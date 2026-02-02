import { BLEPacket } from './packetParser';
import { BLEOpcode } from './bleConstants';

export type QueueMatchStrategy = (packet: BLEPacket) => 'finish' | 'continue' | 'ignore';

export interface BLECommandOptions {
  timeout?: number;
  strategy?: QueueMatchStrategy;
  expectResponse?: boolean; // If false, resolve immediately after write
}

export interface BLECommandRequest {
  opcode: BLEOpcode;
  payload: Uint8Array;
  resolve: (packet: BLEPacket | BLEPacket[]) => void;
  reject: (error: Error) => void;
  timestamp: number;
  options?: BLECommandOptions;
  accumulatedPackets: BLEPacket[];
}

export class BLEQueue {
  private queue: BLECommandRequest[] = [];
  private isProcessing: boolean = false;
  private currentRequest: BLECommandRequest | null = null;
  private timeoutId: NodeJS.Timeout | null = null;
  private readonly DEFAULT_TIMEOUT_MS = 5000;
  private readonly DELAY_BETWEEN_COMMANDS_MS = 250;

  private processNext: () => Promise<void>;

  constructor(processCallback: (request: BLECommandRequest) => Promise<void>) {
    this.processNext = async () => {
      if (this.isProcessing || this.queue.length === 0) {
        return;
      }

      this.isProcessing = true;
      const request = this.queue.shift();

      if (request) {
        this.currentRequest = request;

        const timeoutMs = request.options?.timeout || this.DEFAULT_TIMEOUT_MS;

        // Set timeout
        this.timeoutId = setTimeout(() => {
          if (this.currentRequest === request) {
            request.reject(
              new Error(`Timeout waiting for response to opcode 0x${request.opcode.toString(16)}`)
            );
            this.currentRequest = null;
            this.isProcessing = false;
            // Delay before next command
            setTimeout(() => this.processNext(), this.DELAY_BETWEEN_COMMANDS_MS);
          }
        }, timeoutMs);

        try {
          await processCallback(request);

          if (request.options?.expectResponse === false) {
            if (this.timeoutId) clearTimeout(this.timeoutId);
            request.resolve([]); // Resolve empty array for fire-and-forget
            this.currentRequest = null;
            this.isProcessing = false;
            // Delay before next command
            setTimeout(() => this.processNext(), this.DELAY_BETWEEN_COMMANDS_MS);
          }
        } catch (error) {
          // If sending fails immediately
          if (this.timeoutId) clearTimeout(this.timeoutId);
          request.reject(error as Error);
          this.currentRequest = null;
          this.isProcessing = false;
          // Delay before next command
          setTimeout(() => this.processNext(), this.DELAY_BETWEEN_COMMANDS_MS);
        }
      } else {
        this.isProcessing = false;
      }
    };
  }

  public add(
    opcode: BLEOpcode,
    payload: Uint8Array,
    options?: BLECommandOptions
  ): Promise<BLEPacket | BLEPacket[]> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        opcode,
        payload,
        resolve,
        reject,
        timestamp: Date.now(),
        options,
        accumulatedPackets: [],
      });
      this.processNext();
    });
  }

  public handleResponse(packet: BLEPacket) {
    if (this.currentRequest) {
      let strategy: QueueMatchStrategy;

      if (this.currentRequest.options?.strategy) {
        strategy = this.currentRequest.options.strategy;
      } else {
        // Default strategy: Expect single response logic
        strategy = (pkt) =>
          this.isResponseTo(this.currentRequest!.opcode, pkt.opcode) ? 'finish' : 'ignore';
      }

      const decision = strategy(packet);

      if (decision === 'finish') {
        if (this.timeoutId) clearTimeout(this.timeoutId);

        const req = this.currentRequest;
        // Resolve promise with the final packet or accumulated ones
        if (req.accumulatedPackets.length > 0) {
          req.accumulatedPackets.push(packet);
          req.resolve(req.accumulatedPackets);
        } else {
          req.resolve(packet);
        }

        this.currentRequest = null;
        this.isProcessing = false;
        // Process next immediately (with delay)
        setTimeout(() => this.processNext(), this.DELAY_BETWEEN_COMMANDS_MS);
      } else if (decision === 'continue') {
        // Restart timeout for streams (sliding timeout)
        if (this.timeoutId) clearTimeout(this.timeoutId);
        const timeoutMs = this.currentRequest.options?.timeout || this.DEFAULT_TIMEOUT_MS;

        // Need to capture the specific request instance for the timeout closure
        const req = this.currentRequest;

        this.timeoutId = setTimeout(() => {
          if (this.currentRequest === req) {
            req.reject(new Error(`Timeout waiting for stream (stalled)`));
            this.currentRequest = null;
            this.isProcessing = false;
            this.processNext();
          }
        }, timeoutMs);

        this.currentRequest.accumulatedPackets.push(packet);
      }
      // if 'ignore', do nothing and let other listeners handle it
    }
  }

  private isResponseTo(requestOpcode: number, responseOpcode: number): boolean {
    if (requestOpcode === responseOpcode) return true;

    // Common mappings based on bleConstants
    if (
      requestOpcode === BLEOpcode.OPEN_DOOR &&
      [BLEOpcode.VALID_OPEN_CODE, BLEOpcode.INVALID_OPEN_CODE].includes(responseOpcode)
    )
      return true;
    if (
      requestOpcode === BLEOpcode.ASK_DOOR_STATUS &&
      [BLEOpcode.NOTIFY_DOOR_STATUS, BLEOpcode.ANSWER_DOOR_STATUS].includes(responseOpcode)
    )
      return true;

    if (
      requestOpcode === BLEOpcode.GET_LOGS_COUNT &&
      responseOpcode === BLEOpcode.NOTIFY_LOGS_COUNT
    )
      return true;

    if (requestOpcode === BLEOpcode.COUNT_CODES && responseOpcode === BLEOpcode.NOTIFY_CODES_COUNT)
      return true;

    // Configuration
    const configOps = [
      BLEOpcode.CREATE_MASTER_CODE,
      BLEOpcode.CREATE_SINGLE_USE_CODE,
      BLEOpcode.CREATE_MULTI_USE_CODE,
      BLEOpcode.DELETE_MASTER_CODE,
      BLEOpcode.DELETE_SINGLE_USE_CODE,
      BLEOpcode.DELETE_MULTI_USE_CODE,
      BLEOpcode.REACTIVATE_CODE,
    ];

    if (
      configOps.includes(requestOpcode) &&
      [BLEOpcode.CODE_OPERATION_SUCCESS, BLEOpcode.CODE_OPERATION_ERROR].includes(responseOpcode)
    )
      return true;

    // Special case: COUNT_CODES may receive NOTIFY_LOGS_COUNT
    if (requestOpcode === BLEOpcode.COUNT_CODES && responseOpcode === BLEOpcode.NOTIFY_LOGS_COUNT)
      return true;

    // Generic Error
    if (
      responseOpcode === BLEOpcode.ERROR_COMMAND_NOT_SUPPORTED ||
      responseOpcode === BLEOpcode.LOG_EVENT_ERROR ||
      responseOpcode === BLEOpcode.ERROR_BAD_REQUEST ||
      responseOpcode === BLEOpcode.ERROR_UNAUTHORIZED ||
      responseOpcode === BLEOpcode.CODE_OPERATION_ERROR ||
      responseOpcode === BLEOpcode.ERROR_CRC
    ) {
      return true;
    }

    return false;
  }

  public clear() {
    this.queue = [];
    if (this.timeoutId) clearTimeout(this.timeoutId);
    this.isProcessing = false;
    this.currentRequest = null;
  }
}
