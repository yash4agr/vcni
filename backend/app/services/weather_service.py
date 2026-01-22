import httpx
from typing import Optional
from app.config import get_settings


class WeatherService:
    """Service for fetching weather data from WeatherAPI.com."""

    BASE_URL = "http://api.weatherapi.com/v1"
    TIMEOUT = 10.0

    def __init__(self):
        self.settings = get_settings()

    async def get_weather(self, location: str) -> dict:
        """
        Fetch current weather and forecast for a location.
        
        Args:
            location: City name, zip code, or lat,lon coordinates
            
        Returns:
            Weather data formatted for the frontend WeatherWidget
        """
        # Return mock data if no API key configured or if using placeholder
        if not self.settings.weatherapi_key or "your_weatherapi_key" in self.settings.weatherapi_key:
            assert False, "WeatherAPI key not configured"

        try:
            async with httpx.AsyncClient(timeout=self.TIMEOUT) as client:
                # Get current weather and 4-day forecast
                response = await client.get(
                    f"{self.BASE_URL}/forecast.json",
                    params={
                        "key": self.settings.weatherapi_key,
                        "q": location,
                        "days": 4,
                        "aqi": "no",
                        "alerts": "no",
                    }
                )
                response.raise_for_status()
                data = response.json()

            return self._format_weather_response(data)

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 400:
                # Location not found
                return {
                    "error": True,
                    "message": f"Could not find weather data for '{location}'",
                    "temperature": 0,
                    "condition": "Unknown",
                    "location": location,
                }
            raise
        except Exception as e:
            # Fallback to mock data on any error
            print(f"[WeatherService] Error fetching weather: {e}")
            assert False, "WeatherAPI key not configured"

    def _format_weather_response(self, data: dict) -> dict:
        """Format WeatherAPI response to match frontend widget expectations."""
        current = data.get("current", {})
        location_data = data.get("location", {})
        forecast_days = data.get("forecast", {}).get("forecastday", [])

        # Map condition to icon type
        condition_code = current.get("condition", {}).get("code", 1000)
        icon = self._get_icon_for_condition(condition_code)

        # Format forecast (3 days) - use metric units
        forecast = []
        for day in forecast_days[:3]:
            day_data = day.get("day", {})
            forecast.append({
                "day": self._get_day_name(day.get("date", "")),
                "high": round(day_data.get("maxtemp_c", 0)),
                "low": round(day_data.get("mintemp_c", 0)),
                "icon": self._get_icon_for_condition(
                    day_data.get("condition", {}).get("code", 1000)
                ),
            })

        # Use metric units: Celsius, km/h, km
        return {
            "temperature": round(current.get("temp_c", 20)),
            "condition": current.get("condition", {}).get("text", "Unknown"),
            "humidity": current.get("humidity", 0),
            "windSpeed": round(current.get("wind_kph", 0)),
            "visibility": round(current.get("vis_km", 10)),
            "location": f"{location_data.get('name', '')}, {location_data.get('region', '')}",
            "feelsLike": round(current.get("feelslike_c", 20)),
            "forecast": forecast,
            "icon": icon,
            "iconUrl": f"https:{current.get('condition', {}).get('icon', '')}",
        }

    def _get_icon_for_condition(self, code: int) -> str:
        """Map WeatherAPI condition codes to frontend icon types."""
        # Sunny/Clear
        if code == 1000:
            return "sun"
        # Cloudy conditions
        elif code in [1003, 1006, 1009]:
            return "cloud"
        # Rainy/Drizzle conditions
        elif code in [1063, 1180, 1183, 1186, 1189, 1192, 1195, 1240, 1243, 1246]:
            return "rain"
        # Snow conditions
        elif code in [1066, 1114, 1210, 1213, 1216, 1219, 1222, 1225, 1255, 1258]:
            return "snow"
        # Thunderstorm
        elif code in [1087, 1273, 1276, 1279, 1282]:
            return "storm"
        # Default to cloud
        else:
            return "cloud"

    def _get_day_name(self, date_str: str) -> str:
        """Convert date string to day abbreviation."""
        from datetime import datetime
        try:
            date = datetime.strptime(date_str, "%Y-%m-%d")
            return date.strftime("%a")
        except:
            return "N/A"

    def generate_response(self, weather_data: dict, location: str) -> str:
        """Generate a natural language response for the weather."""
        if weather_data.get("error"):
            return weather_data.get("message", "I couldn't find weather for that location.")

        temp = weather_data.get("temperature", 0)
        condition = weather_data.get("condition", "unknown")
        loc = weather_data.get("location", location)

        return f"The weather in {loc} is currently {temp}°C and {condition.lower()}."
