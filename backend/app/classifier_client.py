from typing import Any, Optional
import httpx

from .config import get_settings
from .models import ClassificationResult


class ModalClassifierClient:
    """Client for calling the Modal-deployed XLM-R classifier."""

    def __init__(self) -> None:
        self.settings = get_settings()
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=self.settings.classifier_timeout)
        return self._client

    async def classify(
        self, text: str, context: Optional[dict[str, Any]] = None
    ) -> ClassificationResult:
        """
        Call the Modal classifier endpoint.

        Args:
            text: User input text to classify
            context: Optional conversation context for disambiguation

        Returns:
            ClassificationResult with intent, confidence, slots, and entities
        """
        try:
            client = await self._get_client()

            # Build request payload
            payload = {"text": text}
            if context:
                payload["context"] = context

            # Call Modal endpoint
            response = await client.post(
                self.settings.modal_classifier_url,
                json=payload,
            )
            response.raise_for_status()

            data = response.json()
            # print(f"[Classifier] Raw response: {data}")

            # Map Modal response to normalized format
            return ClassificationResult(
                intent=data.get("intent"),
                confidence=data.get("confidence", 0.0),
                slots=data.get("slots", {}),
                entities=data.get("entities", []),
                needs_clarification=data.get("confidence", 0.0)
                < self.settings.confidence_threshold,
            )

        except httpx.TimeoutException:
            # Return low-confidence result on timeout
            return ClassificationResult(
                intent=None,
                confidence=0.0,
                needs_clarification=True,
            )

        except httpx.HTTPStatusError as e:
            # Log error and return empty result
            print(f"Classifier HTTP error: {e}")
            return ClassificationResult(
                intent=None,
                confidence=0.0,
                needs_clarification=True,
            )

        except Exception as e:
            # Catch-all for unexpected errors
            print(f"Classifier error: {e}")
            return ClassificationResult(
                intent=None,
                confidence=0.0,
                needs_clarification=True,
            )

    async def close(self) -> None:
        """Close the HTTP client."""
        if self._client:
            await self._client.aclose()
            self._client = None



# Global Client Instance
_classifier_client: Optional[ModalClassifierClient] = None


def get_classifier_client() -> ModalClassifierClient:
    """Get the global classifier client instance."""
    global _classifier_client
    if _classifier_client is None:
        _classifier_client = ModalClassifierClient()
    return _classifier_client
