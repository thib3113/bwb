import { useEffect, useRef } from 'react';
import { BoksTask } from '../types/task';
import { TaskExecutorService } from '../services/TaskExecutorService';
import { BoksDevice } from '../types';
import { BoksController } from '@thib3113/boks-sdk';

interface UseTaskRunnerProps {
  tasks: BoksTask[];
  setTasks: React.Dispatch<React.SetStateAction<BoksTask[]>>;
  isConnected: boolean;
  controller: BoksController | null;
  setIsProcessing: (val: boolean) => void;
  activeDevice: BoksDevice | null;
  autoSync: boolean;
  manualSyncRequestId: string | null;
  setManualSyncRequestId: (val: string | null) => void;
}

export const useTaskRunner = ({
  tasks,
  setTasks,
  isConnected,
  controller,
  setIsProcessing,
  activeDevice,
  manualSyncRequestId,
  setManualSyncRequestId
}: UseTaskRunnerProps) => {
  const processingRef = useRef(false);

  useEffect(() => {
    const pendingTasks = tasks.filter((t) => t.status === 'pending');
    if (pendingTasks.length === 0) return;

    if (!isConnected || !activeDevice || !controller) return;

    // Check autoSync or manual request?
    // If autoSync is false, maybe we wait for manual request?
    // But usually tasks added by user (Add Code) should run immediately if connected.
    // Let's assume manualSync is for full syncs, but specific tasks run always.

    if (processingRef.current) return;

    const processQueue = async () => {
      processingRef.current = true;
      setIsProcessing(true);

      try {
        // Sort by priority (0 is highest) then createdAt
        const sortedPending = [...pendingTasks].sort((a, b) => {
          const pA = a.priority ?? 10;
          const pB = b.priority ?? 10;
          if (pA !== pB) return pA - pB;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });

        const currentTask = sortedPending[0];

        // Mark processing
        setTasks((prev) =>
          prev.map((t) =>
            t.id === currentTask.id
              ? { ...t, status: 'processing', attempts: (t.attempts || 0) + 1 }
              : t
          )
        );

        try {
          // Execute
          await TaskExecutorService.execute(currentTask, activeDevice, controller);

          // Mark completed
          setTasks((prev) =>
            prev.map((t) => (t.id === currentTask.id ? { ...t, status: 'completed' } : t))
          );
        } catch (e: any) {
          console.error(`Task ${currentTask.type} failed`, e);
          // Mark failed
          setTasks((prev) =>
            prev.map((t) =>
              t.id === currentTask.id ? { ...t, status: 'failed', error: e.message } : t
            )
          );
        }
      } catch (e) {
        console.error('Queue processing error', e);
      } finally {
        processingRef.current = false;
        setIsProcessing(false);
      }
    };

    processQueue();
  }, [tasks, isConnected, controller, activeDevice, setTasks, setIsProcessing]);

  // Handle manual sync request reset
  useEffect(() => {
    if (manualSyncRequestId) {
      setManualSyncRequestId(null);
    }
  }, [manualSyncRequestId, setManualSyncRequestId]);
};
