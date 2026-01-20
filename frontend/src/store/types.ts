import type { CommandHistory, ActionWidgets } from '@/entities';

export interface BackendNLUResponse {
  intent: string;
  slots: Record<string, any>;
  response: string;
  action: string;
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