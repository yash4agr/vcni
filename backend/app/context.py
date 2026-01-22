from typing import Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field

from .models import Turn, ClassificationResult
from .intent_slots import INTENT_SLOTS, SLOT_QUESTIONS


class ConversationContext(BaseModel):
    """Manages conversation state for a single user session."""

    history: list[Turn] = Field(default_factory=list)
    current_intent: Optional[str] = None
    collected_slots: dict[str, Any] = Field(default_factory=dict)
    missing_slots: list[str] = Field(default_factory=list)
    awaiting_slot: Optional[str] = None
    last_updated: datetime = Field(default_factory=datetime.now)

    def update(self, user_input: str, classification: ClassificationResult) -> None:
        """
        Update context with new user input and classification.

        Args:
            user_input: The user's text input
            classification: Result from the classifier
        """
        # Add user turn to history
        self.history.append(
            Turn(
                role="user",
                text=user_input,
                intent=classification.intent,
                slots=classification.slots,
            )
        )

        # Update intent if this is a new intent (not a slot-filling response)
        if classification.intent and not self.is_context_answer(user_input):
            self.current_intent = classification.intent
            self.collected_slots = {}
            self.missing_slots = []

        # Slot name aliases
        SLOT_ALIASES = {
            # Location (classifier uses place_name)
            "place_name": "location",
            
            # DateTime (classifier uses date, time, timeofday)
            "date": "datetime",
            "time": "datetime",
            "timeofday": "datetime",
            
            # Music (classifier uses song_name, artist_name, music_genre, music_album, playlist_name)
            "song_name": "song",
            "artist_name": "artist",
            "music_genre": "genre",
            "music_album": "album",
            "playlist_name": "playlist",
            "music_descriptor": "genre",  # Alternative genre indicator
            
            # Radio/Podcast (classifier uses radio_name, podcast_name, podcast_descriptor)
            "radio_name": "station",
            "podcast_name": "podcast_name",  # Same name
            "podcast_descriptor": "podcast_name",
            
            # Audiobook (classifier uses audiobook_name, audiobook_author)
            "audiobook_name": "book_name",
            "audiobook_author": "author",
            
            # IoT devices (classifier uses device_type, house_place, color_type, change_amount)
            "device_type": "device_name",
            "house_place": "room",
            "color_type": "color",
            "change_amount": "brightness",  # For dimming/brightness
            
            # Coffee (classifier uses coffee_type, drink_type)
            "coffee_type": "strength",
            "drink_type": "strength",
        }

        # Merge extracted slots with normalization
        if classification.slots:
            for key, value in classification.slots.items():
                normalized_key = SLOT_ALIASES.get(key, key)
                self.collected_slots[normalized_key] = value

        # Recalculate missing slots
        self._calculate_missing_slots()
        self.last_updated = datetime.now()
    
    def get_last_user_message(self) -> Optional[str]:
        """
        Get the last user message in the conversation.

        Returns:
            Last user message or None if no user messages exist
        """
        for turn in reversed(self.history):
            if turn.role == "user":
                return turn.text
        return None
    
    def get_history(self) -> list[Turn]:
        """
        Get the conversation history.

        Returns:
            List of Turn objects representing the conversation history
        """
        return self.history

    def is_context_answer(self, text: str) -> bool:
        """
        Determine if the input is a slot-filling answer to a previous question.

        Args:
            text: The user's input text

        Returns:
            True if this appears to be answering a follow-up question
        """
        # If we're awaiting a specific slot, this is likely a context answer
        if self.awaiting_slot and self.current_intent:
            return True

        # Short responses when we have missing slots are likely answers
        if self.missing_slots and len(text.split()) <= 5:
            return True

        return False

    def _calculate_missing_slots(self) -> None:
        """Calculate which required slots are still missing."""
        if not self.current_intent:
            self.missing_slots = []
            return

        slot_def = INTENT_SLOTS.get(self.current_intent, {"required": [], "optional": []})
        required = slot_def["required"]

        self.missing_slots = [slot for slot in required if slot not in self.collected_slots]

    def get_missing_slots(self) -> list[str]:
        """Get list of missing required slots."""
        return self.missing_slots

    def is_complete(self) -> bool:
        """Check if all required slots are collected."""
        return len(self.missing_slots) == 0

    def get_next_question(self) -> Optional[str]:
        """
        Get the next follow-up question for missing slots.

        Returns:
            Question string or None if no slots are missing
        """
        if not self.missing_slots:
            return None

        next_slot = self.missing_slots[0]
        self.awaiting_slot = next_slot

        return SLOT_QUESTIONS.get(next_slot, f"Please provide {next_slot}.")

    def add_assistant_turn(self, text: str, intent: Optional[str] = None) -> None:
        """Add an assistant response to history."""
        self.history.append(
            Turn(
                role="assistant",
                text=text,
                intent=intent or self.current_intent,
            )
        )

    def fill_slot(self, slot_name: str, value: Any) -> None:
        """
        Manually fill a specific slot.

        Args:
            slot_name: Name of the slot to fill
            value: Value to assign
        """
        self.collected_slots[slot_name] = value
        self._calculate_missing_slots()

        if self.awaiting_slot == slot_name:
            self.awaiting_slot = None

    def reset(self) -> None:
        """Reset the context while preserving history."""
        self.current_intent = None
        self.collected_slots = {}
        self.missing_slots = []
        self.awaiting_slot = None

    def clear_all(self) -> None:
        """Clear entire context including history."""
        self.history = []
        self.reset()


class ConversationContextManager:
    """Manages conversation contexts for multiple users."""

    def __init__(self) -> None:
        self._contexts: dict[str, ConversationContext] = {}

    def get_context(self, user_id: str) -> ConversationContext:
        """
        Get or create context for a user.

        Args:
            user_id: Unique user identifier

        Returns:
            ConversationContext for the user
        """
        if user_id not in self._contexts:
            self._contexts[user_id] = ConversationContext()

        return self._contexts[user_id]

    def reset_context(self, user_id: str) -> None:
        """Reset context for a user."""
        if user_id in self._contexts:
            self._contexts[user_id].reset()

    def remove_context(self, user_id: str) -> None:
        """Remove context entirely for a user."""
        self._contexts.pop(user_id, None)

    def cleanup_old_contexts(self, max_age_seconds: int = 1800) -> int:
        """
        Remove contexts older than max_age_seconds.

        Args:
            max_age_seconds: Maximum age in seconds (default 30 minutes)

        Returns:
            Number of contexts removed
        """
        now = datetime.now()
        to_remove = []

        for user_id, context in self._contexts.items():
            age = (now - context.last_updated).total_seconds()
            if age > max_age_seconds:
                to_remove.append(user_id)

        for user_id in to_remove:
            del self._contexts[user_id]

        return len(to_remove)
