import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CollegeEvent, Category, Registration } from '../../types';
import { eventService, categoryService, registrationService } from '../../services/api';
import { EventCard } from '../../components/common/EventCard';
import { Modal } from '../../components/common/Modal';
import { TicketModal } from '../../components/common/TicketModal';
import { Alert } from '../../components/common/Alert';
import { CountUpNumber } from '../../components/common/CountUpNumber';
import { useAuth } from '../../context/AuthContext';
import { getEventTimingInfo } from '../../utils/eventTiming';
import {
  Calendar,
  Compass,
  ArrowRight,
  ShieldCheck,
  FileText,
  ChevronRight,
  CheckCircle2,
  Ticket,
  Search,
  QrCode,
  Sparkles,
  Users,
  Clock,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [allEvents, setAllEvents] = useState<CollegeEvent[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<CollegeEvent[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Registration modal state
  const [selectedEvent, setSelectedEvent] = useState<CollegeEvent | null>(null);
  const [regLoading, setRegLoading] = useState(false);
  const [alertInfo, setAlertInfo] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [ticketModalReg, setTicketModalReg] = useState<Registration | null>(null);
  const [heroSearch, setHeroSearch] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [eventsRes, catRes] = await Promise.all([
          eventService.getAll({ status: 'approved' }),
          categoryService.getAll(),
        ]);
        if (eventsRes.success) {
          const eventsList = eventsRes.events || [];
          setAllEvents(eventsList);
          
          const upcoming = eventsList
            .filter((e) => {
              const timing = getEventTimingInfo(e);
              return timing.isUpcoming || timing.isOngoing;
            })
            .sort((a, b) => {
              const aTbd = Boolean(a.date_tbd) || !a.date;
              const bTbd = Boolean(b.date_tbd) || !b.date;
              if (aTbd && !bTbd) return 1;
              if (!aTbd && bTbd) return -1;
              if (aTbd && bTbd) return 0;
              return getEventTimingInfo(a).startDate.getTime() - getEventTimingInfo(b).startDate.getTime();
            });
          
          setUpcomingEvents(upcoming.slice(0, 6));
        }
        if (catRes.success) {
          setCategories(catRes.categories || []);
        }
      } catch (err) {
        console.error('Failed to load homepage data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Compute stats pulled from real data
  const totalEventsCount = allEvents.length;
  const registeredStudentsCount = allEvents.reduce((acc, ev) => acc + (ev.registered_count || 0), 0);
  
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const upcomingThisMonthCount = allEvents.filter((ev) => {
    if (ev.date_tbd || !ev.date) return false;
    const d = new Date(ev.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;

  const handleRegisterClick = (event: CollegeEvent) => {
    if (!user) {
      navigate('/login', { state: { from: `/events/${event.id}` } });
      return;
    }
    setSelectedEvent(event);
    setAlertInfo(null);
  };

  const handleConfirmRegistration = async () => {
    if (!selectedEvent) return;
    try {
      setRegLoading(true);
      const res = await registrationService.register(selectedEvent.id);
      if (res.success) {
        setAlertInfo({
          type: 'success',
          message: 'Registration confirmed. Your verified QR pass has been generated.',
        });

        // Update local status
        setUpcomingEvents((prev) =>
          prev.map((ev) =>
            ev.id === selectedEvent.id
              ? {
                  ...ev,
                  is_registered: true,
                  registered_count: ev.registered_count + 1,
                  seats_left: ev.seats_left !== null && ev.seats_left !== undefined ? Math.max(0, ev.seats_left - 1) : null,
                }
              : ev
          )
        );

        setTicketModalReg({
          registration_id: res.registrationId,
          registration_date: new Date().toISOString(),
          registration_status: 'confirmed',
          attendance_status: 'unmarked',
          student_id: user?.id || 0,
          student_name: user?.name || '',
          student_email: user?.email || '',
          student_phone: user?.phone || '',
          event_id: selectedEvent.id,
          event_title: selectedEvent.title,
          event_date: selectedEvent.date,
          event_venue: selectedEvent.venue,
          start_time: selectedEvent.start_time,
          end_time: selectedEvent.end_time,
          category_name: selectedEvent.category_name,
          google_form_url: selectedEvent.google_form_url || res.google_form_url,
        });

        setTimeout(() => setSelectedEvent(null), 600);
      }
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err.response?.data?.message || 'Failed to complete registration.',
      });
    } finally {
      setRegLoading(false);
    }
  };

  const handleHeroSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (heroSearch.trim()) {
      navigate(`/events?q=${encodeURIComponent(heroSearch.trim())}`);
    } else {
      navigate('/events');
    }
  };

  return (
    <div className="space-y-14 sm:space-y-20 pb-20 animate-page-enter">
      
      {/* Hero Section: Rich subtle blue-to-indigo radial gradient */}
      <section className="relative pt-12 pb-16 sm:pt-20 sm:pb-24 border-b border-[#1F2D4A] overflow-hidden bg-gradient-to-b from-[#0B1220] via-[#0E172A] to-[#0B1220]">
        {/* Soft Radial Glow Background */}
        <div className="absolute inset-0 hero-glow pointer-events-none" />

        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            
            {/* Tag / Category Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#16223B]/90 text-[#3B82F6] border border-[#1F2D4A] shadow-sm text-xs font-semibold backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-[#22D3EE]" />
              <span>CampusPulse · College Event Management</span>
            </div>

            {/* Large Main Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-[54px] font-extrabold tracking-tight text-[#F8FAFC] leading-[1.15]">
              Discover and join <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-[#60A5FA] via-[#38BDF8] to-[#818CF8] bg-clip-text text-transparent">
                campus events
              </span>
            </h1>

            {/* One-Line Subtitle */}
            <p className="text-sm sm:text-base text-[#8B9BB4] max-w-2xl mx-auto leading-relaxed">
              Explore university workshops, hackathons, and tournaments with instant verified QR passes.
            </p>

            {/* Search Bar */}
            <form onSubmit={handleHeroSearchSubmit} className="max-w-xl mx-auto pt-2">
              <div className="relative flex items-center shadow-[0_8px_30px_rgba(0,0,0,0.35)] rounded-[12px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B9BB4] pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search events by title, topic, or venue..."
                  value={heroSearch}
                  onChange={(e) => setHeroSearch(e.target.value)}
                  className="w-full pl-11 pr-28 py-3.5 text-sm bg-[#0F1829] border border-[#1F2D4A] rounded-[12px] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-[#3B82F6] text-[#F8FAFC] placeholder:text-[#64748B] transition-all"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 px-4 py-2 btn-primary text-xs font-semibold h-[34px] rounded-[8px]"
                >
                  Search
                </button>
              </div>
            </form>

            {/* Two Clear Buttons: Browse Events & Create Event */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <Link
                to="/events"
                className="btn-primary text-xs sm:text-sm h-11 px-5"
              >
                <Compass className="w-4 h-4 mr-2" />
                <span>Browse Events</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Link>

              <Link
                to="/organizer/events/new"
                className="btn-secondary text-xs sm:text-sm h-11 px-5"
              >
                <span>Create Event</span>
              </Link>
            </div>

            {/* Stats Strip pulled from existing data with CountUpNumber */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-6 max-w-2xl mx-auto">
              
              {/* Stat 1: Total Events */}
              <div className="p-4 rounded-[12px] bg-[#111A2E] border border-[#1F2D4A] text-left shadow-[0_4px_20px_rgba(0,0,0,0.25)] hover:border-[#3B82F6]/40 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="text-2xl sm:text-3xl font-bold text-[#F8FAFC] tabular-nums tracking-tight">
                    <CountUpNumber value={totalEventsCount} />
                  </div>
                  <div className="w-8 h-8 rounded-[8px] bg-[#3B82F6]/15 text-[#60A5FA] flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-xs font-medium text-[#8B9BB4] mt-1">
                  Total Events
                </div>
              </div>

              {/* Stat 2: Registered Students */}
              <div className="p-4 rounded-[12px] bg-[#111A2E] border border-[#1F2D4A] text-left shadow-[0_4px_20px_rgba(0,0,0,0.25)] hover:border-[#22C55E]/40 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="text-2xl sm:text-3xl font-bold text-[#F8FAFC] tabular-nums tracking-tight">
                    <CountUpNumber value={registeredStudentsCount} />
                  </div>
                  <div className="w-8 h-8 rounded-[8px] bg-[#22C55E]/15 text-[#4ADE80] flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-xs font-medium text-[#8B9BB4] mt-1">
                  Registered Students
                </div>
              </div>

              {/* Stat 3: Upcoming This Month */}
              <div className="p-4 rounded-[12px] bg-[#111A2E] border border-[#1F2D4A] text-left shadow-[0_4px_20px_rgba(0,0,0,0.25)] hover:border-[#22D3EE]/40 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="text-2xl sm:text-3xl font-bold text-[#F8FAFC] tabular-nums tracking-tight">
                    <CountUpNumber value={upcomingThisMonthCount} />
                  </div>
                  <div className="w-8 h-8 rounded-[8px] bg-[#22D3EE]/15 text-[#22D3EE] flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-xs font-medium text-[#8B9BB4] mt-1">
                  Upcoming This Month
                </div>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* Featured / Upcoming Events Section */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-3 border-b border-[#1F2D4A]">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#F8FAFC] tracking-tight">
              Featured Upcoming Events
            </h2>
            <p className="text-xs sm:text-sm text-[#8B9BB4] mt-0.5">
              Scheduled seminars, club hackathons, and tournaments for this semester
            </p>
          </div>

          <Link
            to="/events"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#3B82F6] hover:text-[#60A5FA] self-start sm:self-center transition-colors"
          >
            <span>See full calendar</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Loading Skeletons */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="academic-card overflow-hidden space-y-3 p-4"
              >
                <div className="aspect-[16/9] w-full skeleton-shimmer rounded-[10px]" />
                <div className="h-4 skeleton-shimmer rounded w-1/3" />
                <div className="h-5 skeleton-shimmer rounded w-3/4" />
                <div className="h-3 skeleton-shimmer rounded w-full" />
                <div className="h-9 skeleton-shimmer rounded-[10px]" />
              </div>
            ))}
          </div>
        ) : upcomingEvents.length === 0 ? (
          /* Empty State */
          <div className="text-center py-12 academic-card p-6 space-y-3">
            <div className="w-12 h-12 rounded-[12px] bg-[#3B82F6]/15 text-[#3B82F6] mx-auto flex items-center justify-center border border-[#3B82F6]/30">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#F8FAFC]">
              No Upcoming Events Scheduled
            </h3>
            <p className="text-xs text-[#8B9BB4] max-w-sm mx-auto">
              Check back soon for upcoming department schedules or view the complete catalog.
            </p>
            <Link
              to="/events"
              className="btn-primary text-xs"
            >
              Browse All Events
            </Link>
          </div>
        ) : (
          /* Event Cards Grid with 60ms stagger */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingEvents.slice(0, 6).map((event, idx) => (
              <EventCard
                key={event.id}
                event={event}
                animationDelay={idx * 60}
                onRegisterClick={handleRegisterClick}
              />
            ))}
          </div>
        )}
      </section>

      {/* Browse by Category (Icon Chips) */}
      {categories.length > 0 && (
        <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#1F2D4A]">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[#F8FAFC] tracking-tight">
                Browse by Category
              </h2>
              <p className="text-xs text-[#8B9BB4]">
                Filter events by department or activity focus
              </p>
            </div>
            <Link
              to="/events"
              className="text-xs font-semibold text-[#3B82F6] hover:text-[#60A5FA] flex items-center gap-0.5 transition-colors"
            >
              <span>View all</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/events?category=${cat.id}`}
                className="px-4 py-2 rounded-[10px] bg-[#111A2E] border border-[#1F2D4A] hover:border-[#3B82F6] hover:bg-[#16223B] hover:text-[#F8FAFC] text-xs font-medium text-[#CBD5E1] transition-all flex items-center gap-2 shadow-sm group"
              >
                <span className="w-2 h-2 rounded-full bg-[#3B82F6] group-hover:scale-125 transition-transform" />
                <span>{cat.name}</span>
                {cat.event_count !== undefined && (
                  <span className="text-[11px] text-[#8B9BB4] tabular-nums font-mono">({cat.event_count})</span>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Simple 3-Step "How It Works" Section */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-8">
          <div className="text-xs font-bold uppercase tracking-wider text-[#3B82F6]">
            Campus Journey
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#F8FAFC] mt-1 tracking-tight">
            How It Works in 3 Steps
          </h2>
          <p className="text-xs text-[#8B9BB4] mt-1">
            Simple and seamless workflow from event discovery to verified venue admission
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="academic-card p-6 space-y-3.5 text-left">
            <div className="w-10 h-10 rounded-[10px] bg-[#3B82F6]/15 text-[#3B82F6] flex items-center justify-center font-bold text-sm border border-[#3B82F6]/30">
              <Search className="w-5 h-5 text-[#3B82F6]" />
            </div>
            <div className="text-[11px] font-bold text-[#3B82F6] tracking-wider uppercase">Step 01</div>
            <h3 className="text-base font-bold text-[#F8FAFC]">Discover & Filter</h3>
            <p className="text-xs text-[#8B9BB4] leading-relaxed">
              Explore academic seminars, tech hackathons, and campus activities by category, date, or organizer.
            </p>
          </div>

          {/* Step 2 */}
          <div className="academic-card p-6 space-y-3.5 text-left">
            <div className="w-10 h-10 rounded-[10px] bg-[#22C55E]/15 text-[#22C55E] flex items-center justify-center font-bold text-sm border border-[#22C55E]/30">
              <Ticket className="w-5 h-5 text-[#22C55E]" />
            </div>
            <div className="text-[11px] font-bold text-[#22C55E] tracking-wider uppercase">Step 02</div>
            <h3 className="text-base font-bold text-[#F8FAFC]">Reserve Your Seat</h3>
            <p className="text-xs text-[#8B9BB4] leading-relaxed">
              Register free with a single click and instantly receive an official digital entry pass with a unique QR code.
            </p>
          </div>

          {/* Step 3 */}
          <div className="academic-card p-6 space-y-3.5 text-left">
            <div className="w-10 h-10 rounded-[10px] bg-[#22D3EE]/15 text-[#22D3EE] flex items-center justify-center font-bold text-sm border border-[#22D3EE]/30">
              <QrCode className="w-5 h-5 text-[#22D3EE]" />
            </div>
            <div className="text-[11px] font-bold text-[#22D3EE] tracking-wider uppercase">Step 03</div>
            <h3 className="text-base font-bold text-[#F8FAFC]">Fast QR Check-in</h3>
            <p className="text-xs text-[#8B9BB4] leading-relaxed">
              Show your pass at the venue entrance. Organizers scan with camera for real-time attendance verification.
            </p>
          </div>
        </div>
      </section>

      {/* System Highlights Strip */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-6 sm:p-8 academic-card">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-[8px] bg-[#3B82F6]/15 text-[#3B82F6] flex items-center justify-center border border-[#3B82F6]/30">
                <ShieldCheck className="w-5 h-5 text-[#3B82F6]" />
              </div>
              <h3 className="text-sm font-bold text-[#F8FAFC]">
                Role-Based Architecture
              </h3>
              <p className="text-xs text-[#8B9BB4] leading-relaxed">
                Dedicated interfaces for Students, Faculty Organizers, and College Administrators with token-based security.
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-9 h-9 rounded-[8px] bg-[#3B82F6]/15 text-[#3B82F6] flex items-center justify-center border border-[#3B82F6]/30">
                <FileText className="w-5 h-5 text-[#3B82F6]" />
              </div>
              <h3 className="text-sm font-bold text-[#F8FAFC]">
                Event Form Integration
              </h3>
              <p className="text-xs text-[#8B9BB4] leading-relaxed">
                Seamless support for Google Forms to share event details, agendas, and information sheets with students.
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-9 h-9 rounded-[8px] bg-[#22C55E]/15 text-[#22C55E] flex items-center justify-center border border-[#22C55E]/30">
                <CheckCircle2 className="w-5 h-5 text-[#22C55E]" />
              </div>
              <h3 className="text-sm font-bold text-[#F8FAFC]">
                Live QR Verification
              </h3>
              <p className="text-xs text-[#8B9BB4] leading-relaxed">
                Organizers scan student entry passes via camera with instant validation and automatic database attendance logging.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Registration Event Summary Modal */}
      {selectedEvent && (
        <Modal
          isOpen={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          title="Confirm Event Registration"
          maxWidth="md"
          footer={
            <>
              <button
                onClick={() => setSelectedEvent(null)}
                className="btn-secondary text-xs h-9"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRegistration}
                disabled={regLoading}
                className="btn-primary text-xs h-9"
              >
                {regLoading ? 'Registering...' : 'Confirm Registration'}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            {alertInfo && <Alert type={alertInfo.type} message={alertInfo.message} />}

            {/* Event Summary Card */}
            <div className="p-4 bg-[#111A2E] rounded-[12px] border border-[#1F2D4A] space-y-2.5 text-xs">
              <div className="flex items-center gap-1.5 pb-2 border-b border-[#1F2D4A] font-semibold text-[#F8FAFC]">
                <Calendar className="w-4 h-4 text-[#3B82F6]" />
                <span>Event Registration Summary</span>
              </div>
              
              <div className="flex justify-between py-0.5">
                <span className="text-[#8B9BB4]">Event:</span>
                <span className="font-semibold text-[#F8FAFC] text-right max-w-[240px] truncate">{selectedEvent.title}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-[#8B9BB4]">Date:</span>
                <span className="font-medium text-[#CBD5E1] tabular-nums">{selectedEvent.date}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-[#8B9BB4]">Time:</span>
                <span className="font-medium text-[#CBD5E1] tabular-nums">{selectedEvent.start_time} - {selectedEvent.end_time}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-[#8B9BB4]">Venue:</span>
                <span className="font-medium text-[#CBD5E1]">{selectedEvent.venue}</span>
              </div>
              
              <div className="pt-2 border-t border-[#1F2D4A] flex justify-between font-semibold text-xs text-[#F8FAFC]">
                <span className="text-[#8B9BB4]">Seats Available:</span>
                <span className="text-[#3B82F6] font-bold tabular-nums">{selectedEvent.seats_left} seats remaining</span>
              </div>
            </div>

            <p className="text-xs text-[#8B9BB4] leading-relaxed">
              Upon clicking "Confirm Registration", a verified digital pass with QR code will be issued instantly and linked to your student account.
            </p>
          </div>
        </Modal>
      )}

      {/* Ticket Modal with QR Code */}
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
