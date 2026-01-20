class AssemblyAIAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // Buffer size should be between 50ms and 1000ms
    // At 16kHz: 50ms = 800 samples, 1000ms = 16000 samples
    // Using 4800 samples = 300ms at 16kHz (good balance)
    this.bufferSize = 4800;
    this.buffer = new Float32Array(this.bufferSize);
    this.index = 0;
  }

  process(inputs) {
    const input = inputs[0];
    
    // Check if we have valid input
    if (!input || !input[0]) {
      return true;
    }

    const channel = input[0];

    // Process each sample
    for (let i = 0; i < channel.length; i++) {
      this.buffer[this.index++] = channel[i];

      // When buffer is full, convert to PCM16 and send
      if (this.index >= this.bufferSize) {
        // Convert Float32 (-1.0 to 1.0) to Int16 (-32768 to 32767)
        const pcm16 = new Int16Array(this.bufferSize);
        for (let j = 0; j < this.bufferSize; j++) {
          // Clamp to [-1, 1] and convert to 16-bit integer
          const sample = Math.max(-1, Math.min(1, this.buffer[j]));
          pcm16[j] = sample * 32767;
        }

        // Send the raw PCM16 data (not base64 encoded)
        // AssemblyAI expects raw binary data
        this.port.postMessage(pcm16.buffer, [pcm16.buffer]);

        // Reset buffer
        this.index = 0;
      }
    }

    return true; // Keep processor alive
  }
}

registerProcessor('assemblyai-processor', AssemblyAIAudioProcessor);