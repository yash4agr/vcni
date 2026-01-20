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
  
    constructor(callbacks: VoiceClientCallbacks) {
      this.callbacks = callbacks;
    }
  
    async connect(token: string) {
      try {
        // 1. Setup Audio
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
  
        this.audioContext = new AudioContext({ sampleRate: sampleRate });
        await this.audioContext.audioWorklet.addModule('/audio-worklet/assemblyai-processor.js');
  
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
        
        // Handle legacy/v2 "Turn" messages if necessary
        if (msg.type === 'Turn' && msg.transcript) {
           // Logic for turn-based transcripts can go here if using older models
        }
        
      } catch (err) {
        console.warn('[VoiceClient] Error parsing message:', err);
      }
    }
  
    disconnect() {
      this.workletNode?.disconnect();
      this.mediaStream?.getTracks().forEach(t => t.stop());
      this.audioContext?.close();
      
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'SessionTermination' }));
        this.socket.close();
      }
  
      this.workletNode = null;
      this.mediaStream = null;
      this.audioContext = null;
      this.socket = null;
    }
  }