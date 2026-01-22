import httpx
from typing import Optional, List
from app.config import get_settings


class SearchService:
    """Service for web search using Tavily API."""

    def __init__(self):
        self.settings = get_settings()
        self.base_url = "https://api.tavily.com"

    async def search(
        self,
        query: str,
        max_results: int = 5,
        search_depth: str = "basic",
        include_answer: bool = True,
    ) -> dict:
        """
        Search the web and return structured results.
        
        Args:
            query: Search query
            max_results: Maximum number of results (1-10)
            search_depth: "basic" or "advanced" (advanced costs more)
            include_answer: Whether to include AI-generated summary
            
        Returns:
            dict with answer, results, and UI data
        """
        if not self.settings.tavily_api_key:
            return self._get_mock_results(query)

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/search",
                    json={
                        "api_key": self.settings.tavily_api_key,
                        "query": query,
                        "max_results": min(max_results, 10),
                        "search_depth": search_depth,
                        "include_answer": include_answer,
                        "include_raw_content": False,
                    },
                    timeout=15.0,
                )
                response.raise_for_status()
                data = response.json()

                # Format results for LLM consumption
                results = []
                for r in data.get("results", []):
                    results.append({
                        "title": r.get("title", ""),
                        "url": r.get("url", ""),
                        "snippet": r.get("content", "")[:300],  # Truncate for LLM
                        "score": r.get("score", 0),
                    })

                answer = data.get("answer", "")
                
                # Build response for both LLM and UI
                return {
                    "success": True,
                    "response_data": {
                        "answer": answer,
                        "results": results,
                        "query": query,
                    },
                    "ui_data": {
                        "searchQuery": query,
                        "answer": answer,
                        "results": results[:5],  # Top 5 for UI
                        "resultCount": len(results),
                    },
                    "response_text": self._format_response_text(answer, results),
                }

        except httpx.HTTPStatusError as e:
            print(f"[SearchService] HTTP error: {e.response.status_code}")
            return self._get_error_response(query, str(e))
        except Exception as e:
            print(f"[SearchService] Error: {e}")
            return self._get_error_response(query, str(e))

    def _format_response_text(self, answer: str, results: List[dict]) -> str:
        """Format search results as text for TTS."""
        if answer:
            return answer
        
        if results:
            # Summarize top results
            summaries = []
            for r in results[:3]:
                summaries.append(f"{r['title']}: {r['snippet'][:100]}")
            return "Here's what I found: " + " ".join(summaries)
        
        return "I couldn't find any relevant results for that search."

    def _get_mock_results(self, query: str) -> dict:
        """Return mock results when Tavily API key is not configured."""
        print("[SearchService] Using mock results - Tavily API key not configured")
        
        mock_results = [
            {
                "title": f"Search result for: {query}",
                "url": "https://example.com",
                "snippet": "This is a mock search result. Configure TAVILY_API_KEY for real results.",
                "score": 0.9,
            }
        ]
        
        return {
            "success": True,
            "response_data": {
                "answer": f"I found some information about '{query}'. Please configure the Tavily API for real search results.",
                "results": mock_results,
                "query": query,
            },
            "ui_data": {
                "searchQuery": query,
                "answer": "Mock search - configure TAVILY_API_KEY for real results",
                "results": mock_results,
                "resultCount": 1,
            },
            "response_text": f"I'd search for '{query}' but my search API isn't configured yet.",
            "_mock": True,
        }

    def _get_error_response(self, query: str, error: str) -> dict:
        """Return error response."""
        return {
            "success": False,
            "error": error,
            "response_data": {
                "answer": None,
                "results": [],
                "query": query,
            },
            "ui_data": None,
            "response_text": f"I had trouble searching for that. Error: {error}",
        }


# Singleton instance
_search_service: Optional[SearchService] = None


def get_search_service() -> SearchService:
    """Get the singleton search service instance."""
    global _search_service
    if _search_service is None:
        _search_service = SearchService()
    return _search_service
