from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx

from .config import get_settings
from .models import AssistantResponse
from .controller import get_controller
from .classifier_client import get_classifier_client
from .state_store import get_context_manager


# Request/Response Models

class NLURequest(BaseModel):
    """Request body for NLU processing."""

    text: str
    context: dict[str, Any] | None = None
    user_id: str = "anonymous"


class TokenResponse(BaseModel):
    """Response for AssemblyAI token."""

    token: str


# Lifespan Events

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    print("Starting up...")
    yield
    # Shutdown
    print("Shutting down...")
    # Close classifier client
    classifier = get_classifier_client()
    await classifier.close()
    # Cleanup old contexts
    context_manager = get_context_manager()
    context_manager.cleanup_old_contexts()



# FastAPI App

settings = get_settings()

app = FastAPI(
    title="VCNI Assistant API",
    description="Conversational AI assistant backend with multi-turn support",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health Check

@app.get("/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "healthy"}


@app.get("/")
async def root() -> dict[str, str]:
    """Root endpoint."""
    return {"message": "VCNI Assistant API", "docs": "/docs"}


# AssemblyAI Token Endpoint

@app.get("/api/assemblyai/token")
async def get_assemblyai_token() -> TokenResponse:
    """
    Get a temporary AssemblyAI token for real-time transcription.

    The frontend uses this token to connect directly to AssemblyAI's
    WebSocket for real-time speech-to-text.
    """
    api_key = settings.assemblyai_api_key

    if not api_key:
        raise HTTPException(
            status_code=500, detail="AssemblyAI API key not configured"
        )

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://streaming.assemblyai.com/v3/token",
                headers={"authorization": api_key},
                params={
                    "expires_in_seconds": 600, # 10 minutes
                    "max_session_duration_seconds": 1800 # 30 minutes
                },
            )
            response.raise_for_status()
            data = response.json()
            return TokenResponse(token=data["token"])

    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"Failed to get AssemblyAI token: {e.response.text}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get AssemblyAI token: {str(e)}"
        )


# NLU Processing Endpoint

@app.post("/api/nlu/process")
async def process_nlu(body: NLURequest) -> dict[str, Any]:
    """
    Process user text input through the NLU pipeline.

    This endpoint:
    1. Classifies the intent using the Modal-deployed classifier
    2. Manages conversation context for multi-turn dialogues
    3. Handles slot filling for incomplete intents
    4. Executes intent handlers and returns structured responses

    Args:
        body: NLURequest containing text, optional context, and user_id

    Returns:
        AssistantResponse with ui_mode, ui_data, response, and state
    """
    if not body.text.strip():
        return {
            "intent": None,
            "slots": {},
            "response": "No text provided.",
            "ui_mode": "ai_response",
            "state": "error",
            "confidence": 0.0,
        }

    controller = get_controller()
    response = await controller.process_input(body.user_id, body.text)

    # Convert to dict for JSON response
    return response.model_dump()


# TTS Streaming Endpoint

class TTSRequest(BaseModel):
    """Request body for TTS."""

    text: str
    speaker: str = "moon"


@app.post("/api/tts/stream")
async def stream_tts(body: TTSRequest):
    """
    Stream TTS audio from Rime API.
    
    This endpoint proxies the Rime TTS API to keep the API key server-side.
    Returns streaming PCM audio (16-bit little-endian, 16kHz).
    """
    from fastapi.responses import StreamingResponse
    
    api_key = settings.rime_api_key
    
    if not api_key:
        raise HTTPException(
            status_code=500, detail="Rime API key not configured"
        )
    
    async def stream_audio():
        """Generator that streams audio chunks from Rime."""
        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                "https://users.rime.ai/v1/rime-tts",
                headers={
                    "Accept": "audio/pcm",
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "speaker": body.speaker,
                    "text": body.text,
                    "modelId": "mistv2",
                    "lang": "eng",
                    "samplingRate": 16000,
                    "speedAlpha": 1.0,
                    "noTextNormalization": False,
                },
                timeout=30.0,
            ) as response:
                if response.status_code != 200:
                    error_text = await response.aread()
                    raise HTTPException(
                        status_code=response.status_code,
                        detail=f"Rime API error: {error_text.decode()}"
                    )
                
                # Stream chunks as they arrive
                async for chunk in response.aiter_bytes():
                    yield chunk
    
    return StreamingResponse(
        stream_audio(),
        media_type="audio/pcm",
        headers={
            "X-Sample-Rate": "16000",
            "X-Bit-Depth": "16",
            "X-Channels": "1",
        }
    )

