/**
 * Industrial Command-Centre Audio Notification Synthesizer
 * Uses Web Audio API oscillator synthesis (no external media required)
 * Handles browser auto-play restrictions gracefully.
 */

class AudioAlertSystem {
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = true;
  private intervalId: number | null = null;

  public setMuted(muted: boolean): boolean {
    this.isMuted = muted;
    if (muted) {
      this.stopAlarmLoop();
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  private initContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  /**
   * Plays a single discrete industrial chime for acknowledgements or info events
   */
  public playAcknowledgeChime(): void {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch {
      // Ignore audio failure
    }
  }

  /**
   * Plays an industrial warning beep
   */
  public playWarningBeep(): void {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(659.25, now); // E5

      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch {
      // Ignore audio failure
    }
  }

  /**
   * Plays a 2-pulse critical emergency alarm burst
   */
  public playCriticalAlarmBurst(): void {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [0, 0.18].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now + offset); // A5
        osc.frequency.exponentialRampToValueAtTime(740, now + offset + 0.12);

        gain.gain.setValueAtTime(0.12, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.14);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + offset);
        osc.stop(now + offset + 0.14);
      });
    } catch {
      // Ignore audio failure
    }
  }

  /**
   * Controls continuous loop when critical unacknowledged alarm is present
   */
  public updateAlarmState(hasCriticalUnacknowledged: boolean): void {
    if (!hasCriticalUnacknowledged || this.isMuted) {
      this.stopAlarmLoop();
      return;
    }

    if (this.intervalId === null) {
      this.playCriticalAlarmBurst();
      this.intervalId = window.setInterval(() => {
        if (!this.isMuted) {
          this.playCriticalAlarmBurst();
        }
      }, 3500);
    }
  }

  private stopAlarmLoop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const audioAlertSystem = new AudioAlertSystem();
