export const CODE_STATUS = {
  PENDING_ADD: 'pending_add',
  ON_DEVICE: 'on_device',
  PENDING_DELETE: 'pending_delete',
  REJECTED: 'rejected',
  SYNCED: 'on_device', // Aliased to ON_DEVICE for backward compatibility
} as const;

export type CodeStatusValue = (typeof CODE_STATUS)[keyof typeof CODE_STATUS];
