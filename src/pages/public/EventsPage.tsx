import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CollegeEvent, Category, Registration } from '../../types';
import { eventService, categoryService, registrationService } from '../../services/api';
import { EventCard } from '../../components/common/EventCard';
import { Modal } from '../../components/common/Modal';
import { TicketModal } from '../../components/common/TicketModal';
import { Alert } from '../../components/common/Alert';
import { useAuth } from '../../context/AuthContext';
import { getEventTimingInfo, EventTimingInfo } from '../../utils/eventTiming';
import {
  Search,
  RotateCcw,
  X,
  Calendar,
  Filter,
  Radio,
  Clock,
  History,
  Layers,
  ArrowUpDown,
  Sparkles,
} from 'lucide-react';

export type EventTabType = 'live_upcoming' | 'ongoing' | 'upcoming' | 'past' | 'all';

export const EventsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [events, setEvents] = useState<CollegeEvent[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Active tab state
  const tabParam = (searchParams.get('tab') as EventTabType) || null;
  const [activeTab, setActiveTab] = useState<EventTabType>(tabParam || 'upcoming');
  const [hasSetDefaultTab, setHasSetDefaultTab] = useState(false);

  // Search & category filter state
  const searchQuery = searchParams.get('q') || '';
  const selectedCategory = searchParams.get('category') || '';
  const selectedDate = searchParams.get('date') || '';
  const [upcomingSortOrder, setUpcomingSortOrder] = useState<'asc' | 'desc'>('asc');

  // Registration modal
  const [selectedEvent, setSelectedEvent] = useState<CollegeEvent | null>(null);
  const [regLoading, setRegLoading] = useState(false);
  const [alertInfo, setAlertInfo] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ticketModalReg, setTicketModalReg] = useState<Registration | null>(null);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await categoryService.getAll();
        if (res.success) setCategories(res.categories || []);
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    }
    fetchCategories();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const res = await eventService.getAll({
        q: searchQuery,
        category: selectedCategory,
        date: selectedDate,
        sort: 'asc',
        status: 'approved',
      });
      if (res.success) {
        const list = res.events || [];
        setEvents(list);

        // Work out default tab if not explicitly specified in URL query
        if (!tabParam && !hasSetDefaultTab) {
          const hasOngoing = list.some((e) => getEventTimingInfo(e).isOngoing);
          if (hasOngoing) {
            setActiveTab('live_upcoming');
          } else {
            setActiveTab('upcoming');
          }
          setHasSetDefaultTab(true);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch events', err);
      setLoadError(err.response?.data?.message || 'Unable to connect to the events database. Please check your network or try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [searchQuery, selectedCategory, selectedDate]);

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next);
  };

  const handleResetFilters = () => {
    const next = new URLSearchParams();
    if (activeTab && activeTab !== 'upcoming') {
      next.set('tab', activeTab);
    }
    setSearchParams(next);
  };

  const handleTabChange = (tab: EventTabType) => {
    setActiveTab(tab);
    updateParam('tab', tab);
  };

  // Group events by local time zone status
  const { ongoingList, upcomingList, pastList, allList, liveUpcomingList } = useMemo(() => {
    const ongoing: CollegeEvent[] = [];
    const upcoming: CollegeEvent[] = [];
    const past: CollegeEvent[] = [];

    events.forEach((ev) => {
      const timing = getEventTimingInfo(ev);
      if (timing.isOngoing) {
        ongoing.push(ev);
      } else if (timing.isUpcoming) {
        upcoming.push(ev);
      } else {
        past.push(ev);
      }
    });

    // Sort upcoming according to sort preference (soonest first by default), putting TBD events last
    upcoming.sort((a, b) => {
      const aTbd = Boolean(a.date_tbd) || !a.date;
      const bTbd = Boolean(b.date_tbd) || !b.date;
      if (aTbd && !bTbd) return 1;
      if (!aTbd && bTbd) return -1;
      if (aTbd && bTbd) return 0;

      const timeA = getEventTimingInfo(a).startDate.getTime();
      const timeB = getEventTimingInfo(b).startDate.getTime();
      return upcomingSortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });

    // Sort past events (most recently completed first)
    past.sort((a, b) => {
      const timeA = getEventTimingInfo(a).endDate.getTime();
      const timeB = getEventTimingInfo(b).endDate.getTime();
      return timeB - timeA;
    });

    // Ongoing events sorted by soonest ending
    ongoing.sort((a, b) => {
      const timeA = getEventTimingInfo(a).endDate.getTime();
      const timeB = getEventTimingInfo(b).endDate.getTime();
      return timeA - timeB;
    });

    const liveUpcoming = [...ongoing, ...upcoming];
    const all = [...ongoing, ...upcoming, ...past];

    return {
      ongoingList: ongoing,
      upcomingList: upcoming,
      pastList: past,
      allList: all,
      liveUpcomingList: liveUpcoming,
    };
  }, [events, upcomingSortOrder]);

  // Current list to display based on activeTab
  const currentDisplayEvents = useMemo(() => {
    switch (activeTab) {
      case 'live_upcoming':
        return liveUpcomingList;
      case 'ongoing':
        return ongoingList;
      case 'upcoming':
        return upcomingList;
      case 'past':
        return pastList;
      case 'all':
      default:
        return allList;
    }
  }, [activeTab, liveUpcomingList, ongoingList, upcomingList, pastList, allList]);

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
          message: 'Registration confirmed. Your digital pass is generated.',
        });
        setEvents((prev) =>
          prev.map((e) =>
            e.id === selectedEvent.id
              ? {
                  ...e,
                  is_registered: true,
                  registered_count: e.registered_count + 1,
                  seats_left: e.seats_left !== null && e.seats_left !== undefined ? Math.max(0, e.seats_left - 1) : null,
                }
              : e
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
      const msg = err.response?.data?.message || 'Failed to complete registration.';
      setAlertInfo({ type: 'error', message: msg });
    } finally {
      setRegLoading(false);
    }
  };

  const activeFiltersCount = [searchQuery, selectedCategory, selectedDate].filter(Boolean).length;

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-page-enter">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 border-b border-[#1F2D4A]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#16223B] text-[#3B82F6] border border-[#1F2D4A] text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-[#22D3EE]" />
            <span>CampusPulse Events Directory</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC]">
            Discover Campus Events
          </h1>
          <p className="text-xs sm:text-sm text-[#8B9BB4] mt-1">
            Browse live sessions, scheduled workshops, tournaments, and past events with verified digital tickets.
          </p>
        </div>

        {activeFiltersCount > 0 && (
          <button
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#F87171] hover:text-[#EF4444] px-3 py-1.5 rounded-[10px] bg-[#EF4444]/15 border border-[#EF4444]/30 self-start sm:self-auto transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear {activeFiltersCount} Filter{activeFiltersCount > 1 ? 's' : ''}</span>
          </button>
        )}
      </div>

      {alertInfo && <Alert type={alertInfo.type} message={alertInfo.message} />}

      {loadError && (
        <div className="p-4 rounded-[12px] bg-[#EF4444]/15 border border-[#EF4444]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#F87171]">
          <span>{loadError}</span>
          <button
            onClick={() => fetchEvents()}
            className="btn-secondary text-xs h-8 px-3 self-start sm:self-auto cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Sticky Search and Filter Bar Card */}
      <div className="sticky top-16 z-20 -mx-4 px-4 sm:mx-0 sm:px-0 py-2">
        <div className="academic-card p-4 space-y-3 bg-[#111A2E]/95 backdrop-blur-md shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
          
          {/* Top Search & Date input row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
            {/* Search Input */}
            <div className="md:col-span-9 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B9BB4] pointer-events-none" />
              <input
                type="text"
                placeholder="Search by event title, keywords, or topics..."
                value={searchQuery}
                onChange={(e) => updateParam('q', e.target.value)}
                className="input-base w-full pl-10 pr-10 text-xs sm:text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => updateParam('q', '')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8B9BB4] hover:text-[#F8FAFC] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Date Picker Filter */}
            <div className="md:col-span-3">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => updateParam('date', e.target.value)}
                className="input-base w-full text-xs sm:text-sm"
                title="Filter by event date"
              />
            </div>
          </div>

          {/* Category Filter Strip */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none text-xs">
            <button
              onClick={() => updateParam('category', '')}
              className={`px-3.5 py-1.5 rounded-[10px] text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                !selectedCategory
                  ? 'btn-primary font-semibold shadow-sm'
                  : 'bg-[#16223B] text-[#CBD5E1] hover:bg-[#1E2E4E] hover:text-[#F8FAFC] border border-[#1F2D4A]'
              }`}
            >
              All Categories ({events.length})
            </button>

            {categories.map((c) => {
              const isSelected = selectedCategory === String(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => updateParam('category', isSelected ? '' : String(c.id))}
                  className={`px-3.5 py-1.5 rounded-[10px] text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'btn-primary font-semibold shadow-sm'
                      : 'bg-[#16223B] text-[#CBD5E1] hover:bg-[#1E2E4E] hover:text-[#F8FAFC] border border-[#1F2D4A]'
                  }`}
                >
                  <span>{c.name}</span>
                  {isSelected && <X className="w-3.5 h-3.5 ml-0.5" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Part 1 Status Tabs: Ongoing, Upcoming, Past, All with counts & live badges */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#1F2D4A]">
          
          {/* Status Tabs Strip */}
          <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-[#111A2E] rounded-[12px] border border-[#1F2D4A] scrollbar-none">
            
            {/* If ongoing events exist, show Combined "Live & Upcoming" as first option */}
            {ongoingList.length > 0 && (
              <button
                onClick={() => handleTabChange('live_upcoming')}
                className={`px-3.5 py-2 rounded-[9px] text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'live_upcoming'
                    ? 'bg-[#3B82F6] text-white shadow-sm'
                    : 'text-[#8B9BB4] hover:text-[#F8FAFC] hover:bg-[#16223B]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-[#22D3EE]" />
                <span>Live & Upcoming</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-[#0B1220]/40 tabular-nums">
                  {liveUpcomingList.length}
                </span>
              </button>
            )}

            {/* Ongoing Tab */}
            <button
              onClick={() => handleTabChange('ongoing')}
              className={`px-3.5 py-2 rounded-[9px] text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'ongoing'
                  ? 'bg-[#22C55E]/20 text-[#4ADE80] border border-[#22C55E]/40 shadow-xs'
                  : 'text-[#8B9BB4] hover:text-[#F8FAFC] hover:bg-[#16223B]'
              }`}
            >
              {ongoingList.length > 0 ? (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4ADE80] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22C55E]" />
                </span>
              ) : (
                <Radio className="w-3.5 h-3.5 opacity-60" />
              )}
              <span>Ongoing</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-[#0B1220]/40 tabular-nums">
                {ongoingList.length}
              </span>
            </button>

            {/* Upcoming Tab */}
            <button
              onClick={() => handleTabChange('upcoming')}
              className={`px-3.5 py-2 rounded-[9px] text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'upcoming'
                  ? 'bg-[#3B82F6] text-white shadow-sm'
                  : 'text-[#8B9BB4] hover:text-[#F8FAFC] hover:bg-[#16223B]'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-[#60A5FA]" />
              <span>Upcoming</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-[#0B1220]/40 tabular-nums">
                {upcomingList.length}
              </span>
            </button>

            {/* Past / Completed Tab */}
            <button
              onClick={() => handleTabChange('past')}
              className={`px-3.5 py-2 rounded-[9px] text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'past'
                  ? 'bg-[#1E293B] text-[#F8FAFC] border border-[#334155] shadow-sm'
                  : 'text-[#8B9BB4] hover:text-[#F8FAFC] hover:bg-[#16223B]'
              }`}
            >
              <History className="w-3.5 h-3.5 opacity-70" />
              <span>Past / Completed</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-[#0B1220]/40 tabular-nums">
                {pastList.length}
              </span>
            </button>

            {/* All Tab */}
            <button
              onClick={() => handleTabChange('all')}
              className={`px-3.5 py-2 rounded-[9px] text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-[#3B82F6] text-white shadow-sm'
                  : 'text-[#8B9BB4] hover:text-[#F8FAFC] hover:bg-[#16223B]'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-[#22D3EE]" />
              <span>All</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-[#0B1220]/40 tabular-nums">
                {allList.length}
              </span>
            </button>
          </div>

          {/* Right Area: Sort option inside Upcoming / Active tab */}
          {(activeTab === 'upcoming' || activeTab === 'live_upcoming') && upcomingList.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-[#8B9BB4] self-end sm:self-center">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#3B82F6]" />
              <span>Sort:</span>
              <select
                value={upcomingSortOrder}
                onChange={(e) => setUpcomingSortOrder(e.target.value as 'asc' | 'desc')}
                className="input-base text-xs py-1 px-2.5 bg-[#111A2E] text-[#F8FAFC] cursor-pointer"
              >
                <option value="asc">Soonest First</option>
                <option value="desc">Latest First</option>
              </select>
            </div>
          )}
        </div>

        {/* Tab Context Helper Caption */}
        <div className="flex items-center justify-between text-xs text-[#8B9BB4]">
          <div>
            {activeTab === 'live_upcoming' && (
              <span>
                Displaying <strong>{liveUpcomingList.length}</strong> active events (ongoing live sessions followed by upcoming dates).
              </span>
            )}
            {activeTab === 'ongoing' && (
              <span className="text-[#4ADE80] font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#4ADE80] animate-pulse" />
                <span>Showing {ongoingList.length} event{ongoingList.length === 1 ? '' : 's'} happening right now on campus</span>
              </span>
            )}
            {activeTab === 'upcoming' && (
              <span>
                Showing <strong>{upcomingList.length}</strong> upcoming scheduled event{upcomingList.length === 1 ? '' : 's'}.
              </span>
            )}
            {activeTab === 'past' && (
              <span>
                Showing <strong>{pastList.length}</strong> concluded campus event{pastList.length === 1 ? '' : 's'}.
              </span>
            )}
            {activeTab === 'all' && (
              <span>
                Showing all <strong>{allList.length}</strong> cataloged events.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Events Grid or Per-Tab Empty State */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="academic-card overflow-hidden space-y-3 p-4">
              <div className="aspect-[16/9] w-full skeleton-shimmer rounded-[10px]" />
              <div className="h-4 skeleton-shimmer rounded w-1/3" />
              <div className="h-5 skeleton-shimmer rounded w-3/4" />
              <div className="h-3 skeleton-shimmer rounded w-full" />
              <div className="h-9 skeleton-shimmer rounded-[10px]" />
            </div>
          ))}
        </div>
      ) : currentDisplayEvents.length === 0 ? (
        /* Friendly Empty State Per Tab */
        <div className="text-center py-16 academic-card p-6 space-y-4 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-[14px] bg-[#3B82F6]/15 text-[#3B82F6] mx-auto flex items-center justify-center border border-[#3B82F6]/30 shadow-sm">
            {activeTab === 'ongoing' ? (
              <Radio className="w-6 h-6 text-[#22C55E]" />
            ) : activeTab === 'upcoming' ? (
              <Clock className="w-6 h-6 text-[#3B82F6]" />
            ) : activeTab === 'past' ? (
              <History className="w-6 h-6 text-[#8B9BB4]" />
            ) : (
              <Calendar className="w-6 h-6 text-[#3B82F6]" />
            )}
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#F8FAFC]">
              {activeTab === 'ongoing' && 'No Events Are Live Right Now'}
              {activeTab === 'upcoming' && 'No Upcoming Events Found'}
              {activeTab === 'past' && 'No Completed Events Found'}
              {(activeTab === 'all' || activeTab === 'live_upcoming') && 'No Matching Events Found'}
            </h3>
            <p className="text-xs text-[#8B9BB4] leading-relaxed max-w-sm mx-auto">
              {activeTab === 'ongoing' &&
                'No events are actively taking place right now. Check out the Upcoming events tab to see what is scheduled next.'}
              {activeTab === 'upcoming' &&
                'There are no upcoming events matching your selected filters. Try choosing another category or clearing search terms.'}
              {activeTab === 'past' &&
                'No past events matched your search query.'}
              {(activeTab === 'all' || activeTab === 'live_upcoming') &&
                "We couldn't find any events matching your criteria. Try adjusting or clearing your filters."}
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
            {activeTab === 'ongoing' && (
              <button
                onClick={() => handleTabChange('upcoming')}
                className="btn-primary text-xs"
              >
                <Clock className="w-3.5 h-3.5 mr-1.5" />
                <span>View Upcoming Events ({upcomingList.length})</span>
              </button>
            )}

            {activeFiltersCount > 0 && (
              <button
                onClick={handleResetFilters}
                className="btn-secondary text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                <span>Reset All Filters</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Event Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentDisplayEvents.map((event, idx) => (
            <EventCard
              key={event.id}
              event={event}
              animationDelay={idx * 40}
              onRegisterClick={handleRegisterClick}
            />
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      {selectedEvent && (
        <Modal
          isOpen={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          title="Confirm Registration"
          maxWidth="md"
          footer={
            <>
              <button
                onClick={() => setSelectedEvent(null)}
                className="btn-secondary text-xs h-9 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRegistration}
                disabled={regLoading}
                className="btn-primary text-xs h-9 cursor-pointer"
              >
                {regLoading ? 'Registering...' : 'Confirm Registration'}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            {alertInfo && <Alert type={alertInfo.type} message={alertInfo.message} />}

            <div className="p-4 bg-[#111A2E] rounded-[12px] border border-[#1F2D4A] space-y-2 text-xs">
              <div className="flex justify-between py-0.5">
                <span className="text-[#8B9BB4]">Event:</span>
                <span className="font-semibold text-[#F8FAFC] text-right truncate max-w-[200px]">{selectedEvent.title}</span>
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
              <div className="pt-2 border-t border-[#1F2D4A] flex justify-between font-semibold">
                <span className="text-[#8B9BB4]">Seats:</span>
                <span className="text-[#3B82F6] tabular-nums">{selectedEvent.seats_left} seats remaining</span>
              </div>
            </div>

            <p className="text-xs text-[#8B9BB4] leading-relaxed">
              Upon confirming registration, your official entry pass with verified QR code will be generated immediately.
            </p>
          </div>
        </Modal>
      )}

      {/* Ticket Modal */}
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
