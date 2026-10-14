import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode, CameraDevice } from 'html5-qrcode';
import { eventService } from '../../services/api';
import { Alert } from '../common/Alert';
import {
  Camera,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  UserCheck,
  SwitchCamera,
  History,
  QrCode,
} from 'lucide-react';

export interface CheckInResult {
  registrationId: number;
  studentName: string;
  studentEmail?: string;
  eventTitle?: string;
  timestamp: string;
  status: 'admitted' | 'already_present' | 'invalid';
  message: string;
}

interface QRScannerProps {
  eventId?: number | string;
  eventTitle?: string;
  autoCheckIn?: boolean;
  onCheckInSuccess?: (result: CheckInResult) => void;
  onCheckInError?: (error: string) => void;
  className?: string;
}

export const QRScanner: React.FC<QRScannerProps> = ({
  eventId,
  eventTitle,
  autoCheckIn = true,
  onCheckInSuccess,
  onCheckInError,
  className = '',
}) => {
  const [scannerActive, setScannerActive] = useState<boolean>(false);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Scan & Check-in States
  const [processing, setProcessing] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<CheckInResult | null>(null);
  const [scanHistory, setScanHistory] = useState<CheckInResult[]>([]);
  const [manualCode, setManualCode] = useState<string>('');

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const regionElementId = 'qr-camera-viewport';
  const isHandlingScanRef = useRef<boolean>(false);

  // Enumerate cameras on component mount
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          const backCam = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment'));
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        }
      })
      .catch((err) => {
        console.warn('Camera enumeration notice:', err);
      });

    return () => {
      stopCameraScanner();
    };
  }, []);

  // Start or restart camera when camera ID or active toggle changes
  useEffect(() => {
    if (scannerActive && selectedCameraId) {
      startCameraScanner(selectedCameraId);
    } else if (!scannerActive) {
      stopCameraScanner();
    }
  }, [scannerActive, selectedCameraId]);

  const startCameraScanner = async (cameraId: string) => {
    setCameraError(null);
    try {
      if (html5QrCodeRef.current) {
        await stopCameraScanner();
      }

      const html5QrCode = new Html5Qrcode(regionElementId);
      html5QrCodeRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 220, height: 220 },
        aspectRatio: 1.0,
      };

      await html5QrCode.start(
        cameraId,
        config,
        (decodedText) => {
          handleCodeScanned(decodedText);
        },
        () => {
          // Frame scanner tick - silent
        }
      );
    } catch (err: any) {
      console.error('Failed to start camera', err);
      setCameraError(err.message || 'Camera permission denied or camera device in use.');
      setScannerActive(false);
    }
  };

  const stopCameraScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Error closing camera stream:', err);
      } finally {
        html5QrCodeRef.current = null;
      }
    }
  };

  const parseScannedData = (text: string): { regId: number | null; eventId: number | null; studentId: number | null } => {
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object') {
        return {
          regId: parsed.registrationId || parsed.registration_id || parsed.id || null,
          eventId: parsed.eventId || parsed.event_id || null,
          studentId: parsed.studentId || parsed.student_id || null,
        };
      }
    } catch (e) {
      // Not JSON, check if it's CP-{eventId}-{regId} or plain number
    }

    const cpMatch = text.match(/CP-(\d+)-(\d+)/i);
    if (cpMatch) {
      return {
        eventId: parseInt(cpMatch[1], 10),
        regId: parseInt(cpMatch[2], 10),
        studentId: null,
      };
    }

    const num = parseInt(text.trim(), 10);
    if (!isNaN(num) && num > 0) {
      return { regId: num, eventId: null, studentId: null };
    }

    return { regId: null, eventId: null, studentId: null };
  };

  const handleCodeScanned = async (qrString: string) => {
    if (isHandlingScanRef.current) return;
    isHandlingScanRef.current = true;
    setProcessing(true);

    const parsed = parseScannedData(qrString);
    if (!parsed.regId) {
      const result: CheckInResult = {
        registrationId: 0,
        studentName: 'Invalid QR Ticket',
        timestamp: new Date().toLocaleTimeString(),
        status: 'invalid',
        message: 'Scanned QR code does not contain a valid student registration signature.',
      };
      setLastResult(result);
      addHistory(result);
      if (onCheckInError) onCheckInError(result.message);
      setProcessing(false);
      setTimeout(() => {
        isHandlingScanRef.current = false;
      }, 1500);
      return;
    }

    try {
      const targetEventId = eventId || parsed.eventId || 0;
      const verifyRes = await eventService.verifyTicket(targetEventId, {
        registration_id: parsed.regId,
        qr_data: qrString,
      });
      if (!verifyRes.success || !verifyRes.ticket) {
        throw new Error(verifyRes.message || 'Ticket pass not found in campus database.');
      }

      const ticket = verifyRes.ticket;

      if (eventId && Number(ticket.event_id) !== Number(eventId)) {
        const result: CheckInResult = {
          registrationId: ticket.registration_id,
          studentName: ticket.student_name,
          studentEmail: ticket.student_email,
          eventTitle: ticket.event_title,
          timestamp: new Date().toLocaleTimeString(),
          status: 'invalid',
          message: `Ticket is for another event: "${ticket.event_title}". Access denied at this gate.`,
        };
        setLastResult(result);
        addHistory(result);
        if (onCheckInError) onCheckInError(result.message);
        setProcessing(false);
        setTimeout(() => {
          isHandlingScanRef.current = false;
        }, 1800);
        return;
      }

      if (ticket.attendance_status === 'present') {
        const result: CheckInResult = {
          registrationId: ticket.registration_id,
          studentName: ticket.student_name,
          studentEmail: ticket.student_email,
          eventTitle: ticket.event_title,
          timestamp: new Date().toLocaleTimeString(),
          status: 'already_present',
          message: `${ticket.student_name} was already marked Present at this gate.`,
        };
        setLastResult(result);
        addHistory(result);
        if (onCheckInSuccess) onCheckInSuccess(result);
        setProcessing(false);
        setTimeout(() => {
          isHandlingScanRef.current = false;
        }, 1800);
        return;
      }

      if (autoCheckIn) {
        const checkInRes = await eventService.updateAttendance(
          ticket.event_id,
          ticket.registration_id,
          'present'
        );
        if (checkInRes.success) {
          const result: CheckInResult = {
            registrationId: ticket.registration_id,
            studentName: ticket.student_name,
            studentEmail: ticket.student_email,
            eventTitle: ticket.event_title,
            timestamp: new Date().toLocaleTimeString(),
            status: 'admitted',
            message: `Check-in Verified! Welcome ${ticket.student_name} to the venue.`,
          };
          setLastResult(result);
          addHistory(result);
          if (onCheckInSuccess) onCheckInSuccess(result);
        }
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Verification failed.';
      const failureResult: CheckInResult = {
        registrationId: 0,
        studentName: 'Unknown Attendee',
        timestamp: new Date().toLocaleTimeString(),
        status: 'invalid',
        message: errorMsg,
      };
      setLastResult(failureResult);
      addHistory(failureResult);
      if (onCheckInError) onCheckInError(errorMsg);
    } finally {
      setProcessing(false);
      setTimeout(() => {
        isHandlingScanRef.current = false;
      }, 1800);
    }
  };

  const addHistory = (item: CheckInResult) => {
    setScanHistory((prev) => [item, ...prev.slice(0, 9)]);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleCodeScanned(manualCode.trim());
      setManualCode('');
    }
  };

  const handleSwitchCamera = () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex(c => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    setSelectedCameraId(cameras[nextIndex].id);
  };

  return (
    <div className={`academic-card overflow-hidden ${className}`}>
      
      {/* Scanner Header */}
      <div className="bg-[#0F1829] text-[#F8FAFC] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1F2D4A]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[8px] bg-[#3B82F6]/15 text-[#60A5FA] flex items-center justify-center font-bold text-sm">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-[#F8FAFC] flex items-center gap-2">
              <span>Device Camera QR Scanner</span>
              {scannerActive && (
                <span className="w-2 h-2 rounded-full bg-[#4ADE80]" title="Camera Active" />
              )}
            </h3>
            <p className="text-[11px] text-[#8B9BB4]">
              {eventTitle ? `Gate Check-in: ${eventTitle}` : 'Point device camera at student ticket QR code'}
            </p>
          </div>
        </div>

        {/* Camera Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {cameras.length > 1 && scannerActive && (
            <button
              type="button"
              onClick={handleSwitchCamera}
              className="p-1.5 text-xs font-medium text-[#CBD5E1] hover:text-[#F8FAFC] bg-[#16223B] hover:bg-[#1E2E4E] border border-[#1F2D4A] rounded-[8px] transition-colors flex items-center gap-1 cursor-pointer"
              title="Switch Camera Lens"
            >
              <SwitchCamera className="w-3.5 h-3.5" />
              <span className="text-[11px]">Switch</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setScannerActive(!scannerActive)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-[8px] transition-colors flex items-center gap-1.5 cursor-pointer ${
              scannerActive
                ? 'bg-[#EF4444] hover:bg-[#DC2626] text-white shadow-sm'
                : 'btn-primary'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{scannerActive ? 'Stop Camera' : 'Start Camera'}</span>
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        
        {/* Camera Viewfinder Area */}
        <div className="relative bg-[#080D1A] rounded-[12px] overflow-hidden border border-[#1F2D4A] flex flex-col items-center justify-center min-h-[280px]">
          
          {/* HTML5 QR Code Mount Element */}
          <div
            id={regionElementId}
            className={`w-full max-w-[320px] ${!scannerActive ? 'hidden' : 'block'}`}
          />

          {/* Scanner Inactive Overlay */}
          {!scannerActive && !cameraError && (
            <div className="p-6 text-center text-[#8B9BB4] space-y-3">
              <QrCode className="w-12 h-12 text-[#475569] mx-auto" />
              <div>
                <div className="text-sm font-semibold text-[#CBD5E1]">Device Camera Offline</div>
                <div className="text-xs text-[#8B9BB4] mt-1 max-w-xs mx-auto">
                  Click "Start Camera" above to activate the camera and scan student tickets.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setScannerActive(true)}
                className="btn-primary text-xs"
              >
                Activate Camera Scanner
              </button>
            </div>
          )}

          {/* Camera Permission / Error Banner */}
          {cameraError && (
            <div className="p-6 text-center text-[#CBD5E1] space-y-3">
              <AlertTriangle className="w-10 h-10 text-[#F59E0B] mx-auto" />
              <div className="text-xs text-[#CBD5E1] max-w-xs mx-auto">{cameraError}</div>
              <button
                type="button"
                onClick={() => setScannerActive(true)}
                className="btn-secondary text-xs"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Scanning Reticle Overlay (When active) */}
          {scannerActive && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-between p-4">
              <div className="text-[11px] font-mono text-[#4ADE80] bg-[#0B1220]/90 px-2.5 py-0.5 rounded border border-[#22C55E]/30 backdrop-blur-xs">
                {processing ? 'Processing Check-in...' : 'Position QR Code Inside Box'}
              </div>

              {/* Viewfinder Corner Guides */}
              <div className="relative w-48 h-48 border-2 border-dashed border-[#4ADE80]/80 rounded-lg" />

              <div className="text-[10px] text-[#8B9BB4] bg-[#0B1220]/90 px-2 py-0.5 rounded border border-[#1F2D4A] backdrop-blur-xs">
                Automatic Check-in Enabled
              </div>
            </div>
          )}
        </div>

        {/* Live Scan Result Banner */}
        {lastResult && (
          <div
            className={`p-4 rounded-[12px] border transition-colors ${
              lastResult.status === 'admitted'
                ? 'bg-[#22C55E]/15 border-[#22C55E]/30 text-[#4ADE80]'
                : lastResult.status === 'already_present'
                ? 'bg-[#F59E0B]/15 border-[#F59E0B]/30 text-[#FBBF24]'
                : 'bg-[#EF4444]/15 border-[#EF4444]/30 text-[#F87171]'
            }`}
          >
            <div className="flex items-start gap-3">
              {lastResult.status === 'admitted' ? (
                <CheckCircle2 className="w-5 h-5 text-[#4ADE80] shrink-0 mt-0.5" />
              ) : lastResult.status === 'already_present' ? (
                <AlertTriangle className="w-5 h-5 text-[#FBBF24] shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-[#F87171] shrink-0 mt-0.5" />
              )}

              <div className="space-y-1 flex-1 text-xs">
                <div className="font-semibold text-sm leading-tight flex items-center justify-between">
                  <span>{lastResult.studentName}</span>
                  <span className="text-[11px] font-mono opacity-80">
                    {lastResult.timestamp}
                  </span>
                </div>

                <div className="font-medium text-xs leading-relaxed text-[#CBD5E1]">
                  {lastResult.message}
                </div>

                {lastResult.studentEmail && (
                  <div className="text-[11px] opacity-80 pt-0.5 text-[#8B9BB4]">
                    {lastResult.studentEmail} · Pass #{lastResult.registrationId}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Manual Pass ID Fallback Input */}
        <form onSubmit={handleManualSubmit} className="pt-2 border-t border-[#1F2D4A] space-y-2">
          <label className="block text-xs font-semibold text-[#CBD5E1]">
            Manual Ticket / Pass ID Entry (Backup or Barcode Scanner)
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <QrCode className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B9BB4] pointer-events-none" />
              <input
                type="text"
                placeholder="Enter Registration ID (e.g. 1, 4) or paste QR string..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="input-base w-full pl-10 text-xs"
              />
            </div>
            <button
              type="submit"
              disabled={processing || !manualCode.trim()}
              className="btn-primary text-xs shrink-0"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{processing ? 'Checking...' : 'Check-In'}</span>
            </button>
          </div>
        </form>

        {/* Live Session Check-in History */}
        {scanHistory.length > 0 && (
          <div className="space-y-2.5 pt-2 border-t border-[#1F2D4A]">
            <div className="flex items-center justify-between text-xs text-[#8B9BB4]">
              <span className="font-semibold uppercase tracking-wider text-[10px] text-[#8B9BB4] flex items-center gap-1">
                <History className="w-3 h-3 text-[#3B82F6]" />
                <span>Session Check-in Activity</span>
              </span>
              <span className="tabular-nums font-mono text-[11px] text-[#4ADE80]">
                {scanHistory.filter(h => h.status === 'admitted').length} Admitted
              </span>
            </div>

            <div className="divide-y divide-[#1F2D4A] border border-[#1F2D4A] rounded-[10px] overflow-hidden bg-[#0D1526] text-xs">
              {scanHistory.map((item, idx) => (
                <div key={idx} className="p-2.5 flex items-center justify-between gap-3 bg-[#111A2E]/60">
                  <div className="flex items-center gap-2">
                    {item.status === 'admitted' ? (
                      <span className="w-2 h-2 rounded-full bg-[#4ADE80]" />
                    ) : item.status === 'already_present' ? (
                      <span className="w-2 h-2 rounded-full bg-[#FBBF24]" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-[#F87171]" />
                    )}
                    <span className="font-semibold text-[#F8FAFC]">{item.studentName}</span>
                    {item.registrationId > 0 && (
                      <span className="text-[11px] text-[#8B9BB4] font-mono">#{item.registrationId}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize border ${
                      item.status === 'admitted'
                        ? 'bg-[#22C55E]/15 text-[#4ADE80] border-[#22C55E]/30'
                        : item.status === 'already_present'
                        ? 'bg-[#F59E0B]/15 text-[#FBBF24] border-[#F59E0B]/30'
                        : 'bg-[#EF4444]/15 text-[#F87171] border-[#EF4444]/30'
                    }`}>
                      {item.status === 'admitted' ? 'Present' : item.status}
                    </span>
                    <span className="text-[10px] text-[#8B9BB4] tabular-nums font-mono">{item.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
