import { BoksLog } from '../types';
import { isLogPayload, parsePayload } from './payloadParser';

export interface ParsedLog extends BoksLog {
  description: string;
  details: Record<string, unknown>;
}

/**
 * Parses a single log entry
 */
export function parseLog(log: BoksLog): ParsedLog {
  const payloadInstance = parsePayload(log.opcode, log.payload, log.raw);

  if (isLogPayload(payloadInstance)) {
    return {
      ...log,
      timestamp: payloadInstance.timestamp,
      description: payloadInstance.description,
      details: payloadInstance.toDetails(),
    };
  }

  // Fallback for unknown opcodes
  return {
    ...log,
    description: 'logs:events.unknown',
    details: { opcode: log.opcode },
  };
}

/**
 * Parses multiple log entries
 */
export function parseLogs(logs: BoksLog[]): ParsedLog[] {
  return logs.map(parseLog);
}
