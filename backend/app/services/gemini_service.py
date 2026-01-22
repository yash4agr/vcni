from typing import Optional, List
from app.config import get_settings
from google import genai
from google.genai import types


class GeminiService:
    """Service for generating AI responses using Google Gemini."""

    SYSTEM_PROMPT = """You are VCNI (Voice Controlled Natural Interface), a sassy, witty, and helpful smart home assistant. 

Your personality traits:
- Confident and slightly sarcastic, but always helpful
- You have a dry wit and enjoy clever wordplay
- You're knowledgeable but don't talk down to users
- You keep responses concise (1-3 sentences max) since they'll be spoken aloud via TTS
- You occasionally use pop culture references
- You're proud of your abilities but humble about your limitations

Guidelines:
- Keep responses SHORT and conversational - they will be spoken aloud
- Be helpful first, sassy second
- If you don't know something, admit it with humor
- Avoid excessive emojis or formatting since this is for voice output
- Respond naturally as if having a conversation

You help users with:
- Weather information
- Smart home control
- Music playback
- General questions and conversation
"""

    def __init__(self):
        self.settings = get_settings()
        self._client = None

    @property
    def client(self):
        """Lazy initialization of Gemini client."""
        if self._client is None:
            if not self.settings.gemini_api_key or "your_gemini_api_key" in self.settings.gemini_api_key:
                raise ValueError("Gemini API key not configured")
            self._client = genai.Client(api_key=self.settings.gemini_api_key)
        return self._client

    async def generate_response(
        self,
        user_message: str,
        context: Optional[List[dict]] = None,
        intent: Optional[str] = None,
    ) -> dict:
        """
        Generate an AI response to the user's message.
        
        Args:
            user_message: The user's input text
            context: Optional conversation history
            intent: Optional detected intent for context
            
        Returns:
            Response data formatted for the frontend AIResponseWidget
        """
        if not self.settings.gemini_api_key or "your_gemini_api_key" in self.settings.gemini_api_key:
            return self._get_mock_response(user_message)

        try:
            # Build conversation history
            chat_history = []
            if context:
                for turn in context[-5:]:  # Last 5 turns max
                    if turn.role == "user":
                        chat_history.append(
                            types.Content(
                                role="user",
                                parts=[types.Part.from_text(text=turn.text)]
                            )
                        )
                    if turn.role == "assistant":
                        chat_history.append(
                            types.Content(
                                role="model",
                                parts=[types.Part.from_text(text=turn.text)]
                            )
                        )

            # Add context about what the user is trying to do
            enhanced_message = user_message
            if intent:
                enhanced_message = f"[User intent: {intent}] {user_message}"

            # Use streaming for low latency - collect first chunk quickly
            response_text = ""
            async for chunk in await self.client.aio.models.generate_content_stream(
                model="gemini-3-flash-preview",  # Fast model for low latency
                contents=[
                    *chat_history,
                    types.Content(
                        role="user",
                        parts=[types.Part.from_text(text=enhanced_message)]
                    )
                ],
                config=types.GenerateContentConfig(
                    system_instruction=self.SYSTEM_PROMPT,
                    temperature=0.9,  # More creative for personality
                    # max_output_tokens=150,  # Limit for faster response
                    candidate_count=1,
                ),
            ):
                if chunk.text:
                    response_text += chunk.text

            # Generate follow-up suggestions
            suggestions = self._generate_suggestions(intent, user_message)

            return {
                "response": response_text.strip(),
                "suggestions": suggestions,
            }

        except Exception as e:
            print(f"[GeminiService] Error generating response: {e}")
            return self._get_mock_response(user_message)

    def _generate_suggestions(
        self, intent: Optional[str], user_message: str
    ) -> List[str]:
        """Generate contextual follow-up suggestions."""
        default_suggestions = [
            "What's the weather like?",
            "Turn on the lights",
            "Play some music",
            "Tell me a joke",
        ]

        if intent:
            intent_lower = intent.lower()
            if "weather" in intent_lower:
                return [
                    "What about tomorrow?",
                    "How about next week?",
                    "Should I bring an umbrella?",
                    "What's the UV index?",
                ]
            elif "music" in intent_lower:
                return [
                    "Skip this song",
                    "Turn up the volume",
                    "Play something chill",
                    "Add to favorites",
                ]
            elif "iot" in intent_lower or "light" in intent_lower:
                return [
                    "Dim the lights",
                    "Turn off all lights",
                    "Set lights to blue",
                    "Activate movie mode",
                ]

        return default_suggestions

    def _get_mock_response(self, user_message: str) -> dict:
        """Return a mock response when Gemini is unavailable."""
        # Simple response based on keywords
        message_lower = user_message.lower()

        if "hello" in message_lower or "hi" in message_lower:
            response = "Hey there! I'm your AI assistant. What can I help you with today?"
        elif "joke" in message_lower:
            response = "Why don't scientists trust atoms? Because they make up everything! I know, I know, I'll show myself out."
        elif "thank" in message_lower:
            response = "You're welcome! That's what I'm here for. Anything else?"
        elif "who are you" in message_lower or "what are you" in message_lower:
            response = "I'm VCNI, your sassy smart home assistant. Think Jarvis, but with better jokes."
        else:
            response = "I'm here to help! Ask me about the weather, music, or controlling your smart home devices."

        return {
            "response": response,
            "suggestions": [
                "What's the weather forecast?",
                "Turn on the lights",
                "Play some music",
                "Tell me more about AI",
            ],
            "_mock": True,
        }

    async def generate_contextual_response(
        self,
        intent: str,
        action_result: dict,
        user_message: str,
    ) -> str:
        """
        Generate a contextual response after an action is performed.
        
        Args:
            intent: The detected intent
            action_result: Result from the action (e.g., weather data)
            user_message: Original user message
            
        Returns:
            A contextual response string
        """
        if not self.settings.gemini_api_key or "your_gemini_api_key" in self.settings.gemini_api_key:
            return self._generate_simple_response(intent, action_result)

        try:
            prompt = f"""The user said: "{user_message}"
I (the assistant) performed an action for intent: {intent}
The result was: {action_result}

Generate a SHORT, conversational response (1-2 sentences) that:
1. Confirms the action was done or shares the relevant info
2. Maintains my sassy personality
3. Is suitable for text-to-speech (no emojis/formatting)"""

            # Use streaming for faster first response
            response_text = ""
            async for chunk in await self.client.aio.models.generate_content_stream(
                model="gemini-2.5-flash",
                contents=types.Content(
                    role="user",
                    parts=[types.Part.from_text(text=prompt)]
                ),
                config=types.GenerateContentConfig(
                    system_instruction=self.SYSTEM_PROMPT,
                    temperature=0.9,
                    max_output_tokens=100,
                ),
            ):
                if chunk.text:
                    response_text += chunk.text

            return response_text.strip()

        except Exception as e:
            print(f"[GeminiService] Error generating contextual response: {e}")
            return self._generate_simple_response(intent, action_result)

    def _generate_simple_response(self, intent: str, action_result: dict) -> str:
        """Generate a simple response without Gemini."""
        intent_lower = intent.lower()

        if "weather" in intent_lower:
            temp = action_result.get("temperature", "??")
            condition = action_result.get("condition", "unknown")
            location = action_result.get("location", "your area")
            return f"It's currently {temp}°F and {condition.lower()} in {location}."

        elif "music" in intent_lower:
            title = action_result.get("title", "something")
            artist = action_result.get("artist", "an artist")
            return f"Now playing '{title}' by {artist}. Enjoy!"

        elif "iot" in intent_lower or "light" in intent_lower:
            return "Done! Your smart home awaits your next command."

        return "Got it! Is there anything else I can help with?"

    def __del__(self):
        """Cleanup client connection."""
        if self._client is not None:
            try:
                self._client.close()
            except:
                pass