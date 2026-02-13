import { useEffect, useRef } from 'react';
import { BoksTask, TaskType } from '../types/task';
import { BoksDevice } from '../types';
import { sortTasks } from '../utils/taskSorter';
import { TaskExecutorService, SendRequestFn } from '../services/TaskExecutorService';
import { BoksTXPacket } from '../ble/packets/BoksTXPacket';
import { BLEPacket } from '../utils/packetParser';

interface UseTaskRunnerProps {
  tasks: BoksTask[];
  setTasks: React.Dispatch<React.SetStateAction<BoksTask[]>>;
  isConnected: boolean;
  setIsProcessing: (isProcessing: boolean) => void;
  activeDevice: BoksDevice | null;
  sendRequest: (packet: BoksTXPacket) => Promise<BLEPacket | BLEPacket[]>;
  autoSync: boolean;
  manualSyncRequestId: string | null;
  setManualSyncRequestId: (id: string | null) => void;
}

export const useTaskRunner = ({
  tasks,
  setTasks,
  isConnected,
  setIsProcessing,
  activeDevice,
  sendRequest,
  autoSync,
  manualSyncRequestId,
  setManualSyncRequestId
}: UseTaskRunnerProps) => {
  // Ref for tracking processing state to avoid duplicate execution
  const isProcessingRef = useRef(false);

  useEffect(() => {
    if (!isConnected) return;
    if (isProcessingRef.current) return;

    // Get pending tasks to check if we should even start
    const pendingTasks = tasks.filter((task) => task.status === 'pending');

    // Check if queue is empty
    if (pendingTasks.length === 0) {
      if (manualSyncRequestId) {
        console.log('[TaskRunner] All tasks processed, resetting manual sync request');
        setManualSyncRequestId(null);
      }
      return;
    }

    // Auto Sync Check
    if (!autoSync && !manualSyncRequestId) {
      // Check for urgent tasks (Unlock/Lock)
      const hasUrgentTasks = pendingTasks.some(
        (t) => t.type === TaskType.UNLOCK_DOOR || t.type === TaskType.LOCK_DOOR
      );

      if (!hasUrgentTasks) {
        return;
      }
    }

    const processNextTask = async () => {
      isProcessingRef.current = true;
      setIsProcessing(true);

      // Re-evaluate pending and sort within the async execution
      const currentPending = tasks.filter((t) => t.status === 'pending');
      if (currentPending.length === 0) {
        isProcessingRef.current = false;
        setIsProcessing(false);
        return;
      }

      const sorted = sortTasks(currentPending);
      const taskToRun = sorted[0];

      // Urgency check inside async context
      if (!autoSync && !manualSyncRequestId) {
        if (taskToRun.type !== TaskType.UNLOCK_DOOR && taskToRun.type !== TaskType.LOCK_DOOR) {
          isProcessingRef.current = false;
          setIsProcessing(false);
          return;
        }
      }

      if (!activeDevice) {
        isProcessingRef.current = false;
        setIsProcessing(false);
        return;
      }

      try {
        console.log(`[TaskRunner] Executing task: ${taskToRun.type}`, taskToRun.payload);

        // Mark as processing if needed?
        // TaskContext didn't explicitly set 'processing' status in state, only completed/failed.
        // But logic suggests we might want to?
        // TaskContext used 'isProcessing' boolean.
        // But the prompt says: "Updates the task status (pending -> processing -> completed/failed)"
        // So I should update to 'processing'.

        setTasks((prevTasks) =>
          prevTasks.map((t) => (t.id === taskToRun.id ? { ...t, status: 'processing' } : t))
        );

        await TaskExecutorService.execute(
          taskToRun,
          activeDevice,
          sendRequest as unknown as SendRequestFn
        );

        console.log(`[TaskRunner] Task completed: ${taskToRun.type}`);

        setTasks((prevTasks) =>
          prevTasks.map((t) => (t.id === taskToRun.id ? { ...t, status: 'completed' } : t))
        );
      } catch (err) {
        console.error('[TaskRunner] Task processing error:', err);

        setTasks((prevTasks) =>
          prevTasks.map((t) =>
            t.id === taskToRun.id
              ? {
                  ...t,
                  status: 'failed',
                  error: err instanceof Error ? err.message : String(err),
                  attempts: t.attempts + 1
                }
              : t
          )
        );

        // Wait 2s before allowing next task
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } finally {
        isProcessingRef.current = false;
        setIsProcessing(false);
      }
    };

    processNextTask();
  }, [
    isConnected,
    tasks,
    activeDevice,
    autoSync,
    manualSyncRequestId,
    sendRequest,
    setTasks,
    setIsProcessing,
    setManualSyncRequestId
  ]);
};
