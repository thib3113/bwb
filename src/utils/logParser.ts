import { BoksLog } from '../types';
import { isLogPayload, parsePayload } from './payloadParser';

export interface ParsedLog extends BoksLog {
  eventType: string;
  description: string;
  details: Record<string, unknown>;
}

/**
 * Parses a single log entry
 */
/**
 * Parses a single log entry.
 * Note: If payload/raw are missing, it provides minimal info.
 */
export function parseLog(log: Partial<BoksLog>): ParsedLog {
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
    return {
      ...baseLog,
      eventType: payloadInstance.constructor.name.replace('LogPayload', '').toLowerCase(),
      timestamp: payloadInstance.timestamp,
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
export function parseLogs(logs: BoksLog[]): ParsedLog[] {
  return logs.map(parseLog);
}
