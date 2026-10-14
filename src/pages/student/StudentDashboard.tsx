import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { registrationService, eventService, studentService } from '../../services/api';
import { Registration, CollegeEvent, StudentProfile } from '../../types';
import { TicketModal } from '../../components/common/TicketModal';
import { Modal } from '../../components/common/Modal';
import { Alert } from '../../components/common/Alert';
import { RealtimeNotificationPanel } from '../../components/student/RealtimeNotificationPanel';
import { CountUpNumber } from '../../components/common/CountUpNumber';
import { getEventTimingInfo } from '../../utils/eventTiming';
import {
  Calendar,
  Ticket,
  CheckCircle,
  MapPin,
  Compass,
  QrCode,
  FileText,
  Clock,
  PlusCircle,
  Edit2,
  Trash2,
  AlertCircle,
  AlertTriangle,
  UserCheck,
  Layers,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

interface StudentDashboardProps {
  defaultTab?: 'registered' | 'created';
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ defaultTab = 'registered' }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Active Tab: check query parameter ?tab= or defaultTab prop
  const searchParams = new URLSearchParams(location.search);
  const initialTab = (searchParams.get('tab') as 'registered' | 'created') || defaultTab;
  const [activeTab, setActiveTab] = useState<'registered' | 'created'>(initialTab);

  // Registrations state
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(true);
  const [ticketModalReg, setTicketModalReg] = useState<Registration | null>(null);

  // Student created events state
  const [createdEvents, setCreatedEvents] = useState<CollegeEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // Student profile state for 100% completion check
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<CollegeEvent | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [alertInfo, setAlertInfo] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'created' || tabParam === 'registered') {
      setActiveTab(tabParam);
    }
  }, [location.search]);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        setLoadingRegistrations(true);
        const res = await registrationService.getMyRegistrations();
        if (res.success) {
          setRegistrations(res.registrations || []);
        }
      } catch (err) {
        console.error('Failed to load student registrations', err);
      } finally {
        setLoadingRegistrations(false);
      }

      try {
        setLoadingEvents(true);
        const res = await eventService.getAll({ organizer_id: user.id });
        if (res.success) {
          setCreatedEvents(res.events || []);
        }
      } catch (err) {
        console.error('Failed to load created events', err);
      } finally {
        setLoadingEvents(false);
      }

      try {
        const pRes = await studentService.getProfile();
        if (pRes.success) {
          setStudentProfile(pRes.profile);
        }
      } catch (err) {
        console.warn('Notice loading student profile in dashboard', err);
      }
    }

    loadData();
  }, [user]);

  const isProfileComplete = Boolean(studentProfile?.is_complete);

  const handleCreateEventClick = () => {
    if (!isProfileComplete) {
      navigate('/student/profile', {
        state: { message: 'Complete your profile to create events' },
      });
    } else {
      navigate('/organizer/events/new');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      const res = await eventService.delete(deleteTarget.id);
      if (res.success) {
        setAlertInfo({ type: 'success', message: `Event "${deleteTarget.title}" deleted successfully.` });
        setCreatedEvents((prev) => prev.filter((e) => e.id !== deleteTarget.id));
        setDeleteTarget(null);
      }
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err.response?.data?.message || 'Failed to delete event.',
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const confirmedRegistrations = registrations.filter((r) => r.registration_status === 'confirmed');
  const upcomingRegistrations = confirmedRegistrations.filter((r) => {
    const timing = getEventTimingInfo({
      date: r.event_date,
      date_tbd: r.date_tbd,
      end_date: r.end_date,
      start_time: r.start_time,
      end_time: r.end_time,
    });
    return timing.isUpcoming || timing.isOngoing;
  });

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#1F2D4A]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC]">
            Student Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-[#8B9BB4] mt-1">
            Welcome back, <span className="text-[#F8FAFC] font-semibold">{user?.name}</span> · Manage your ticket passes, proposed events, and reminders.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <Link to="/events" className="btn-secondary text-xs">
            <Compass className="w-3.5 h-3.5 mr-1 text-[#8B9BB4]" />
            <span>Browse Events</span>
          </Link>

          {/* Create Event Button for Students */}
          <button
            onClick={handleCreateEventClick}
            className="btn-primary text-xs"
          >
            <PlusCircle className="w-3.5 h-3.5 mr-1" />
            <span>Create Event</span>
          </button>
        </div>
      </div>

      {alertInfo && <Alert type={alertInfo.type} message={alertInfo.message} />}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Metric 1: Upcoming Event Passes */}
        <div className="academic-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#8B9BB4]">Upcoming Events</span>
            <div className="w-9 h-9 rounded-[10px] bg-[#3B82F6]/15 text-[#60A5FA] flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#F8FAFC] tabular-nums tracking-tight">
              <CountUpNumber value={upcomingRegistrations.length} />
            </div>
            <div className="text-[11px] text-[#8B9BB4] mt-1">
              Scheduled on your calendar
            </div>
          </div>
        </div>

        {/* Metric 2: My Created Events */}
        <div
          onClick={() => setActiveTab('created')}
          className="academic-card p-5 space-y-3 cursor-pointer hover:border-[#3B82F6]/40 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#8B9BB4]">My Created Events</span>
            <div className="w-9 h-9 rounded-[10px] bg-[#A855F7]/15 text-[#C084FC] flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#F8FAFC] tabular-nums tracking-tight">
              <CountUpNumber value={createdEvents.length} />
            </div>
            <div className="text-[11px] text-[#8B9BB4] mt-1 flex items-center gap-1">
              <span>Submitted for approval</span>
              <ArrowRight className="w-3 h-3 text-[#A855F7]" />
            </div>
          </div>
        </div>

        {/* Metric 3: Profile Status */}
        <Link
          to="/student/profile"
          className="academic-card p-5 space-y-3 hover:border-[#3B82F6]/40 transition-colors block"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#8B9BB4]">Student Profile</span>
            <div
              className={`w-9 h-9 rounded-[10px] flex items-center justify-center ${
                isProfileComplete
                  ? 'bg-[#22C55E]/15 text-[#4ADE80]'
                  : 'bg-[#F59E0B]/15 text-[#FBBF24]'
              }`}
            >
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#F8FAFC] tabular-nums tracking-tight">
              {studentProfile?.completion_percentage ?? 0}%
            </div>
            <div className="text-[11px] text-[#8B9BB4] mt-1 flex items-center gap-1">
              {isProfileComplete ? (
                <span className="text-[#4ADE80] font-medium">100% Complete · Event Creation Enabled</span>
              ) : (
                <span className="text-[#FBBF24] font-medium">Complete profile to create events</span>
              )}
            </div>
          </div>
        </Link>
      </div>

      {/* Tabs Switcher: Passes vs Created Events */}
      <div className="flex items-center gap-2 border-b border-[#1F2D4A] pb-1">
        <button
          onClick={() => setActiveTab('registered')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-[10px] text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'registered'
              ? 'border-[#3B82F6] text-[#F8FAFC] bg-[#16223B]/60'
              : 'border-transparent text-[#8B9BB4] hover:text-[#CBD5E1] hover:bg-[#16223B]/30'
          }`}
        >
          <Ticket className="w-4 h-4" />
          <span>My Ticket Passes</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-[#3B82F6]/20 text-[#60A5FA]">
            {registrations.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('created')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-[10px] text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'created'
              ? 'border-[#3B82F6] text-[#F8FAFC] bg-[#16223B]/60'
              : 'border-transparent text-[#8B9BB4] hover:text-[#CBD5E1] hover:bg-[#16223B]/30'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>My Created Events</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-[#A855F7]/20 text-[#C084FC]">
            {createdEvents.length}
          </span>
        </button>
      </div>

      {/* TAB CONTENT */}
      {activeTab === 'created' ? (
        /* =================== SECTION: MY CREATED EVENTS =================== */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#F8FAFC] flex items-center gap-2">
                <span>My Created Events</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#3B82F6]/15 text-[#60A5FA] border border-[#3B82F6]/30">
                  Student Proposals
                </span>
              </h2>
              <p className="text-xs text-[#8B9BB4] mt-0.5">
                Events you created. New events begin as Pending approval and go live once an admin approves them.
              </p>
            </div>

            <button
              onClick={handleCreateEventClick}
              className="btn-primary text-xs self-start gap-1"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Create Event</span>
            </button>
          </div>

          {loadingEvents ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 skeleton-shimmer rounded-[14px]" />
              ))}
            </div>
          ) : createdEvents.length === 0 ? (
            <div className="academic-card p-12 text-center space-y-3">
              <Calendar className="w-10 h-10 text-[#8B9BB4] mx-auto opacity-50" />
              <h3 className="text-sm font-semibold text-[#F8FAFC]">
                You haven't created any events yet
              </h3>
              <p className="text-xs text-[#8B9BB4] max-w-md mx-auto">
                {isProfileComplete
                  ? 'Your profile is 100% complete! Propose a new campus workshop, hackathon, or cultural fest to be reviewed by administration.'
                  : 'Complete your student profile to 100% to unlock student event creation.'}
              </p>
              <div className="pt-2">
                {isProfileComplete ? (
                  <button
                    onClick={handleCreateEventClick}
                    className="btn-primary text-xs inline-flex items-center gap-1.5"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Create Your First Event</span>
                  </button>
                ) : (
                  <Link
                    to="/student/profile"
                    className="btn-primary text-xs inline-flex items-center gap-1.5"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Complete Profile to Create Events</span>
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="academic-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Event Title</th>
                      <th>Category</th>
                      <th>Schedule / Date</th>
                      <th>Status Badge</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {createdEvents.map((ev) => {
                      const isPending = ev.status === 'pending';
                      const isApproved = ev.status === 'approved';
                      const isRejected = ev.status === 'rejected';
                      const isCancelled = ev.status === 'cancelled';

                      return (
                        <tr key={ev.id}>
                          {/* Title & Venue */}
                          <td>
                            <div className="font-semibold text-[#F8FAFC] line-clamp-1 max-w-xs">
                              {isApproved ? (
                                <Link
                                  to={`/events/${ev.id}`}
                                  className="hover:text-[#3B82F6] transition-colors"
                                >
                                  {ev.title}
                                </Link>
                              ) : (
                                <span>{ev.title}</span>
                              )}
                            </div>
                            <div className="text-[11px] text-[#8B9BB4] flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-[#8B9BB4]" />
                              <span className="truncate max-w-[200px]">{ev.venue}</span>
                            </div>

                            {/* Rejection Reason Notice if present */}
                            {isRejected && ev.rejection_reason && (
                              <div className="mt-2 p-2 bg-[#EF4444]/10 border border-[#EF4444]/25 rounded-[8px] text-[11px] text-[#F87171] max-w-sm space-y-0.5">
                                <div className="font-semibold flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3 text-[#F87171]" />
                                  <span>Admin Rejection Reason:</span>
                                </div>
                                <p className="italic pl-4 text-[#CBD5E1]">"{ev.rejection_reason}"</p>
                              </div>
                            )}
                          </td>

                          {/* Category */}
                          <td>
                            <span className="text-xs text-[#CBD5E1]">
                              {ev.category_name || 'Event'}
                            </span>
                          </td>

                          {/* Schedule / Date */}
                          <td className="text-xs tabular-nums text-[#CBD5E1]">
                            {ev.date_tbd ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#A855F7]/15 text-[#C084FC] border border-[#A855F7]/30">
                                Date TBD
                              </span>
                            ) : (
                              <div>
                                <div className="font-medium text-[#F8FAFC]">
                                  {ev.end_date && ev.end_date !== ev.date
                                    ? `${ev.date} - ${ev.end_date}`
                                    : ev.date}
                                </div>
                                {ev.start_time && (
                                  <div className="text-[11px] text-[#8B9BB4]">
                                    {ev.end_time ? `${ev.start_time} - ${ev.end_time}` : ev.start_time}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                                isApproved
                                  ? 'bg-[#22C55E]/15 text-[#4ADE80] border-[#22C55E]/30'
                                  : isPending
                                  ? 'bg-[#F59E0B]/15 text-[#FBBF24] border-[#F59E0B]/30'
                                  : isRejected
                                  ? 'bg-[#EF4444]/15 text-[#F87171] border-[#EF4444]/30'
                                  : isCancelled
                                  ? 'bg-[#EF4444]/15 text-[#F87171] border-[#EF4444]/30'
                                  : 'bg-[#16223B] text-[#CBD5E1] border-[#1F2D4A]'
                              }`}
                            >
                              {isPending
                                ? 'Pending approval'
                                : isApproved
                                ? 'Approved'
                                : isRejected
                                ? 'Rejected'
                                : isCancelled
                                ? 'Cancelled'
                                : ev.status}
                            </span>
                          </td>

                          {/* Actions: Edit & Delete for pending or rejected */}
                          <td className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isPending || isRejected ? (
                                <>
                                  <Link
                                    to={`/organizer/events/${ev.id}/edit`}
                                    title="Edit and Resubmit Event"
                                    className="p-1.5 text-[#8B9BB4] hover:text-[#3B82F6] hover:bg-[#16223B] rounded-[8px] transition-colors inline-flex items-center gap-1 text-xs"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Edit</span>
                                  </Link>
                                  <button
                                    onClick={() => setDeleteTarget(ev)}
                                    title="Delete Event"
                                    className="p-1.5 text-[#8B9BB4] hover:text-[#EF4444] rounded-[8px] hover:bg-[#EF4444]/10 transition-colors inline-flex items-center gap-1 text-xs cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Delete</span>
                                  </button>
                                </>
                              ) : isApproved ? (
                                <span className="text-[11px] text-[#8B9BB4] italic">
                                  Approved (Contact admin to change)
                                </span>
                              ) : (
                                <span className="text-[11px] text-[#8B9BB4] italic">
                                  Archived
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* =================== SECTION: MY TICKET PASSES =================== */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Registered Passes */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#1F2D4A]">
              <h2 className="text-base font-bold text-[#F8FAFC]">
                My Event Ticket Passes
              </h2>
              <Link
                to="/student/registrations"
                className="text-xs font-semibold text-[#3B82F6] hover:text-[#60A5FA] transition-colors"
              >
                View Pass History →
              </Link>
            </div>

            {loadingRegistrations ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 skeleton-shimmer rounded-[14px]" />
                ))}
              </div>
            ) : registrations.length === 0 ? (
              <div className="academic-card p-8 text-center space-y-3">
                <Ticket className="w-8 h-8 text-[#8B9BB4] mx-auto opacity-50" />
                <h3 className="text-sm font-semibold text-[#F8FAFC]">
                  No Active Event Passes
                </h3>
                <p className="text-xs text-[#8B9BB4] max-w-sm mx-auto">
                  Browse upcoming campus technical workshops, hackathons, and cultural fests to register.
                </p>
                <div className="pt-2">
                  <Link to="/events" className="btn-primary text-xs">
                    Browse All Events
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {registrations.slice(0, 5).map((reg) => {
                  const timing = getEventTimingInfo({
                    date: reg.event_date,
                    date_tbd: reg.date_tbd,
                    end_date: reg.end_date,
                    start_time: reg.start_time,
                    end_time: reg.end_time,
                  });

                  return (
                    <div
                      key={reg.registration_id}
                      className="academic-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-[#3B82F6]">
                            {reg.category_name}
                          </span>

                          {timing.isDateTbd ? (
                            <span className="bg-[#A855F7]/20 text-[#C084FC] border border-[#A855F7]/40 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                              Date TBD
                            </span>
                          ) : timing.isOngoing ? (
                            <span className="bg-[#22C55E]/20 text-[#4ADE80] border border-[#22C55E]/40 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-ping" />
                              <span>LIVE NOW</span>
                            </span>
                          ) : (
                            <span className="bg-[#3B82F6]/20 text-[#60A5FA] border border-[#3B82F6]/40 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                              {timing.countdownText || 'Upcoming'}
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-bold text-[#F8FAFC]">
                          <Link
                            to={`/events/${reg.event_id}`}
                            className="hover:text-[#3B82F6] transition-colors"
                          >
                            {reg.event_title}
                          </Link>
                        </h3>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-[#8B9BB4]">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-[#3B82F6]" />
                            <span className="tabular-nums font-medium text-[#CBD5E1]">
                              {reg.date_tbd
                                ? 'Date TBD'
                                : reg.end_date && reg.end_date !== reg.event_date
                                ? `${reg.event_date} - ${reg.end_date}`
                                : reg.event_date || 'Date TBD'}
                            </span>
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-[#8B9BB4]" />
                            <span>{reg.event_venue}</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-center">
                        <button
                          onClick={() => setTicketModalReg(reg)}
                          className="btn-primary text-xs h-9"
                        >
                          <QrCode className="w-3.5 h-3.5 mr-1" />
                          <span>Ticket Pass</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Alerts & Announcements */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-[#F8FAFC] pb-2 border-b border-[#1F2D4A]">
              Campus Broadcasts
            </h2>
            <div className="academic-card p-4">
              <RealtimeNotificationPanel />
            </div>
          </div>
        </div>
      )}

      {/* Ticket Modal */}
      {ticketModalReg && (
        <TicketModal
          isOpen={!!ticketModalReg}
          onClose={() => setTicketModalReg(null)}
          registration={ticketModalReg}
        />
      )}

      {/* Delete Event Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete Created Event"
      >
        <div className="space-y-4">
          <p className="text-xs text-[#CBD5E1] leading-relaxed">
            Are you sure you want to delete <strong className="text-[#F8FAFC]">"{deleteTarget?.title}"</strong>? This will permanently delete the event proposal.
          </p>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => setDeleteTarget(null)}
              className="btn-secondary text-xs"
              disabled={deleteLoading}
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteConfirm}
              className="btn-danger text-xs"
              disabled={deleteLoading}
            >
              {deleteLoading ? 'Deleting...' : 'Delete Event'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
