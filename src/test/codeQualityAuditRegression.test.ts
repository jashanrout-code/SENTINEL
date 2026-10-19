import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useSentinelStore } from '../store/useSentinelStore';
import { simulationScheduler } from '../core/simulationScheduler';
import {
  calculateFramingDistance,
  DEFAULT_FACILITY_FRAMING,
  ISO_DIR,
} from '../components/facility/cameraFraming';

describe('Code Quality Audit & Edge Case Regression Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useSentinelStore.getState().resetSimulation();
  });

  afterEach(() => {
    simulationScheduler.stop();
    vi.useRealTimers();
  });

  it('Inspection Countdown Resilience: repeated inspection requests while IN_PROGRESS do not reset the 5s timer', () => {
    // Set up Research Lab with fire extinguished and ready for inspection
    useSentinelStore.setState(s => ({
      hazardEnv: {
        ...s.hazardEnv,
        fireIgnited: false,
        fireIntensity: 0,
        smokeConcentration: 0,
        ambientTemperature: 25,
      },
      telemetry: {
        ...s.telemetry,
        temperature: 25,
        smokeDetected: false,
      },
    }));

    // Initial inspection request should succeed
    const res1 = useSentinelStore.getState().requestSafetyInspection('RESEARCH_LAB');
    expect(res1.success).toBe(true);
    expect(useSentinelStore.getState().hazardEnv.inspectionStatus?.RESEARCH_LAB).toBe('IN_PROGRESS');
    expect(useSentinelStore.getState().hazardEnv.inspectionCountdown?.RESEARCH_LAB).toBe(5);

    // Advance 2 seconds
    simulationScheduler.advanceTicks(2);
    expect(useSentinelStore.getState().hazardEnv.inspectionCountdown?.RESEARCH_LAB).toBe(3);

    // Duplicate inspection request while IN_PROGRESS should be rejected and NOT reset countdown to 5
    const res2 = useSentinelStore.getState().requestSafetyInspection('RESEARCH_LAB');
    expect(res2.success).toBe(false);
    expect(res2.message).toContain('already in progress');
    expect(useSentinelStore.getState().hazardEnv.inspectionCountdown?.RESEARCH_LAB).toBe(3);

    // Advance remaining 3 seconds to complete verification
    simulationScheduler.advanceTicks(3);
    expect(useSentinelStore.getState().hazardEnv.inspectionStatus?.RESEARCH_LAB).toBe('PASSED');
    expect(useSentinelStore.getState().hazardEnv.inspectionCountdown?.RESEARCH_LAB).toBe(0);
  });

  it('Control Room Inspection Resilience: repeated calls while IN_PROGRESS do not reset the timer', () => {
    useSentinelStore.getState().triggerManualEmergency('CONTROL_ROOM');
    useSentinelStore.getState().stepSimulationTick();
    const inc = useSentinelStore.getState().activeIncidents.find(i => i.category === 'MANUAL_EMERGENCY');
    expect(inc).toBeDefined();

    // Clear trip switch in Operations
    useSentinelStore.setState(s => ({
      telemetry: { ...s.telemetry, manualEmergencyActive: false },
      hazardEnv: { ...s.hazardEnv, manualEmergencyActive: false },
    }));

    // Initiate inspection
    const res1 = useSentinelStore.getState().requestSafetyInspection('CONTROL_ROOM');
    expect(res1.success).toBe(true);
    expect(useSentinelStore.getState().hazardEnv.inspectionCountdown?.CONTROL_ROOM).toBe(5);

    // Advance 2 seconds
    simulationScheduler.advanceTicks(2);
    expect(useSentinelStore.getState().hazardEnv.inspectionCountdown?.CONTROL_ROOM).toBe(3);

    // Repeated call must be rejected and preserve countdown
    const res2 = useSentinelStore.getState().requestSafetyInspection('CONTROL_ROOM');
    expect(res2.success).toBe(false);
    expect(res2.message).toContain('already in progress');
    expect(useSentinelStore.getState().hazardEnv.inspectionCountdown?.CONTROL_ROOM).toBe(3);
  });

  it('Floating Zone Health Status Resolution: getZoneStatus evaluates distinct health tiers', () => {
    const store = useSentinelStore.getState();

    // Nominal baseline
    expect(store.getZoneStatus('RESEARCH_LAB')).toBe('normal');
    expect(store.getZoneStatus('CONTROL_ROOM')).toBe('normal');

    // Trigger manual emergency -> unacknowledged is critical
    useSentinelStore.getState().triggerManualEmergency('CONTROL_ROOM');
    useSentinelStore.getState().stepSimulationTick();
    expect(useSentinelStore.getState().getZoneStatus('CONTROL_ROOM')).toBe('critical');

    // Acknowledge -> transitions to acknowledged
    const inc = useSentinelStore.getState().activeIncidents.find(i => i.category === 'MANUAL_EMERGENCY');
    useSentinelStore.getState().acknowledgeIncident(inc!.id);
    expect(useSentinelStore.getState().getZoneStatus('CONTROL_ROOM')).toBe('acknowledged');

    // Sensor fault in Chemical Lab -> transitions to fault
    useSentinelStore.setState(s => ({
      telemetry: {
        ...s.telemetry,
        sensorFaults: { ...s.telemetry.sensorFaults, gas: true },
      },
    }));
    expect(useSentinelStore.getState().getZoneStatus('CHEMICAL_LAB')).toBe('fault');
  });

  it('Restoration Protection: restoreZoneOperations rejects execution if already RESTORING', () => {
    useSentinelStore.setState(s => ({
      zoneRecovery: {
        ...s.zoneRecovery,
        RESEARCH_LAB: { state: 'RESTORING', progress: 45 },
      },
    }));

    const result = useSentinelStore.getState().restoreZoneOperations('RESEARCH_LAB');
    expect(result.success).toBe(false);
    expect(result.message).toContain('already in progress');
  });

  it('Camera Framing Bounds: correctly adapts for narrow and wide aspect ratios with immutable ISO vector', () => {
    expect(DEFAULT_FACILITY_FRAMING.baseDistance).toBe(52);
    expect(DEFAULT_FACILITY_FRAMING.minAspect).toBe(1.45);

    // 16:9 widescreen
    const distWide = calculateFramingDistance(16 / 9, DEFAULT_FACILITY_FRAMING);
    expect(distWide).toBe(52);

    // 4:3 narrower screen requires larger camera distance
    const distNarrow = calculateFramingDistance(4 / 3, DEFAULT_FACILITY_FRAMING);
    expect(distNarrow).toBeGreaterThan(52);

    // ISO_DIR must be normalized vector
    expect(Math.hypot(ISO_DIR.x, ISO_DIR.y, ISO_DIR.z)).toBeCloseTo(1.0, 5);
  });

  it('Simulation Reset Integrity: clears highlight targets and resets baseline state', () => {
    useSentinelStore.setState({
      activeHighlightTarget: 'action-ack-test',
      pendingNavigationTarget: {
        destinationView: 'incident-management',
        targetControlId: 'action-ack-test',
      },
    });

    useSentinelStore.getState().resetSimulation();

    const state = useSentinelStore.getState();
    expect(state.activeHighlightTarget).toBeNull();
    expect(state.pendingNavigationTarget).toBeNull();
    expect(state.activeIncidents.length).toBe(0);
    expect(state.zoneRecovery.RESEARCH_LAB.state).toBe('RESTORED');
    expect(state.isSimulationRunning).toBe(false);
  });
});
