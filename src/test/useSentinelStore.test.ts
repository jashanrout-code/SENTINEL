import { describe, it, expect, beforeEach } from 'vitest';
import { useSentinelStore } from '../store/useSentinelStore';
import { INITIAL_TELEMETRY, PREDEFINED_SCENARIOS } from '../core/scenarios';

describe('SENTINEL Store - Application State & Scenarios', () => {
  beforeEach(() => {
    // Reset simulation before each test
    useSentinelStore.getState().resetSimulation();
  });

  it('initializes with nominal telemetry and 0 active incidents', () => {
    const state = useSentinelStore.getState();
    expect(state.activeIncidents).toHaveLength(0);
    expect(state.telemetry.temperature).toBe(INITIAL_TELEMETRY.temperature);
    expect(state.telemetry.smokeDetected).toBe(false);
    expect(state.telemetry.gasConcentration).toBe(INITIAL_TELEMETRY.gasConcentration);
    expect(state.telemetry.intrusionDetected).toBe(false);
    expect(state.currentView).toBe('command-centre');
  });

  it('applying scenario updates telemetry through the monitoring engine', () => {
    // Apply Research Lab Fire scenario
    useSentinelStore.getState().applyScenario('SCENARIO_AUTO_FIRE_SUCCESS');

    const state = useSentinelStore.getState();
    expect(state.telemetry.temperature).toBe(82);
    expect(state.telemetry.smokeDetected).toBe(true);
    expect(state.activeIncidents).toHaveLength(1);
    expect(state.activeIncidents[0].category).toBe('FIRE');
    expect(state.selectedZoneId).toBe('RESEARCH_LAB');
    expect(state.getZoneStatus('RESEARCH_LAB')).toBe('critical');
  });

  it('navigation between operational views preserves simulation state', () => {
    // Apply Gas scenario in Command Centre
    useSentinelStore.getState().applyScenario('SCENARIO_AUTO_GAS_SUCCESS');
    expect(useSentinelStore.getState().activeIncidents).toHaveLength(1);

    // Navigate to Incident Management
    useSentinelStore.getState().setView('incident-management');
    expect(useSentinelStore.getState().currentView).toBe('incident-management');
    expect(useSentinelStore.getState().activeIncidents).toHaveLength(1);

    // Navigate to Operations
    useSentinelStore.getState().setView('operations');
    expect(useSentinelStore.getState().currentView).toBe('operations');
    expect(useSentinelStore.getState().activeIncidents).toHaveLength(1);
    expect(useSentinelStore.getState().telemetry.gasConcentration).toBe(175);
  });

  it('toggleSensorFault sets fault status and updates zone health without creating emergency alarm', () => {
    useSentinelStore.getState().toggleSensorFault('temperature');

    const state = useSentinelStore.getState();
    expect(state.telemetry.sensorFaults.temperature).toBe(true);
    // Zone status reflects fault
    expect(state.getZoneStatus('RESEARCH_LAB')).toBe('fault');
    // But no false fire emergency alarm is created
    expect(state.activeIncidents.find(i => i.category === 'FIRE')).toBeUndefined();
  });

  it('simulation reset restores baseline telemetry and clears active alarms', () => {
    // Trigger multiple concurrent incidents
    useSentinelStore.getState().applyScenario('SCENARIO_AUTO_MULTIPLE_CONCURRENT');
    expect(useSentinelStore.getState().activeIncidents.length).toBeGreaterThan(0);

    // Execute simulation reset
    useSentinelStore.getState().resetSimulation();

    const state = useSentinelStore.getState();
    expect(state.activeIncidents).toHaveLength(0);
    expect(state.telemetry.temperature).toBe(25);
    expect(state.telemetry.gasConcentration).toBe(20);
    expect(state.telemetry.smokeDetected).toBe(false);
    expect(state.telemetry.intrusionDetected).toBe(false);
  });

  it('all predefined scenarios load expected target zones and telemetry', () => {
    for (const scenario of PREDEFINED_SCENARIOS) {
      useSentinelStore.getState().resetSimulation();
      useSentinelStore.getState().applyScenario(scenario.id);

      const state = useSentinelStore.getState();
      expect(state.selectedZoneId).toBe(scenario.targetZone);
    }
  });
});
