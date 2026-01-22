from typing import TypedDict


class SlotDefinition(TypedDict):
    """Definition for intent slot requirements."""

    required: list[str]
    optional: list[str]


# Intent Slot Definitions

INTENT_SLOTS: dict[str, SlotDefinition] = {
    # Weather - location optional (will use default if not provided)
    "weather_query": {
        "required": [],
        "optional": ["location", "datetime"],
    },
    # Music
    "play_music": {
        "required": [],
        "optional": ["artist", "song", "genre", "playlist"],
    },
    "play_radio": {
        "required": [],
        "optional": ["station", "genre"],
    },
    "play_podcasts": {
        "required": [],
        "optional": ["podcast_name", "episode"],
    },
    "play_audiobook": {
        "required": [],
        "optional": ["book_name", "author"],
    },
    # IoT - Lights (device_name optional, can infer from room/context)
    "iot_hue_lighton": {
        "required": [],
        "optional": ["device_name", "room"],
    },
    "iot_hue_lightoff": {
        "required": [],
        "optional": ["device_name", "room"],
    },
    "iot_hue_lightchange": {
        "required": [],
        "optional": ["device_name", "color", "room", "brightness"],
    },
    "iot_hue_lightup": {
        "required": [],
        "optional": ["device_name", "room", "brightness"],
    },
    "iot_hue_lightdim": {
        "required": [],
        "optional": ["device_name", "room", "brightness"],
    },
    # IoT - Other
    "iot_wemo_on": {
        "required": [],
        "optional": ["device_name", "room"],
    },
    "iot_wemo_off": {
        "required": [],
        "optional": ["device_name", "room"],
    },
    "iot_coffee": {
        "required": [],
        "optional": ["strength", "size"],
    },
    "iot_cleaning": {
        "required": [],
        "optional": ["room", "mode"],
    },
    # General intents (no slots required)
    "general_greet": {"required": [], "optional": []},
    "general_joke": {"required": [], "optional": []},
    "general_quirky": {"required": [], "optional": []},
}


# Slot Questions

SLOT_QUESTIONS: dict[str, str] = {
    # Location/Place
    "location": "What city would you like the weather for?",
    "room": "Which room?",
    # Device
    "device_name": "Which device would you like to control?",
    # Time
    "datetime": "For what date and time?",
    # Music
    "artist": "Which artist would you like to listen to?",
    "song": "Which song would you like to play?",
    "genre": "What genre of music would you like?",
    "playlist": "Which playlist would you like to play?",
    "station": "Which radio station?",
    "podcast_name": "Which podcast would you like to listen to?",
    "book_name": "Which audiobook would you like?",
    # IoT
    "color": "What color would you like?",
    "brightness": "What brightness level? (0-100)",
    "strength": "What coffee strength would you prefer?",
    "size": "What size cup?",
    "mode": "Which cleaning mode?",
}



# Intent Categories (for grouping)

WEATHER_INTENTS = {"weather_query"}

MUSIC_INTENTS = {"play_music", "play_radio", "play_podcasts", "play_audiobook"}

IOT_INTENTS = {
    "iot_hue_lighton",
    "iot_hue_lightoff",
    "iot_hue_lightchange",
    "iot_hue_lightup",
    "iot_hue_lightdim",
    "iot_wemo_on",
    "iot_wemo_off",
    "iot_coffee",
    "iot_cleaning",
}

GENERAL_INTENTS = {"general_greet", "general_joke", "general_quirky"}
