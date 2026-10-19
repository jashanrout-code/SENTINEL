import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSentinelStore } from '../store/useSentinelStore';

describe('Guided Operator Navigation to Exact Controls', () => {
  beforeEach(() => {
    useSentinelStore.getState().resetSimulation();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it('Test 1: Research Laboratory recovery guidance opens Command Centre and targets the correct restoration control', () => {
    useSentinelStore.setState(s => ({
      currentView: 'operations',
      selectedZoneId: 'CONTROL_ROOM',
      activeIncidents: [],
      hazardEnv: {
        ...s.hazardEnv,
        fireIgnited: false,
        fireIntensity: 0,
        ambientTemperature: 25,
        smokeConcentration: 0,
        inspectionStatus: { RESEARCH_LAB: 'PASSED' },
      },
      telemetry: {
        ...s.telemetry,
        temperature: 25,
        smokeDetected: false,
      },
      zoneRecovery: {
        ...s.zoneRecovery,
        RESEARCH_LAB: { state: 'RECOVERY_PERMITTED', progress: 0 },
      },
    }));

    const actions = useSentinelStore.getState().getPendingOperatorActions();
    const recoveryAction = actions.find(a => a.stage === 'EQUIPMENT_RECOVERY' && a.zoneId === 'RESEARCH_LAB');
    expect(recoveryAction).toBeDefined();
    expect(recoveryAction?.destinationView).toBe('command-centre');
    expect(recoveryAction?.targetControlId).toBe('action-recover-RESEARCH_LAB');
    expect(recoveryAction?.sectionId).toBe('section-recovery-RESEARCH_LAB');

    // Execute navigation
    useSentinelStore.getState().navigateToGuidedAction(recoveryAction!);

    const state = useSentinelStore.getState();
    expect(state.currentView).toBe('command-centre');
    expect(state.selectedZoneId).toBe('RESEARCH_LAB');
    expect(state.selectedIncidentId).toBeNull();
    expect(state.activeHighlightTarget).toBe('action-recover-RESEARCH_LAB');
    expect(state.pendingNavigationTarget?.targetControlId).toBe('action-recover-RESEARCH_LAB');
  });

  it('Test 2: Chemical Laboratory guidance selects ZN-02 and targets its restoration control', () => {
    useSentinelStore.setState(s => ({
      currentView: 'incident-management',
      selectedZoneId: 'RESEARCH_LAB',
      activeIncidents: [],
      hazardEnv: {
        ...s.hazardEnv,
        gasSourceActive: false,
        gasReleaseRate: 0,
        gasConcentration: 20,
        inspectionStatus: { CHEMICAL_LAB: 'PASSED' },
      },
      telemetry: {
        ...s.telemetry,
        gasConcentration: 20,
      },
      zoneRecovery: {
        ...s.zoneRecovery,
        CHEMICAL_LAB: { state: 'RECOVERY_PERMITTED', progress: 0, gasSupplyAuthorised: true },
      },
    }));

    const actions = useSentinelStore.getState().getPendingOperatorActions();
    const recoveryAction = actions.find(a => a.stage === 'EQUIPMENT_RECOVERY' && a.zoneId === 'CHEMICAL_LAB');
    expect(recoveryAction).toBeDefined();
    expect(recoveryAction?.destinationView).toBe('command-centre');
    expect(recoveryAction?.targetControlId).toBe('action-recover-CHEMICAL_LAB');

    useSentinelStore.getState().navigateToGuidedAction(recoveryAction!);

    const state = useSentinelStore.getState();
    expect(state.currentView).toBe('command-centre');
    expect(state.selectedZoneId).toBe('CHEMICAL_LAB');
    expect(state.selectedIncidentId).toBeNull();
    expect(state.activeHighlightTarget).toBe('action-recover-CHEMICAL_LAB');
  });

  it('Test 3: Restricted Storage guidance selects ZN-03 and targets its restoration control', () => {
    useSentinelStore.setState(s => ({
      currentView: 'operations',
      selectedZoneId: 'CHEMICAL_LAB',
      activeIncidents: [],
      responseTeams: {
        ...s.responseTeams,
        securityTeam: {
          ...s.responseTeams.securityTeam,
          assessmentCompleted: true,
          assessmentProgress: 100,
        },
      },
      hazardEnv: {
        ...s.hazardEnv,
        intrusionBreachActive: false,
        inspectionStatus: { RESTRICTED_STORAGE: 'PASSED' },
      },
      telemetry: {
        ...s.telemetry,
        intrusionDetected: false,
      },
      zoneRecovery: {
        ...s.zoneRecovery,
        RESTRICTED_STORAGE: { state: 'RECOVERY_PERMITTED', progress: 0 },
      },
    }));

    const actions = useSentinelStore.getState().getPendingOperatorActions();
    const recoveryAction = actions.find(a => a.stage === 'EQUIPMENT_RECOVERY' && a.zoneId === 'RESTRICTED_STORAGE');
    expect(recoveryAction).toBeDefined();
    expect(recoveryAction?.destinationView).toBe('command-centre');
    expect(recoveryAction?.targetControlId).toBe('action-recover-RESTRICTED_STORAGE');

    useSentinelStore.getState().navigateToGuidedAction(recoveryAction!);

    const state = useSentinelStore.getState();
    expect(state.currentView).toBe('command-centre');
    expect(state.selectedZoneId).toBe('RESTRICTED_STORAGE');
    expect(state.selectedIncidentId).toBeNull();
    expect(state.activeHighlightTarget).toBe('action-recover-RESTRICTED_STORAGE');
  });

  it('Test 4: Navigation works when the operator starts on Operations', () => {
    useSentinelStore.setState(s => ({
      currentView: 'operations',
      selectedZoneId: 'RESTRICTED_STORAGE',
      activeIncidents: [],
      hazardEnv: {
        ...s.hazardEnv,
        fireIgnited: false,
        fireIntensity: 0,
        inspectionStatus: { RESEARCH_LAB: 'PASSED' },
      },
      telemetry: {
        ...s.telemetry,
        temperature: 25,
        smokeDetected: false,
      },
      zoneRecovery: {
        ...s.zoneRecovery,
        RESEARCH_LAB: { state: 'RECOVERY_PERMITTED', progress: 0 },
      },
    }));

    const action = useSentinelStore.getState().getPendingOperatorActions().find(a => a.stage === 'EQUIPMENT_RECOVERY' && a.zoneId === 'RESEARCH_LAB');
    expect(action).toBeDefined();
    useSentinelStore.getState().navigateToGuidedAction(action!);

    expect(useSentinelStore.getState().currentView).toBe('command-centre');
    expect(useSentinelStore.getState().selectedZoneId).toBe('RESEARCH_LAB');
  });

  it('Test 5: Navigation works when the operator starts on Incident Management', () => {
    useSentinelStore.setState(s => ({
      currentView: 'incident-management',
      selectedZoneId: 'RESEARCH_LAB',
      selectedIncidentId: 'INC-OLD-123',
      activeIncidents: [],
      hazardEnv: {
        ...s.hazardEnv,
        gasSourceActive: false,
        gasReleaseRate: 0,
        gasConcentration: 20,
        inspectionStatus: { CHEMICAL_LAB: 'PASSED' },
      },
      telemetry: {
        ...s.telemetry,
        gasConcentration: 20,
      },
      zoneRecovery: {
        ...s.zoneRecovery,
        CHEMICAL_LAB: { state: 'RECOVERY_PERMITTED', progress: 0, gasSupplyAuthorised: true },
      },
    }));

    const action = useSentinelStore.getState().getPendingOperatorActions().find(a => a.stage === 'EQUIPMENT_RECOVERY' && a.zoneId === 'CHEMICAL_LAB');
    expect(action).toBeDefined();
    useSentinelStore.getState().navigateToGuidedAction(action!);

    expect(useSentinelStore.getState().currentView).toBe('command-centre');
    expect(useSentinelStore.getState().selectedZoneId).toBe('CHEMICAL_LAB');
    // Crucial: selectedIncidentId must be cleared so ContextualPanel doesn't display incident details
    expect(useSentinelStore.getState().selectedIncidentId).toBeNull();
  });

  it('Test 6: Navigation works when another zone is currently selected', () => {
    useSentinelStore.setState(s => ({
      currentView: 'command-centre',
      selectedZoneId: 'CONTROL_ROOM',
      activeIncidents: [],
      hazardEnv: {
        ...s.hazardEnv,
        fireIgnited: false,
        fireIntensity: 0,
        inspectionStatus: { RESEARCH_LAB: 'PASSED' },
      },
      telemetry: {
        ...s.telemetry,
        temperature: 25,
        smokeDetected: false,
      },
      zoneRecovery: {
        ...s.zoneRecovery,
        RESEARCH_LAB: { state: 'RECOVERY_PERMITTED', progress: 0 },
      },
    }));

    const action = useSentinelStore.getState().getPendingOperatorActions().find(a => a.stage === 'EQUIPMENT_RECOVERY' && a.zoneId === 'RESEARCH_LAB');
    expect(action).toBeDefined();
    useSentinelStore.getState().navigateToGuidedAction(action!);

    expect(useSentinelStore.getState().selectedZoneId).toBe('RESEARCH_LAB');
    expect(useSentinelStore.getState().activeHighlightTarget).toBe('action-recover-RESEARCH_LAB');
  });

  it('Test 7: Navigation handles asynchronous rendering and stages pendingNavigationTarget', () => {
    const target = {
      destinationView: 'command-centre' as const,
      zoneId: 'RESEARCH_LAB' as const,
      sectionId: 'section-recovery-RESEARCH_LAB',
      targetControlId: 'action-recover-RESEARCH_LAB',
    };

    useSentinelStore.getState().navigateToGuidedAction(target);

    const pending = useSentinelStore.getState().pendingNavigationTarget;
    expect(pending).not.toBeNull();
    expect(pending?.targetControlId).toBe('action-recover-RESEARCH_LAB');
    expect(pending?.destinationView).toBe('command-centre');
    expect(pending?.sectionId).toBe('section-recovery-RESEARCH_LAB');
    expect(pending?.timestamp).toBeGreaterThan(0);
  });

  it('Test 8: Other guided actions reach their actual verified controls', () => {
    // 1. Acknowledgement
    useSentinelStore.getState().applyScenario('SCENARIO_AUTO_FIRE_SUCCESS');
    let actions = useSentinelStore.getState().getPendingOperatorActions();
    const ackAction = actions.find(a => a.stage === 'ACKNOWLEDGEMENT');
    expect(ackAction).toBeDefined();
    expect(ackAction!.destinationView).toBe('incident-management');
    expect(ackAction!.targetControlId).toBe(`action-ack-${ackAction!.incidentId}`);
    expect(ackAction!.sectionId).toBe(`section-incident-${ackAction!.incidentId}`);

    useSentinelStore.getState().navigateToGuidedAction(ackAction!);
    expect(useSentinelStore.getState().currentView).toBe('incident-management');
    expect(useSentinelStore.getState().activeHighlightTarget).toBe(`action-ack-${ackAction!.incidentId}`);

    // Acknowledge incident
    useSentinelStore.getState().acknowledgeIncident(ackAction!.incidentId!);

    // Extinguish fire and advance to safety inspection
    useSentinelStore.setState(s => ({
      hazardEnv: { ...s.hazardEnv, fireIgnited: false, fireIntensity: 0, ambientTemperature: 25, smokeConcentration: 0 },
      telemetry: { ...s.telemetry, temperature: 25, smokeDetected: false },
    }));

    actions = useSentinelStore.getState().getPendingOperatorActions();
    const inspAction = actions.find(a => a.stage === 'SAFETY_INSPECTION');
    expect(inspAction).toBeDefined();
    expect(inspAction?.destinationView).toBe('incident-management');
    expect(inspAction?.targetControlId).toBe('action-inspect-RESEARCH_LAB');
    expect(inspAction?.sectionId).toBe(`section-incident-${ackAction!.incidentId}`);

    // Execute safety inspection
    useSentinelStore.getState().requestSafetyInspection('RESEARCH_LAB');
    // Fast forward countdown
    for (let i = 0; i < 6; i++) {
      useSentinelStore.getState().stepSimulationTick();
    }
    expect(useSentinelStore.getState().hazardEnv.inspectionStatus?.RESEARCH_LAB).toBe('PASSED');

    // Next action: Closure
    actions = useSentinelStore.getState().getPendingOperatorActions();
    const closeAction = actions.find(a => a.stage === 'CLOSURE');
    expect(closeAction).toBeDefined();
    expect(closeAction?.destinationView).toBe('incident-management');
    expect(closeAction?.targetControlId).toBe(`action-close-${ackAction!.incidentId}`);

    // Authorise closure
    useSentinelStore.getState().authorizeIncidentClosure(ackAction!.incidentId!);

    // Next action: Equipment Recovery in Command Centre
    actions = useSentinelStore.getState().getPendingOperatorActions();
    const recAction = actions.find(a => a.stage === 'EQUIPMENT_RECOVERY' && a.zoneId === 'RESEARCH_LAB');
    expect(recAction).toBeDefined();
    expect(recAction?.destinationView).toBe('command-centre');
    expect(recAction?.targetControlId).toBe('action-recover-RESEARCH_LAB');
    expect(recAction?.sectionId).toBe('section-recovery-RESEARCH_LAB');

    // Test ALARM_RESET guided action on an active incident with cleared condition
    useSentinelStore.setState({
      activeIncidents: [
        {
          id: 'INC-RESET-TEST',
          category: 'FIRE',
          zoneId: 'RESEARCH_LAB',
          severity: 'CRITICAL',
          priority: 2,
          state: 'CONDITION_CLEARED',
          title: 'Condition Cleared Fire',
          details: 'Fire condition cleared',
          detectedAt: Date.now() - 5000,
          conditionActive: false,
          acknowledgedAt: Date.now() - 3000,
          resolvedAt: null,
          responses: {},
        },
      ],
    });

    actions = useSentinelStore.getState().getPendingOperatorActions();
    const resetAction = actions.find(a => a.stage === 'ALARM_RESET');
    expect(resetAction).toBeDefined();
    expect(resetAction?.destinationView).toBe('incident-management');
    expect(resetAction?.targetControlId).toBe('action-reset-INC-RESET-TEST');
    expect(resetAction?.sectionId).toBe('section-incident-INC-RESET-TEST');
  });

  it('Test 9: Completed actions disappear from the pending-action queue', () => {
    useSentinelStore.setState(s => ({
      activeIncidents: [],
      hazardEnv: {
        ...s.hazardEnv,
        fireIgnited: false,
        fireIntensity: 0,
        inspectionStatus: { RESEARCH_LAB: 'PASSED' },
      },
      telemetry: {
        ...s.telemetry,
        temperature: 25,
        smokeDetected: false,
      },
      zoneRecovery: {
        ...s.zoneRecovery,
        RESEARCH_LAB: { state: 'RECOVERY_PERMITTED', progress: 0 },
      },
    }));

    let actions = useSentinelStore.getState().getPendingOperatorActions();
    expect(actions.some(a => a.stage === 'EQUIPMENT_RECOVERY' && a.zoneId === 'RESEARCH_LAB')).toBe(true);

    // Perform recovery
    useSentinelStore.getState().recoverZoneEquipment('RESEARCH_LAB');

    // Queue must now be free of this recovery action
    actions = useSentinelStore.getState().getPendingOperatorActions();
    expect(actions.some(a => a.stage === 'EQUIPMENT_RECOVERY' && a.zoneId === 'RESEARCH_LAB')).toBe(false);
  });

  it('Test 10: Navigation never automatically executes restoration or any consequential action', () => {
    useSentinelStore.setState(s => ({
      currentView: 'operations',
      activeIncidents: [],
      hazardEnv: {
        ...s.hazardEnv,
        fireIgnited: false,
        fireIntensity: 0,
        inspectionStatus: { RESEARCH_LAB: 'PASSED' },
      },
      telemetry: {
        ...s.telemetry,
        temperature: 25,
        smokeDetected: false,
      },
      zoneRecovery: {
        ...s.zoneRecovery,
        RESEARCH_LAB: { state: 'RECOVERY_PERMITTED', progress: 0 },
      },
    }));

    const recoveryAction = useSentinelStore.getState().getPendingOperatorActions().find(a => a.stage === 'EQUIPMENT_RECOVERY');
    expect(recoveryAction).toBeDefined();

    // Operator clicks Guided Navigation button
    useSentinelStore.getState().navigateToGuidedAction(recoveryAction!);

    // State after navigation: recovery MUST NOT be executed automatically!
    const recState = useSentinelStore.getState().zoneRecovery.RESEARCH_LAB;
    expect(recState.state).toBe('RECOVERY_PERMITTED');
    expect(recState.progress).toBe(0);

    const opState = useSentinelStore.getState().getZoneOperationalState('RESEARCH_LAB');
    expect(opState.recoveryLifecycleState).toBe('RECOVERY_PERMITTED');
    expect(opState.canRestoreEquipment).toBe(true);
  });
});
