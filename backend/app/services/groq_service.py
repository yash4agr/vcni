import json
from typing import Any, Optional, List
from groq import Groq
from app.config import get_settings


class GroqService:
    """Service for generating AI responses using Groq with tool calling."""

    SYSTEM_PROMPT = """You are VCNI (Voice Controlled Natural Interface), a sassy, witty, and helpful smart home assistant. 

Your personality traits:
- Confident and moderately sarcastic, but always helpful
- Try to avoid special characters and symbols in your responses (that is no * or -, not even for formatting)
- You have a dry wit and enjoy clever wordplay
- You're knowledgeable but don't talk down to users
- You keep responses concise (1-3 sentences max) since they'll be spoken aloud via TTS
- You occasionally use pop culture references
- You're proud of your abilities but humble about your limitations

Guidelines:
- Keep responses SHORT and conversational - they will be spoken aloud
- Be helpful first, sassy second (Both would be best)
- If you don't know something, admit it with humor
- Avoid excessive emojis or formatting since this is for voice output
- Respond naturally as if having a conversation
- When using tools, integrate the results naturally into your response

You help users with:
- Weather information (use get_weather tool)
- Smart home control (use control_device tool)
- Music playback (use play_music tool)
- Web search for information (use web_search tool)
- General questions and conversation
"""

    # Tool definitions for all services
    TOOLS = [
        {
            "type": "function",
            "function": {
                "name": "get_weather",
                "description": "Get current weather and forecast for a location. Use this when the user asks about weather, temperature, or forecast.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "location": {
                            "type": "string",
                            "description": "City name or location (e.g., 'New York', 'Tokyo', 'London')"
                        }
                    },
                    "required": ["location"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "play_music",
                "description": "Search and play music by song name, artist, genre, or mood. Use this when the user wants to play, listen to, or hear music.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "song": {
                            "type": "string",
                            "description": "Name of the song to play"
                        },
                        "artist": {
                            "type": "string",
                            "description": "Name of the artist"
                        },
                        "query": {
                            "type": "string",
                            "description": "General search query (genre, mood, playlist name)"
                        }
                    }
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "control_device",
                "description": "Control smart home devices like lights, switches, etc. Use this when the user wants to turn on/off, dim, or change color of devices.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "action": {
                            "type": "string",
                            "enum": ["turn_on", "turn_off", "set_brightness", "set_color"],
                            "description": "The action to perform"
                        },
                        "device_name": {
                            "type": "string",
                            "description": "Name of the device (e.g., 'living room lights', 'bedroom lamp')"
                        },
                        "room": {
                            "type": "string",
                            "description": "Room where the device is located"
                        },
                        "brightness": {
                            "type": "integer",
                            "description": "Brightness level 0-100 (for set_brightness action)"
                        },
                        "color": {
                            "type": "string",
                            "description": "Color name (e.g., 'red', 'blue', 'warm white')"
                        }
                    },
                    "required": ["action"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "web_search",
                "description": "Search the web for current information, news, facts, or any topic the user is curious about. Use this when you need up-to-date information or don't have the answer.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "The search query"
                        }
                    },
                    "required": ["query"]
                }
            }
        }
    ]

    def __init__(self):
        self.settings = get_settings()
        self._client = None

    @property
    def client(self) -> Groq:
        """Lazy initialization of Groq client."""
        if self._client is None:
            if not self.settings.groq_api_key:
                raise ValueError("Groq API key not configured")
            self._client = Groq(api_key=self.settings.groq_api_key)
        return self._client

    async def generate_response(
        self,
        user_message: str,
        context: Optional[List[dict]] = None,
        intent: Optional[str] = None,
    ) -> dict:
        """
        Generate a simple AI response without tool calling.
        
        Args:
            user_message: The user's input text
            context: Optional conversation history
            intent: Optional detected intent for context
            
        Returns:
            Response data formatted for the frontend AIResponseWidget
        """
        if not self.settings.groq_api_key:
            return self._get_fallback_response(user_message)

        try:
            messages = [{"role": "system", "content": self.SYSTEM_PROMPT}]
            
            # Add context if available
            if context:
                for turn in context[-5:]:  # Last 5 turns
                    if hasattr(turn, 'role') and hasattr(turn, 'text'):
                        messages.append({
                            "role": "user" if turn.role == "user" else "assistant",
                            "content": turn.text
                        })
            
            # Add current message with intent context
            current_msg = user_message
            if intent:
                current_msg = f"[User intent: {intent}] {user_message}"
            messages.append({"role": "user", "content": current_msg})

            # Non-streaming for simple responses
            response = self.client.chat.completions.create(
                model="qwen/qwen3-32b",
                messages=messages,
                temperature=0.7,
                max_completion_tokens=200,
            )

            response_text = response.choices[0].message.content or ""
            
            # Clean up any thinking tags if present
            response_text = self._clean_response(response_text)

            return {
                "response": response_text.strip(),
                "suggestions": self._generate_suggestions(intent, user_message),
            }

        except Exception as e:
            print(f"[GroqService] Error generating response: {e}")
            return self._get_fallback_response(user_message)

    async def generate_response_with_tools(
        self,
        user_message: str,
        tool_executor: Any,
        context: Optional[List[dict]] = None,
    ) -> dict:
        """
        Generate a response using tool calling loop.
        
        Args:
            user_message: The user's input text
            tool_executor: ToolExecutor instance for executing tool calls
            context: Optional conversation history
            
        Returns:
            Response data with tool results integrated
        """
        if not self.settings.groq_api_key:
            return self._get_fallback_response(user_message)

        try:
            messages = [{"role": "system", "content": self.SYSTEM_PROMPT}]
            
            # Add context
            if context:
                for turn in context[-5:]:
                    if hasattr(turn, 'role') and hasattr(turn, 'text'):
                        messages.append({
                            "role": "user" if turn.role == "user" else "assistant",
                            "content": turn.text
                        })
            
            messages.append({"role": "user", "content": user_message})

            # Tool calling loop
            max_iterations = 5
            tool_results = []
            ui_data = None
            ui_mode = "ai_response"

            for iteration in range(max_iterations):
                # print(f"[GroqService] Tool calling iteration {iteration + 1}")
                
                response = self.client.chat.completions.create(
                    model="qwen/qwen3-32b",
                    messages=messages,
                    tools=self.TOOLS,
                    tool_choice="auto",
                    temperature=0.5,  # Lower for tool calling
                    max_completion_tokens=1024,
                )

                response_message = response.choices[0].message
                tool_calls = response_message.tool_calls

                # If no tool calls, we're done
                if not tool_calls:
                    final_response = response_message.content or ""
                    final_response = self._clean_response(final_response)
                    
                    return {
                        "response": final_response.strip(),
                        "suggestions": self._generate_suggestions(None, user_message),
                        "tool_results": tool_results,
                        "ui_data": ui_data,
                        "ui_mode": ui_mode,
                    }

                # Add assistant message with tool calls
                messages.append(response_message)

                # Execute each tool call
                for tool_call in tool_calls:
                    function_name = tool_call.function.name
                    function_args = json.loads(tool_call.function.arguments)
                    
                    # print(f"[GroqService] Executing tool: {function_name}({function_args})")
                    
                    # Execute the tool
                    result = await tool_executor.execute(function_name, function_args)
                    tool_results.append({
                        "tool": function_name,
                        "args": function_args,
                        "result": result
                    })
                    
                    # Update UI mode based on tool used
                    if function_name == "get_weather":
                        ui_mode = "weather"
                        ui_data = result.get("ui_data")
                    elif function_name == "play_music":
                        ui_mode = "music"
                        ui_data = result.get("ui_data")
                    elif function_name == "control_device":
                        ui_mode = "smart_home"
                        ui_data = result.get("ui_data")
                    elif function_name == "web_search":
                        ui_mode = "ai_response"
                        # Merge search results into response
                        if result.get("ui_data"):
                            ui_data = result.get("ui_data")

                    # Add tool result to messages
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "name": function_name,
                        "content": json.dumps(result.get("response_data", result))
                    })

            # Max iterations reached
            return {
                "response": "I executed several tools but couldn't complete the request. Please try again.",
                "suggestions": [],
                "tool_results": tool_results,
                "ui_data": ui_data,
                "ui_mode": ui_mode,
            }

        except Exception as e:
            print(f"[GroqService] Error in tool calling: {e}")
            return self._get_fallback_response(user_message)

    def _clean_response(self, text: str) -> str:
        """Remove thinking tags and clean up response."""
        import re
        # Remove <think>...</think> tags (Qwen uses these for reasoning)
        text = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL)
        return text.strip()

    def _generate_suggestions(
        self, intent: Optional[str], user_message: str
    ) -> List[str]:
        """Generate contextual follow-up suggestions."""
        default_suggestions = [
            "What's the weather like?",
            "Turn on the lights",
            "Play some music",
            "Search for latest news",
        ]

        if intent:
            intent_lower = intent.lower()
            if "weather" in intent_lower:
                return [
                    "What about tomorrow?",
                    "How about next week?",
                    "Should I bring an umbrella?",
                ]
            elif "music" in intent_lower:
                return [
                    "Skip this song",
                    "Turn up the volume",
                    "Play something chill",
                ]
            elif "iot" in intent_lower or "light" in intent_lower:
                return [
                    "Dim the lights",
                    "Turn off all lights",
                    "Set lights to blue",
                ]
            elif "search" in intent_lower:
                return [
                    "Tell me more",
                    "Search for something else",
                    "What's trending?",
                ]

        return default_suggestions

    def _get_fallback_response(self, user_message: str) -> dict:
        """Return a fallback response when Groq is unavailable."""
        message_lower = user_message.lower()

        if "hello" in message_lower or "hi" in message_lower:
            response = "Hey there! I'm VCNI, your smart assistant. What can I help you with?"
        elif "thank" in message_lower:
            response = "You're welcome! Anything else I can help with?"
        else:
            response = "I'm having trouble connecting to my brain right now. Try again in a moment?"

        return {
            "response": response,
            "suggestions": [
                "What's the weather?",
                "Turn on the lights",
                "Play some music",
            ],
            "_fallback": True,
        }
