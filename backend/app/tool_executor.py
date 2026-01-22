import json
from typing import Any, Dict
from app.services.weather_service import WeatherService
from app.services.music_service import MusicService
from app.services.iot_service import IoTService
from app.services.search_service import SearchService


class ToolExecutor:
    """Executes tool calls and returns results for LLM consumption."""

    def __init__(self):
        self.weather = WeatherService()
        self.music = MusicService()
        self.iot = IoTService()
        self.search = SearchService()

    async def execute(self, tool_name: str, args: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a tool call and return structured result.
        
        Args:
            tool_name: Name of the tool to execute
            args: Arguments for the tool
            
        Returns:
            Dict with response_data (for LLM), ui_data (for frontend), and response_text
        """
        # print(f"[ToolExecutor] Executing {tool_name} with args: {args}")
        
        try:
            if tool_name == "get_weather":
                return await self._execute_weather(args)
            elif tool_name == "play_music":
                return await self._execute_music(args)
            elif tool_name == "control_device":
                return await self._execute_device(args)
            elif tool_name == "web_search":
                return await self._execute_search(args)
            else:
                return {
                    "success": False,
                    "error": f"Unknown tool: {tool_name}",
                    "response_data": {"error": f"Unknown tool: {tool_name}"},
                    "ui_data": None,
                    "response_text": f"I don't know how to use the tool '{tool_name}'.",
                }
        except Exception as e:
            print(f"[ToolExecutor] Error executing {tool_name}: {e}")
            return {
                "success": False,
                "error": str(e),
                "response_data": {"error": str(e)},
                "ui_data": None,
                "response_text": f"There was an error: {str(e)}",
            }

    async def _execute_weather(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Execute weather tool."""
        location = args.get("location", "")
        if not location:
            return {
                "success": False,
                "error": "Location is required",
                "response_data": {"error": "No location provided"},
                "ui_data": None,
                "response_text": "I need a location to check the weather.",
            }

        result = await self.weather.get_weather(location)
        
        if result.get("error"):
            return {
                "success": False,
                "error": result["error"],
                "response_data": result,
                "ui_data": None,
                "response_text": f"Couldn't get weather for {location}.",
            }

        # Format for LLM consumption (concise)
        response_data = {
            "location": result.get("location", location),
            "temperature": result.get("temperature"),
            "condition": result.get("condition"),
            "humidity": result.get("humidity"),
            "wind": result.get("wind"),
            "forecast": result.get("forecast", [])[:3],  # 3-day forecast
        }

        return {
            "success": True,
            "response_data": response_data,
            "ui_data": result,  # Full data for UI widget
            "response_text": result.get("response_text", ""),
        }

    async def _execute_music(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Execute music tool."""
        song = args.get("song")
        artist = args.get("artist")
        query = args.get("query")

        # Build search query
        search_query = ""
        if song and artist:
            search_query = f"{song} by {artist}"
        elif song:
            search_query = song
        elif artist:
            search_query = f"songs by {artist}"
        elif query:
            search_query = query
        else:
            return {
                "success": False,
                "error": "Need song, artist, or query",
                "response_data": {"error": "No search criteria provided"},
                "ui_data": None,
                "response_text": "What would you like me to play?",
            }

        try:
            result = await self.music.search(search_query)
        except Exception as e:
            print(f"[ToolExecutor] Music search error: {e}")
            return {
                "success": False,
                "error": str(e),
                "response_data": {"error": "Music search failed"},
                "ui_data": None,
                "response_text": f"Couldn't find music for '{search_query}'.",
            }
        
        # MusicService returns: {title, artist, album, duration, videoId, thumbnailUrl, playlist}
        # Check if we have a valid result with videoId
        if not result.get("videoId"):
            return {
                "success": False,
                "error": "No results found",
                "response_data": {"error": "No music found"},
                "ui_data": None,
                "response_text": f"Couldn't find music for '{search_query}'.",
            }

        # Build response data for LLM
        response_data = {
            "now_playing": {
                "title": result.get("title", "Unknown"),
                "artist": result.get("artist", "Unknown Artist"),
                "album": result.get("album"),
                "duration": result.get("duration"),
                "videoId": result.get("videoId"),
            },
            "queue": result.get("playlist", [])
        }

        return {
            "success": True,
            "response_data": response_data,
            "ui_data": result,  # Full data for MusicWidget
            "response_text": f"Playing {result.get('title', 'music')} by {result.get('artist', 'Unknown')}",
        }

    async def _execute_device(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Execute device control tool."""
        action = args.get("action")
        device_name = args.get("device_name")
        room = args.get("room")
        brightness = args.get("brightness")
        color = args.get("color")

        if not action:
            return {
                "success": False,
                "error": "Action is required",
                "response_data": {"error": "No action specified"},
                "ui_data": None,
                "response_text": "What would you like me to do with the device?",
            }

        # Build device identifier - combine device_name and room for better matching
        device_id = device_name or room or "lights"

        # Map LLM action to IoT service action
        iot_action = "toggle"
        value = None
        
        if action == "turn_on":
            iot_action = "on"
        elif action == "turn_off":
            iot_action = "off"
        elif action == "set_brightness":
            iot_action = "set"
            value = brightness or 50
        elif action == "set_color":
            iot_action = "set"

        # Call the actual IoT service method
        result = await self.iot.control_device(
            device_name=device_id,
            action=iot_action,
            value=value,
            color=color,
        )
        
        # Format response
        action_text = {
            "turn_on": "turned on",
            "turn_off": "turned off",
            "set_brightness": f"set to {brightness}% brightness",
            "set_color": f"changed to {color}",
        }.get(action, "updated")

        response_text = f"Done! {device_id} has been {action_text}."

        # Build UI data from result
        ui_data = {
            "devices": result.get("devices", [])
        }

        return {
            "success": not result.get("error", False),
            "response_data": {
                "action": action,
                "device": device_id,
                "result": "success" if not result.get("error") else "error",
                "results": result.get("results", []),
            },
            "ui_data": ui_data,
            "response_text": response_text if not result.get("error") else result.get("message", "Failed to control device"),
        }

    async def _execute_search(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Execute web search tool."""
        query = args.get("query", "")
        if not query:
            return {
                "success": False,
                "error": "Query is required",
                "response_data": {"error": "No search query provided"},
                "ui_data": None,
                "response_text": "What would you like me to search for?",
            }

        result = await self.search.search(query)
        return result


# Singleton instance
_tool_executor: ToolExecutor | None = None


def get_tool_executor() -> ToolExecutor:
    """Get the singleton tool executor instance."""
    global _tool_executor
    if _tool_executor is None:
        _tool_executor = ToolExecutor()
    return _tool_executor
