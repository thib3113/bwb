import { ReactNode, useCallback, useMemo, useState } from 'react';
import { AddCodePayload, BoksTask, TaskType } from '../types/task';
import { useBLEConnection } from '../hooks/useBLEConnection';
import { useDevice } from '../hooks/useDevice';
import { TaskContext } from './Contexts';
import { useTaskRunner } from '../hooks/useTaskRunner';

export const TaskProvider = ({ children }: { children: ReactNode }) => {
  const { isConnected, controller } = useBLEConnection();
  const { activeDevice } = useDevice();
  const autoSync = activeDevice?.auto_sync ?? false;

  // In-memory state for tasks
  const [tasks, setTasks] = useState<BoksTask[]>([]);
  // Exposed processing state
  const [isProcessing, setIsProcessing] = useState(false);

  // State to track manual sync requests
  const [manualSyncRequestId, setManualSyncRequestId] = useState<string | null>(null);

  const syncTasks = useCallback(async () => {
    console.log('[TaskContext] Manual sync requested');
    setManualSyncRequestId(crypto.randomUUID());
  }, []);

  // Add a new task to the queue
  const addTask = useCallback(
    (taskData: Omit<BoksTask, 'id' | 'createdAt' | 'attempts' | 'status'>) => {
      // For ADD_MASTER_CODE tasks, automatically add a DELETE_CODE task first
      if (taskData.type === TaskType.ADD_MASTER_CODE) {
        // Create the delete task with the same configKey and index from payload
        // IMPORTANT: Do NOT include codeId in payload for this automatic cleanup task.
        // This prevents the 'phantom delete' issue where the new code is deleted from DB.
        const deleteTask: BoksTask = {
          ...taskData,
          id: crypto.randomUUID(),
          createdAt: new Date(),
          attempts: 0,
          status: 'pending',
          sync_status: 'created',
          type: TaskType.DELETE_CODE,
          priority: 0, // Highest priority
          payload: {
            ...(taskData.payload as AddCodePayload),
            codeId: undefined, // Explicitly remove codeId
            codeType: 'master',
            index: (taskData.payload as AddCodePayload).index // PASS THE INDEX HERE!
          }
        } as unknown as BoksTask;

        // Create the add task
        const addTask: BoksTask = {
          ...taskData,
          id: crypto.randomUUID(),
          createdAt: new Date(),
          attempts: 0,
          status: 'pending',
          sync_status: 'created'
        } as unknown as BoksTask;

        // Add both tasks to the queue
        setTasks((prevTasks) => [...prevTasks, deleteTask, addTask]);
      } else {
        // For all other tasks, add normally
        const task: BoksTask = {
          ...taskData,
          id: crypto.randomUUID(),
          createdAt: new Date(),
          attempts: 0,
          status: 'pending',
          sync_status: 'created'
        } as unknown as BoksTask;

        setTasks((prevTasks) => [...prevTasks, task]);
      }
    },
    []
  );

  // Retry a failed task
  const retryTask = useCallback((taskId: string) => {
    setTasks((prevTasks) =>
      prevTasks.map((t) =>
        t.id === taskId ? { ...t, status: 'pending', attempts: 0, error: undefined } : t
      )
    );
  }, []);

  // Use the extracted Task Runner hook
  useTaskRunner({
    tasks,
    setTasks,
    isConnected,
    controller, // Pass controller
    setIsProcessing,
    activeDevice,
    autoSync,
    manualSyncRequestId,
    setManualSyncRequestId
  });

  const value = useMemo(
    () => ({
      addTask,
      retryTask,
      tasks,
      syncTasks,
      isProcessing
    }),
    [addTask, retryTask, tasks, syncTasks, isProcessing]
  );

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
};
