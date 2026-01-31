import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { useBLE } from '../hooks/useBLE';
import { BLEOpcode } from '../utils/bleConstants';
import { BLEPacket } from '../utils/packetParser';
import { ErrorContext } from './Contexts';

export const ErrorProvider = ({ children }: { children: ReactNode }) => {
  const { addListener, removeListener, log } = useBLE();
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    const handleError = (packet: BLEPacket) => {
      let errorMessage = 'Unknown Error';
      switch (packet.opcode) {
        case BLEOpcode.ERROR_CRC:
          errorMessage = 'Erreur CRC (Checksum invalide)';
          break;
        case BLEOpcode.ERROR_UNAUTHORIZED:
          errorMessage = 'Non autorisé (Authentification requise)';
          break;
        case BLEOpcode.ERROR_BAD_REQUEST:
          errorMessage = 'Mauvaise requête (Format invalide)';
          break;
        case BLEOpcode.CODE_OPERATION_ERROR:
          errorMessage = "Erreur lors de l'opération sur le code";
          break;
        case BLEOpcode.ERROR_COMMAND_NOT_SUPPORTED:
          errorMessage = 'Commande non supportée';
          break;
        default:
          errorMessage = `Erreur BLE inconnue (Opcode: 0x${packet.opcode.toString(16).toUpperCase()})`;
      }

      log(`BLE Error: ${errorMessage}`, 'error');
      setLastError(errorMessage);
    };

    addListener(BLEOpcode.ERROR_CRC, handleError);
    addListener(BLEOpcode.ERROR_UNAUTHORIZED, handleError);
    addListener(BLEOpcode.ERROR_BAD_REQUEST, handleError);
    addListener(BLEOpcode.CODE_OPERATION_ERROR, handleError);
    addListener(BLEOpcode.ERROR_COMMAND_NOT_SUPPORTED, handleError);

    return () => {
      removeListener(BLEOpcode.ERROR_CRC, handleError);
      removeListener(BLEOpcode.ERROR_UNAUTHORIZED, handleError);
      removeListener(BLEOpcode.ERROR_BAD_REQUEST, handleError);
      removeListener(BLEOpcode.CODE_OPERATION_ERROR, handleError);
      removeListener(BLEOpcode.ERROR_COMMAND_NOT_SUPPORTED, handleError);
    };
  }, [addListener, removeListener, log]);

  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  const value = useMemo(() => ({ lastError, clearError }), [lastError, clearError]);

  return <ErrorContext.Provider value={value}>{children}</ErrorContext.Provider>;
};
