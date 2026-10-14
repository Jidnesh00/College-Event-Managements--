import React, { useEffect, useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { eventService } from '../../services/api';
import { CollegeEvent } from '../../types';
import { getEventTimingInfo } from '../../utils/eventTiming';
import { QRScannerModal } from '../../components/organizer/QRScannerModal';
import { OrganizerDashboardCharts } from '../../components/organizer/OrganizerDashboardCharts';
import { CountUpNumber } from '../../components/common/CountUpNumber';
import { Alert } from '../../components/common/Alert';
import {
  Calendar,
  Users,
  PlusCircle,
  Clock,
  TrendingUp,
  MapPin,
  QrCode,
  Search,
  Filter,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Layers,
  FileCheck,
} from 'lucide-react';

export const OrganizerDashboard: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [events, setEvents] = useState<CollegeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanningEvent, setScanningEvent] = useState<CollegeEvent | null>(null);
  const [alertInfo, setAlertInfo] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Table filters & search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  useEffect(() => {
    async function loadOrganizerEvents() {
      if (!user) return;
      try {
        setLoading(true);
        setAlertInfo(null);
        const res = await eventService.getAll({ organizer_id: user.id });
        if (res.success) {
          setEvents(res.events);
        }
      } catch (err: any) {
        console.error('Failed to load organizer dashboard events', err);
        setAlertInfo({
          type: 'error',
          message: err.response?.data?.message || 'Failed to load organizer dashboard events.',
        });
      } finally {
        setLoading(false);
      }
    }
    loadOrganizerEvents();
  }, [user]);

  const totalEvents = events.length;
  const upcomingEvents = events.filter((e) => {
    const timing = getEventTimingInfo(e);
    return timing.isUpcoming || timing.isOngoing;
  });
  const totalRegistrations = events.reduce((acc, curr) => acc + (curr.registered_count || 0), 0);
  const totalCapacity = events.reduce((acc, curr) => acc + (curr.max_participants || 0), 0);
  const fillRate = totalCapacity > 0 ? Math.round((totalRegistrations / totalCapacity) * 100) : 0;

  // Filtered & Paginated events for the data table
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const matchesSearch =
        ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ev.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ev.category_name && ev.category_name.toLowerCase().includes(searchQuery.toLowerCase()));

      const timing = getEventTimingInfo(ev);
      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'upcoming'
          ? (timing.isUpcoming || timing.isOngoing)
          : timing.isPast;

      return matchesSearch && matchesStatus;
    });
  }, [events, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / pageSize));
  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEvents.slice(start, start + pageSize);
  }, [filteredEvents, currentPage, pageSize]);

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-page-enter">
      
      {/* Sidebar Layout: 12-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Sidebar (3 Cols) */}
        <aside className="lg:col-span-3 space-y-4">
          <div className="bg-[#0D1526] rounded-[14px] border border-[#1F2D4A] p-4 shadow-sm space-y-4">
            <div className="pb-3 border-b border-[#1F2D4A]">
              <span className="text-[11px] font-semibold text-[#7C8BA8] uppercase tracking-wider">
                Organizer Portal
              </span>
              <h2 className="text-sm font-bold text-[#F1F5F9] mt-0.5 truncate">
                {user?.name || 'Club Organizer'}
              </h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#3B82F6]/15 text-[#3B82F6] border border-[#3B82F6]/30 mt-1">
                Event Organizer
              </span>
            </div>

            <nav className="space-y-1 text-sm font-medium">
              <Link
                to="/organizer/dashboard"
                className="flex items-center gap-2.5 px-3 py-2 rounded-[10px] bg-[#3B82F6]/15 text-[#3B82F6] font-semibold"
              >
                <LayoutDashboard className="w-4 h-4 text-[#3B82F6]" />
                <span>Overview</span>
              </Link>

              <Link
                to="/organizer/events"
                className="flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-[#CBD5E1] hover:text-[#F1F5F9] hover:bg-[#16223B] transition-colors"
              >
                <Layers className="w-4 h-4 text-[#7C8BA8]" />
                <span>My Events ({totalEvents})</span>
              </Link>

              <Link
                to="/organizer/events/new"
                className="flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-[#CBD5E1] hover:text-[#F1F5F9] hover:bg-[#16223B] transition-colors"
              >
                <PlusCircle className="w-4 h-4 text-[#7C8BA8]" />
                <span>Create Event</span>
              </Link>

              <Link
                to="/events"
                className="flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-[#CBD5E1] hover:text-[#F1F5F9] hover:bg-[#16223B] transition-colors"
              >
                <Calendar className="w-4 h-4 text-[#7C8BA8]" />
                <span>Browse Campus Events</span>
              </Link>
            </nav>

            <div className="pt-3 border-t border-[#1F2D4A]">
              <Link
                to="/organizer/events/new"
                className="btn-primary w-full text-xs font-semibold"
              >
                <PlusCircle className="w-4 h-4 mr-1.5" />
                <span>New Event</span>
              </Link>
            </div>
          </div>

          {/* Quick Helper Card */}
          <div className="bg-[#111A2E] rounded-[14px] border border-[#1F2D4A] p-4 space-y-2 text-xs text-[#CBD5E1]">
            <div className="font-semibold text-[#F1F5F9] flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-[#3B82F6]" />
              <span>Door Check-in</span>
            </div>
            <p className="leading-relaxed text-[#7C8BA8]">
              Use the "Scan QR" button on each event row to scan student boarding passes in real time.
            </p>
          </div>
        </aside>

        {/* Right Main Content (9 Cols) */}
        <main className="lg:col-span-9 space-y-6">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#1F2D4A]">
            <div>
              <h1 className="text-[32px] font-bold tracking-tight text-[#F1F5F9]">
                Organizer Dashboard
              </h1>
              <p className="text-[13px] text-[#7C8BA8] mt-1">
                Monitor student attendance, event quotas, and upcoming campus sessions.
              </p>
            </div>

            <Link
              to="/organizer/events/new"
              className="btn-primary self-start"
            >
              <PlusCircle className="w-4 h-4 mr-1.5" />
              <span>Create Event</span>
            </Link>
          </div>

          {alertInfo && <Alert type={alertInfo.type} message={alertInfo.message} />}

          {/* 4 Stat Cards: Icon in tinted circle, big number, label, small trend */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Stat Card 1 */}
            <div className="academic-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#7C8BA8]">Events Hosted</span>
                <div className="w-9 h-9 rounded-full bg-[#3B82F6]/15 text-[#3B82F6] flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#F1F5F9] tabular-nums">
                  <CountUpNumber value={totalEvents} />
                </div>
                <div className="flex items-center gap-1 text-[11px] font-medium text-[#22C55E] mt-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>All active campus clubs</span>
                </div>
              </div>
            </div>

            {/* Stat Card 2 */}
            <div className="academic-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#7C8BA8]">Upcoming Events</span>
                <div className="w-9 h-9 rounded-full bg-[#22D3EE]/15 text-[#22D3EE] flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#F1F5F9] tabular-nums">
                  <CountUpNumber value={upcomingEvents.length} />
                </div>
                <div className="text-[11px] text-[#7C8BA8] mt-1">
                  Scheduled on calendar
                </div>
              </div>
            </div>

            {/* Stat Card 3 */}
            <div className="academic-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#7C8BA8]">Total Attendees</span>
                <div className="w-9 h-9 rounded-full bg-[#22C55E]/15 text-[#22C55E] flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#F1F5F9] tabular-nums">
                  <CountUpNumber value={totalRegistrations} />
                </div>
                <div className="flex items-center gap-1 text-[11px] font-medium text-[#22C55E] mt-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>+18% turnout this month</span>
                </div>
              </div>
            </div>

            {/* Stat Card 4 */}
            <div className="academic-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#7C8BA8]">Average Fill Rate</span>
                <div className="w-9 h-9 rounded-full bg-[#F59E0B]/15 text-[#F59E0B] flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#F1F5F9] tabular-nums">
                  <CountUpNumber value={fillRate} suffix="%" />
                </div>
                <div className="text-[11px] text-[#7C8BA8] mt-1">
                  Total capacity utilized
                </div>
              </div>
            </div>

          </div>

          {/* Clean Analytics Chart */}
          {events.length > 0 && (
            <div className="academic-card p-6">
              <OrganizerDashboardCharts />
            </div>
          )}

          {/* Data Table with Search and Filters */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-[#F1F5F9]">
                  Managed Events Data Table
                </h2>
                <p className="text-xs text-[#7C8BA8]">
                  Search, filter, edit details, and scan venue QR passes.
                </p>
              </div>

              {/* Search & Filter Bar */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-[#7C8BA8] absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search events, venue..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="input-base pl-9 text-xs w-48 sm:w-60"
                  />
                </div>

                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value as any);
                      setCurrentPage(1);
                    }}
                    className="input-base text-xs pr-8 cursor-pointer bg-[#0F1829] text-[#F1F5F9]"
                  >
                    <option value="all" className="bg-[#111A2E] text-[#F1F5F9]">All Dates</option>
                    <option value="upcoming" className="bg-[#111A2E] text-[#F1F5F9]">Upcoming</option>
                    <option value="past" className="bg-[#111A2E] text-[#F1F5F9]">Past</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Table Container */}
            <div className="academic-card overflow-hidden">
              {loading ? (
                <div className="p-8 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 academic-card skeleton-shimmer" />
                  ))}
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <Calendar className="w-10 h-10 text-[#7C8BA8] mx-auto" />
                  <h3 className="text-base font-bold text-[#F1F5F9]">
                    No matching events found
                  </h3>
                  <p className="text-xs text-[#7C8BA8] max-w-sm mx-auto">
                    {searchQuery ? 'Try adjusting your search criteria or filter.' : 'Launch your first campus event today.'}
                  </p>
                  {!searchQuery && (
                    <Link to="/organizer/events/new" className="btn-primary mt-2">
                      <PlusCircle className="w-4 h-4 mr-1.5" />
                      <span>Create New Event</span>
                    </Link>
                  )}
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="table-base">
                      <thead>
                        <tr>
                          <th>Event Name & Category</th>
                          <th>Schedule</th>
                          <th>Venue</th>
                          <th>Enrollment</th>
                          <th className="text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1F2D4A]">
                        {paginatedEvents.map((ev) => (
                          <tr key={ev.id}>
                            <td>
                              <div>
                                <Link
                                  to={`/events/${ev.id}`}
                                  className="font-semibold text-[#F1F5F9] hover:text-[#3B82F6] transition-colors"
                                >
                                  {ev.title}
                                </Link>
                                <div className="text-xs text-[#7C8BA8] mt-0.5">
                                  {ev.category_name || 'Campus Event'}
                                </div>
                              </div>
                            </td>
                            <td>
                              <div className="text-xs text-[#CBD5E1] font-medium">
                                {ev.date_tbd
                                  ? 'Date TBD'
                                  : ev.end_date && ev.end_date !== ev.date
                                  ? `${ev.date} - ${ev.end_date}`
                                  : ev.date || 'Date TBD'}
                              </div>
                              {!ev.date_tbd && ev.start_time && (
                                <div className="text-xs text-[#7C8BA8]">
                                  {ev.end_time ? `${ev.start_time} - ${ev.end_time}` : ev.start_time}
                                </div>
                              )}
                            </td>
                            <td>
                              <div className="flex items-center gap-1.5 text-xs text-[#CBD5E1]">
                                <MapPin className="w-3.5 h-3.5 text-[#7C8BA8] flex-shrink-0" />
                                <span className="truncate max-w-[140px]">{ev.venue}</span>
                              </div>
                            </td>
                            <td>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30 tabular-nums">
                                {ev.registered_count} / {ev.max_participants !== null && ev.max_participants !== undefined ? ev.max_participants : 'Unlimited'}
                              </span>
                            </td>
                            <td className="text-right">
                              <div className="inline-flex items-center gap-2">
                                <button
                                  onClick={() => setScanningEvent(ev)}
                                  className="h-8 px-2.5 rounded-[8px] bg-[#3B82F6]/15 hover:bg-[#3B82F6]/25 text-[#3B82F6] text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                                  title="Scan Student QR passes"
                                >
                                  <QrCode className="w-3.5 h-3.5" />
                                  <span>Scan</span>
                                </button>
                                <Link
                                  to={`/organizer/events/${ev.id}/participants`}
                                  className="h-8 px-2.5 rounded-[8px] border border-[#1F2D4A] hover:bg-[#16223B] text-[#CBD5E1] text-xs font-medium inline-flex items-center transition-colors"
                                >
                                  Roster
                                </Link>
                                <Link
                                  to={`/organizer/events/${ev.id}/edit`}
                                  className="h-8 px-2 rounded-[8px] text-[#7C8BA8] hover:text-[#F1F5F9] text-xs font-medium inline-flex items-center transition-colors"
                                >
                                  Edit
                                </Link>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Footer */}
                  <div className="p-4 border-t border-[#1F2D4A] flex items-center justify-between text-xs text-[#7C8BA8]">
                    <div>
                      Showing {(currentPage - 1) * pageSize + 1} to{' '}
                      {Math.min(currentPage * pageSize, filteredEvents.length)} of{' '}
                      {filteredEvents.length} events
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-1.5 rounded-[8px] border border-[#1F2D4A] disabled:opacity-40 hover:bg-[#16223B] text-[#CBD5E1] transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="px-2 font-medium text-[#F1F5F9]">
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-1.5 rounded-[8px] border border-[#1F2D4A] disabled:opacity-40 hover:bg-[#16223B] text-[#CBD5E1] transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

        </main>
      </div>

      {/* QR Scanner Modal */}
      {scanningEvent && (
        <QRScannerModal
          isOpen={!!scanningEvent}
          onClose={() => setScanningEvent(null)}
          eventId={scanningEvent.id}
          eventTitle={scanningEvent.title}
        />
      )}
    </div>
  );
};

