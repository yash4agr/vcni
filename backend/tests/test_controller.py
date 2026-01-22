"""Tests for AssistantController."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from app.controller import AssistantController
from app.models import ClassificationResult, AssistantResponse


@pytest.fixture
def controller():
    """Create controller with mocked dependencies."""
    with patch("app.controller.get_classifier_client") as mock_classifier:
        with patch("app.controller.get_context_manager") as mock_context_mgr:
            # Setup mock classifier
            mock_client = AsyncMock()
            mock_classifier.return_value = mock_client

            # Setup mock context manager
            from app.context import ConversationContextManager

            mock_context_mgr.return_value = ConversationContextManager()

            controller = AssistantController()
            controller.classifier = mock_client
            yield controller


class TestAssistantController:
    """Tests for AssistantController class."""

    @pytest.mark.asyncio
    async def test_weather_two_turn_flow(self, controller):
        """Test: 'What's the weather?' -> ask location -> city -> returns weather."""
        # First turn: No location provided
        controller.classifier.classify = AsyncMock(
            return_value=ClassificationResult(
                intent="weather_query",
                confidence=0.95,
                slots={},
            )
        )

        response1 = await controller.process_input("user1", "What's the weather?")

        assert response1.state == "awaiting_info"
        assert response1.needs_more_info is True
        assert "city" in response1.follow_up_question.lower()

        # Second turn: Location provided
        controller.classifier.classify = AsyncMock(
            return_value=ClassificationResult(
                intent="weather_query",
                confidence=0.95,
                slots={"location": "New York"},
            )
        )

        response2 = await controller.process_input("user1", "New York")

        assert response2.state == "completed"
        assert response2.ui_mode == "weather"
        assert response2.ui_data is not None
        assert "New York" in response2.response

    @pytest.mark.asyncio
    async def test_iot_light_flow(self, controller):
        """Test: 'Turn on lights' -> ask device -> device name -> returns confirmation."""
        # First turn: No device specified
        controller.classifier.classify = AsyncMock(
            return_value=ClassificationResult(
                intent="iot_hue_lighton",
                confidence=0.92,
                slots={},
            )
        )

        response1 = await controller.process_input("user2", "Turn on the lights")

        assert response1.state == "awaiting_info"
        assert response1.needs_more_info is True
        assert response1.follow_up_question is not None

        # Second turn: Device provided
        controller.classifier.classify = AsyncMock(
            return_value=ClassificationResult(
                intent="iot_hue_lighton",
                confidence=0.92,
                slots={"device_name": "living room lights"},
            )
        )

        response2 = await controller.process_input("user2", "living room lights")

        assert response2.state == "completed"
        assert response2.ui_mode == "smart_home"
        assert response2.ui_data is not None

    @pytest.mark.asyncio
    async def test_music_play_direct(self, controller):
        """Test: Music play with no required slots completes immediately."""
        controller.classifier.classify = AsyncMock(
            return_value=ClassificationResult(
                intent="play_music",
                confidence=0.88,
                slots={"artist": "The Weeknd"},
            )
        )

        response = await controller.process_input("user3", "Play The Weeknd")

        assert response.state == "completed"
        assert response.ui_mode == "music"
        assert response.ui_data is not None

    @pytest.mark.asyncio
    async def test_low_confidence_clarification(self, controller):
        """Test: Low confidence triggers clarification request."""
        controller.classifier.classify = AsyncMock(
            return_value=ClassificationResult(
                intent="play_music",
                confidence=0.4,  # Below threshold
                slots={},
                needs_clarification=True,
            )
        )

        response = await controller.process_input("user4", "play something")

        assert response.state == "awaiting_info"
        assert response.needs_more_info is True

    @pytest.mark.asyncio
    async def test_general_greeting(self, controller):
        """Test: General greeting returns ai_response mode."""
        controller.classifier.classify = AsyncMock(
            return_value=ClassificationResult(
                intent="general_greet",
                confidence=0.98,
                slots={},
            )
        )

        response = await controller.process_input("user5", "Hello!")

        assert response.state == "completed"
        assert response.ui_mode == "ai_response"
        assert "hello" in response.response.lower() or "help" in response.response.lower()
