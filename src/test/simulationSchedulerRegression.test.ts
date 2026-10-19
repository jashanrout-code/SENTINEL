import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useSentinelStore } from '../store/useSentinelStore';
import { simulationScheduler } from '../core/simulationScheduler';

describe('SENTINEL Authoritative Simulation Clock & Response Progression Regression Suite', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useSentinelStore.getState().resetSimulation();
  });

  afterEach(() => {
    simulationScheduler.stop();
    vi.useRealTimers();
  });

  it('1. Dispatch advances after each simulated time interval', () => {
    // Apply automated fire scenario
    useSentinelStore.getState().applyScenario('SCENARIO_AUTO_FIRE_SUCCESS');
    expect(useSentinelStore.getState().isSimulationRunning).toBe(true);
    expect(useSentinelStore.getState().responseTeams.fireTeam.stage).toBe('STANDBY');

    // Advance by 1 scheduler interval (700ms) -> team is dispatched
    vi.advanceTimersByTime(700);
    const p1 = useSentinelStore.getState().responseTeams.fireTeam.progress;
    expect(useSentinelStore.getState().responseTeams.fireTeam.stage).toBe('NOTIFICATION_INITIATED');
    expect(p1).toBeGreaterThan(0);

    // Advance by another interval -> progress increases further
    vi.advanceTimersByTime(700);
    const p2 = useSentinelStore.getState().responseTeams.fireTeam.progress;
    expect(p2).toBeGreaterThan(p1);
  });

  it('2. Progress increases monotonically across all active response teams', () => {
    useSentinelStore.getState().applyScenario('SCENARIO_AUTO_FIRE_SUCCESS');
    // Tick 1: team is dispatched
    vi.advanceTimersByTime(700);
    let prevProgress = useSentinelStore.getState().responseTeams.fireTeam.progress;

    for (let i = 0; i < 20; i++) {
      vi.advanceTimersByTime(700);
      const currentProgress = useSentinelStore.getState().responseTeams.fireTeam.progress;
      expect(currentProgress).toBeGreaterThanOrEqual(prevProgress);
      prevProgress = currentProgress;
    }
  });

  it('3. ETA decreases appropriately and reaches 0 upon arrival on site', () => {
    useSentinelStore.getState().applyScenario('SCENARIO_AUTO_FIRE_FAIL');
    // Tick 1: dispatch initiated, initial ETA assigned
    vi.advanceTimersByTime(700);
    let prevEta = useSentinelStore.getState().responseTeams.fireTeam.etaSeconds;
    expect(prevEta).toBeGreaterThan(0);

    let arrivedOnSite = false;
    for (let i = 0; i < 25; i++) {
      vi.advanceTimersByTime(700);
      const team = useSentinelStore.getState().responseTeams.fireTeam;
      if (team.stage === 'ON_SITE' || team.stage === 'INTERVENTION_UNDERWAY' || team.stage === 'RESPONSE_COMPLETED') {
        arrivedOnSite = true;
        expect(team.etaSeconds).toBe(0);
      } else {
        expect(team.etaSeconds).toBeLessThanOrEqual(prevEta);
        prevEta = team.etaSeconds;
      }
    }
    expect(arrivedOnSite).toBe(true);
  });

  it('4. Dispatch reaches its terminal state with progress=100% and ETA=0s', () => {
    useSentinelStore.getState().applyScenario('SCENARIO_AUTO_FIRE_SUCCESS');

    // Run enough ticks for fire suppression and brigade verification
    for (let i = 0; i < 30; i++) {
      vi.advanceTimersByTime(700);
    }

    const fireTeam = useSentinelStore.getState().responseTeams.fireTeam;
    expect(fireTeam.stage).toBe('RESPONSE_COMPLETED');
    expect(fireTeam.progress).toBe(100);
    expect(fireTeam.etaSeconds).toBe(0);
  });

  it('5. Dispatch continues even after hazard containment occurs early', () => {
    useSentinelStore.getState().applyScenario('SCENARIO_AUTO_FIRE_SUCCESS');

    // Wait until fire containment happens (around 5-10 ticks)
    for (let i = 0; i < 8; i++) {
      vi.advanceTimersByTime(700);
    }
    expect(useSentinelStore.getState().hazardEnv.containmentStatus.fire).toBe('CONTAINED');

    // At containment, brigade might still be en route or on site
    const midProgress = useSentinelStore.getState().responseTeams.fireTeam.progress;

    // Advance further: verify dispatch does not freeze when fire returns to normal
    for (let i = 0; i < 15; i++) {
      vi.advanceTimersByTime(700);
    }

    const finalTeam = useSentinelStore.getState().responseTeams.fireTeam;
    expect(finalTeam.progress).toBeGreaterThanOrEqual(midProgress);
    expect(finalTeam.stage).toBe('RESPONSE_COMPLETED');
    expect(finalTeam.progress).toBe(100);
    expect(finalTeam.etaSeconds).toBe(0);
  });

  it('6. Dispatch continues seamlessly when navigating between operational views', () => {
    useSentinelStore.getState().applyScenario('SCENARIO_AUTO_GAS_SUCCESS');

    // Start on Command Centre
    useSentinelStore.getState().setView('command-centre');
    vi.advanceTimersByTime(1400); // 2 ticks
    const p1 = useSentinelStore.getState().responseTeams.hazmatTeam.progress;

    // Navigate to Incident Management
    useSentinelStore.getState().setView('incident-management');
    vi.advanceTimersByTime(1400); // 2 ticks
    const p2 = useSentinelStore.getState().responseTeams.hazmatTeam.progress;
    expect(p2).toBeGreaterThan(p1);

    // Navigate to Operations
    useSentinelStore.getState().setView('operations');
    vi.advanceTimersByTime(1400); // 2 ticks
    const p3 = useSentinelStore.getState().responseTeams.hazmatTeam.progress;
    expect(p3).toBeGreaterThan(p2);

    // Return to Command Centre
    useSentinelStore.getState().setView('command-centre');
    vi.advanceTimersByTime(1400);
    const p4 = useSentinelStore.getState().responseTeams.hazmatTeam.progress;
    expect(p4).toBeGreaterThan(p3);
  });

  it('7. Manual intervention does not freeze automatic dispatch processes', () => {
    useSentinelStore.getState().applyScenario('SCENARIO_AUTO_GAS_FAIL');

    // HazMat team is en route automatically
    vi.advanceTimersByTime(1400);
    const initialHazmatProgress = useSentinelStore.getState().responseTeams.hazmatTeam.progress;

    // Operator executes manual override on unrelated equipment (e.g., manual gas valve isolate)
    useSentinelStore.getState().executeManualIntervention('MANUAL_GAS_ISOLATE');

    // Clock must still advance and HazMat team must not freeze
    expect(useSentinelStore.getState().isSimulationRunning).toBe(true);
    vi.advanceTimersByTime(2100);

    const postInterventionProgress = useSentinelStore.getState().responseTeams.hazmatTeam.progress;
    expect(postInterventionProgress).toBeGreaterThan(initialHazmatProgress);
  });

  it('8. Multiple simultaneous response teams progress independently', () => {
    // Start automated fire scenario
    useSentinelStore.getState().applyScenario('SCENARIO_AUTO_FIRE_FAIL');

    // Also trigger gas emergency
    useSentinelStore.getState().executeManualIntervention('REQUEST_HAZMAT_BACKUP');

    // Also dispatch security team
    useSentinelStore.getState().executeManualIntervention('REQUEST_SECURITY_DISPATCH');

    const t0Fire = useSentinelStore.getState().responseTeams.fireTeam.progress;
    const t0Hazmat = useSentinelStore.getState().responseTeams.hazmatTeam.progress;
    const t0Security = useSentinelStore.getState().responseTeams.securityTeam.progress;

    // Run 5 ticks
    vi.advanceTimersByTime(3500);

    const t1Fire = useSentinelStore.getState().responseTeams.fireTeam.progress;
    const t1Hazmat = useSentinelStore.getState().responseTeams.hazmatTeam.progress;
    const t1Security = useSentinelStore.getState().responseTeams.securityTeam.progress;

    expect(t1Fire).toBeGreaterThan(t0Fire);
    expect(t1Hazmat).toBeGreaterThanOrEqual(t0Hazmat);
    expect(t1Security).toBeGreaterThan(t0Security);
  });

  it('9. Simulation reset clears pending operations and re-initialises scheduler', () => {
    useSentinelStore.getState().applyScenario('SCENARIO_AUTO_FIRE_FAIL');
    vi.advanceTimersByTime(2100);

    expect(useSentinelStore.getState().responseTeams.fireTeam.stage).not.toBe('STANDBY');
    expect(useSentinelStore.getState().activeIncidents.length).toBeGreaterThan(0);

    // Perform reset
    useSentinelStore.getState().resetSimulation();

    const state = useSentinelStore.getState();
    expect(state.isSimulationRunning).toBe(false);
    expect(state.activeIncidents.length).toBe(0);
    expect(state.responseTeams.fireTeam.stage).toBe('STANDBY');
    expect(state.responseTeams.fireTeam.progress).toBe(0);
    expect(state.responseTeams.fireTeam.etaSeconds).toBe(0);
    expect(state.responseTeams.hazmatTeam.stage).toBe('STANDBY');
    expect(state.responseTeams.securityTeam.stage).toBe('STANDBY');
    expect(simulationScheduler.isRunning()).toBe(false);

    // Applying a new scenario cleanly re-arms and runs the clock
    useSentinelStore.getState().applyScenario('SCENARIO_AUTO_FIRE_SUCCESS');
    expect(useSentinelStore.getState().isSimulationRunning).toBe(true);
    expect(simulationScheduler.isRunning()).toBe(true);
  });

  it('10. Repeated scenario execution does not create duplicate timers', () => {
    // Start scenario multiple times rapidly
    useSentinelStore.getState().applyScenario('SCENARIO_AUTO_FIRE_SUCCESS');
    useSentinelStore.getState().applyScenario('SCENARIO_AUTO_FIRE_SUCCESS');
    useSentinelStore.getState().applyScenario('SCENARIO_AUTO_FIRE_SUCCESS');

    expect(simulationScheduler.isRunning()).toBe(true);

    const tickHandlerSpy = vi.fn();
    const originalHandler = simulationScheduler.getTickHandler();
    simulationScheduler.setTickHandler((count, elapsed) => {
      tickHandlerSpy(count, elapsed);
      if (originalHandler) originalHandler(count, elapsed);
    });

    // Advance 700ms (1 interval)
    vi.advanceTimersByTime(700);

    // Exactly 1 tick should have fired, not 3
    expect(tickHandlerSpy).toHaveBeenCalledTimes(1);

    // Advance another 700ms
    vi.advanceTimersByTime(700);
    expect(tickHandlerSpy).toHaveBeenCalledTimes(2);

    // Restore original handler
    simulationScheduler.setTickHandler(originalHandler);
  });
});
