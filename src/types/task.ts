import { SyncStatus, CodeType } from './index';

export enum TaskType {
  ADD_MASTER_CODE = 'ADD_MASTER_CODE',
  ADD_SINGLE_USE_CODE = 'ADD_SINGLE_USE_CODE',
  ADD_MULTI_USE_CODE = 'ADD_MULTI_USE_CODE',
  DELETE_CODE = 'DELETE_CODE',
  SYNC_CODES = 'SYNC_CODES',
  GET_LOGS = 'GET_LOGS',
  GET_BATTERY_LEVEL = 'GET_BATTERY_LEVEL',
  UNLOCK_DOOR = 'UNLOCK_DOOR',
  LOCK_DOOR = 'LOCK_DOOR',
  GET_DOOR_STATUS = 'GET_DOOR_STATUS',
}

export interface BaseTask {
  id: string; // UUID
  createdAt: Date;
  attempts: number;
  lastAttemptAt?: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  deviceId: string;
  priority: number; // 0 = highest priority
  sync_status?: SyncStatus;
  updated_at?: number;
}

export interface AddCodePayload {
  code: string;
  codeId: string;
  name?: string;
  index?: number; // For master codes
  maxUses?: number; // For multi-use codes
  [key: string]: unknown;
}

export interface DeleteCodePayload {
  codeId: string;
  codeType: CodeType;
  code?: string; // Sometimes needed for deletion if not in DB
  [key: string]: unknown;
}

export interface AddMasterCodeTask extends BaseTask {
  type: TaskType.ADD_MASTER_CODE;
  payload: AddCodePayload;
}

export interface AddSingleUseCodeTask extends BaseTask {
  type: TaskType.ADD_SINGLE_USE_CODE;
  payload: AddCodePayload;
}

export interface AddMultiUseCodeTask extends BaseTask {
  type: TaskType.ADD_MULTI_USE_CODE;
  payload: AddCodePayload;
}

export interface DeleteCodeTask extends BaseTask {
  type: TaskType.DELETE_CODE;
  payload: DeleteCodePayload;
}

export interface GenericTask extends BaseTask {
  type:
    | TaskType.SYNC_CODES
    | TaskType.GET_LOGS
    | TaskType.GET_BATTERY_LEVEL
    | TaskType.UNLOCK_DOOR
    | TaskType.LOCK_DOOR
    | TaskType.GET_DOOR_STATUS;
  payload: Record<string, unknown>;
}

export type BoksTask =
  | AddMasterCodeTask
  | AddSingleUseCodeTask
  | AddMultiUseCodeTask
  | DeleteCodeTask
  | GenericTask;
