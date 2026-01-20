import { create } from 'zustand';
import { BaseCrudService } from '@/integrations';
import type { CommandHistory, ActionWidgets } from '@/entities';
import { VoiceClient } from './VoiceClient';
import { TTSService } from './TTSService';
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
      // Fetch Token
      const res = await fetch('/api/assemblyai/token');
      const data = await res.json();

      // const data = { token: 'AQICAHhSP--gzqwd67dd_jPEAiXH4o-iox25DgpL8nRLgcJP4QGHJhhtIazEyB9K_B1Efl-ZAAAGRjCCBkIGCSqGSIb3DQEHBqCCBjMwggYvAgEAMIIGKAYJKoZIhvcNAQcBMB4GCWCGSAFlAwQBLjARBAws_P8OMVXaYzZ0bCQCARCAggX51AQfGbDModpw_fJ1dOhzdYR4h2xswAqNX6uLWZ91GZB7QqkwNDEa_Y0FxQKHPJi0nnTLMALs-FVbA66mPlvU2xPZs3e2FBykrQAMgyImammiNhtLKxSjSFZIoOy6obdZ_6PFEavoh2viThpRcUm_0REBrR42TkLqU9KK8PyWHJ-KZWGDy1kXHXU-5qed-xsL_ICqDu3xtpXReqp0iDvKGUsmrsFmXtLSwCaQZD_XCoirXkkjS_NeOwXtAWtCUUkMJQrXvXtdB8eJYNmc6LKPyQQh9wCP_BhifDL9rYu6Javg_G2yGFDfqNSYhHKjVAjFYxF6KteNzYlo6KZDDSKsA2g0Ij8zHELfjga_xfLMZvoSSfTacDxZbl5fJ-x4Fw27B3SLV4KEkg54i5wJ8DPx80s0vZ6WTCHwor1QDoTYdRfNF1hpczCaacmUxkMy7KbHaQl7xcZdZ0LeePjBRyeVOEuOQr3d3psZ8t-_wOIpspbecYNY7CQcYvkgMUfKAxla3owE12wZGrNWz6Ango8X2JTlKjHGc2nS_jHtEQGwn2BEb7TCKo7JHZH16v6e94WgpkFOvYQWmGwtmSkkmRHJACSQRTzo6hiIJew8WDC0qtRx-NRUQZKsHl_-uXsqgKur0iYgECF-T4Jme91pGQ5Vg7CIpuKyAS99KG1mwU_IQbcI1KRTE7VCt_JHb0AFjR1BaHFblbshThWBvH5DKslUwq1t4xXHk3CmZ9ZIRbbEvIXT-WZHfE5CHSlbqyuCdtyiNhNHhs72drfknGLp3esbDiz0FuOg1QXub9uwTBXX1dB0nXP-GBizMBnGvzOAdjmDjfsnf5wj45bOYNrbDzoAZFY-L90DCJcYzoPS2ajxQRTTMQ6PPNogXjQsKG87keT-nyVj68BAHNkgeXllReNelVS_THMnm-QIzPx-UxcBmX5XQJ68yvzY4IoDo6EFE4m4fk6X2ACuuGTTYtvMZgSwr0Xp3FP0f89UMLynUZCzawwnmdzo-zbvlH43g6PFgGDyRqAGbVR-Xt9TMfogg293EilNJAuFILBI-3cfJLq4cZdbqAIqNUbvWZb4nf8wSCq3hKmY20yde0YU5rx5IVN7_CdRRdoLwBLGW2rlC7XUI1cnvRKtuitNf2Ey3Oq5Wz0oRBWmco1whNbXJXs3SBBZ1Ti9D6trZ2zk5XT1z2yLQi-gJhJnpQ8pEVLCghi9A2cTGUILN8vHLudVjBHl0gPM44OiDrmTYOWwj8WoZYynLe-BkpmsFusn0lJdjKDKPCPKFlNktU0_dS2t3pEfOclaLdZS11lP9pIbuWmTvl-bZnUkCQQ5nAhICqDChAUVpnWg-6Q7-XoIOk9yxMFhKEXWTO7zF92ho4kBmExvihf965p4Hfnx4JAbY7Qzw7l3quPoSyrl6WvqYD5gMfnScHePA6kOqV4ggYDFkITEpQnAwHxDULDryhOGyovF0h6reIN8Ykfl4PVywFoAjEwpkNuqu7G-Swb73u1Ideljrs7ICwpt-6916Cgjuyw8a4eSEcXpcS_KWKCdf0H7zweSt-ixGpm3Pl25ypPGiNfLzeoHfa2OZAmphFgV9HdDoMqsMlr5DIyFEahTLRChVX6tn9TcUiusBrbEMKNm8DDkdRAp4-xEZzwjrnsXdnXnGXnHri2tP7hCpG-1_HYF2XXclkMrbmyahbkukZHScqip1QsRVeBk3otdUZBWi-pkzwq1SzDV2T5vYHomGumRtzg7ZkM7kqWY0jbks6HTSKdUAfTvhfKVndlX_VBeX4MwDPgQ8G9jmn9echIQCngMO8OBkUXOaTd0Ccr-l3lbLsgJyqK84IhaUdWJaY1Q5odhsBmqYZZ_iJm7njAtnqGwslERhJE4ciixEkS1yw5036QLt3L1h8b-XFTJt6uKDRKs3RKkStt76_pmWGRTNa4UKdj4SAlS9jXduRd0Ht6lMaJC8BH1AQTkYI9pwJZr2_q4zkf5eD4Dxwe--Yn1ohBwvWr1T4m9aLPOKaA9OXmNxFZzX0F2v2CD81vKMAeoBdc' };
      
      // Connect
      await voiceClient.connect(data.token);
    } catch (err) {
      console.error('[Store] Failed to start:', err);
      set({ isListening: false });
    }
  },

  stopListening: () => {
    voiceClient?.disconnect();
    voiceClient = null;
    
    // Cleanup Timeouts
    if (bufferTimeout) clearTimeout(bufferTimeout);
    if (inactivityTimeout) clearTimeout(inactivityTimeout);
    if (sessionTimeout) clearTimeout(sessionTimeout);
    
    set({ isListening: false });
  },

  // --- Command Processing ---
  processCommand: async (text: string, skipDuplicateCheck = false) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!skipDuplicateCheck && trimmed === get().lastProcessedTranscript) return;

    set({ lastProcessedTranscript: trimmed });
    
    // Mock NLU / Backend Call (Move actual fetch here if preferred)
    // For now, keeping your structure
    try {
       const response = await fetch('/api/nlu/process', {
         method: 'POST',
         body: JSON.stringify({ text: trimmed, context: get().conversationContext })
       });
       const nluResult: BackendNLUResponse = await response.json();

      // const nluResult: BackendNLUResponse = {
      //   intent: 'test',
      //   response: 'Hello Yash, this is a test response',
      //   confidence: 1,
      //   slots: {},
      //   action: 'test',
      // };
       set({ detectedIntent: nluResult.intent, lastNLUResult: nluResult });
       
       if (nluResult.response) get().speak(nluResult.response);
       
       // Update History
       const entry = {
         _id: crypto.randomUUID(),
         commandText: trimmed,
         detectedIntent: nluResult.intent,
         processedAt: new Date(),
         status: 'completed',
         actionResult: nluResult.response
       } as CommandHistory;
       
       set(s => ({ commandHistory: [entry, ...s.commandHistory] }));
       
    } catch (err) {
       console.error('[Store] NLU Error:', err);
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