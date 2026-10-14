import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { registrationService } from '../../services/api';
import { Registration } from '../../types';
import { Modal } from '../../components/common/Modal';
import { TicketModal } from '../../components/common/TicketModal';
import { Alert } from '../../components/common/Alert';
import {
  Calendar,
  MapPin,
  Clock,
  CheckCircle2,
  Trash2,
  QrCode,
  FileText,
  ExternalLink,
} from 'lucide-react';

export const MyRegistrationsPage: React.FC = () => {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'confirmed' | 'cancelled'>('all');

  // Modals state
  const [selectedReg, setSelectedReg] = useState<Registration | null>(null);
  const [ticketModalReg, setTicketModalReg] = useState<Registration | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [alertInfo, setAlertInfo] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadRegistrations();
  }, []);

  async function loadRegistrations() {
    try {
      setLoading(true);
      const res = await registrationService.getMyRegistrations();
      if (res.success) {
        setRegistrations(res.registrations || []);
      }
    } catch (err) {
      console.error('Failed to load registrations', err);
    } finally {
      setLoading(false);
    }
  }

  const handleCancelClick = (reg: Registration) => {
    setSelectedReg(reg);
    setAlertInfo(null);
  };

  const handleConfirmCancel = async () => {
    if (!selectedReg) return;
    try {
      setCancelLoading(true);
      const res = await registrationService.cancel(selectedReg.registration_id);
      if (res.success) {
        setAlertInfo({ type: 'success', message: 'Registration cancelled successfully.' });
        setRegistrations((prev) =>
          prev.map((r) =>
            r.registration_id === selectedReg.registration_id
              ? { ...r, registration_status: 'cancelled' }
              : r
          )
        );
        setTimeout(() => setSelectedReg(null), 800);
      }
    } catch (err: any) {
      setAlertInfo({ type: 'error', message: err.response?.data?.message || 'Failed to cancel.' });
    } finally {
      setCancelLoading(false);
    }
  };

  const filteredRegistrations = registrations.filter((r) => {
    if (filter === 'all') return true;
    if (filter === 'confirmed') return r.registration_status === 'confirmed' && r.event_status !== 'cancelled';
    if (filter === 'cancelled') return r.registration_status === 'cancelled' || r.event_status === 'cancelled';
    return true;
  });

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-page-enter">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#1F2D4A]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC]">
            My Event Passes & Tickets
          </h1>
          <p className="text-xs sm:text-sm text-[#8B9BB4] mt-1">
            Access your QR entry passes, view event details, and track attendance verification status.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-[#16223B] border border-[#1F2D4A] rounded-[10px] self-start sm:self-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-[8px] text-xs font-medium transition-colors cursor-pointer ${
              filter === 'all'
                ? 'bg-[#3B82F6] text-white shadow-sm font-semibold'
                : 'text-[#8B9BB4] hover:text-[#F8FAFC]'
            }`}
          >
            All ({registrations.length})
          </button>
          <button
            onClick={() => setFilter('confirmed')}
            className={`px-3 py-1.5 rounded-[8px] text-xs font-medium transition-colors cursor-pointer ${
              filter === 'confirmed'
                ? 'bg-[#3B82F6] text-white shadow-sm font-semibold'
                : 'text-[#8B9BB4] hover:text-[#F8FAFC]'
            }`}
          >
            Confirmed
          </button>
          <button
            onClick={() => setFilter('cancelled')}
            className={`px-3 py-1.5 rounded-[8px] text-xs font-medium transition-colors cursor-pointer ${
              filter === 'cancelled'
                ? 'bg-[#3B82F6] text-white shadow-sm font-semibold'
                : 'text-[#8B9BB4] hover:text-[#F8FAFC]'
            }`}
          >
            Cancelled
          </button>
        </div>
      </div>

      {alertInfo && <Alert type={alertInfo.type} message={alertInfo.message} />}

      {/* Registrations List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 skeleton-shimmer rounded-[14px]"
            />
          ))}
        </div>
      ) : filteredRegistrations.length === 0 ? (
        <div className="text-center py-16 academic-card p-6 space-y-3 max-w-lg mx-auto">
          <Calendar className="w-10 h-10 text-[#8B9BB4] mx-auto opacity-60" />
          <h3 className="text-base font-bold text-[#F8FAFC]">
            No Event Passes Found
          </h3>
          <p className="text-xs text-[#8B9BB4] leading-relaxed max-w-sm mx-auto">
            {filter === 'all'
              ? "You haven't enrolled in any events yet. Check out the campus catalog and grab your pass!"
              : `No registrations found with the "${filter}" filter.`}
          </p>
          <Link
            to="/events"
            className="btn-primary text-xs"
          >
            Browse Events
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRegistrations.map((reg) => {
            const isEventCancelled = reg.event_status === 'cancelled';
            const isUserCancelled = reg.registration_status === 'cancelled';
            const isCancelled = isUserCancelled || isEventCancelled;
            const isAttended = reg.attendance_status === 'present';

            return (
              <div
                key={reg.registration_id}
                className={`p-5 rounded-[14px] border transition-all ${
                  isCancelled
                    ? 'bg-[#0E1626]/60 border-[#1F2D4A] opacity-60'
                    : 'academic-card'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#3B82F6]/15 text-[#60A5FA] border border-[#3B82F6]/30">
                        {reg.category_name}
                      </span>
                      <span>·</span>
                      <span className="text-xs text-[#8B9BB4] font-mono tabular-nums">Pass #CP-{reg.event_id}-{reg.registration_id}</span>

                      {/* Status Badges */}
                      {Boolean(reg.date_tbd) && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#A855F7]/15 text-[#C084FC] border border-[#A855F7]/30">
                          Date TBD
                        </span>
                      )}
                      {isEventCancelled ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#EF4444]/15 text-[#F87171] border border-[#EF4444]/30">
                          Event Cancelled by Administration
                        </span>
                      ) : isUserCancelled ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#EF4444]/15 text-[#F87171] border border-[#EF4444]/30">
                          Cancelled
                        </span>
                      ) : isAttended ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#22C55E]/15 text-[#4ADE80] border border-[#22C55E]/30 gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Attended</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#22C55E]/15 text-[#4ADE80] border border-[#22C55E]/30">
                          Confirmed Seat
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-[#F8FAFC]">
                      <Link to={`/events/${reg.event_id}`} className="hover:text-[#3B82F6] transition-colors">
                        {reg.event_title}
                      </Link>
                    </h3>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-[#8B9BB4]">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#3B82F6]" />
                        <span className="tabular-nums font-semibold text-[#CBD5E1]">
                          {reg.date_tbd
                            ? 'Date TBD'
                            : (reg.end_date && reg.end_date !== reg.event_date
                                ? `${reg.event_date} - ${reg.end_date}`
                                : (reg.event_date || 'Date TBD'))}
                        </span>
                      </span>
                      {!reg.date_tbd && reg.start_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-[#8B9BB4]" />
                          <span className="tabular-nums">
                            {reg.end_time ? `${reg.start_time} - ${reg.end_time}` : reg.start_time}
                          </span>
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#8B9BB4]" />
                        <span>{reg.event_venue}</span>
                      </span>
                    </div>
                  </div>

                  {/* Actions Area */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0">
                    {reg.google_form_url && !isCancelled && (
                      <a
                        href={reg.google_form_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary text-xs h-9 inline-flex items-center gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5 text-[#8B9BB4]" />
                        <span>Open Event Form</span>
                        <ExternalLink className="w-3 h-3 text-[#8B9BB4]" />
                      </a>
                    )}

                    {!isCancelled && (
                      <button
                        onClick={() => setTicketModalReg(reg)}
                        className="btn-primary text-xs h-9"
                      >
                        <QrCode className="w-3.5 h-3.5 mr-1" />
                        <span>Show QR Pass</span>
                      </button>
                    )}

                    {isEventCancelled && (
                      <span className="text-[11px] text-[#F87171] font-medium px-2.5 py-1 bg-[#EF4444]/10 rounded-[8px] border border-[#EF4444]/25">
                        Pass Inactive (Event Cancelled)
                      </span>
                    )}

                    {!isCancelled && (
                      <button
                        onClick={() => handleCancelClick(reg)}
                        className="p-2 text-[#8B9BB4] hover:text-[#EF4444] rounded-[10px] hover:bg-[#EF4444]/10 transition-colors cursor-pointer"
                        title="Cancel Registration"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={!!selectedReg}
        onClose={() => setSelectedReg(null)}
        title="Cancel Event Pass"
        maxWidth="md"
        footer={
          <>
            <button
              onClick={() => setSelectedReg(null)}
              className="btn-secondary text-xs h-9"
            >
              Keep Pass
            </button>
            <button
              onClick={handleConfirmCancel}
              disabled={cancelLoading}
              className="btn-danger text-xs h-9"
            >
              {cancelLoading ? 'Cancelling...' : 'Confirm Cancellation'}
            </button>
          </>
        }
      >
        <p className="text-sm text-[#CBD5E1] leading-relaxed">
          Are you sure you want to cancel your pass for <strong className="text-[#F8FAFC]">{selectedReg?.event_title}</strong>? Your seat will be returned to the registration pool immediately.
        </p>
      </Modal>

      {/* Ticket Pass Modal */}
      {ticketModalReg && (
        <TicketModal
          isOpen={!!ticketModalReg}
          onClose={() => setTicketModalReg(null)}
          registration={ticketModalReg}
        />
      )}
    </div>
  );
};
