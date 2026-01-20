export const TTSService = {
    async speakWithRime(text: string, onStart?: () => void, onEnd?: () => void): Promise<void> {
      try {
        // Replace with your actual endpoint
        const response = await fetch('/api/tts/rime', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voice: 'default' })
        });

        const contentType = response.headers.get('content-type');
        if (!response.ok || !contentType?.includes('audio')) {
          // Throwing here sends us straight to the catch block
          throw new Error(`TTS API returned ${response.status} (${contentType})`);
        }
  
          const audioBlob = await response.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          
          audio.onplay = () => onStart?.();
          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            onEnd?.();
          };
          audio.onerror = () => {
            console.warn('[TTS] RIME playback failed, falling back to browser');
            this.speakWithBrowser(text, onStart, onEnd);
          };
          
          await audio.play();
          return;
      } catch (err) {
        console.warn('[TTS] RIME API failed, using browser fallback:', err);
        this.speakWithBrowser(text, onStart, onEnd);
      }
    },
  
    speakWithBrowser(text: string, onStart?: () => void, onEnd?: () => void): void {
      if (!window.speechSynthesis) {
        console.error('[TTS] Browser speech synthesis not supported');
        return;
      }
  
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
  
      // Simple voice selection logic
      const setVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        const preferred = voices.find(v => 
          v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Natural'))
        );
        if (preferred) utterance.voice = preferred;
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
        console.error('[TTS] Error:', err);
        onEnd?.();
      };
  
      window.speechSynthesis.speak(utterance);
    },
  
    cancel() {
      window.speechSynthesis?.cancel();
    }
  };