export const TTSService = {
  // Audio context for PCM playback
  audioContext: null as AudioContext | null,

  async speakWithRime(text: string, onStart?: () => void, onEnd?: () => void): Promise<void> {
    try {
      // Request PCM streaming from backend (which proxies to Rime)
      const response = await fetch('/api/tts/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          speaker: 'moon'  // Valid mistv2 voice
        })
      });

      console.log('[TTS] Response status:', response.status, response.headers.get('content-type'));

      if (!response.ok) {
        const errText = await response.text().catch(() => 'Unknown');
        throw new Error(`TTS request failed: ${response.status} (${errText})`);
      }

      // Initialize AudioContext if needed
      if (!this.audioContext) {
        this.audioContext = new AudioContext({ sampleRate: 16000 });
      }

      // Resume if suspended (browser policy)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      // Notify that playback is starting
      let hasStarted = false;
      const notifyStart = () => {
        if (!hasStarted) {
          hasStarted = true;
          console.log('[TTS] RIME PCM playback started');
          onStart?.();
        }
      };

      // Collect all PCM chunks
      const chunks: Uint8Array[] = [];
      let totalBytes = 0;

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        if (value && value.length > 0) {
          chunks.push(value);
          totalBytes += value.length;
          notifyStart(); // Start notification on first chunk
        }
      }

      console.log(`[TTS] Received ${chunks.length} chunks, ${totalBytes} bytes total`);

      if (totalBytes === 0) {
        throw new Error('TTS returned empty audio data');
      }

      // Combine all chunks
      const allPcmData = new Uint8Array(totalBytes);
      let offset = 0;
      for (const chunk of chunks) {
        allPcmData.set(chunk, offset);
        offset += chunk.length;
      }

      // Convert 16-bit PCM to Float32 for Web Audio
      const samples = allPcmData.length / 2; // 16-bit = 2 bytes per sample
      const audioBuffer = this.audioContext.createBuffer(1, samples, 16000);
      const channelData = audioBuffer.getChannelData(0);

      const dataView = new DataView(allPcmData.buffer);
      for (let i = 0; i < samples; i++) {
        // 16-bit little-endian to float (-1 to 1)
        const int16 = dataView.getInt16(i * 2, true);
        channelData[i] = int16 / 32768;
      }

      // Play the audio
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);

      source.onended = () => {
        console.log('[TTS] RIME PCM playback ended');
        onEnd?.();
      };

      const duration = audioBuffer.duration;
      console.log(`[TTS] Playing ${duration.toFixed(2)}s of audio`);
      source.start(0);

    } catch (err) {
      console.warn('[TTS] RIME API failed, using browser fallback:', err);
      this.speakWithBrowser(text, onStart, onEnd);
    }
  },

  speakWithBrowser(text: string, onStart?: () => void, onEnd?: () => void): void {
    if (!window.speechSynthesis) {
      console.error('[TTS] Browser speech synthesis not supported');
      onEnd?.();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);

    // Voice selection logic
    const setVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v =>
        v.lang.startsWith('en') && (
          v.name.includes('Google') ||
          v.name.includes('Samantha') ||
          v.name.includes('Natural')
        )
      );
      if (preferred) {
        utterance.voice = preferred;
      }
    };

    if (window.speechSynthesis.getVoices().length > 0) {
      setVoice();
    } else {
      window.speechSynthesis.onvoiceschanged = setVoice;
    }

    utterance.onstart = () => {
      console.log('[TTS] Speaking:', text);
      onStart?.();
    };

    utterance.onend = () => {
      onEnd?.();
    };

    utterance.onerror = (err) => {
      console.error('[TTS] Browser TTS Error:', err);
      onEnd?.();
    };

    window.speechSynthesis.speak(utterance);
  },

  cancel() {
    window.speechSynthesis?.cancel();
    // Stop audio context if needed
    if (this.audioContext && this.audioContext.state === 'running') {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
};