from typing import Any, Literal, Optional
from pydantic import BaseModel, Field
from datetime import datetime


# Action Types - JSON-like structure for different intents

class WeatherAction(BaseModel):
    """Action data for weather-related intents."""

    type: Literal["weather"] = "weather"
    location: Optional[str] = None
    datetime: Optional[str] = None
    temperature: Optional[float] = None
    condition: Optional[str] = None
    humidity: Optional[int] = None
    wind_speed: Optional[float] = None
    visibility: Optional[float] = None
    forecast: Optional[list[dict[str, Any]]] = None


class MusicAction(BaseModel):
    """Action data for music-related intents."""

    type: Literal["music"] = "music"
    command: Optional[Literal["play", "pause", "skip", "previous", "stop"]] = None
    artist: Optional[str] = None
    song: Optional[str] = None
    genre: Optional[str] = None
    playlist: Optional[str] = None
    current_track: Optional[dict[str, Any]] = None
    queue: Optional[list[dict[str, Any]]] = None


class IoTAction(BaseModel):
    """Action data for IoT/smart home intents."""

    type: Literal["iot"] = "iot"
    command: Optional[Literal["on", "off", "set", "toggle"]] = None
    device_name: Optional[str] = None
    room: Optional[str] = None
    color: Optional[str] = None
    brightness: Optional[int | str] = None 
    devices: Optional[list[dict[str, Any]]] = None


class GeneralAction(BaseModel):
    """Action data for general/fallback intents."""

    type: Literal["general"] = "general"
    message: Optional[str] = None


# Union type for all actions
ActionData = WeatherAction | MusicAction | IoTAction | GeneralAction


# Conversation Turn

class Turn(BaseModel):
    """A single turn in the conversation history."""

    role: Literal["user", "assistant"]
    text: str
    timestamp: datetime = Field(default_factory=datetime.now)
    intent: Optional[str] = None
    slots: Optional[dict[str, Any]] = None


# Classification Result (from Modal)

class ClassificationResult(BaseModel):
    """Normalized classification result from Modal classifier."""

    intent: Optional[str] = None
    confidence: float = 0.0
    slots: dict[str, Any] = Field(default_factory=dict)
    entities: list[dict[str, Any]] = Field(default_factory=list)
    needs_clarification: bool = False
    candidates: list[dict[str, Any]] = Field(default_factory=list)


# WebSocket Message Schemas

class ClientMessage(BaseModel):
    """Message received from frontend via WebSocket."""

    text: Optional[str] = None
    audio: Optional[str] = None  # base64 encoded audio
    meta: Optional[dict[str, Any]] = None


class AssistantResponse(BaseModel):
    """Response sent to frontend via WebSocket."""

    response: str
    ui_mode: str = "ai_response"  # weather, music, smart_home, ai_response
    ui_data: Optional[dict[str, Any]] = None
    action: Optional[ActionData] = None
    state: Literal["awaiting_info", "processing", "completed", "error"] = "completed"
    needs_more_info: bool = False
    follow_up_question: Optional[str] = None
    intent: Optional[str] = None
    confidence: Optional[float] = None
    slots: dict[str, Any] = Field(default_factory=dict)
