"""State storage for conversation contexts.

TODO: Replace with Redis for production/horizontal scaling.
"""

from .context import ConversationContextManager

# Global Context Manager Instance

# In-memory storage - simple dict-based approach
# TODO: Migrate to Redis for horizontal scaling and persistence
context_manager = ConversationContextManager()


def get_context_manager() -> ConversationContextManager:
    """Get the global context manager instance."""
    return context_manager
