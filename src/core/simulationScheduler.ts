/**
 * SENTINEL Authoritative Simulation Clock & Scheduler
 *
 * Provides a single, robust, singleton timer that drives the simulation
 * independently of individual page components and views.
 *
 * Guarantees:
 * - Single authoritative interval (no duplicate timers on rerenders/HMR).
 * - Monotonically increasing tick counter and elapsed time tracking.
 * - Safe error boundaries around tick callbacks to prevent interval death.
 * - Idempotent start, stop, and reset operations.
 */

export type TickCallback = (tickCount: number, elapsedMs: number) => void;

export class SimulationScheduler {
  private static instance: SimulationScheduler | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private tickHandler: TickCallback | null = null;
  private tickIntervalMs: number = 700;
  private isRunningState: boolean = false;
  private tickCount: number = 0;
  private startTime: number = 0;
  private lastTickTime: number = 0;

  private constructor() { }

  public static getInstance(): SimulationScheduler {
    if (!SimulationScheduler.instance) {
      SimulationScheduler.instance = new SimulationScheduler();
    }
    return SimulationScheduler.instance;
  }

  public setTickHandler(handler: TickCallback | null): void {
    this.tickHandler = handler;
  }

  public getTickHandler(): TickCallback | null {
    return this.tickHandler;
  }

  public setIntervalMs(ms: number): void {
    const validMs = Math.max(50, ms);
    this.tickIntervalMs = validMs;
    if (this.isRunningState) {
      this.stop();
      this.start();
    }
  }

  public getIntervalMs(): number {
    return this.tickIntervalMs;
  }

  public start(): void {
    if (this.intervalId !== null) {
      this.isRunningState = true;
      return;
    }

    this.isRunningState = true;
    if (this.startTime === 0) {
      this.startTime = Date.now();
    }
    this.lastTickTime = Date.now();

    this.intervalId = setInterval(() => {
      this.tick();
    }, this.tickIntervalMs);
  }

  public stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunningState = false;
  }

  public isRunning(): boolean {
    return this.isRunningState && this.intervalId !== null;
  }

  public getTickCount(): number {
    return this.tickCount;
  }

  public getElapsedMs(): number {
    return this.tickCount * this.tickIntervalMs;
  }

  public getLastTickTime(): number {
    return this.lastTickTime;
  }

  public tick(): void {
    this.tickCount++;
    this.lastTickTime = Date.now();

    if (this.tickHandler) {
      try {
        this.tickHandler(this.tickCount, this.getElapsedMs());
      } catch (err) {
        // Prevent interval failure from stopping the scheduler
        console.error('SimulationScheduler: Error in tick handler', err);
      }
    }
  }

  /**
   * Deterministically advances N ticks (useful for automated regression tests)
   */
  public advanceTicks(count: number): void {
    for (let i = 0; i < count; i++) {
      this.tick();
    }
  }

  public reset(): void {
    this.stop();
    this.tickCount = 0;
    this.startTime = 0;
    this.lastTickTime = 0;
  }
}

export const simulationScheduler = SimulationScheduler.getInstance();
