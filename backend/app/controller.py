from typing import Any

from .config import get_settings
from .models import (
    AssistantResponse,
    ClassificationResult,
    WeatherAction,
    MusicAction,
    IoTAction,
    GeneralAction,
)
from .context import ConversationContext
from .state_store import get_context_manager
from .classifier_client import get_classifier_client
from .intent_to_ui import get_ui_mode
from .intent_slots import INTENT_SLOTS, WEATHER_INTENTS, MUSIC_INTENTS, IOT_INTENTS
from .services import WeatherService, MusicService, IoTService, GeminiService, GroqService
from .tool_executor import get_tool_executor


class AssistantController:
    """Main controller for processing user input and generating responses."""

    def __init__(self, user_id: str = "default") -> None:
        self.user_id = user_id
        self.context_manager = get_context_manager()
        self.classifier = get_classifier_client()
        self.weather_service = WeatherService()
        self.music_service = MusicService()
        self.iot_service = IoTService(user_id=user_id)
        self.gemini_service = GeminiService()
        self.llm_service = self._get_llm_service()
        self.tool_executor = get_tool_executor()
        self.settings = get_settings()

    def _get_llm_service(self):
        """Get the configured LLM service based on settings."""
        settings = get_settings()
        # print(f"[Controller] Using LLM provider: {settings.llm_provider}")
        if settings.llm_provider == "groq":
            return GroqService()
        else:
            return GeminiService()

    async def process_input(self, user_id: str, text: str) -> AssistantResponse:
        """
        Process user input and generate response.

        Args:
            user_id: Unique user identifier
            text: User's input text

        Returns:
            AssistantResponse with ui_mode, ui_data, and response
        """
        # Update user context
        self.user_id = user_id
        self.iot_service = IoTService(user_id=user_id)

        # Get or create context
        context = self.context_manager.get_context(user_id)

        try:
            # Classify the input
            classification = await self._classify_input(text, context)
            # print(f"[Controller] Classification: intent={classification.intent}, confidence={classification.confidence}, slots={classification.slots}")

            # Check if this is a slot-filling response
            if context.awaiting_slot and context.is_context_answer(text):
                return await self._handle_slot_filling(context, text, classification)

            # New intent detected
            context.update(text, classification)
            # print(f"[Controller] After update: current_intent={context.current_intent}, collected_slots={context.collected_slots}")

            # Check for low confidence / no intent - route to GenAI instead of asking for clarification
            if classification.needs_clarification or not classification.intent:
                # print(f"[Controller] Low confidence or no intent, routing to GenAI")
                return await self._handle_general(context, classification)

            # Check if we need more slots
            if not context.is_complete():
                return self._build_slot_request(context, classification)

            # All slots collected - execute intent
            return await self._execute_intent(context, classification)

        except Exception as e:
            print(f"Error processing input: {e}")
            return AssistantResponse(
                response="I'm sorry, I encountered an error. Please try again.",
                ui_mode="ai_response",
                state="error",
                intent=context.current_intent,
            )

    async def _classify_input(
        self, text: str, context: ConversationContext
    ) -> ClassificationResult:
        """Classify user input using Modal classifier."""
        # Build context dict for classifier
        context_dict = None
        if context.current_intent:
            context_dict = {
                "current_intent": context.current_intent,
                "collected_slots": context.collected_slots,
                "awaiting_slot": context.awaiting_slot,
            }

        return await self.classifier.classify(text, context_dict)

    async def _handle_slot_filling(
        self,
        context: ConversationContext,
        text: str,
        classification: ClassificationResult,
    ) -> AssistantResponse:
        """Handle slot-filling response from user."""
        # Extract slot value from classification or use raw text
        if classification.slots and context.awaiting_slot:
            value = classification.slots.get(context.awaiting_slot, text)
        else:
            value = text

        # Fill the awaited slot
        if context.awaiting_slot:
            context.fill_slot(context.awaiting_slot, value)

        # Also merge any additional extracted slots
        for slot_name, slot_value in classification.slots.items():
            if slot_name not in context.collected_slots:
                context.fill_slot(slot_name, slot_value)

        # Check if we need more slots
        if not context.is_complete():
            return self._build_slot_request(context, classification)

        # All slots collected - execute intent
        return await self._execute_intent(context, classification)

    def _build_clarification_response(
        self, context: ConversationContext, classification: ClassificationResult
    ) -> AssistantResponse:
        """Build response asking for clarification on intent."""
        response = "I'm not quite sure what you mean. Could you please clarify?"

        if classification.candidates:
            # Offer options
            options = [c.get("intent", "unknown") for c in classification.candidates[:3]]
            response = f"Did you mean one of these: {', '.join(options)}?"

        context.add_assistant_turn(response)

        return AssistantResponse(
            response=response,
            ui_mode="ai_response",
            state="awaiting_info",
            needs_more_info=True,
            follow_up_question=response,
            intent=classification.intent,
            confidence=classification.confidence,
        )

    def _build_slot_request(
        self, context: ConversationContext, classification: ClassificationResult
    ) -> AssistantResponse:
        """Build response asking for missing slot."""
        question = context.get_next_question()

        if question:
            context.add_assistant_turn(question)

        return AssistantResponse(
            response=question or "I need more information.",
            ui_mode=get_ui_mode(context.current_intent),
            state="awaiting_info",
            needs_more_info=True,
            follow_up_question=question,
            intent=context.current_intent,
            confidence=classification.confidence,
            slots=context.collected_slots,
        )

    async def _execute_intent(
        self, context: ConversationContext, classification: ClassificationResult
    ) -> AssistantResponse:
        """Execute the intent with collected slots."""
        intent = context.current_intent
        slots = context.collected_slots

        if intent in WEATHER_INTENTS:
            return await self._handle_weather(context, slots)

        if intent in MUSIC_INTENTS:
            return await self._handle_music(context, slots)

        if intent in IOT_INTENTS:
            return await self._handle_iot(context, slots, intent)

        # General/fallback response - use GenAI
        return await self._handle_general(context, classification)

    async def _handle_weather(
        self, context: ConversationContext, slots: dict[str, Any]
    ) -> AssistantResponse:
        """Handle weather intent."""
        location = slots.get("location", "San Francisco")

        # Call weather service
        weather_data = await self.weather_service.get_weather(location)

        # Generate response using GenAI or fallback
        response = self.weather_service.generate_response(weather_data, location)

        # Build action
        action = WeatherAction(
            location=weather_data.get("location", location),
            temperature=weather_data.get("temperature"),
            condition=weather_data.get("condition"),
            humidity=weather_data.get("humidity"),
            wind_speed=weather_data.get("windSpeed"),
            visibility=weather_data.get("visibility"),
            forecast=weather_data.get("forecast"),
        )

        context.add_assistant_turn(response, context.current_intent)
        context.reset()  # Clear context after completion

        return AssistantResponse(
            response=response,
            ui_mode="weather",
            ui_data=weather_data,
            action=action,
            state="completed",
            intent=context.current_intent,
            slots=slots,
        )

    async def _handle_music(
        self, context: ConversationContext, slots: dict[str, Any]
    ) -> AssistantResponse:
        """Handle music intent."""
        # print(f"[Controller._handle_music] Received slots: {slots}")
        
        # Build search query from slots
        query_parts = []
        if slots.get("song"):
            query_parts.append(slots["song"])
        if slots.get("artist"):
            query_parts.append(slots["artist"])
        if slots.get("genre"):
            query_parts.append(slots["genre"])

        query = " ".join(query_parts) if query_parts else slots.values() or "music"
        # print(f"[Controller._handle_music] Built query: '{query}'")

        # Call music service
        music_data = await self.music_service.search(query)

        # Generate response
        response = self.music_service.generate_response(music_data, query)

        # Build action
        action = MusicAction(
            command="play",
            artist=music_data.get("artist"),
            song=music_data.get("title"),
            genre=slots.get("genre"),
            playlist=slots.get("playlist"),
            current_track={
                "title": music_data.get("title"),
                "artist": music_data.get("artist"),
                "album": music_data.get("album"),
            },
            queue=music_data.get("playlist"),
        )

        # Format ui_data for MusicWidget
        ui_data = {
            "title": music_data.get("title"),
            "artist": music_data.get("artist"),
            "album": music_data.get("album"),
            "duration": music_data.get("duration", 245),
            "videoId": music_data.get("videoId"),
            "thumbnailUrl": music_data.get("thumbnailUrl"),
            "visualAsset": music_data.get("thumbnailUrl"),  # Map for widget display
            "playlist": music_data.get("playlist", []),
        }

        context.add_assistant_turn(response, context.current_intent)
        context.reset()

        return AssistantResponse(
            response=response,
            ui_mode="music",
            ui_data=ui_data,
            action=action,
            state="completed",
            intent=context.current_intent,
            slots=slots,
        )

    async def _handle_iot(
        self, context: ConversationContext, slots: dict[str, Any], intent: str
    ) -> AssistantResponse:
        """Handle IoT intents."""
        # Determine action from intent
        if "lighton" in intent or "wemo_on" in intent:
            action_type = "on"
        elif "lightoff" in intent or "wemo_off" in intent:
            action_type = "off"
        elif "lightchange" in intent:
            action_type = "set"
        elif "lightdim" in intent:
            action_type = "off"  # Dim = turn down
        elif "lightup" in intent:
            action_type = "on"  # Brighten = turn up
        else:
            action_type = "toggle"

        # Build device name from slots
        device_name = slots.get("device_name") or slots.get("room", "lights")

        # Call IoT service
        result = await self.iot_service.control_device(
            device_name=device_name,
            action=action_type,
            color=slots.get("color"),
            value=slots.get("brightness"),
        )

        # Generate response
        response = self.iot_service.generate_response(result, action_type, device_name)

        # Build action
        action = IoTAction(
            command=action_type,
            device_name=device_name,
            room=slots.get("room"),
            color=slots.get("color"),
            brightness=slots.get("brightness"),
            devices=result.get("devices"),
        )

        # Build ui_data matching SmartHomeWidget structure
        ui_data = {"devices": result.get("devices", [])}

        context.add_assistant_turn(response, context.current_intent)
        context.reset()

        return AssistantResponse(
            response=response,
            ui_mode="smart_home",
            ui_data=ui_data,
            action=action,
            state="completed",
            intent=intent,
            slots=slots,
        )

    async def _handle_general(
        self, context: ConversationContext, classification: ClassificationResult
    ) -> AssistantResponse:
        """Handle general/greeting intents using configured LLM with tool calling."""
        intent = context.current_intent
        user_message = context.get_last_user_message() or "Hello"

        # Get conversation history for context
        history = context.get_history()

        # Use Groq with tool calling if configured, otherwise fall back to GenAI
        if self.settings.llm_provider == "groq" and hasattr(self.llm_service, 'generate_response_with_tools'):
            llm_response = await self.llm_service.generate_response_with_tools(
                user_message=user_message,
                tool_executor=self.tool_executor,
                context=history,
            )
            
            # Check if we got tool results that provide UI data
            if llm_response.get("ui_mode") and llm_response.get("ui_mode") != "ai_response":
                # Tool was used, we have specific UI data
                ui_mode = llm_response.get("ui_mode")
                ui_data = llm_response.get("ui_data")
            else:
                # General response, use ai_response widget
                ui_mode = "ai_response"
                ui_data = {
                    "response": llm_response.get("response", ""),
                    "suggestions": llm_response.get("suggestions", []),
                }
        else:
            # print(f"[Controller] Using Gemini for: {user_message}")
            llm_response = await self.gemini_service.generate_response(
                user_message=user_message,
                context=history,
                intent=intent,
            )
            ui_mode = "ai_response"
            ui_data = {
                "response": llm_response.get("response", ""),
                "suggestions": llm_response.get("suggestions", []),
            }

        response = llm_response.get("response", "How can I assist you?")
        suggestions = llm_response.get("suggestions", [])

        action = GeneralAction(message=response)

        context.add_assistant_turn(response, intent)
        context.reset()

        return AssistantResponse(
            response=response,
            ui_mode=ui_mode,
            ui_data=ui_data,
            action=action,
            state="completed",
            intent=intent,
            confidence=classification.confidence,
        )



# Global Controller Instance
_controller: AssistantController | None = None


def get_controller() -> AssistantController:
    """Get the global controller instance."""
    global _controller
    if _controller is None:
        _controller = AssistantController()
    return _controller
