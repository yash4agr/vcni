import type { CommandHistory, ActionWidgets } from '@/entities';

// Action Types - JSON-like structure for different intents

export interface WeatherAction {
  type: 'weather';
  location?: string;
  datetime?: string;
  temperature?: number;
  condition?: string;
  humidity?: number;
  wind_speed?: number;
  visibility?: number;
  forecast?: Array<{
    day: string;
    high: number;
    low: number;
    icon: string;
  }>;
}

export interface MusicAction {
  type: 'music';
  command?: 'play' | 'pause' | 'skip' | 'previous' | 'stop';
  artist?: string;
  song?: string;
  genre?: string;
  playlist?: string;
  current_track?: {
    title: string;
    artist: string;
    album?: string;
    albumArt?: string;
    duration?: number;
  };
  queue?: Array<{
    title: string;
    artist: string;
    duration?: string;
  }>;
}

export interface IoTAction {
  type: 'iot';
  command?: 'on' | 'off' | 'change' | 'dim' | 'brighten';
  device_name?: string;
  room?: string;
  color?: string;
  brightness?: number;
  devices?: Array<{
    id: number;
    name: string;
    type: string;
    status: boolean;
    value?: number;
    room?: string;
    color?: string;
  }>;
}

export interface GeneralAction {
  type: 'general';
  message?: string;
}

export type ActionData = WeatherAction | MusicAction | IoTAction | GeneralAction;

// Backend NLU Response
export type AssistantState = 'awaiting_info' | 'processing' | 'completed' | 'error';

export interface BackendNLUResponse {
  intent: string;
  slots: Record<string, any>;
  response: string;

  // New fields for UI mode and data
  ui_mode?: 'weather' | 'music' | 'smart_home' | 'ai_response';
  ui_data?: Record<string, any>;
  action?: ActionData;
  state?: AssistantState;
  needs_more_info?: boolean;
  follow_up_question?: string;

  // Legacy fields (kept for compatibility)
  followup?: {
    required: boolean;
    question: string;
    context: string;
  };
  confidence: number;
}

export interface ConversationContext {
  lastIntent: string | null;
  lastSlots: Record<string, any>;
  lastCommand: string | null;
  awaitingFollowup: boolean;
  followupContext?: string;
}

export interface VoiceState {
  // Voice input
  isListening: boolean;
  currentTranscript: string;
  lastProcessedTranscript: string;

  // Voice output
  isSpeaking: boolean;
  voiceResponse: string;

  // NLU & execution
  detectedIntent: string | null;
  lastNLUResult: BackendNLUResponse | null;
  conversationContext: ConversationContext;

  // History
  commandHistory: CommandHistory[];
  actionWidgets: ActionWidgets[];
  isLoadingHistory: boolean;
  isLoadingWidgets: boolean;

  // Methods
  startListening: () => Promise<void>;
  stopListening: () => void;
  speak: (text: string) => void;
  stopSpeaking: () => void;
  processCommand: (text: string, skipDuplicateCheck?: boolean) => Promise<void>;
  loadCommandHistory: () => Promise<void>;
  loadActionWidgets: () => Promise<void>;
}