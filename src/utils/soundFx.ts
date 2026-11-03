// Synthesized analog photobooth sounds via Web Audio API (unlocked on iOS user tap)

class BoothSoundEngine {
  private ctx: AudioContext | null = null;
  public enabled = true;

  public unlock(): void {
    if (!this.enabled || typeof window === 'undefined') return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.ctx) {
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    } catch {
      // Ignore audio errors on restricted environments
    }
  }

  public playCountdownTick(finalWarn = false): void {
    if (!this.enabled) return;
    this.unlock();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(finalWarn ? 880 : 587.33, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.11, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch {
      // Ignore
    }
  }

  public playXenonShutter(): void {
    if (!this.enabled) return;
    this.unlock();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;

      // 1. Mechanical leaf shutter noise burst
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.085);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const decay = Math.exp(-i / (this.ctx.sampleRate * 0.018));
        data[i] = (Math.random() * 2 - 1) * decay;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.Q.setValueAtTime(1.2, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.32, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noise.start(now);

      // 2. Subtle xenon flash capacitor recycle whine
      const capOsc = this.ctx.createOscillator();
      const capGain = this.ctx.createGain();
      capOsc.type = 'sine';
      capOsc.frequency.setValueAtTime(2400, now + 0.05);
      capOsc.frequency.exponentialRampToValueAtTime(5200, now + 0.55);

      capGain.gain.setValueAtTime(0.0001, now + 0.05);
      capGain.gain.linearRampToValueAtTime(0.022, now + 0.12);
      capGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

      capOsc.connect(capGain);
      capGain.connect(this.ctx.destination);
      capOsc.start(now + 0.05);
      capOsc.stop(now + 0.62);
    } catch {
      // Ignore
    }
  }

  public playChuteDrop(): void {
    if (!this.enabled) return;
    this.unlock();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(190, now);
      osc.frequency.exponentialRampToValueAtTime(92, now + 0.18);

      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch {
      // Ignore
    }
  }
}

export const boothSound = new BoothSoundEngine();
