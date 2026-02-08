/// <reference types="web-bluetooth" />
import { useEffect, useRef, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Container,
  Divider,
  LinearProgress,
  Paper,
  Stack,
  Typography
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { SecureDfu, SecureDfuPackage } from '@thib3113/web-bluetooth-dfu';
import { useBLEConnection } from '../hooks/useBLEConnection';
import { BluetoothDevice } from '../types';

// Hardcoded Constants from requirements
const BOKS_SERVICE_UUID = 'a7630001-f491-4f21-95ea-846ba586e361';
const DFU_SERVICE_UUID = 0XFE59;
const BATTERY_SERVICE_UUID = 0X180F;
const DEVICE_INFO_SERVICE_UUID = 0X180A;
const GENERIC_ACCESS_SERVICE_UUID = 0x1800;
const DEVICE_NAME_CHAR_UUID = 0X2A00;
const SW_REV_CHAR_UUID = 0X2A28;
const HW_REV_CHAR_UUID = 0X2A26;
const BATTERY_THRESHOLD = 20;

const DFU_ERRORS: Record<number, string> = {
  0x01: 'Invalid Opcode',
  0x02: 'Opcode not supported',
  0x03: 'Invalid parameter',
  0x04: 'Insufficient resources',
  0x05: 'Invalid Object (Corrupt or wrong type)',
  0x07: 'Unsupported type',
  0x08: 'Operation not permitted (Wrong state)',
  0X0A: 'Payload size exceeded',
  0X0B: 'Hash failed (Integrity error)',
  0X0C: 'Signature failed (Authentication error)',
  0X0D: 'Hardware version error (Wrong firmware for this PCB)',
  0X0E: 'Software version error (Downgrade blocked)'
};

export const DfuUpdatePage = () => {
  const { t } = useTranslation('dfu');
  const [searchParams] = useSearchParams();
  const { disconnect: disconnectGlobal } = useBLEConnection();

  // URL Parameters
  const targetPcb = searchParams.get('target_pcb');
  const targetSoftware = searchParams.get('target_software');
  const targetInternalRev = searchParams.get('target_internal_rev');

  // State
  const [firmwareBlob, setFirmwareBlob] = useState<ArrayBuffer | null>(null);
  const [firmwareName, setFirmwareName] = useState<string>('');
  const [bluetoothDevice, setBluetoothDevice] = useState<BluetoothDevice | null>(null);
  const [status, setStatus] = useState<string>(t('status.ready'));
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info' | 'warning'>('info');
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [isFlashing, setIsFlashing] = useState(false);
  const [isDfuModeActive, setIsDfuModeActive] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<{
    battery: string;
    version: string;
    hw: string;
    name: string;
  }>({ battery: '-', version: '-', hw: '-', name: '-' });

  // Action Buttons State
  const [canConnect, setCanConnect] = useState(false);
  const [canStart, setCanStart] = useState(false);
  const [actionLabel, setActionLabel] = useState<string>('connect');

  // Refs for logic
  const isFlashingRef = useRef(false);

  // prevent accidental close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isFlashingRef.current) {
        e.preventDefault();
        e.returnValue = t('warnings.bricking');
        return t('warnings.bricking');
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [t]);

  const log = (msg: string, level: 'info' | 'error' | 'warning' | 'debug' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const entry = `[${timestamp}] [${level.toUpperCase()}] ${msg}`;
    console.log(entry);
    setLogs((prev) => [...prev, entry]);
  };

  const handleFileChange = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files[0]) {
      const file = target.files[0];
      try {
        const buffer = await file.arrayBuffer();
        setFirmwareBlob(buffer);
        setFirmwareName(file.name);
        log(`Firmware loaded: ${file.name} (${buffer.byteLength} bytes)`);
        setCanConnect(true);
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        log(`Failed to load file: ${errMsg}`, 'error');
        setStatus(t('errors.fw_load'));
        setStatusType('error');
      }
    }
  };

  const buf2hex = (buffer: ArrayBuffer) => {
    return Array.prototype.map
      .call(new Uint8Array(buffer), (x) => ('00' + (x as number).toString(16)).slice(-2))
      .join(' ');
  };

  const debugRead = async (characteristic: BluetoothRemoteGATTCharacteristic, label: string) => {
    const value = await characteristic.readValue();
    log(`[BLE RX] ${label}: ${buf2hex(value.buffer as ArrayBuffer)}`, 'debug');
    return value;
  };

  const readInfo = async (server: BluetoothRemoteGATTServer) => {
    const deviceName = bluetoothDevice?.name || t('labels.unknown');
    let localDfuMode = false;

    if (deviceName.includes('DfuTarg')) {
      localDfuMode = true;
      setIsDfuModeActive(true);
      setDeviceInfo((prev) => ({ ...prev, name: t('status.device_in_dfu') }));
    } else {
      setIsDfuModeActive(false);
      // Try to read device name from characteristic
      try {
        const gapSvc = await server.getPrimaryService(GENERIC_ACCESS_SERVICE_UUID);
        const nameChar = await gapSvc.getCharacteristic(DEVICE_NAME_CHAR_UUID);
        const val = await debugRead(nameChar, 'Device Name');
        const realName = new TextDecoder().decode(val).trim();
        setDeviceInfo((prev) => ({ ...prev, name: realName || deviceName }));
      } catch {
        setDeviceInfo((prev) => ({ ...prev, name: deviceName }));
      }
    }

    let batteryOk = true;
    let versionMatch = false;
    let hwOk = true;

    // Read Battery
    try {
      const batSvc = await server.getPrimaryService(BATTERY_SERVICE_UUID);
      const batChar = await batSvc.getCharacteristic(0X2A19);
      const val = await debugRead(batChar, 'Battery');
      const level = val.getUint8(0);
      setDeviceInfo((prev) => ({ ...prev, battery: `${level}%` }));
      if (level < BATTERY_THRESHOLD) batteryOk = false;
    } catch {
      setDeviceInfo((prev) => ({ ...prev, battery: t('labels.not_available') }));
      log('Battery info unavailable', localDfuMode ? 'debug' : 'info');
    }

    // Read SW Version
    try {
      const infoSvc = await server.getPrimaryService(DEVICE_INFO_SERVICE_UUID);
      const swChar = await infoSvc.getCharacteristic(SW_REV_CHAR_UUID);
      const val = await debugRead(swChar, 'SW Version');
      const currentVer = new TextDecoder().decode(val).trim();
      setDeviceInfo((prev) => ({ ...prev, version: currentVer }));
      if (targetSoftware && currentVer === targetSoftware) versionMatch = true;
    } catch {
      setDeviceInfo((prev) => ({ ...prev, version: t('labels.unknown') }));
    }

    // Read HW Version
    try {
      const infoSvc = await server.getPrimaryService(DEVICE_INFO_SERVICE_UUID);
      const hwChar = await infoSvc.getCharacteristic(HW_REV_CHAR_UUID);
      const val = await debugRead(hwChar, 'HW Version');
      const currentHw = new TextDecoder().decode(val).trim();
      setDeviceInfo((prev) => ({ ...prev, hw: `${currentHw}` }));
      if (targetInternalRev && currentHw !== targetInternalRev) hwOk = false;
      // Optional: Check against target_pcb if provided, though typically 'internal rev' is more precise
      if (targetPcb && !currentHw.includes(targetPcb)) {
        // We log a warning but don't strictly block unless internal rev mismatches
        log(`Warning: PCB mismatch? Expected ${targetPcb}, got ${currentHw}`, 'warning');
      }
    } catch {
      setDeviceInfo((prev) => ({ ...prev, hw: t('labels.unknown') }));
    }

    return { batteryOk, versionMatch, hwOk };
  };

  const connect = async () => {
    try {
      // 1. Disconnect global session first
      disconnectGlobal();
      log('Disconnected global session.');

      setStatus(t('status.searching'));
      setStatusType('info');

      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [BOKS_SERVICE_UUID] }, { services: [DFU_SERVICE_UUID] }],
        optionalServices: [
          BOKS_SERVICE_UUID,
          DFU_SERVICE_UUID,
          BATTERY_SERVICE_UUID,
          DEVICE_INFO_SERVICE_UUID,
          GENERIC_ACCESS_SERVICE_UUID
        ]
      });

      log(`Connected to ${device.name}`);
      setBluetoothDevice(device as unknown as BluetoothDevice);
      if (!device.gatt) throw new Error('No GATT server');
      const server = await device.gatt.connect();

      let isRealDfu = false;
      let isButtonless = false;

      try {
        const dfuSvc = await server.getPrimaryService(DFU_SERVICE_UUID);
        const chars = await dfuSvc.getCharacteristics();
        isRealDfu = chars.length > 1;
        isButtonless = chars.length === 1;
      } catch {
        // Ignore service not found
      }

      const checks = await readInfo(server);
      setCanConnect(false); // Disable connect button
      setCanStart(true); // Enable start/action button

      if (isRealDfu) {
        log('Real DFU mode detected.');
        setStatus(t('instructions.step_3'));
        setStatusType('success');
        setActionLabel('flash');
      } else {
        if (!checks.hwOk || !checks.batteryOk) {
          setStatus(t('errors.compatibility'));
          setStatusType('error');
          // We allow continuing but warn
        }

        if (isButtonless) {
          setStatus(t('status.preparing'));
          setActionLabel('prepare');
        } else {
          if (checks.versionMatch) {
            setStatus(
              t('labels.target_version', { version: targetSoftware }) + ' (Already on target)'
            );
            setStatusType('warning');
          }
          setActionLabel('prepare');
        }
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      log(`Connection error: ${errMsg}`, 'error');
      setStatus(t('errors.bluetooth'));
      setStatusType('error');
      setCanConnect(true);
    }
  };

  const startAction = async () => {
    if (actionLabel === 'flash') {
      await performFlash();
      return;
    }

    // Prepare mode (Reboot to bootloader)
    try {
      setCanStart(false);
      if (!bluetoothDevice || !bluetoothDevice.gatt) throw new Error('No device');

      const server = await bluetoothDevice.gatt.connect();
      const dfuSvc = await server.getPrimaryService(DFU_SERVICE_UUID);
      const chars = await dfuSvc.getCharacteristics();

      if (chars.length === 1) {
        log('Triggering DFU reboot...');
        const chr = chars[0];
        await chr.startNotifications();

        // Write 0x01 to enter bootloader
        const value = new Uint8Array([0x01]);
        await chr.writeValue(value);

        setStatus(t('instructions.reboot_wait'));
        setStatusType('info');

        // Switch to reconnect UI
        setCanConnect(true);
        setActionLabel('reconnect'); // Next click will be connect
        setCanStart(false);
      } else {
        // If somehow we are already in flash mode
        await performFlash();
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      log(`Failed: ${errMsg}`, 'error');
      setStatus(t('errors.unknown'));
      setStatusType('error');
      setCanStart(true);
    }
  };

  const performFlash = async () => {
    if (!firmwareBlob || !bluetoothDevice) return;

    try {
      setIsFlashing(true);
      isFlashingRef.current = true;
      setCanStart(false);
      setProgress(0);
      setStatus(t('status.flashing'));
      setStatusType('info');

      const pkg = new SecureDfuPackage(firmwareBlob);
      await pkg.load();
      const image = (await pkg.getAppImage()) || (await pkg.getBaseImage());

      log(`Flash ready: ${image.type} (${image.imageData.byteLength} bytes)`);

      const dfu = new SecureDfu();
      dfu.enableSmartSpeed = true;
      dfu.packetSize = 100;
      dfu.packetReceiptNotification = 12;
      dfu.forceRestart = true;

      dfu.addEventListener('log', (e: { message: string }) => {
        const msg = e.message || String(e);
        let enhancedMsg = msg;
        if (msg.includes('error 0x')) {
          const match = msg.match(/0x([0-9A-Fa-f]+)/);
          if (match) {
            const code = parseInt(match[1], 16);
            if (DFU_ERRORS[code]) enhancedMsg += ` (${DFU_ERRORS[code]})`;
          }
        }
        // Filter out too verbose logs if needed
        if (msg.toLowerCase().includes('failed') || msg.toLowerCase().includes('error')) {
          log(`[DFU SDK] ${enhancedMsg}`, 'warning');
        }
      });

      dfu.addEventListener(
        'progress',
        (e: { totalBytes: number; sentBytes: number; validatedBytes: number }) => {
          const total = e.totalBytes || image.imageData.byteLength;
          const pVal = (e.validatedBytes / total) * 100;
          setProgress(pVal);
        }
      );

      await dfu.update(
        bluetoothDevice as unknown as globalThis.BluetoothDevice,
        image.initData,
        image.imageData
      );

      log('Flash successful! Rebooting device...');
      setStatus(t('status.success'));
      setStatusType('success');

      if (bluetoothDevice.gatt?.connected) {
        await bluetoothDevice.gatt.disconnect();
      }
    } catch (err: unknown) {
      const e = err as Error;
      let errorMsg = e.message || String(e);
      if (errorMsg.includes('0x')) {
        const match = errorMsg.match(/0x([0-9A-Fa-f]+)/);
        if (match) {
          const code = parseInt(match[1], 16);
          if (DFU_ERRORS[code]) errorMsg += ` (${DFU_ERRORS[code]})`;
        }
      }
      log(`FLASH FAILED: ${errorMsg}`, 'error');
      setStatus(`Error: ${errorMsg}`);
      setStatusType('error');
      setCanStart(true);
    } finally {
      setIsFlashing(false);
      isFlashingRef.current = false;
    }
  };

  const handleAction = () => {
    if (actionLabel === 'connect' || actionLabel === 'reconnect') {
      connect();
    } else {
      startAction();
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Typography variant="h4" gutterBottom>
        {t('title')}
      </Typography>

      {/* Warnings */}
      <Stack spacing={2} sx={{ mb: 3 }}>
        {/* navigator.bluetooth check */}
        {!navigator.bluetooth && <Alert severity="error">{t('warnings.https')}</Alert>}
        <Alert severity="warning">{t('warnings.legal')}</Alert>
      </Stack>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack spacing={3}>
          {/* File Input */}
          <Box sx={{ textAlign: 'center' }}>
            <input
              accept=".zip"
              style={{ display: 'none' }}
              id="raised-button-file"
              type="file"
              onChange={(e) => handleFileChange(e as unknown as Event)}
              disabled={isFlashing}
            />
            <label htmlFor="raised-button-file">
              <Button
                variant="outlined"
                component="span"
                fullWidth
                size="large"
                sx={{ height: 60, borderStyle: 'dashed' }}
                disabled={isFlashing}
              >
                {firmwareBlob ? firmwareName : t('instructions.select_file')}
              </Button>
            </label>
            {firmwareBlob && (
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                {(firmwareBlob.byteLength / 1024).toFixed(1)} KB loaded
              </Typography>
            )}
          </Box>

          {/* Status & Progress */}
          <Box>
            {/* Hide status text if it just duplicates the button action (e.g. "Device ready", "Click to prepare") */}
            {/* Show only if it's an active process or error/success feedback */}
            {(isFlashing ||
              statusType === 'error' ||
              statusType === 'success' ||
              status.includes('...')) && (
              <Typography
                variant="h6"
                color={
                  statusType === 'error'
                    ? 'error'
                    : statusType === 'success'
                      ? 'success.main'
                      : 'text.primary'
                }
                gutterBottom
                align="center"
              >
                {status}
              </Typography>
            )}

            {isFlashing && (
              <Box sx={{ width: '100%', mt: 2 }}>
                <LinearProgress variant="determinate" value={progress} />
                <Typography variant="caption" color="text.secondary" align="center" display="block">
                  {Math.round(progress)}%
                </Typography>
              </Box>
            )}
          </Box>

          {/* Device Info */}
          {(bluetoothDevice || isDfuModeActive) && (
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
              <Stack spacing={1}>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    {t('labels.device_name')}
                  </Typography>
                  <Typography variant="body2">{deviceInfo.name}</Typography>
                </Box>
                <Divider />
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    {t('labels.battery')}
                  </Typography>
                  <Typography variant="body2">{deviceInfo.battery}</Typography>
                </Box>
                <Divider />
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    {t('labels.version')}
                  </Typography>
                  <Box textAlign="right">
                    <Typography variant="body2">{deviceInfo.version}</Typography>
                    {targetSoftware && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        Exp: {targetSoftware}
                      </Typography>
                    )}
                  </Box>
                </Box>
                <Divider />
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    {t('labels.hw')}
                  </Typography>
                  <Box textAlign="right">
                    <Typography variant="body2">{deviceInfo.hw}</Typography>
                    {targetInternalRev && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        Exp: {targetInternalRev}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Stack>
            </Paper>
          )}

          {/* Actions */}
          <Button
            variant="contained"
            size="large"
            disabled={(!canConnect && !canStart) || isFlashing}
            onClick={handleAction}
            fullWidth
          >
            {actionLabel === 'connect'
              ? t('buttons.connect')
              : actionLabel === 'reconnect'
                ? t('buttons.reconnect')
                : actionLabel === 'flash'
                  ? t('buttons.flash')
                  : t('buttons.prepare')}
          </Button>
        </Stack>
      </Paper>

      {/* Logs */}
      <Paper
        sx={{
          p: 2,
          maxHeight: 200,
          overflow: 'auto',
          bgcolor: 'grey.900',
          color: 'common.white',
          fontFamily: 'monospace',
          fontSize: '0.75rem'
        }}
      >
        {logs.length === 0 && (
          <Typography variant="caption" sx={{ opacity: 0.5 }}>
            {t('logs.placeholder')}
          </Typography>
        )}
        {logs.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </Paper>

      {/* FAQ Section */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          {t('faq.title')}
        </Typography>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight="bold">{t('faq.process.q')}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography style={{ whiteSpace: 'pre-line' }}>{t('faq.process.a')}</Typography>
          </AccordionDetails>
        </Accordion>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight="bold">{t('faq.risks.q')}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography style={{ whiteSpace: 'pre-line' }}>{t('faq.risks.a')}</Typography>
          </AccordionDetails>
        </Accordion>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight="bold">{t('faq.troubleshoot.q')}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography style={{ whiteSpace: 'pre-line' }}>{t('faq.troubleshoot.a')}</Typography>
          </AccordionDetails>
        </Accordion>
      </Box>
    </Container>
  );
};

export default DfuUpdatePage;
