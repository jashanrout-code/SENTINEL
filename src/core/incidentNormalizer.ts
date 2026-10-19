import type { IncidentRecord } from '../types';

/**
 * Normalizes any incident record (legacy, hydrated, or malformed) to guarantee
 * one canonical acknowledgement truth across all systems.
 *
 * Rules:
 * 1. An incident is acknowledged ONLY if it has a reliable positive numeric timestamp `acknowledgedAt`.
 *    If `acknowledgedAt` is a numeric string or ISO string, it is parsed. If invalid or missing, it is null.
 * 2. If reliable acknowledgement is present:
 *    - `acknowledgedAt` = numeric timestamp (> 0)
 *    - `acknowledgedBy` = record.acknowledgedBy || 'Control Room Operator'
 *    - `operatorAcknowledged` = true
 *    - If `state === 'ACTIVE_UNACKNOWLEDGED'`, sync to `record.conditionActive ? 'ACTIVE_ACKNOWLEDGED' : 'CONDITION_CLEARED'`
 * 3. If reliable acknowledgement is NOT present:
 *    - `acknowledgedAt` = null
 *    - `acknowledgedBy` = null
 *    - `operatorAcknowledged` = false
 *    - If `state === 'ACTIVE_ACKNOWLEDGED'`, sync to `record.conditionActive ? 'ACTIVE_UNACKNOWLEDGED' : 'CONDITION_CLEARED'`
 * 4. Ensures all required fields exist so legacy records cannot remain permanently locked.
 */
export function normalizeIncidentRecord(raw: Partial<IncidentRecord> & Record<string, any>): IncidentRecord {
  if (!raw || typeof raw !== 'object') {
    throw new Error('normalizeIncidentRecord: expected an object');
  }

  // Parse acknowledgedAt if provided as number or valid timestamp string
  let validAckTimestamp: number | null = null;
  if (typeof raw.acknowledgedAt === 'number' && !isNaN(raw.acknowledgedAt) && raw.acknowledgedAt > 0) {
    validAckTimestamp = raw.acknowledgedAt;
  } else if (typeof raw.acknowledgedAt === 'string') {
    const parsed = Number(raw.acknowledgedAt);
    if (!isNaN(parsed) && parsed > 0) {
      validAckTimestamp = parsed;
    } else {
      const parsedDate = Date.parse(raw.acknowledgedAt);
      if (!isNaN(parsedDate) && parsedDate > 0) {
        validAckTimestamp = parsedDate;
      }
    }
  }

  const conditionActive = Boolean(raw.conditionActive);
  const detectedAt = typeof raw.detectedAt === 'number' && raw.detectedAt > 0
    ? raw.detectedAt
    : Date.now();

  let state = raw.state;
  let acknowledgedBy: string | null = null;
  let operatorAcknowledged = false;

  if (validAckTimestamp !== null) {
    operatorAcknowledged = true;
    acknowledgedBy = typeof raw.acknowledgedBy === 'string' && raw.acknowledgedBy.trim()
      ? raw.acknowledgedBy
      : 'Control Room Operator';
    if (state === 'ACTIVE_UNACKNOWLEDGED' || !state) {
      state = conditionActive ? 'ACTIVE_ACKNOWLEDGED' : 'CONDITION_CLEARED';
    }
  } else {
    validAckTimestamp = null;
    acknowledgedBy = null;
    operatorAcknowledged = false;
    if (state === 'ACTIVE_ACKNOWLEDGED' || !state) {
      state = conditionActive ? 'ACTIVE_UNACKNOWLEDGED' : 'CONDITION_CLEARED';
    }
  }

  return {
    ...raw,
    id: raw.id || `INC-${Date.now()}`,
    category: raw.category || 'FIRE',
    zoneId: raw.zoneId || 'RESEARCH_LAB',
    priority: typeof raw.priority === 'number' ? raw.priority : 1,
    detectedAt,
    acknowledgedAt: validAckTimestamp,
    acknowledgedBy,
    resolvedAt: typeof raw.resolvedAt === 'number' ? raw.resolvedAt : null,
    state,
    conditionActive,
    details: raw.details || raw.description || 'Emergency incident recorded.',
    responses: raw.responses || {},
    operatorAcknowledged,
  };
}

export function normalizeIncidentList(records: Array<Partial<IncidentRecord> & Record<string, any>>): IncidentRecord[] {
  if (!Array.isArray(records)) return [];
  return records.map(normalizeIncidentRecord);
}
