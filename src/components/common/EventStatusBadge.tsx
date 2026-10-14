import React from 'react';
import { getEventTimingInfo } from '../../utils/eventTiming';
import { Clock } from 'lucide-react';

interface EventStatusBadgeProps {
  date?: string | null;
  dateTbd?: boolean | number;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  showCountdown?: boolean;
  className?: string;
}

export const EventStatusBadge: React.FC<EventStatusBadgeProps> = ({
  date,
  dateTbd,
  endDate,
  startTime,
  endTime,
  showCountdown = true,
  className = '',
}) => {
  const timing = getEventTimingInfo({
    date,
    date_tbd: dateTbd,
    end_date: endDate,
    start_time: startTime,
    end_time: endTime,
  });

  if (timing.isDateTbd) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-[#A855F7]/15 text-[#C084FC] border border-[#A855F7]/30 shadow-xs backdrop-blur-md ${className}`}
      >
        <Clock className="w-2.5 h-2.5" />
        <span>Date TBD</span>
      </span>
    );
  }

  if (timing.isOngoing) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-[#22C55E]/15 text-[#4ADE80] border border-[#22C55E]/30 shadow-xs backdrop-blur-md ${className}`}
        title="Event is currently happening live"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4ADE80] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22C55E]" />
        </span>
        <span className="tracking-wide">LIVE NOW</span>
      </span>
    );
  }

  if (timing.isUpcoming) {
    return (
      <div className={`inline-flex items-center gap-1.5 ${className}`}>
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-[#3B82F6]/15 text-[#60A5FA] border border-[#3B82F6]/30 shadow-xs backdrop-blur-md">
          <span>Upcoming</span>
        </span>
        {showCountdown && timing.countdownText && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#06B6D4]/15 text-[#22D3EE] border border-[#06B6D4]/30 backdrop-blur-md tabular-nums">
            <Clock className="w-2.5 h-2.5" />
            <span>{timing.countdownText}</span>
          </span>
        )}
      </div>
    );
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium bg-[#1E293B]/80 text-[#94A3B8] border border-[#334155]/60 backdrop-blur-md ${className}`}
    >
      <span>Completed</span>
    </span>
  );
};
