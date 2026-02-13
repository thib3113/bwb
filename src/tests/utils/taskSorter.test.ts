import { describe, it, expect } from 'vitest';
import { sortTasks } from '../../utils/taskSorter';
import { BoksTask, TaskType } from '../../types/task';
import { CODE_TYPE } from '../../types';

const mockTask = (overrides: Partial<BoksTask>): BoksTask => ({
  id: 'test-id',
  createdAt: new Date(),
  attempts: 0,
  status: 'pending',
  deviceId: 'device-id',
  priority: 5,
  type: TaskType.SYNC_CODES,
  payload: {},
  ...overrides
} as BoksTask);

describe('taskSorter', () => {
  it('should sort tasks by priority (lowest number first)', () => {
    const tasks = [
      mockTask({ id: '1', priority: 10 }),
      mockTask({ id: '2', priority: 1 }),
      mockTask({ id: '3', priority: 5 })
    ];

    const sorted = sortTasks(tasks);

    expect(sorted.map(t => t.id)).toEqual(['2', '3', '1']);
  });

  it('should prioritize DELETE_CODE over ADD tasks with same priority', () => {
    const tasks = [
      mockTask({ id: '1', type: TaskType.ADD_SINGLE_USE_CODE, priority: 5 }),
      mockTask({ id: '2', type: TaskType.DELETE_CODE, priority: 5 })
    ];

    const sorted = sortTasks(tasks);

    expect(sorted.map(t => t.id)).toEqual(['2', '1']);
  });

  it('should sort ADD tasks by opcode priority', () => {
    const tasks = [
      mockTask({ id: 'multi', type: TaskType.ADD_MULTI_USE_CODE, priority: 5 }),
      mockTask({ id: 'master', type: TaskType.ADD_MASTER_CODE, priority: 5 }),
      mockTask({ id: 'single', type: TaskType.ADD_SINGLE_USE_CODE, priority: 5 })
    ];

    const sorted = sortTasks(tasks);

    // Order: Master (1) -> Single (2) -> Multi (3)
    expect(sorted.map(t => t.id)).toEqual(['master', 'single', 'multi']);
  });

  it('should sort DELETE tasks by opcode priority', () => {
    const tasks = [
      mockTask({
        id: 'del-multi',
        type: TaskType.DELETE_CODE,
        priority: 5,
        payload: { codeType: CODE_TYPE.MULTI, codeId: 'del-multi' }
      }),
      mockTask({
        id: 'del-master',
        type: TaskType.DELETE_CODE,
        priority: 5,
        payload: { codeType: CODE_TYPE.MASTER, codeId: 'del-master' }
      }),
      mockTask({
        id: 'del-single',
        type: TaskType.DELETE_CODE,
        priority: 5,
        payload: { codeType: CODE_TYPE.SINGLE, codeId: 'del-single' }
      })
    ];

    const sorted = sortTasks(tasks);

    // Order: Master (1) -> Single (2) -> Multi (3)
    expect(sorted.map(t => t.id)).toEqual(['del-master', 'del-single', 'del-multi']);
  });

  it('should handle complex mixed sorting', () => {
    const tasks = [
      mockTask({ id: 'p10', priority: 10 }),
      mockTask({ id: 'p1-add', type: TaskType.ADD_MASTER_CODE, priority: 1 }),
      mockTask({ id: 'p1-del', type: TaskType.DELETE_CODE, priority: 1, payload: { codeType: CODE_TYPE.SINGLE, codeId: 'p1-del' } })
    ];

    const sorted = sortTasks(tasks);

    expect(sorted.map(t => t.id)).toEqual(['p1-del', 'p1-add', 'p10']);
  });
});
