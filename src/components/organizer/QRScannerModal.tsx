import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { eventService } from '../../services/api';
import { AttendanceStatus } from '../../types';
import { Modal } from '../common/Modal';
import { Alert } from '../common/Alert';
import {
  Camera,
  CheckCircle2,
  XCircle,
  QrCode,
  Search,
  UserCheck,
  RotateCcw,
} from 'lucide-react';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: number | string;
  eventTitle: string;
  onAttendeeAdmitted?: (registrationId: number) => void;
}

interface VerifiedTicket {
  registration_id: number;
  registration_date: string;
  registration_status: string;
  attendance_status: AttendanceStatus;
  student_id: number;
  student_name: string;
  student_email: string;
  student_phone: string;
  event_id: number;
  event_title: string;
  event_date: string;
  event_venue: string;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  onAttendeeAdmitted,
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'manual'>('camera');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  
  // Verification states
  const [loading, setLoading] = useState(false);
  const [admitting, setAdmitting] = useState(false);
  const [verifiedTicket, setVerifiedTicket] = useState<VerifiedTicket | null>(null);
  const [isMatchingEvent, setIsMatchingEvent] = useState(true);
  const [alertInfo, setAlertInfo] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const qrRegionId = 'qr-reader-viewport';

  useEffect(() => {
    if (isOpen && activeTab === 'camera') {
      const timer = setTimeout(() => {
        startCamera();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (scannerRef.current) {
        await stopCamera();
      }

      const html5QrCode = new Html5Qrcode(qrRegionId);
      scannerRef.current = html5QrCode;

      const qrCodeSuccessCallback = (decodedText: string) => {
        handleQrDetected(decodedText);
      };

      const config = { fps: 10, qrbox: { width: 220, height: 220 }, aspectRatio: 1.0 };

      await html5QrCode.start(
        { facingMode: 'environment' },
        config,
        qrCodeSuccessCallback,
        () => {}
      );
      setIsScanning(true);
    } catch (err: any) {
      console.warn('Failed to start camera', err);
      setCameraError('Camera access unavailable. Use manual pass lookup below.');
      setIsScanning(false);
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (err) {
        console.warn('Error clearing camera scanner:', err);
      } finally {
        scannerRef.current = null;
        setIsScanning(false);
      }
    }
  };

  const parseScannedData = (text: string): { regId: number | null; eventId: number | null } => {
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object') {
        return {
          regId: parsed.registrationId || parsed.registration_id || parsed.id || null,
          eventId: parsed.eventId || parsed.event_id || null,
        };
      }
    } catch (e) {}

    const cpMatch = text.match(/CP-(\d+)-(\d+)/i);
    if (cpMatch) {
      return {
        eventId: parseInt(cpMatch[1], 10),
        regId: parseInt(cpMatch[2], 10),
      };
    }

    const num = parseInt(text.trim(), 10);
    if (!isNaN(num) && num > 0) {
      return { regId: num, eventId: null };
    }

    return { regId: null, eventId: null };
  };

  const handleQrDetected = async (decodedText: string) => {
    const parsed = parseScannedData(decodedText);
    if (!parsed.regId) {
      setAlertInfo({ type: 'error', message: 'Scanned QR code does not contain a valid registration ID.' });
      return;
    }

    await stopCamera();
    await verifyRegistrationId(parsed.regId);
  };

  const verifyRegistrationId = async (registrationId: number) => {
    try {
      setLoading(true);
      setAlertInfo(null);
      setVerifiedTicket(null);

      const res = await eventService.verifyTicket(eventId, { registration_id: registrationId });
      if (res.success && res.ticket) {
        const ticket = res.ticket as unknown as VerifiedTicket;
        setVerifiedTicket(ticket);

        const matches = res.isMatchingEvent ?? (Number(ticket.event_id) === Number(eventId));
        setIsMatchingEvent(matches);

        if (!matches) {
          setAlertInfo({
            type: 'error',
            message: `Pass is for another event: "${ticket.event_title}". Not valid for this gate!`,
          });
        } else if (ticket.attendance_status === 'present') {
          setAlertInfo({
            type: 'warning',
            message: `Notice: Attendee "${ticket.student_name}" is ALREADY marked Present.`,
          });
        } else {
          setAlertInfo({
            type: 'success',
            message: `Verified valid pass for ${ticket.student_name}. Ready for admission.`,
          });
        }
      }
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err.response?.data?.message || 'Pass ID not found in campus database.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;

    const parsed = parseScannedData(manualCode.trim());
    if (parsed.regId) {
      verifyRegistrationId(parsed.regId);
    } else {
      setAlertInfo({ type: 'error', message: 'Please enter a valid numeric Registration ID.' });
    }
  };

  const handleConfirmAdmission = async () => {
    if (!verifiedTicket) return;
    try {
      setAdmitting(true);
      const res = await eventService.updateAttendance(
        verifiedTicket.event_id,
        verifiedTicket.registration_id,
        'present'
      );

      if (res.success) {
        setVerifiedTicket((prev) => prev ? { ...prev, attendance_status: 'present' } : null);
        setAlertInfo({
          type: 'success',
          message: `Success! ${verifiedTicket.student_name} has been admitted and marked Present!`,
        });
        if (onAttendeeAdmitted) {
          onAttendeeAdmitted(verifiedTicket.registration_id);
        }
      }
    } catch (err: any) {
      setAlertInfo({ type: 'error', message: 'Failed to update attendance status.' });
    } finally {
      setAdmitting(false);
    }
  };

  const handleResetForNext = () => {
    setVerifiedTicket(null);
    setAlertInfo(null);
    setManualCode('');
    if (activeTab === 'camera') {
      startCamera();
    }
  };

  const handleModalClose = () => {
    stopCamera();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title="Entry Gate QR Scanner & Verification"
      maxWidth="md"
    >
      <div className="space-y-4">
        
        {/* Event Header info */}
        <div className="p-3 bg-[#111A2E] rounded-[10px] border border-[#1F2D4A] text-xs">
          <div className="text-[10px] text-[#8B9BB4] font-semibold uppercase tracking-wider">
            Current Event Gate
          </div>
          <div className="font-semibold text-[#F8FAFC] line-clamp-1 mt-0.5">{eventTitle}</div>
        </div>

        {alertInfo && (
          <Alert type={alertInfo.type} message={alertInfo.message} />
        )}

        {/* Verification Result Card */}
        {verifiedTicket ? (
          <div className="p-5 academic-card space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-[#1F2D4A]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[8px] bg-[#3B82F6]/15 text-[#60A5FA] font-bold text-xs flex items-center justify-center">
                  {verifiedTicket.student_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-semibold text-[#F8FAFC]">
                    {verifiedTicket.student_name}
                  </div>
                  <div className="text-[11px] text-[#8B9BB4]">
                    Student ID #{verifiedTicket.student_id} · Pass #{verifiedTicket.registration_id}
                  </div>
                </div>
              </div>

              {isMatchingEvent ? (
                <span className="text-[11px] font-semibold text-[#4ADE80] bg-[#22C55E]/15 border border-[#22C55E]/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#4ADE80]" />
                  <span>Valid Pass</span>
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-[#F87171] bg-[#EF4444]/15 border border-[#EF4444]/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5 text-[#F87171]" />
                  <span>Mismatch</span>
                </span>
              )}
            </div>

            {/* Student & Event Details */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 bg-[#0D1526] rounded-[8px] border border-[#1F2D4A]">
                <div className="text-[10px] text-[#8B9BB4] font-semibold">EMAIL & CONTACT</div>
                <div className="font-medium text-[#CBD5E1] truncate mt-0.5">{verifiedTicket.student_email}</div>
                <div className="text-[#8B9BB4] text-[11px]">{verifiedTicket.student_phone || 'No phone recorded'}</div>
              </div>

              <div className="p-2.5 bg-[#0D1526] rounded-[8px] border border-[#1F2D4A]">
                <div className="text-[10px] text-[#8B9BB4] font-semibold">ATTENDANCE STATUS</div>
                <div className="font-semibold text-[#F8FAFC] capitalize flex items-center gap-1 mt-0.5">
                  {verifiedTicket.attendance_status === 'present' ? (
                    <span className="text-[#4ADE80] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#4ADE80]" />
                      <span>Present (Admitted)</span>
                    </span>
                  ) : (
                    <span className="text-[#FBBF24]">Unmarked (Waiting Entry)</span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 border-t border-[#1F2D4A] flex flex-col sm:flex-row items-center gap-2">
              {isMatchingEvent && verifiedTicket.attendance_status !== 'present' && (
                <button
                  type="button"
                  onClick={handleConfirmAdmission}
                  disabled={admitting}
                  className="btn-primary w-full sm:flex-1 text-xs h-9 justify-center gap-2"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>{admitting ? 'Admitting...' : 'Confirm Entry & Mark Present'}</span>
                </button>
              )}

              {verifiedTicket.attendance_status === 'present' && (
                <div className="w-full sm:flex-1 py-2 px-3 bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#4ADE80] rounded-[8px] text-xs font-semibold flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#4ADE80]" />
                  <span>Attendee Confirmed & Checked In!</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleResetForNext}
                className="btn-secondary w-full sm:w-auto text-xs h-9 justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Scan Next Attendee</span>
              </button>
            </div>

          </div>
        ) : (
          /* Scanning Options View */
          <div className="space-y-4">
            
            {/* Tabs for Camera vs Manual Pass ID */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#0F1829] rounded-[10px] text-xs font-medium border border-[#1F2D4A]">
              <button
                type="button"
                onClick={() => setActiveTab('camera')}
                className={`py-2 rounded-[8px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'camera'
                    ? 'btn-primary font-semibold'
                    : 'text-[#8B9BB4] hover:text-[#F8FAFC]'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Camera Scanner</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('manual')}
                className={`py-2 rounded-[8px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'manual'
                    ? 'btn-primary font-semibold'
                    : 'text-[#8B9BB4] hover:text-[#F8FAFC]'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>Manual Pass Lookup</span>
              </button>
            </div>

            {activeTab === 'camera' ? (
              <div className="space-y-3">
                <div className="relative bg-[#080D1A] rounded-[12px] overflow-hidden border border-[#1F2D4A] flex flex-col items-center justify-center min-h-[260px]">
                  <div id={qrRegionId} className="w-full max-w-[280px]" />

                  {!isScanning && !cameraError && (
                    <div className="text-center p-6 text-[#8B9BB4] space-y-2">
                      <QrCode className="w-10 h-10 text-[#475569] mx-auto" />
                      <div className="text-xs">Connecting to device camera...</div>
                    </div>
                  )}

                  {cameraError && (
                    <div className="text-center p-6 text-[#FBBF24] space-y-2">
                      <div className="text-xs">{cameraError}</div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('manual')}
                        className="btn-primary text-xs"
                      >
                        Switch to Manual Lookup
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleManualSearch} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">
                    Registration Pass ID or QR String
                  </label>
                  <div className="relative">
                    <QrCode className="absolute left-3 top-3 w-4 h-4 text-[#8B9BB4]" />
                    <input
                      type="text"
                      placeholder="e.g. 12, CP-5-12, or JSON payload..."
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      className="input-base w-full pl-9 text-xs"
                      autoFocus
                    />
                  </div>
                  <p className="text-[11px] text-[#8B9BB4] mt-1">
                    Enter the student pass number shown on their digital ticket or physical printout.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || !manualCode.trim()}
                  className="btn-primary w-full text-xs h-10 justify-center"
                >
                  {loading ? 'Verifying...' : 'Verify Ticket & Check In'}
                </button>
              </form>
            )}

          </div>
        )}

      </div>
    </Modal>
  );
};
