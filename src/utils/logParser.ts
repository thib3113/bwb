import { BoksLog } from '../types';
import { isLogPayload, parsePayload } from './payloadParser';

export interface ParsedLog extends BoksLog {
  eventType: string;
  description: string;
  details: Record<string, unknown>;
}

export interface ParseLogOptions {
  preserveTimestamp?: boolean;
}

/**
 * Parses a single log entry.
 * Note: If payload/raw are missing, it provides minimal info.
 */
export function parseLog(log: Partial<BoksLog>, options?: ParseLogOptions): ParsedLog {
  const opcode = log.opcode ?? 0;
  const payload = log.payload ?? new Uint8Array(0);
  const raw = log.raw ?? new Uint8Array(0);

  const payloadInstance = parsePayload(opcode, payload, raw);

  const baseLog: BoksLog = {
    device_id: log.device_id ?? 'unknown',
    timestamp: log.timestamp ?? new Date().toISOString(),
    event: log.event ?? 'UNKNOWN',
    type: log.type ?? 'info',
    opcode,
    payload,
    raw,
    synced: log.synced ?? false,
    ...log
  };

  if (isLogPayload(payloadInstance)) {
    // If preserveTimestamp is true and we have a timestamp in the input log, use it.
    // Otherwise use the recalculated timestamp from payloadInstance (based on age).
    const timestampToUse = (options?.preserveTimestamp && log.timestamp)
      ? String(log.timestamp)
      : payloadInstance.timestamp;

    return {
      ...baseLog,
      eventType: payloadInstance.constructor.name.replace('LogPayload', '').toLowerCase(),
      timestamp: timestampToUse,
      description: payloadInstance.description,
      details: payloadInstance.toDetails()
    };
  }

  // Fallback for unknown opcodes
  return {
    ...baseLog,
    eventType: 'unknown',
    description: 'logs:events.unknown',
    details: { opcode: baseLog.opcode }
  };
}

/**
 * Parses multiple log entries
 */
export function parseLogs(logs: BoksLog[], options?: ParseLogOptions): ParsedLog[] {
  return logs.map((log) => parseLog(log, options));
}
