import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { CollegeEvent, EventMedia } from '../../types';
import { eventService, registrationService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';
import { TicketModal } from '../../components/common/TicketModal';
import { Alert } from '../../components/common/Alert';
import { getEventTimingInfo, formatEventDateRange } from '../../utils/eventTiming';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  ArrowLeft,
  Mail,
  Phone,
  QrCode,
  FileText,
  ExternalLink,
  Users,
  ShieldCheck,
  Share2,
} from 'lucide-react';

export const EventDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [event, setEvent] = useState<CollegeEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Registration and Ticket modals
  const [modalOpen, setModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [alertInfo, setAlertInfo] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    async function fetchEventDetails() {
      if (!id) return;
      try {
        setLoading(true);
        setError(null);
        const res = await eventService.getById(id);

        if (res.success && res.event) {
          setEvent(res.event);
        } else {
          setError('Event not found or has been removed.');
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load event details.');
      } finally {
        setLoading(false);
      }
    }
    fetchEventDetails();
  }, [id]);

  const handleRegister = async () => {
    if (!user) {
      navigate('/login', { state: { from: `/events/${id}` } });
      return;
    }
    if (!event) return;

    try {
      setActionLoading(true);
      const res = await registrationService.register(event.id);
      if (res.success) {
        setAlertInfo({
          type: 'success',
          message: 'Registration confirmed. Your verified digital pass is ready.',
        });
        setEvent((prev) =>
          prev
            ? {
                ...prev,
                is_registered: true,
                user_registration_id: res.registrationId,
                registered_count: prev.registered_count + 1,
                seats_left: prev.seats_left !== null && prev.seats_left !== undefined ? Math.max(0, prev.seats_left - 1) : null,
              }
            : prev
        );
        setModalOpen(false);
        setTimeout(() => setTicketModalOpen(true), 400);
      }
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err.response?.data?.message || 'Failed to register for this event.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelRegistration = async () => {
    if (!event || !event.user_registration_id) return;
    try {
      setActionLoading(true);
      const res = await registrationService.cancel(event.user_registration_id);
      if (res.success) {
        setAlertInfo({
          type: 'success',
          message: 'Your registration has been cancelled successfully.',
        });
        setEvent((prev) =>
          prev
            ? {
                ...prev,
                is_registered: false,
                user_registration_id: null,
                registered_count: Math.max(0, prev.registered_count - 1),
                seats_left: prev.seats_left !== null && prev.seats_left !== undefined ? prev.seats_left + 1 : null,
              }
            : prev
        );
        setCancelModalOpen(false);
      }
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err.response?.data?.message || 'Failed to cancel registration.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <div className="h-4 skeleton-shimmer rounded w-28" />
        <div className="aspect-[16/9] w-full skeleton-shimmer rounded-[14px]" />
        <div className="h-8 skeleton-shimmer rounded w-1/2" />
        <div className="h-32 skeleton-shimmer rounded-[14px] w-full" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-[12px] bg-[#EF4444]/15 text-[#EF4444] mx-auto flex items-center justify-center border border-[#EF4444]/30">
          <Calendar className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-[#F8FAFC]">Event Not Available</h2>
        <p className="text-xs text-[#8B9BB4] leading-relaxed">{error || 'Could not find this event.'}</p>
        <Link
          to="/events"
          className="btn-primary text-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          <span>Back to All Events</span>
        </Link>
      </div>
    );
  }

  const timing = getEventTimingInfo({
    date: event.date,
    date_tbd: event.date_tbd,
    end_date: event.end_date,
    start_time: event.start_time,
    end_time: event.end_time,
  });

  const hasSeatLimit = event.max_participants !== null && event.max_participants !== undefined;
  const isFull = hasSeatLimit ? (event.registered_count >= Number(event.max_participants)) : false;
  const isPast = timing.isPast;
  const capacityPercent = hasSeatLimit ? Math.min(100, Math.round((event.registered_count / Number(event.max_participants)) * 100)) : 0;
  const seatsRemaining = hasSeatLimit
    ? (event.seats_left !== null && event.seats_left !== undefined
        ? event.seats_left
        : Math.max(0, Number(event.max_participants) - event.registered_count))
    : null;

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-page-enter">
      
      {/* Top Navigation & Share Bar */}
      <div className="flex items-center justify-between">
        <Link
          to="/events"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8B9BB4] hover:text-[#60A5FA] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Events Directory</span>
        </Link>

        <button
          onClick={handleShare}
          className="btn-secondary text-xs h-8 px-3 gap-1.5"
        >
          <Share2 className="w-3.5 h-3.5 text-[#8B9BB4]" />
          <span>{copiedLink ? 'Link Copied!' : 'Share'}</span>
        </button>
      </div>

      {alertInfo && <Alert type={alertInfo.type} message={alertInfo.message} />}

      {/* Main Grid: 8 Cols Left (Content), 4 Cols Right (Sticky Sidebar) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Large Hero Banner */}
          <div className="relative aspect-[16/9] w-full rounded-[14px] overflow-hidden bg-[#0D1526] border border-[#1F2D4A] shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
            {event.image ? (
              <img
                src={event.image}
                alt={event.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-900/60 via-indigo-950/80 to-[#0D1526] text-[#F8FAFC]">
                <div className="w-14 h-14 rounded-[14px] bg-[#16223B]/80 border border-[#1F2D4A] shadow-sm flex items-center justify-center mb-2.5">
                  <Calendar className="w-7 h-7 text-[#3B82F6]" />
                </div>
                <span className="text-xs font-semibold tracking-wider uppercase text-[#CBD5E1]">
                  {event.category_name || 'Campus Event'}
                </span>
              </div>
            )}
            
            <div className="absolute top-3.5 left-3.5 flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#16223B]/90 text-[#60A5FA] border border-[#1F2D4A] backdrop-blur-md shadow-sm">
                {event.category_name}
              </span>
              {timing.isDateTbd && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#A855F7]/20 text-[#C084FC] border border-[#A855F7]/40 backdrop-blur-md shadow-sm">
                  Date TBD
                </span>
              )}
            </div>
          </div>

          {/* Event Heading & Title */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-xs text-[#8B9BB4] font-medium">
              <span className="font-semibold text-[#60A5FA]">{event.category_name}</span>
              <span>·</span>
              <span className="font-mono">Event #{event.id}</span>
              <span>·</span>
              <span className="capitalize px-2 py-0.5 rounded-full bg-[#16223B] text-[#CBD5E1] font-semibold text-[11px] border border-[#1F2D4A]">
                {event.status}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#F8FAFC] tracking-tight leading-tight">
              {event.title}
            </h1>
          </div>

          {/* Description & Agenda Section */}
          <div className="academic-card p-6 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#3B82F6]">
              Event Description & Agenda
            </h2>
            <p className="text-sm text-[#CBD5E1] leading-relaxed whitespace-pre-line">
              {event.description}
            </p>
          </div>

          {/* Event Form Card */}
          {event.google_form_url && (
            <div className="academic-card p-5 space-y-3">
              <div className="flex items-center gap-2 text-[#F8FAFC] font-semibold text-sm">
                <FileText className="w-4 h-4 text-[#3B82F6]" />
                <span>Event Form</span>
              </div>
              <p className="text-xs text-[#8B9BB4] leading-relaxed">
                Open the Google Form for this event
              </p>
              <div>
                <a
                  href={event.google_form_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary text-xs h-9 inline-flex items-center gap-1.5"
                >
                  <span>Open Form</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}

          {/* Organizer / Department info */}
          <div className="academic-card p-6 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#3B82F6]">
              Event Host & Coordinator
            </h2>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="text-sm font-bold text-[#F8FAFC]">{event.organizer_name}</div>
                <div className="text-xs text-[#8B9BB4]">Faculty / Club Coordinator</div>
              </div>

              <div className="flex items-center gap-4 text-xs text-[#CBD5E1]">
                {event.organizer_email && (
                  <a
                    href={`mailto:${event.organizer_email}`}
                    className="flex items-center gap-1.5 text-[#60A5FA] hover:underline transition-colors"
                  >
                    <Mail className="w-4 h-4 text-[#8B9BB4]" />
                    <span>{event.organizer_email}</span>
                  </a>
                )}
                {event.organizer_phone && (
                  <div className="flex items-center gap-1.5 text-[#8B9BB4]">
                    <Phone className="w-4 h-4 text-[#8B9BB4]" />
                    <span>{event.organizer_phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Sticky Registration Card (4 cols) */}
        <div className="lg:col-span-4 sticky top-24 space-y-4">
          <div className="academic-card p-6 space-y-5">
            
            {/* Status indicator */}
            <div className="flex items-center justify-between pb-4 border-b border-[#1F2D4A]">
              <span className="text-[11px] font-bold text-[#8B9BB4] uppercase tracking-wider">
                Registration Status
              </span>
              {event.is_registered ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#4ADE80] bg-[#22C55E]/15 px-2.5 py-0.5 rounded-full border border-[#22C55E]/30">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Enrolled</span>
                </span>
              ) : timing.isDateTbd ? (
                <span className="text-xs font-semibold text-[#C084FC] bg-[#A855F7]/15 px-2.5 py-0.5 rounded-full border border-[#A855F7]/30">
                  Date TBD
                </span>
              ) : isPast ? (
                <span className="text-xs font-medium text-[#8B9BB4] bg-[#16223B] px-2.5 py-0.5 rounded-full border border-[#1F2D4A]">
                  Concluded
                </span>
              ) : isFull ? (
                <span className="text-xs font-semibold text-[#F87171] bg-[#EF4444]/15 px-2.5 py-0.5 rounded-full border border-[#EF4444]/30">
                  House Full
                </span>
              ) : (
                <span className="text-xs font-semibold text-[#60A5FA] bg-[#3B82F6]/15 px-2.5 py-0.5 rounded-full border border-[#3B82F6]/30">
                  Open
                </span>
              )}
            </div>

            {/* Schedule Rows with Lucide Icons */}
            <div className="space-y-3.5 text-xs">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-[8px] bg-[#3B82F6]/15 text-[#60A5FA] flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] font-medium text-[#8B9BB4]">Date</div>
                  <div className="font-semibold text-[#F8FAFC] tabular-nums">
                    {formatEventDateRange(event)}
                  </div>
                </div>
              </div>

              {!timing.isDateTbd && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-[8px] bg-[#3B82F6]/15 text-[#60A5FA] flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] font-medium text-[#8B9BB4]">Time</div>
                    <div className="font-semibold text-[#F8FAFC] tabular-nums">
                      {event.end_time ? `${event.start_time} - ${event.end_time}` : (event.start_time || 'TBD')}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-[8px] bg-[#3B82F6]/15 text-[#60A5FA] flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] font-medium text-[#8B9BB4]">Venue</div>
                  <div className="font-semibold text-[#F8FAFC]">
                    {event.venue}
                  </div>
                </div>
              </div>
            </div>

            {/* Capacity Progress Bar */}
            <div className="p-4 rounded-[10px] bg-[#0F1829] border border-[#1F2D4A] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#8B9BB4] flex items-center gap-1">
                  <Users className="w-3 h-3 text-[#8B9BB4]" />
                  <span>Enrolled Students:</span>
                </span>
                <span className="font-semibold text-[#F8FAFC] tabular-nums">
                  {event.registered_count} {hasSeatLimit ? `/ ${event.max_participants}` : ''}
                </span>
              </div>
              {hasSeatLimit && (
                <div className="w-full bg-[#16223B] h-2 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${capacityPercent}%` }}
                    className={`h-full rounded-full transition-all duration-300 ${
                      isFull ? 'bg-[#EF4444]' : capacityPercent > 80 ? 'bg-[#F59E0B]' : 'bg-[#3B82F6]'
                    }`}
                  />
                </div>
              )}
              <div className="text-xs text-right font-medium text-[#8B9BB4] tabular-nums">
                {hasSeatLimit ? (isFull ? '0 seats left (Full)' : `${seatsRemaining} seats left`) : 'Unlimited seats'}
              </div>
            </div>

            {/* Action Buttons */}
            <div>
              {event.status === 'cancelled' ? (
                <div className="p-3 text-center rounded-[10px] bg-[#EF4444]/15 text-[#F87171] text-xs font-semibold border border-[#EF4444]/30 space-y-1">
                  <div>⚠️ Event Cancelled by Administration</div>
                  <p className="text-[11px] font-normal text-[#CBD5E1]">
                    This event has been cancelled and is no longer open for attendance.
                  </p>
                </div>
              ) : event.status === 'pending' ? (
                <div className="p-3 text-center rounded-[10px] bg-[#F59E0B]/15 text-[#FBBF24] text-xs font-semibold border border-[#F59E0B]/30 space-y-1">
                  <div>⏳ Pending Admin Approval</div>
                  <p className="text-[11px] font-normal text-[#CBD5E1]">
                    This proposal is awaiting approval before registrations open.
                  </p>
                </div>
              ) : event.status === 'rejected' ? (
                <div className="p-3 text-center rounded-[10px] bg-[#EF4444]/15 text-[#F87171] text-xs font-semibold border border-[#EF4444]/30 space-y-1">
                  <div>❌ Event Proposal Declined</div>
                  <p className="text-[11px] font-normal text-[#CBD5E1]">
                    This proposal was not approved by administration.
                  </p>
                </div>
              ) : event.is_registered ? (
                <div className="space-y-2">
                  <button
                    onClick={() => setTicketModalOpen(true)}
                    className="btn-primary w-full"
                  >
                    <QrCode className="w-4 h-4 mr-1.5" />
                    <span>View QR Ticket Pass</span>
                  </button>
                  <button
                    onClick={() => setCancelModalOpen(true)}
                    className="w-full py-2 text-[#F87171] hover:text-[#EF4444] text-xs font-medium hover:bg-[#EF4444]/10 rounded-[10px] transition-colors text-center cursor-pointer"
                  >
                    Cancel Registration
                  </button>
                </div>
              ) : isPast ? (
                <div className="p-3 text-center rounded-[10px] bg-[#16223B] text-xs font-medium text-[#8B9BB4] border border-[#1F2D4A]">
                  Event has concluded.
                </div>
              ) : isFull ? (
                <div className="p-3 text-center rounded-[10px] bg-[#EF4444]/15 text-[#F87171] text-xs font-semibold border border-[#EF4444]/30">
                  All seats are fully booked.
                </div>
              ) : (
                <button
                  onClick={() => setModalOpen(true)}
                  className="btn-primary w-full h-11 text-sm font-semibold cursor-pointer"
                >
                  <span>Register Free</span>
                </button>
              )}
            </div>

            {/* Trust badge */}
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#8B9BB4] pt-2 border-t border-[#1F2D4A]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#22C55E]" />
              <span>Verified Campus Pulse Digital Pass</span>
            </div>

          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Confirm Event Registration"
          maxWidth="md"
          footer={
            <>
              <button
                onClick={() => setModalOpen(false)}
                className="btn-secondary text-xs h-9"
              >
                Cancel
              </button>
              <button
                onClick={handleRegister}
                disabled={actionLoading}
                className="btn-primary text-xs h-9"
              >
                {actionLoading ? 'Registering...' : 'Confirm Registration'}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="p-4 bg-[#111A2E] rounded-[12px] border border-[#1F2D4A] space-y-2.5 text-xs">
              <div className="flex justify-between py-0.5">
                <span className="text-[#8B9BB4]">Event:</span>
                <span className="font-semibold text-[#F8FAFC] text-right truncate max-w-[200px]">{event.title}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-[#8B9BB4]">Date:</span>
                <span className="font-medium text-[#CBD5E1] tabular-nums">{event.date}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-[#8B9BB4]">Venue:</span>
                <span className="font-medium text-[#CBD5E1]">{event.venue}</span>
              </div>
              <div className="pt-2 border-t border-[#1F2D4A] flex justify-between font-semibold">
                <span className="text-[#8B9BB4]">Seats:</span>
                <span className="text-[#3B82F6] tabular-nums">{event.seats_left} seats remaining</span>
              </div>
            </div>
            <p className="text-xs text-[#8B9BB4] leading-relaxed">
              Upon confirmation, an official entry pass with a cryptographically verifiable QR code will be generated.
            </p>
          </div>
        </Modal>
      )}

      {/* Cancel Registration Modal */}
      {cancelModalOpen && (
        <Modal
          isOpen={cancelModalOpen}
          onClose={() => setCancelModalOpen(false)}
          title="Cancel Registration"
          maxWidth="sm"
          footer={
            <>
              <button
                onClick={() => setCancelModalOpen(false)}
                className="btn-secondary text-xs h-9"
              >
                Keep Reservation
              </button>
              <button
                onClick={handleCancelRegistration}
                disabled={actionLoading}
                className="btn-danger text-xs h-9"
              >
                {actionLoading ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </>
          }
        >
          <div className="space-y-3 text-xs text-[#CBD5E1]">
            <p>
              Are you sure you want to cancel your registration for <strong className="text-[#F8FAFC]">{event.title}</strong>?
            </p>
            <p className="text-[#8B9BB4]">
              Your reserved seat will be released immediately to other students.
            </p>
          </div>
        </Modal>
      )}

      {/* Ticket Modal */}
      {ticketModalOpen && event.user_registration_id && (
        <TicketModal
          isOpen={ticketModalOpen}
          onClose={() => setTicketModalOpen(false)}
          registration={{
            registration_id: event.user_registration_id,
            registration_date: new Date().toISOString(),
            registration_status: 'confirmed',
            attendance_status: 'unmarked',
            student_id: user?.id || 0,
            student_name: user?.name || '',
            student_email: user?.email || '',
            student_phone: user?.phone || '',
            event_id: event.id,
            event_title: event.title,
            event_date: event.date,
            event_venue: event.venue,
            start_time: event.start_time,
            end_time: event.end_time,
            category_name: event.category_name,
            google_form_url: event.google_form_url,
          }}
        />
      )}
    </div>
  );
};
