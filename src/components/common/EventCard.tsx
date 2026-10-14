import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CollegeEvent } from '../../types';
import { getEventTimingInfo, formatEventDateRange, formatEventTimeRange } from '../../utils/eventTiming';
import {
  Calendar,
  MapPin,
  Clock,
  CheckCircle2,
  Users,
  ArrowRight,
  Radio,
  FileText,
} from 'lucide-react';

interface EventCardProps {
  event: CollegeEvent;
  onRegisterClick?: (event: CollegeEvent) => void;
  showAdminActions?: boolean;
  onStatusChange?: (eventId: number, status: any) => void;
  onDeleteClick?: (eventId: number) => void;
  animationDelay?: number;
}

// Category theme mapping with tinted gradients and badge classes
const getCategoryTheme = (categoryName: string = '') => {
  const cat = categoryName.toLowerCase();
  if (cat.includes('tech') || cat.includes('code') || cat.includes('ai') || cat.includes('cyber')) {
    return {
      gradient: 'from-blue-900/60 via-indigo-950/80 to-[#0D1526]',
      badgeClass: 'badge-tech',
      accentColor: '#3B82F6',
    };
  }
  if (cat.includes('cultur') || cat.includes('music') || cat.includes('fest') || cat.includes('art') || cat.includes('drama')) {
    return {
      gradient: 'from-purple-900/60 via-indigo-950/80 to-[#0D1526]',
      badgeClass: 'badge-cultural',
      accentColor: '#A855F7',
    };
  }
  if (cat.includes('sport') || cat.includes('fit') || cat.includes('game') || cat.includes('athletic')) {
    return {
      gradient: 'from-emerald-950/60 via-teal-950/80 to-[#0D1526]',
      badgeClass: 'badge-sports',
      accentColor: '#22C55E',
    };
  }
  if (cat.includes('work') || cat.includes('lecture') || cat.includes('training')) {
    return {
      gradient: 'from-amber-950/60 via-orange-950/80 to-[#0D1526]',
      badgeClass: 'badge-workshop',
      accentColor: '#F59E0B',
    };
  }
  if (cat.includes('hack')) {
    return {
      gradient: 'from-indigo-950/60 via-blue-950/80 to-[#0D1526]',
      badgeClass: 'badge-hackathon',
      accentColor: '#6366F1',
    };
  }
  if (cat.includes('seminar') || cat.includes('symposium')) {
    return {
      gradient: 'from-teal-950/60 via-cyan-950/80 to-[#0D1526]',
      badgeClass: 'badge-seminar',
      accentColor: '#14B8A6',
    };
  }
  if (cat.includes('competition') || cat.includes('duel') || cat.includes('quiz')) {
    return {
      gradient: 'from-pink-950/60 via-purple-950/80 to-[#0D1526]',
      badgeClass: 'badge-competition',
      accentColor: '#EC4899',
    };
  }
  if (cat.includes('interview') || cat.includes('placement') || cat.includes('gd')) {
    return {
      gradient: 'from-cyan-950/60 via-blue-950/80 to-[#0D1526]',
      badgeClass: 'badge-interview',
      accentColor: '#06B6D4',
    };
  }
  return {
    gradient: 'from-blue-950/60 via-slate-900/80 to-[#0D1526]',
    badgeClass: 'badge-other',
    accentColor: '#3B82F6',
  };
};

export const EventCard: React.FC<EventCardProps> = ({
  event,
  onRegisterClick,
  showAdminActions = false,
  onStatusChange,
  onDeleteClick,
  animationDelay = 0,
}) => {
  const [imageError, setImageError] = useState(false);

  const timing = getEventTimingInfo({
    date: event.date,
    date_tbd: event.date_tbd,
    end_date: event.end_date,
    start_time: event.start_time,
    end_time: event.end_time,
  });

  const formattedDate = formatEventDateRange(event);
  const formattedTime = formatEventTimeRange(event);

  const hasSeatLimit = event.max_participants !== null && event.max_participants !== undefined;
  const isFull = hasSeatLimit ? (event.registered_count >= Number(event.max_participants)) : false;
  const capacityPercent = hasSeatLimit
    ? Math.min(100, Math.round((event.registered_count / Number(event.max_participants)) * 100))
    : 0;
  const seatsRemaining = hasSeatLimit
    ? (event.seats_left !== null && event.seats_left !== undefined
        ? event.seats_left
        : Math.max(0, Number(event.max_participants) - event.registered_count))
    : null;
  const isFewSeats = hasSeatLimit && !isFull && !timing.isPast && (seatsRemaining! <= 5 || capacityPercent >= 85);
  const theme = getCategoryTheme(event.category_name);

  return (
    <div
      style={{ animationDelay: `${animationDelay}ms` }}
      className={`academic-card group overflow-hidden flex flex-col h-full animate-page-enter transition-all duration-200 ${
        timing.isPast ? 'opacity-85 grayscale-[0.2]' : ''
      }`}
    >
      {/* Cover Image / Gradient Category Banner */}
      <div className="relative aspect-[16/9] w-full bg-[#0D1526] border-b border-[#1F2D4A] overflow-hidden">
        {!imageError && event.image ? (
          <img
            src={event.image}
            alt={event.title}
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300 ease-out"
          />
        ) : (
          <div
            className={`w-full h-full bg-gradient-to-br ${theme.gradient} flex flex-col items-center justify-center p-4 text-center text-[#F8FAFC] relative`}
          >
            <div className="w-12 h-12 rounded-[12px] bg-[#16223B]/80 backdrop-blur-xs flex items-center justify-center mb-1.5 border border-[#1F2D4A] shadow-sm">
              <Calendar className="w-5 h-5" style={{ color: theme.accentColor }} />
            </div>
            <span className="text-[11px] font-semibold tracking-wider uppercase text-[#CBD5E1]">
              {event.category_name || 'Campus Event'}
            </span>
          </div>
        )}

        {/* Top Badges: Category on Left, Status on Right */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 pointer-events-none">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold backdrop-blur-md shadow-sm ${theme.badgeClass}`}
            >
              {event.category_name}
            </span>

            {event.google_form_url && (
              <span
                className="bg-[#0B1220]/85 text-[#93C5FD] border border-[#3B82F6]/30 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 backdrop-blur-md shadow-xs"
                title="Event form attached"
              >
                <FileText className="w-2.5 h-2.5 text-[#60A5FA]" />
                <span>Form</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* TBD badge: TBD events show in Upcoming with a "Date TBD" badge, never as Ongoing or Past */}
            {timing.isDateTbd ? (
              <span className="bg-[#A855F7]/20 text-[#C084FC] border border-[#A855F7]/40 text-[10px] font-semibold px-2.5 py-0.5 rounded-full backdrop-blur-md shadow-xs">
                Date TBD
              </span>
            ) : timing.isOngoing ? (
              /* Live Now pulsing badge */
              <span className="bg-[#22C55E]/20 text-[#4ADE80] border border-[#22C55E]/40 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 backdrop-blur-md shadow-xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4ADE80] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22C55E]" />
                </span>
                <span className="tracking-wide">LIVE NOW</span>
              </span>
            ) : timing.isUpcoming ? (
              /* Upcoming badge */
              <span className="bg-[#3B82F6]/20 text-[#60A5FA] border border-[#3B82F6]/40 text-[10px] font-semibold px-2.5 py-0.5 rounded-full backdrop-blur-md shadow-xs">
                Upcoming
              </span>
            ) : (
              /* Past / Completed badge */
              <span className="bg-[#1E293B]/80 text-[#94A3B8] border border-[#334155]/60 text-[10px] font-medium px-2.5 py-0.5 rounded-full backdrop-blur-md shadow-xs">
                Completed
              </span>
            )}

            {/* Enrolled Badge */}
            {event.is_registered && (
              <span className="bg-[#22C55E]/20 text-[#4ADE80] border border-[#22C55E]/40 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 backdrop-blur-md shadow-sm">
                <CheckCircle2 className="w-3 h-3 text-[#4ADE80]" />
                <span>Enrolled</span>
              </span>
            )}
          </div>
        </div>

        {/* Bottom Countdown pill for upcoming events within 7 days */}
        {!timing.isDateTbd && timing.isUpcoming && timing.countdownText && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 text-[11px] font-semibold text-[#22D3EE] bg-[#0B1220]/90 px-2.5 py-0.5 rounded-md border border-[#1F2D4A] backdrop-blur-md shadow-sm">
            <Clock className="w-3 h-3 text-[#22D3EE]" />
            <span className="tabular-nums font-mono">{timing.countdownText}</span>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3.5">
        <div className="space-y-2">
          {/* Date & Time Row */}
          <div className="flex items-center gap-1.5 text-xs text-[#8B9BB4] flex-wrap">
            <Calendar className="w-3.5 h-3.5 text-[#3B82F6] shrink-0" />
            <span className="tabular-nums font-semibold text-[#E2E8F0]">{formattedDate}</span>
            {formattedTime && (
              <>
                <span aria-hidden="true" className="text-[#334155]">·</span>
                <span className="tabular-nums font-medium text-[#8B9BB4]">{formattedTime}</span>
              </>
            )}
          </div>

          {/* Title */}
          <h3 className="text-[15px] font-bold text-[#F8FAFC] line-clamp-2 leading-snug group-hover:text-[#3B82F6] transition-colors">
            <Link to={`/events/${event.id}`}>{event.title}</Link>
          </h3>

          {/* Description snippet */}
          <p className="text-xs text-[#8B9BB4] line-clamp-2 leading-relaxed">
            {event.description}
          </p>
        </div>

        {/* Venue & Capacity Progress Bar */}
        <div className="pt-3 border-t border-[#1F2D4A] space-y-2.5 text-xs">
          <div className="flex items-center gap-1.5 text-[#CBD5E1]">
            <MapPin className="w-3.5 h-3.5 text-[#8B9BB4] shrink-0" />
            <span className="truncate font-medium">{event.venue}</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#8B9BB4] flex items-center gap-1">
                <Users className="w-3 h-3 text-[#8B9BB4]" />
                <strong className="text-[#F8FAFC] tabular-nums font-semibold">
                  {event.registered_count}
                </strong>{' '}
                {hasSeatLimit ? `/ ${event.max_participants} enrolled` : 'enrolled'}
              </span>
              <span
                className={`font-semibold tabular-nums ${
                  !hasSeatLimit
                    ? 'text-[#60A5FA]'
                    : isFull
                    ? 'text-[#F87171]'
                    : isFewSeats
                    ? 'text-[#FBBF24]'
                    : 'text-[#8B9BB4]'
                }`}
              >
                {!hasSeatLimit
                  ? 'Unlimited seats'
                  : isFull
                  ? 'House Full'
                  : `${seatsRemaining} seats left`}
              </span>
            </div>

            {/* Seats-filled progress bar (if seat limit exists) */}
            {hasSeatLimit && (
              <div className="w-full bg-[#16223B] h-1.5 rounded-full overflow-hidden">
                <div
                  style={{ width: `${capacityPercent}%` }}
                  className={`h-full rounded-full transition-all duration-300 ${
                    isFull
                      ? 'bg-[#EF4444]'
                      : capacityPercent >= 85
                      ? 'bg-[#F59E0B]'
                      : 'bg-[#3B82F6]'
                  }`}
                />
              </div>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-1 flex items-center gap-2">
          <Link
            to={`/events/${event.id}`}
            className="btn-secondary flex-1 text-xs h-9 justify-center"
          >
            <span>View Details</span>
            <ArrowRight className="w-3 h-3 ml-1 text-[#8B9BB4] group-hover:translate-x-0.5 transition-transform" />
          </Link>

          {onRegisterClick && !event.is_registered && !timing.isPast && !isFull && (
            <button
              onClick={() => onRegisterClick(event)}
              className="btn-primary flex-1 text-xs h-9 justify-center cursor-pointer"
            >
              Register
            </button>
          )}

          {event.is_registered && (
            <Link
              to="/student/registrations"
              className="flex-1 text-center py-2 px-3 text-xs font-semibold text-[#4ADE80] bg-[#22C55E]/15 hover:bg-[#22C55E]/25 rounded-[10px] transition-colors border border-[#22C55E]/30 flex items-center justify-center gap-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>My Pass</span>
            </Link>
          )}
        </div>

        {/* Admin Quick Action Controls */}
        {showAdminActions && (
          <div className="pt-2 border-t border-[#1F2D4A] flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              {onStatusChange && event.status !== 'approved' && (
                <button
                  onClick={() => onStatusChange(event.id, 'approved')}
                  className="px-2.5 py-0.5 bg-[#22C55E]/15 text-[#4ADE80] border border-[#22C55E]/30 hover:bg-[#22C55E]/25 rounded-md text-[11px] font-semibold transition-colors cursor-pointer"
                >
                  Approve
                </button>
              )}
              {onStatusChange && event.status !== 'rejected' && (
                <button
                  onClick={() => onStatusChange(event.id, 'rejected')}
                  className="px-2.5 py-0.5 bg-[#F59E0B]/15 text-[#FBBF24] border border-[#F59E0B]/30 hover:bg-[#F59E0B]/25 rounded-md text-[11px] font-semibold transition-colors cursor-pointer"
                >
                  Reject
                </button>
              )}
            </div>
            {onDeleteClick && (
              <button
                onClick={() => onDeleteClick(event.id)}
                className="text-[#F87171] hover:text-[#EF4444] font-semibold text-[11px] transition-colors cursor-pointer"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
