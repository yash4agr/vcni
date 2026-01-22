# VCNI - Voice Controlled Natural Interface

A conversational AI assistant with multi-turn dialogue, real-time voice input, LLM-powered tool calling, and smart home integration.

## Features

- 🎤 **Real-time Voice Input** - AssemblyAI streaming transcription
- 🧠 **Dual LLM Support** - Groq (qwen3-32b) or Gemini with easy switching
- 🔧 **Tool Calling** - LLM autonomously uses weather, music, IoT, and web search tools
- 🏠 **Smart Home Control** - Voice-controlled lights and devices
- 🎵 **Music Playback** - YouTube Music integration with queue management
- 🌤️ **Weather Queries** - Real-time weather with 3-day forecast
- 🔍 **Web Search** - Tavily-powered search for current information
- 🗣️ **Text-to-Speech** - Rime TTS with low-latency PCM streaming

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│    Backend      │────▶│  Modal Classifier│
│  (Astro/React)  │     │   (FastAPI)     │     │   (XLM-R NLU)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
        │                       ├──▶ Groq/Gemini LLM (Tool Calling)
        │                       ├──▶ WeatherAPI
        │                       ├──▶ YouTube Music API
        │                       ├──▶ Tavily Search API
        │                       └──▶ Rime TTS API
        │
        └──────────────▶ AssemblyAI (Real-time STT)
```

## Quick Start

### Prerequisites

- Docker & Docker Compose
- API Keys: AssemblyAI, Groq, WeatherAPI, (optional) Tavily

### Setup

1. **Clone and configure:**
   ```bash
   git clone <repo-url>
   cd VCNI
   cp .env.example .env
   # Edit .env with your API keys
   ```

2. **Run with Docker:**
   ```bash
   docker compose up --build
   ```

3. **Access:**
   - Frontend: http://localhost:4321
   - Backend API: http://localhost:8000/docs

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ASSEMBLYAI_API_KEY` | Yes | Real-time speech-to-text |
| `GROQ_API_KEY` | Yes* | Groq LLM for tool calling |
| `GEMINI_API_KEY` | Yes* | Google Gemini (alternative LLM) |
| `LLM_PROVIDER` | No | `groq` or `gemini` (default: groq) |
| `WEATHERAPI_KEY` | No | Weather data |
| `TAVILY_API_KEY` | No | Web search |
| `RIME_API_KEY` | No | Text-to-speech |

*At least one LLM provider required

### Switching LLM Providers

```bash
# In .env
LLM_PROVIDER=groq    # Use Groq with tool calling
LLM_PROVIDER=gemini  # Use Gemini
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/assemblyai/token` | Get STT token |
| POST | `/api/nlu/process` | Process text through NLU |
| POST | `/api/tts/stream` | Stream TTS audio |

## Project Structure

```
VCNI/
├── backend/
│   ├── app/
│   │   ├── services/        # Weather, Music, IoT, Groq, Search
│   │   ├── controller.py    # Main orchestration
│   │   ├── tool_executor.py # LLM tool execution
│   │   └── main.py          # FastAPI app
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/api/       # API proxy routes
│   │   ├── store/           # Zustand + VoiceClient
│   │   └── components/      # React widgets
│   └── Dockerfile
├── ML/
│   └── inference/           # Modal classifier
├── docker-compose.yml
└── .env.example
```

## Supported Intents

| Intent | UI Mode | Description |
|--------|---------|-------------|
| `weather_query` | weather | Get weather info |
| `play_music` | music | Play music |
| `iot_hue_*` | smart_home | Control devices |
| `qa_factoid` | ai_response | General questions |
| `general_greet` | ai_response | Greetings |

## License

MIT

