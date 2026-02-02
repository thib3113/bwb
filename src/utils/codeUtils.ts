import { BoksCode } from '../types';
import { CODE_STATUS } from '../constants/codeStatus';
import { CODE_TYPES } from './constants';

// Helper for secure random index
const getSecureRandomIndex = (max: number): number => {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % max;
};

// Fonction pour générer un code aléatoire de 6 caractères (0-9, A, B)
export const generateCode = (): string => {
  const characters = '0123456789AB';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(getSecureRandomIndex(characters.length));
  }
  return result;
};

// Fonction pour valider un code (longueur 6, caractères 0-9, A, B)
export const validateCode = (code: string | null | undefined): boolean => {
  if (!code || code.length !== 6) {
    return false;
  }
  const validCharacters = /^[0-9AB]+$/;
  return validCharacters.test(code);
};

// Fonction pour formater un code (nettoyer l'entrée)
export const formatCode = (input: string | null | undefined): string => {
  if (!input) return '';
  // Convertir en majuscules et supprimer les caractères non valides
  return input.toUpperCase().replace(/[^0-9AB]/g, '');
};

/**
 * Sorts codes by priority and creation date.
 * Optimized using Schwartzian transform to avoid repeated Date parsing.
 */
export const sortCodes = (codes: BoksCode[]): BoksCode[] => {
  const getPriority = (code: BoksCode) => {
    // Priority 1: Pending codes (PENDING_ADD, PENDING_DELETE)
    if (code.status === CODE_STATUS.PENDING_ADD || code.status === CODE_STATUS.PENDING_DELETE) {
      return 1;
    }
    // Priority 2: Active codes (ON_DEVICE and not used)
    if (code.status === CODE_STATUS.ON_DEVICE || code.status === 'synced') {
      // For single-use codes, check if they've been used
      if (code.type === CODE_TYPES.SINGLE) {
        // Note: We can't use deriveCodeMetadata here due to circular dependency
        // For now, we'll just check if it's a single-use code
      }
      // For multi-use codes, check if they've been fully used
      if (code.type === CODE_TYPES.MULTI) {
        // If uses >= maxUses, they're considered used (priority 3)
        if (
          code.uses !== undefined &&
          code.maxUses !== undefined &&
          code.uses >= code.maxUses
        ) {
          return 3;
        }
      }
      // Otherwise, they're active (priority 2)
      return 2;
    }
    // Priority 3: Used codes (default case)
    return 3;
  };

  // Map to intermediate structure
  const mapped = codes.map((code) => ({
    code,
    priority: getPriority(code),
    timestamp: new Date(code.created_at).getTime(),
  }));

  // Sort
  mapped.sort((a, b) => {
    // If priorities are different, sort by priority
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }

    // If priorities are the same, sort by creation date (descending - newest first)
    // Handle potential NaN values
    if (isNaN(a.timestamp) && isNaN(b.timestamp)) return 0;
    if (isNaN(a.timestamp)) return 1;
    if (isNaN(b.timestamp)) return -1;

    return b.timestamp - a.timestamp;
  });

  // Map back to codes
  return mapped.map((m) => m.code);
};
