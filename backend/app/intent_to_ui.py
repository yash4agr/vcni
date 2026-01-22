from .intent_slots import WEATHER_INTENTS, MUSIC_INTENTS, IOT_INTENTS, GENERAL_INTENTS

# UI Mode Constants

UI_MODE_WEATHER = "weather"
UI_MODE_MUSIC = "music"
UI_MODE_SMART_HOME = "smart_home"
UI_MODE_AI_RESPONSE = "ai_response"



# Intent to UI Mode Mapping

def get_ui_mode(intent: str | None) -> str:
    """
    Get the UI mode for a given intent.

    Args:
        intent: The classified intent string

    Returns:
        UI mode string for the frontend widget
    """
    if intent is None:
        return UI_MODE_AI_RESPONSE

    if intent in WEATHER_INTENTS:
        return UI_MODE_WEATHER

    if intent in MUSIC_INTENTS:
        return UI_MODE_MUSIC

    if intent in IOT_INTENTS:
        return UI_MODE_SMART_HOME

    if intent in GENERAL_INTENTS:
        return UI_MODE_AI_RESPONSE

    # Default fallback
    return UI_MODE_AI_RESPONSE



# Direct Mapping (for explicit lookups)

INTENT_TO_UI_MODE: dict[str, str] = {
    # Weather
    "weather_query": UI_MODE_WEATHER,
    # Music
    "play_music": UI_MODE_MUSIC,
    "play_radio": UI_MODE_MUSIC,
    "play_podcasts": UI_MODE_MUSIC,
    "play_audiobook": UI_MODE_MUSIC,
    # IoT
    "iot_hue_lighton": UI_MODE_SMART_HOME,
    "iot_hue_lightoff": UI_MODE_SMART_HOME,
    "iot_hue_lightchange": UI_MODE_SMART_HOME,
    "iot_hue_lightup": UI_MODE_SMART_HOME,
    "iot_hue_lightdim": UI_MODE_SMART_HOME,
    "iot_wemo_on": UI_MODE_SMART_HOME,
    "iot_wemo_off": UI_MODE_SMART_HOME,
    "iot_coffee": UI_MODE_SMART_HOME,
    "iot_cleaning": UI_MODE_SMART_HOME,
    # General
    "general_greet": UI_MODE_AI_RESPONSE,
    "general_joke": UI_MODE_AI_RESPONSE,
    "general_quirky": UI_MODE_AI_RESPONSE,
}
