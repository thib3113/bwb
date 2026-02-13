import { BoksTask, TaskType } from '../types/task';
import { CODE_TYPE } from '../types';

export const sortTasks = (tasks: BoksTask[]): BoksTask[] => {
  return [...tasks].sort((a, b) => {
    // First sort by priority
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }

    // Then sort by task type: DELETE before ADD
    const isDeleteA = a.type === TaskType.DELETE_CODE;
    const isDeleteB = b.type === TaskType.DELETE_CODE;

    // If one is delete and the other is not, delete comes first
    if (isDeleteA && !isDeleteB) return -1;
    if (!isDeleteA && isDeleteB) return 1;

    // For ADD tasks, sort by opcode (ADD_MASTER_CODE, ADD_SINGLE_USE_CODE, ADD_MULTI_USE_CODE)
    if (!isDeleteA && !isDeleteB) {
      const getOpcodePriority = (task: BoksTask) => {
        switch (task.type) {
          case TaskType.ADD_MASTER_CODE:
            return 1;
          case TaskType.ADD_SINGLE_USE_CODE:
            return 2;
          case TaskType.ADD_MULTI_USE_CODE:
            return 3;
          default:
            return 4;
        }
      };
      return getOpcodePriority(a) - getOpcodePriority(b);
    }

    // Both are DELETE tasks, sort by opcode (DELETE_MASTER_CODE, DELETE_SINGLE_USE_CODE, DELETE_MULTI_USE_CODE)
    const getDeleteOpcodePriority = (task: BoksTask) => {
      const codeType = task.payload.codeType as CODE_TYPE;
      switch (codeType) {
        case CODE_TYPE.MASTER:
          return 1; // DELETE_MASTER_CODE (0x0C)
        case CODE_TYPE.SINGLE:
          return 2; // DELETE_SINGLE_USE_CODE (0x0D)
        case CODE_TYPE.MULTI:
          return 3; // DELETE_MULTI_USE_CODE (0x0E)
        default:
          return 4;
      }
    };
    return getDeleteOpcodePriority(a) - getDeleteOpcodePriority(b);
  });
};
