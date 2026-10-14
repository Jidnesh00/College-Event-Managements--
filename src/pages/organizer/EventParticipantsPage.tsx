import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { eventService, notificationService } from '../../services/api';
import { AttendanceStatus, Registration } from '../../types';
import { Alert } from '../../components/common/Alert';
import { QRScannerModal } from '../../components/organizer/QRScannerModal';
import { TicketModal } from '../../components/common/TicketModal';
import {
  ArrowLeft,
  Users,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Search,
  Camera,
  QrCode,
  BellRing,
  Send,
  Radio,
  X,
  FileText,
  ExternalLink,
} from 'lucide-react';

interface ParticipantRecord {
  registration_id: number;
  registration_date: string;
  registration_status: string;
  attendance_status: AttendanceStatus;
  google_form_completed?: number | boolean;
  student_id: number;
  student_name: string;
  student_email: string;
  student_phone: string;
}

export const EventParticipantsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [eventInfo, setEventInfo] = useState<{
    id: number;
    title: string;
    date: string;
    venue: string;
    max_participants: number;
    google_form_url?: string | null;
  } | null>(null);

  const [stats, setStats] = useState<{
    total: number;
    confirmed: number;
    present: number;
    absent: number;
    unmarked: number;
    formSubmitted?: number;
  }>({ total: 0, confirmed: 0, present: 0, absent: 0, unmarked: 0, formSubmitted: 0 });

  const [participants, setParticipants] = useState<ParticipantRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [alertInfo, setAlertInfo] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Scanner and Ticket Preview Modals
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [previewTicket, setPreviewTicket] = useState<Registration | null>(null);

  // Broadcast Modal State
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);

  useEffect(() => {
    if (eventInfo) {
      setBroadcastTitle(`Reminder: ${eventInfo.title} is coming up!`);
      setBroadcastMessage(
        `Dear attendee, please remember to bring your digital QR Pass for check-in at ${eventInfo.venue}. Gates open 15 minutes before start time.`
      );
    }
  }, [eventInfo]);

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !broadcastTitle || !broadcastMessage) return;

    try {
      setBroadcasting(true);
      const res = await notificationService.broadcastEventAnnouncement(id, {
        title: broadcastTitle,
        message: broadcastMessage,
      });

      if (res.success) {
        setAlertInfo({
          type: 'success',
          message: `Real-time reminder alert sent to ${res.recipientCount} student(s) over WebSocket!`,
        });
        setBroadcastModalOpen(false);
      }
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err.response?.data?.message || 'Failed to send broadcast.',
      });
    } finally {
      setBroadcasting(false);
    }
  };

  useEffect(() => {
    loadParticipants();
  }, [id]);

  async function loadParticipants() {
    if (!id) return;
    try {
      setLoading(true);
      const res = await eventService.getParticipants(id);
      if (res.success) {
        setEventInfo(res.event);
        setStats(res.stats);
        setParticipants(res.participants);
      }
    } catch (err) {
      console.error('Failed to load participants', err);
    } finally {
      setLoading(false);
    }
  }

  const handleAttendanceChange = async (registrationId: number, newStatus: AttendanceStatus) => {
    if (!id) return;
    try {
      setUpdatingId(registrationId);
      const res = await eventService.updateAttendance(id, registrationId, newStatus);
      if (res.success) {
        setParticipants((prev) =>
          prev.map((p) =>
            p.registration_id === registrationId
              ? { ...p, attendance_status: newStatus }
              : p
          )
        );
        // Recalculate stats
        setStats((prev) => {
          const oldRecord = participants.find((p) => p.registration_id === registrationId);
          const oldStatus = oldRecord?.attendance_status || 'unmarked';
          return {
            ...prev,
            [oldStatus]: Math.max(0, (prev as any)[oldStatus] - 1),
            [newStatus]: (prev as any)[newStatus] + 1,
          };
        });
      }
    } catch (err: any) {
      setAlertInfo({ type: 'error', message: 'Failed to update attendance status.' });
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredParticipants = participants.filter((p) =>
    p.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.student_email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-page-enter">
      
      {/* Header */}
      <div>
        <Link
          to="/organizer/events"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7C8BA8] hover:text-[#3B82F6] mb-2 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to My Events</span>
        </Link>

        {eventInfo && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1F2D4A]">
            <div>
              <h1 className="text-[32px] font-bold tracking-tight text-[#F1F5F9]">
                Attendee Roster: {eventInfo.title}
              </h1>
              <p className="text-[13px] text-[#7C8BA8] mt-1">
                Manage registrations and live attendance check-in.
              </p>
              <div className="flex items-center gap-2 text-xs text-[#7C8BA8] mt-2">
                <span>{eventInfo.date}</span>
                <span>·</span>
                <span>{eventInfo.venue}</span>
                <span>·</span>
                <span className="tabular-nums font-medium text-[#CBD5E1]">
                  {participants.length} / {eventInfo.max_participants} enrolled
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start">
              <button
                type="button"
                onClick={() => setBroadcastModalOpen(true)}
                className="px-3.5 py-2 bg-[#F59E0B]/15 hover:bg-[#F59E0B]/25 text-[#F59E0B] border border-[#F59E0B]/30 text-xs font-semibold rounded-[10px] shadow-xs flex items-center gap-1.5 transition-colors"
                title="Send real-time alert reminder to all registered students"
              >
                <BellRing className="w-3.5 h-3.5" />
                <span>Broadcast Reminder</span>
              </button>

              <button
                type="button"
                onClick={() => setQrScannerOpen(true)}
                className="btn-primary text-xs"
              >
                <Camera className="w-3.5 h-3.5 mr-1.5" />
                <span>Scan Attendee QR</span>
              </button>

              <Link
                to={`/events/${id}`}
                className="btn-secondary text-xs"
              >
                Public Page
              </Link>
            </div>
          </div>
        )}
      </div>

      {alertInfo && <Alert type={alertInfo.type} message={alertInfo.message} />}

      {/* Google Form Integration Banner for Organizer */}
      {eventInfo?.google_form_url && (
        <div className="p-4 bg-[#16223B] border border-[#1F2D4A] rounded-[14px] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-[#F1F5F9]">
              <FileText className="w-4 h-4 text-[#3B82F6]" />
              <span>Event Form Attached</span>
            </div>
            <p className="text-[11px] text-[#7C8BA8] max-w-xl">
              This event includes a Google Form link with extra details or materials for students.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={eventInfo.google_form_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-xs"
            >
              <span>Open Form</span>
              <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
            </a>
          </div>
        </div>
      )}

      {/* Attendance Stats Counter */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 academic-card space-y-1">
          <div className="text-xs text-[#7C8BA8] font-medium">Total Registered</div>
          <div className="text-2xl font-bold text-[#F1F5F9] tabular-nums">{stats.total}</div>
        </div>

        <div className="p-4 academic-card border-[#22C55E]/30 space-y-1">
          <div className="text-xs text-[#22C55E] font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" />
            <span>Marked Present</span>
          </div>
          <div className="text-2xl font-bold text-[#22C55E] tabular-nums">{stats.present}</div>
        </div>

        <div className="p-4 academic-card border-[#EF4444]/30 space-y-1">
          <div className="text-xs text-[#EF4444] font-medium flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5 text-[#EF4444]" />
            <span>Marked Absent</span>
          </div>
          <div className="text-2xl font-bold text-[#EF4444] tabular-nums">{stats.absent}</div>
        </div>

        <div className="p-4 academic-card space-y-1">
          <div className="text-xs text-[#7C8BA8] font-medium flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5 text-[#7C8BA8]" />
            <span>Unmarked</span>
          </div>
          <div className="text-2xl font-bold text-[#CBD5E1] tabular-nums">{stats.unmarked}</div>
        </div>
      </div>

      {/* Search Filter */}
      <div className="academic-card p-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7C8BA8] pointer-events-none" />
          <input
            type="text"
            placeholder="Search attendees by student name or college email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-base w-full pl-10 text-xs"
          />
        </div>
      </div>

      {/* Roster Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 academic-card skeleton-shimmer" />
          ))}
        </div>
      ) : filteredParticipants.length === 0 ? (
        <div className="p-12 text-center academic-card space-y-2">
          <Users className="w-8 h-8 text-[#7C8BA8] mx-auto" />
          <h3 className="text-sm font-semibold text-[#F1F5F9]">No students found</h3>
          <p className="text-xs text-[#7C8BA8]">
            {searchTerm ? 'No registered attendees matched your search.' : 'No students have registered for this event yet.'}
          </p>
        </div>
      ) : (
        <div className="academic-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Contact</th>
                  <th>Registration Date</th>
                  <th>Current Attendance</th>
                  <th className="text-right">Mark Attendance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F2D4A]">
                {filteredParticipants.map((p) => (
                  <tr key={p.registration_id}>
                    
                    {/* Student Info */}
                    <td>
                      <div className="font-semibold text-[#F1F5F9]">{p.student_name}</div>
                      <div className="text-[11px] text-[#7C8BA8]">Student ID #{p.student_id}</div>
                    </td>

                    {/* Contact */}
                    <td className="text-[#CBD5E1]">
                      <div>{p.student_email}</div>
                      {p.student_phone && (
                        <div className="text-[11px] text-[#7C8BA8]">{p.student_phone}</div>
                      )}
                    </td>

                    {/* Date */}
                    <td className="text-[#CBD5E1] tabular-nums">
                      {new Date(p.registration_date).toLocaleDateString()}
                    </td>

                    {/* Current Attendance */}
                    <td>
                      {p.attendance_status === 'present' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#22C55E] bg-[#22C55E]/15 border border-[#22C55E]/30 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Present</span>
                        </span>
                      ) : p.attendance_status === 'absent' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#EF4444] bg-[#EF4444]/15 border border-[#EF4444]/30 px-2 py-0.5 rounded-full">
                          <XCircle className="w-3 h-3" />
                          <span>Absent</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#7C8BA8] bg-[#16223B] border border-[#1F2D4A] px-2 py-0.5 rounded-full">
                          Unmarked
                        </span>
                      )}
                    </td>

                    {/* Interactive Attendance Action Buttons */}
                    <td className="text-right">
                      <div className="inline-flex items-center gap-1.5 p-0.5 bg-[#0F1829] border border-[#1F2D4A] rounded-[8px]">
                        <button
                          onClick={() =>
                            setPreviewTicket({
                              registration_id: p.registration_id,
                              registration_date: p.registration_date,
                              registration_status: p.registration_status as any,
                              attendance_status: p.attendance_status,
                              student_id: p.student_id,
                              student_name: p.student_name,
                              student_email: p.student_email,
                              student_phone: p.student_phone,
                              event_id: Number(id),
                              event_title: eventInfo?.title || 'Event',
                              event_date: eventInfo?.date || '',
                              event_venue: eventInfo?.venue || '',
                            })
                          }
                          title="View Attendee QR Ticket Pass"
                          className="px-2 py-1 text-[11px] font-medium text-[#7C8BA8] hover:text-[#3B82F6] rounded flex items-center gap-1 transition-colors"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>QR Pass</span>
                        </button>

                        <button
                          onClick={() => handleAttendanceChange(p.registration_id, 'present')}
                          disabled={updatingId === p.registration_id}
                          className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
                            p.attendance_status === 'present'
                              ? 'bg-[#22C55E] text-white font-semibold'
                              : 'text-[#7C8BA8] hover:text-[#22C55E]'
                          }`}
                        >
                          Present
                        </button>
                        <button
                          onClick={() => handleAttendanceChange(p.registration_id, 'absent')}
                          disabled={updatingId === p.registration_id}
                          className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
                            p.attendance_status === 'absent'
                              ? 'bg-[#EF4444] text-white font-semibold'
                              : 'text-[#7C8BA8] hover:text-[#EF4444]'
                          }`}
                        >
                          Absent
                        </button>
                        <button
                          onClick={() => handleAttendanceChange(p.registration_id, 'unmarked')}
                          disabled={updatingId === p.registration_id}
                          className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
                            p.attendance_status === 'unmarked'
                              ? 'bg-[#16223B] text-[#F1F5F9] font-semibold'
                              : 'text-[#7C8BA8] hover:text-[#CBD5E1]'
                          }`}
                        >
                          Reset
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Entry Gate QR Scanner Modal */}
      {id && (
        <QRScannerModal
          isOpen={qrScannerOpen}
          onClose={() => setQrScannerOpen(false)}
          eventId={id}
          eventTitle={eventInfo?.title || 'Event Gate Check-in'}
          onAttendeeAdmitted={(admittedRegId) => {
            setParticipants((prev) =>
              prev.map((p) =>
                p.registration_id === admittedRegId
                  ? { ...p, attendance_status: 'present' }
                  : p
              )
            );
            setStats((prev) => ({
              ...prev,
              present: prev.present + 1,
              unmarked: Math.max(0, prev.unmarked - 1),
            }));
          }}
        />
      )}

      {/* Ticket Pass Preview Modal */}
      <TicketModal
        isOpen={Boolean(previewTicket)}
        onClose={() => setPreviewTicket(null)}
        registration={previewTicket}
      />

      {/* Broadcast Reminder Modal */}
      {broadcastModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-modal-in">
          <div className="surface-elevated max-w-lg w-full overflow-hidden">
            <div className="p-4 bg-[#16223B] border-b border-[#1F2D4A] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30 rounded-[8px]">
                  <BellRing className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#F1F5F9]">Broadcast Real-Time Reminder</h3>
                  <p className="text-[11px] text-[#7C8BA8]">
                    Instantly notifies {participants.length} registered attendee(s) via WebSockets.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBroadcastModalOpen(false)}
                className="text-[#7C8BA8] hover:text-[#F1F5F9] p-1 rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendBroadcast} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">
                  Alert Title
                </label>
                <input
                  type="text"
                  required
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  className="input-base w-full text-xs sm:text-sm"
                  placeholder="e.g. Reminder: HackFest 2026 starts tomorrow!"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">
                  Message Content
                </label>
                <textarea
                  required
                  rows={3}
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-[#0F1829] border border-[#1F2D4A] rounded-[10px] focus:outline-none focus:ring-[3px] focus:ring-[#3B82F6]/25 focus:border-[#3B82F6] text-[#F1F5F9] transition-colors placeholder:text-[#7C8BA8]"
                  placeholder="Enter reminder details, venue directions, or required equipment..."
                />
              </div>

              <div className="p-3 bg-[#0F1829] rounded-[10px] border border-[#1F2D4A] text-xs text-[#CBD5E1] space-y-1">
                <div className="font-semibold text-[#F1F5F9] flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-[#22C55E]" />
                  <span>Real-Time Broadcast Delivery</span>
                </div>
                <p className="text-[11px] text-[#7C8BA8]">
                  This will trigger an audio chime, pop-up toast, and persistent notification on the dashboards of all enrolled students.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBroadcastModalOpen(false)}
                  className="btn-secondary text-xs h-9"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={broadcasting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#3B82F6] hover:bg-[#2563EB] rounded-[10px] shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-60 h-9"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{broadcasting ? 'Broadcasting...' : 'Send Live Reminder'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
