import { useCodeContext } from './useCodeContext';

export const useBLECodes = () => {
  const { createCode, deleteCode, onCodeUsed } = useCodeContext();
  return { createCode, deleteCode, onCodeUsed };
};
