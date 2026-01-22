interface VoiceClientCallbacks {
  onTranscript: (text: string, isFinal: boolean) => void;
  onError: (error: string) => void;
  onConnected: () => void;
  onDisconnected: () => void;
}

export class VoiceClient {
  private socket: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private callbacks: VoiceClientCallbacks;

  // Pre-loaded audio context for faster startup
  private static preloadedContext: AudioContext | null = null;
  private static workletLoaded = false;

  constructor(callbacks: VoiceClientCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Pre-load audio worklet module on page load
   * This eliminates the worklet loading delay when mic is clicked
   */
  static async preload(): Promise<void> {
    if (VoiceClient.workletLoaded) return;

    try {
      console.log('[VoiceClient] Pre-loading audio worklet...');
      VoiceClient.preloadedContext = new AudioContext({ sampleRate: 48000 });
      await VoiceClient.preloadedContext.audioWorklet.addModule('/audio-worklet/assemblyai-processor.js');
      // Suspend to save resources until needed
      await VoiceClient.preloadedContext.suspend();
      VoiceClient.workletLoaded = true;
      console.log('[VoiceClient] Audio worklet pre-loaded');
    } catch (error) {
      console.warn('[VoiceClient] Failed to pre-load worklet:', error);
    }
  }

  async connect(token: string) {
    try {
      // 1. Setup Audio - use preloaded context if available
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const audioTrack = this.mediaStream.getAudioTracks()[0];
      const settings = audioTrack.getSettings();
      const sampleRate = settings.sampleRate || 48000;

      // Use preloaded context or create new one
      if (VoiceClient.preloadedContext && VoiceClient.workletLoaded) {
        console.log('[VoiceClient] Using pre-loaded audio context');
        this.audioContext = VoiceClient.preloadedContext;
        await this.audioContext.resume();
        VoiceClient.preloadedContext = null; // Can only use once
      } else {
        console.log('[VoiceClient] Creating new audio context');
        this.audioContext = new AudioContext({ sampleRate: sampleRate });
        await this.audioContext.audioWorklet.addModule('/audio-worklet/assemblyai-processor.js');
      }

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.workletNode = new AudioWorkletNode(this.audioContext, 'assemblyai-processor');

      // 2. Setup WebSocket
      const params = new URLSearchParams({
        sample_rate: sampleRate.toString(),
        token: token,
      });

      this.socket = new WebSocket(`wss://streaming.assemblyai.com/v3/ws?${params.toString()}`);

      // 3. Wire them together
      this.workletNode.port.onmessage = (event) => {
        if (this.socket?.readyState === WebSocket.OPEN) {
          this.socket.send(event.data);
        }
      };

      this.socket.onopen = () => {
        source.connect(this.workletNode!);
        this.callbacks.onConnected();
      };

      this.socket.onmessage = (event) => this.handleMessage(event);

      this.socket.onerror = (error) => {
        console.error('[VoiceClient] Socket error:', error);
        this.callbacks.onError('WebSocket connection failed');
      };

      this.socket.onclose = () => {
        this.callbacks.onDisconnected();
      };

    } catch (error: any) {
      this.callbacks.onError(error.message || 'Failed to initialize voice client');
      this.disconnect();
    }
  }

  private handleMessage(event: MessageEvent) {
    try {

      const msg = JSON.parse(event.data);
      if (msg.error) {
        console.error('[VOICE:ERROR]', msg.error);
        this.disconnect();
        return;
      }

      const type = msg.message_type || msg.type;

      if (type === 'Turn' && msg.transcript) {
        this.callbacks.onTranscript(msg.transcript, msg.end_of_turn);
      }
      else if (type === 'FinalTranscript' || type === 'PartialTranscript') {
        if (msg.text) {
          this.callbacks.onTranscript(msg.text, type === 'FinalTranscript');
        }
      }
      else if (type === 'SessionTerminated' || type === 'Termination') {
        console.log('[VoiceClient] Session terminated by server');
        this.disconnect();
      }


      // Handle standard "Transcript" messages
      if (msg.message_type === 'FinalTranscript' || msg.message_type === 'PartialTranscript') {
        if (msg.text) {
          this.callbacks.onTranscript(msg.text, msg.message_type === 'FinalTranscript');
        }
      }

    } catch (err) {
      console.warn('[VoiceClient] Error parsing message:', err);
    }
  }

  disconnect() {
    // Stop audio worklet immediately
    this.workletNode?.disconnect();

    // Stop all media tracks (releases microphone)
    this.mediaStream?.getTracks().forEach(t => t.stop());

    // Don't close audio context if it was preloaded - just suspend it
    if (this.audioContext && this.audioContext !== VoiceClient.preloadedContext) {
      this.audioContext.close();
    } else if (this.audioContext) {
      this.audioContext.suspend();
    }

    // Close WebSocket connection
    if (this.socket) {
      if (this.socket.readyState === WebSocket.OPEN) {
        try {
          this.socket.send(JSON.stringify({ type: 'SessionTermination' }));
        } catch (e) {
          // Socket may already be closing, ignore send errors
          console.warn('[VoiceClient] Failed to send termination:', e);
        }
        this.socket.close();
      } else if (this.socket.readyState === WebSocket.CONNECTING) {
        // Force close if still connecting
        this.socket.close();
      }
    }

    // Clear all references
    this.workletNode = null;
    this.mediaStream = null;
    this.audioContext = null;
    this.socket = null;

    console.log('[VoiceClient] Disconnected and cleaned up');
  }
}

// Auto-preload when module loads
if (typeof window !== 'undefined') {
  // Delay slightly to not block initial render
  setTimeout(() => {
    VoiceClient.preload();
  }, 200);
}