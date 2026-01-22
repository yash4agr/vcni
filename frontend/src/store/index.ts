import { create } from 'zustand';
import { BaseCrudService } from '@/integrations';
import type { CommandHistory, ActionWidgets } from '@/entities';
import { VoiceClient } from './VoiceClient';
import { TTSService } from './TTSService';
import { tokenManager } from './TokenManager';
import { VoiceState, BackendNLUResponse, ConversationContext } from './types';

// Constants
const TRANSCRIPT_BUFFER_DELAY = 1000;
const INACTIVITY_TIMEOUT = 30000;
const SESSION_TIMEOUT = 900000;

// Variables outside store to persist between renders
let voiceClient: VoiceClient | null = null;
let bufferTimeout: NodeJS.Timeout | null = null;
let inactivityTimeout: NodeJS.Timeout | null = null;
let sessionTimeout: NodeJS.Timeout | null = null;

// Intent to UI mode mapping for backend intents
function mapIntentToUiMode(intent: string): string {
  // Weather intents
  if (intent === 'weather_query') return 'weather';

  // Music intents
  if (['play_music', 'play_radio', 'play_podcasts', 'play_audiobook'].includes(intent)) {
    return 'music';
  }

  // IoT/Smart Home intents
  if (intent.startsWith('iot_')) return 'smart_home';

  // Default to AI response for everything else
  return 'ai_response';
}

export const useVoiceStore = create<VoiceState>((set, get) => ({
  // --- Initial State ---
  isListening: false,
  currentTranscript: '',
  lastProcessedTranscript: '',
  isSpeaking: false,
  voiceResponse: '',
  detectedIntent: null,
  lastNLUResult: null,
  conversationContext: {
    lastIntent: null,
    lastSlots: {},
    lastCommand: null,
    awaitingFollowup: false,
  },
  commandHistory: [],
  actionWidgets: [],
  isLoadingHistory: false,
  isLoadingWidgets: false,

  // --- TTS Methods ---
  speak: (text: string) => {
    TTSService.speakWithRime(
      text,
      () => set({ isSpeaking: true, voiceResponse: text }),
      () => set({ isSpeaking: false })
    );
  },

  stopSpeaking: () => {
    TTSService.cancel();
    set({ isSpeaking: false });
  },

  // --- Listening Methods ---
  startListening: async () => {
    if (get().isListening) return;

    // Clear old timeouts
    if (bufferTimeout) clearTimeout(bufferTimeout);
    if (inactivityTimeout) clearTimeout(inactivityTimeout);

    // Initialize Client with Callbacks
    voiceClient = new VoiceClient({
      onConnected: () => {
        console.log('[Store] Connected');
        set({ isListening: true, currentTranscript: '' });

        // Start Safety Timeouts
        sessionTimeout = setTimeout(() => get().stopListening(), SESSION_TIMEOUT);
        inactivityTimeout = setTimeout(() => get().stopListening(), INACTIVITY_TIMEOUT);
      },

      onTranscript: (text, isFinal) => {
        // Reset Inactivity Timer
        if (inactivityTimeout) clearTimeout(inactivityTimeout);
        inactivityTimeout = setTimeout(() => get().stopListening(), INACTIVITY_TIMEOUT);

        set({ currentTranscript: text });

        // If Final, buffer and process
        if (isFinal) {
          if (bufferTimeout) clearTimeout(bufferTimeout);
          bufferTimeout = setTimeout(() => {
            get().processCommand(text);
          }, TRANSCRIPT_BUFFER_DELAY);
        }
      },

      onError: (err) => {
        console.error('[Store] Voice Error:', err);
        get().stopListening();
      },

      onDisconnected: () => {
        console.log('[Store] Disconnected');
        set({ isListening: false });
      }
    });

    try {
      // Get token from cache (pre-fetched on page load)
      const token = await tokenManager.getToken();

      // Connect
      await voiceClient.connect(token);
    } catch (err) {
      console.error('[Store] Failed to start:', err);
      // Invalidate cache on error so next attempt fetches fresh
      tokenManager.invalidate();
      set({ isListening: false });
    }
  },

  stopListening: () => {

    // Immediately set state to prevent race conditions
    voiceClient?.disconnect();
    voiceClient = null;
    
    set({ isListening: false, currentTranscript: '' });

    // Cleanup Timeouts
    if (bufferTimeout) clearTimeout(bufferTimeout);
    if (inactivityTimeout) clearTimeout(inactivityTimeout);
    if (sessionTimeout) clearTimeout(sessionTimeout);
  },

  // --- Command Processing ---
  processCommand: async (text: string, skipDuplicateCheck = false) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!skipDuplicateCheck && trimmed === get().lastProcessedTranscript) return;

    set({ lastProcessedTranscript: trimmed });

    // Auto-stop mic while processing
    const wasListening = get().isListening;
    if (wasListening) {
      get().stopListening();
    }

    try {
      const startTime = performance.now();

      const response = await fetch('/api/nlu/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: trimmed,
          context: get().conversationContext,
          user_id: 'default_user' // TODO: Use actual user ID
        })
      });
      const nluResult: BackendNLUResponse = await response.json();

      const endTime = performance.now();
      const responseTimeMs = endTime - startTime;
      const responseTimeSec = (responseTimeMs / 1000).toFixed(2);

      console.log(`[Store] Response time: ${responseTimeSec}s`);

      // Use ui_mode for widget switching, fallback to intent-based mapping
      const uiMode = nluResult.ui_mode || mapIntentToUiMode(nluResult.intent);

      set({
        detectedIntent: uiMode,
        lastNLUResult: nluResult,
        conversationContext: {
          lastIntent: nluResult.intent,
          lastSlots: nluResult.slots || {},
          lastCommand: trimmed,
          awaitingFollowup: nluResult.needs_more_info || false,
          followupContext: nluResult.follow_up_question,
        }
      });

      // Update Widgets if data provided
      if (uiMode && nluResult.ui_data) {
        const newWidget: ActionWidgets = {
          _id: Date.now().toString(),
          widgetType: uiMode,
          displayName: nluResult.intent || 'Unknown Action',
          description: nluResult.response,
          isActive: true,
          configurationJson: JSON.stringify({
            ...nluResult.ui_data,
            responseTime: responseTimeSec  // Add actual response time
          }),
          visualAsset: nluResult.ui_data.visualAsset
        };

        set(s => ({
          // Add new widget and remove old ones of same type to keep list clean
          actionWidgets: [newWidget, ...s.actionWidgets.filter(w => w.widgetType !== uiMode)]
        }));
      }

      if (nluResult.response) get().speak(nluResult.response);

      // Update History
      const entry = {
        _id: crypto.randomUUID(),
        commandText: trimmed,
        detectedIntent: nluResult.intent,
        processedAt: new Date(),
        status: nluResult.state || 'completed',
        actionResult: nluResult.response
      } as CommandHistory;

      set(s => ({ commandHistory: [entry, ...s.commandHistory] }));

      // Auto-restart mic after processing
      setTimeout(() => {
        if (!get().isListening) {
          get().startListening();
        }
      }, 500);

    } catch (err) {
      console.error('[Store] NLU Error:', err);
      // Restart mic on error too
      setTimeout(() => {
        if (!get().isListening) {
          get().startListening();
        }
      }, 500);
    }
  },

  loadCommandHistory: async () => {
    set({ isLoadingHistory: false });
  },

  loadActionWidgets: async () => {
    set({ isLoadingWidgets: true });
    try {
      const res = await BaseCrudService.getAll<ActionWidgets>('actionwidgets', [], { limit: 50 });
      set({ actionWidgets: res.items.filter(w => w.isActive), isLoadingWidgets: false });
    } catch {
      set({ isLoadingWidgets: false });
    }
  }
}));