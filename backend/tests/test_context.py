"""Tests for ConversationContext."""

import pytest
from app.context import ConversationContext, ConversationContextManager
from app.models import ClassificationResult


class TestConversationContext:
    """Tests for ConversationContext class."""

    def test_context_initialization(self):
        """New context should have empty slots."""
        context = ConversationContext()

        assert context.current_intent is None
        assert context.collected_slots == {}
        assert context.missing_slots == []
        assert context.awaiting_slot is None
        assert len(context.history) == 0

    def test_update_with_new_intent(self):
        """Classification should set current_intent."""
        context = ConversationContext()
        classification = ClassificationResult(
            intent="weather_query",
            confidence=0.95,
            slots={"location": "New York"},
        )

        context.update("What's the weather in New York?", classification)

        assert context.current_intent == "weather_query"
        assert context.collected_slots == {"location": "New York"}
        assert len(context.history) == 1
        assert context.history[0].role == "user"

    def test_get_missing_slots(self):
        """Should return required slots not yet filled."""
        context = ConversationContext()
        classification = ClassificationResult(
            intent="weather_query",
            confidence=0.95,
            slots={},  # No slots extracted
        )

        context.update("What's the weather?", classification)
        missing = context.get_missing_slots()

        assert "location" in missing

    def test_is_complete_when_all_slots_filled(self):
        """Should return True when all required slots are filled."""
        context = ConversationContext()
        classification = ClassificationResult(
            intent="weather_query",
            confidence=0.95,
            slots={"location": "New York"},
        )

        context.update("What's the weather in New York?", classification)

        assert context.is_complete() is True

    def test_is_complete_when_slots_missing(self):
        """Should return False when required slots are missing."""
        context = ConversationContext()
        classification = ClassificationResult(
            intent="weather_query",
            confidence=0.95,
            slots={},
        )

        context.update("What's the weather?", classification)

        assert context.is_complete() is False

    def test_get_next_question(self):
        """Should return appropriate slot question."""
        context = ConversationContext()
        classification = ClassificationResult(
            intent="weather_query",
            confidence=0.95,
            slots={},
        )

        context.update("What's the weather?", classification)
        question = context.get_next_question()

        assert question is not None
        assert "city" in question.lower() or "location" in question.lower()
        assert context.awaiting_slot == "location"

    def test_fill_slot(self):
        """Manually filling slot should update state."""
        context = ConversationContext()
        classification = ClassificationResult(
            intent="weather_query",
            confidence=0.95,
            slots={},
        )

        context.update("What's the weather?", classification)
        context.fill_slot("location", "Boston")

        assert context.collected_slots["location"] == "Boston"
        assert context.is_complete() is True

    def test_is_context_answer_when_awaiting(self):
        """Should detect slot-filling response."""
        context = ConversationContext()
        context.current_intent = "weather_query"
        context.awaiting_slot = "location"

        assert context.is_context_answer("New York") is True
        assert context.is_context_answer("Boston") is True

    def test_reset_preserves_history(self):
        """Reset should clear intent/slots but keep history."""
        context = ConversationContext()
        classification = ClassificationResult(
            intent="weather_query",
            confidence=0.95,
            slots={"location": "NYC"},
        )

        context.update("Weather in NYC", classification)
        context.add_assistant_turn("It's sunny!")
        context.reset()

        assert context.current_intent is None
        assert context.collected_slots == {}
        assert len(context.history) == 2  # History preserved


class TestConversationContextManager:
    """Tests for ConversationContextManager class."""

    def test_get_context_creates_new(self):
        """Should create new context for unknown user."""
        manager = ConversationContextManager()

        context = manager.get_context("user123")

        assert context is not None
        assert isinstance(context, ConversationContext)

    def test_get_context_returns_existing(self):
        """Should return same context for same user."""
        manager = ConversationContextManager()

        context1 = manager.get_context("user123")
        context1.current_intent = "test_intent"

        context2 = manager.get_context("user123")

        assert context2.current_intent == "test_intent"

    def test_reset_context(self):
        """Should reset user's context."""
        manager = ConversationContextManager()

        context = manager.get_context("user123")
        context.current_intent = "test_intent"

        manager.reset_context("user123")

        assert manager.get_context("user123").current_intent is None

    def test_remove_context(self):
        """Should remove context entirely."""
        manager = ConversationContextManager()

        manager.get_context("user123")
        manager.remove_context("user123")

        # Getting again should create fresh context
        new_context = manager.get_context("user123")
        assert new_context.current_intent is None
