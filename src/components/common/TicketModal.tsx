import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Registration } from '../../types';
import { Modal } from './Modal';
import {
  Calendar,
  Clock,
  MapPin,
  Printer,
  Download,
  CheckCircle2,
  ShieldCheck,
  QrCode as QrIcon,
  FileText,
  ExternalLink,
} from 'lucide-react';

interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  registration: Registration | null;
}

export const TicketModal: React.FC<TicketModalProps> = ({
  isOpen,
  onClose,
  registration,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (registration) {
      const payload = JSON.stringify({
        registration_id: registration.registration_id,
        event_id: registration.event_id,
        student_id: registration.student_id,
        event_title: registration.event_title,
        student_name: registration.student_name,
        pass_code: `CP-${registration.event_id}-${registration.registration_id}`,
      });

      QRCode.toDataURL(payload, {
        width: 220,
        margin: 1.5,
        color: {
          dark: '#0B1220',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Failed to generate QR code', err));
    }
  }, [registration]);

  if (!registration) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `ticket-${registration.registration_id}-qr.png`;
    link.click();
  };

  const isAttended = registration.attendance_status === 'present';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Official Event Pass & QR Verification"
      maxWidth="lg"
      footer={
        <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-3">
          <div className="text-xs text-[#7C8BA8]">
            Present this QR pass on your mobile device or printout at venue check-in
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadQR}
              className="btn-secondary text-xs h-9"
            >
              <Download className="w-3.5 h-3.5 mr-1 text-[#7C8BA8]" />
              <span>Download</span>
            </button>
            <button
              onClick={handlePrint}
              className="btn-primary text-xs h-9"
            >
              <Printer className="w-3.5 h-3.5 mr-1" />
              <span>Print Pass</span>
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        
        {/* Success Banner with Tinted Background */}
        <div className="flex items-center gap-3 p-3.5 rounded-[10px] bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E]">
          <div className="w-8 h-8 rounded-full bg-[#22C55E] text-white flex items-center justify-center shrink-0 shadow-sm">
            <CheckCircle2 className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 text-xs">
            <div className="font-bold text-[#F1F5F9]">Registration Confirmed</div>
            <div className="text-[#22C55E] text-xs mt-0.5">
              Pass ID: <span className="font-mono font-semibold">PASS-CP{registration.event_id}{registration.registration_id}</span> · Status: Confirmed & Active
            </div>
          </div>
        </div>

        {/* Ticket Boarding Pass Card */}
        <div className="rounded-[14px] border border-[#1F2D4A] bg-[#111A2E] p-5 space-y-4 text-[#CBD5E1] shadow-[0_8px_24px_rgba(0,0,0,0.25)]">
          
          {/* Header Row */}
          <div className="flex items-center justify-between pb-3 border-b border-[#1F2D4A]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-[8px] bg-[#3B82F6] flex items-center justify-center font-bold text-xs text-white">
                CP
              </div>
              <div>
                <div className="text-xs font-bold text-[#F1F5F9]">
                  CampusPulse Digital Pass
                </div>
                <div className="text-[11px] text-[#7C8BA8]">Verified Academic Registration</div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] uppercase font-semibold text-[#7C8BA8]">Pass Code</div>
              <div className="text-xs font-mono font-bold text-[#3B82F6] tabular-nums">
                CP-{registration.event_id}-{registration.registration_id}
              </div>
            </div>
          </div>

          {/* Details & QR Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            
            {/* Info (7 cols) */}
            <div className="md:col-span-7 space-y-3">
              <div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold text-[#3B82F6] bg-[#3B82F6]/15 border border-[#3B82F6]/30">
                  {registration.category_name || 'College Event'}
                </span>
                <h3 className="text-base font-bold text-[#F1F5F9] mt-1.5 leading-snug">
                  {registration.event_title}
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div>
                  <div className="text-[10px] text-[#7C8BA8] uppercase font-semibold">Date</div>
                  <div className="font-semibold text-[#CBD5E1] tabular-nums">
                    {registration.date_tbd
                      ? 'Date TBD'
                      : (registration.end_date && registration.end_date !== registration.event_date
                          ? `${registration.event_date} - ${registration.end_date}`
                          : (registration.event_date || 'Date TBD'))}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-[#7C8BA8] uppercase font-semibold">Timing</div>
                  <div className="font-semibold text-[#CBD5E1] tabular-nums">
                    {registration.date_tbd
                      ? 'Time TBD'
                      : (registration.start_time
                          ? (registration.end_time
                              ? `${registration.start_time} - ${registration.end_time}`
                              : registration.start_time)
                          : 'TBD')}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-[10px] text-[#7C8BA8] uppercase font-semibold">Venue</div>
                  <div className="font-semibold text-[#CBD5E1]">
                    {registration.event_venue}
                  </div>
                </div>
              </div>

              {/* Student Metadata */}
              <div className="pt-2.5 border-t border-[#1F2D4A] flex items-center justify-between text-xs">
                <div>
                  <div className="text-[10px] text-[#7C8BA8] uppercase font-semibold">Attendee</div>
                  <div className="font-semibold text-[#F1F5F9]">{registration.student_name}</div>
                  <div className="text-[11px] text-[#7C8BA8]">{registration.student_email}</div>
                </div>

                <div>
                  {isAttended ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#22C55E] bg-[#22C55E]/15 px-2 py-0.5 rounded-full border border-[#22C55E]/30">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Attended</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#3B82F6] bg-[#3B82F6]/15 px-2 py-0.5 rounded-full border border-[#3B82F6]/30">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Confirmed</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* QR Code Container (5 cols) */}
            <div className="md:col-span-5 flex flex-col items-center justify-center p-3 bg-white rounded-[10px] border border-[#1F2D4A] text-center shadow-inner">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Entry QR Pass"
                  className="w-40 h-40 object-contain rounded"
                />
              ) : (
                <div className="w-40 h-40 flex items-center justify-center text-slate-400">
                  <QrIcon className="w-10 h-10" />
                </div>
              )}
              <div className="mt-1.5 text-[10px] font-mono text-slate-700 font-semibold tabular-nums">
                PASS: CP-{registration.event_id}-{registration.registration_id}
              </div>
            </div>

          </div>

          {/* Ticket Footer Tear-off row */}
          <div className="pt-3 border-t border-dashed border-[#1F2D4A] flex items-center justify-between text-[11px] text-[#7C8BA8]">
            <span>Verified Entry Pass · Present at venue entrance</span>
            <span>College Event Administration</span>
          </div>
        </div>

        {/* Optional Google Form Link inside Ticket */}
        {registration.google_form_url && (
          <div className="p-3.5 rounded-[10px] bg-[#111A2E] border border-[#1F2D4A] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#3B82F6] shrink-0" />
              <div>
                <div className="font-semibold text-[#F1F5F9]">Event Form</div>
                <div className="text-xs text-[#7C8BA8]">
                  Open the Google Form for this event
                </div>
              </div>
            </div>
            <a
              href={registration.google_form_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-xs h-8 inline-flex items-center gap-1"
            >
              <span>Open Event Form</span>
              <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </div>
        )}

      </div>
    </Modal>
  );
};
