import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { eventService } from '../../services/api';
import {
  TrendingUp,
  BarChart3,
  PieChart as PieIcon,
  RefreshCw,
} from 'lucide-react';

interface AnalyticsPayload {
  summary: {
    totalEvents: number;
    totalCapacity: number;
    totalRegistered: number;
    totalAttended: number;
    overallFillRate: number;
    turnoutRate: number;
  };
  dailyTrend: Array<{ date: string; registrations: number }>;
  eventComparison: Array<{
    id: number;
    title: string;
    shortTitle: string;
    date: string;
    capacity: number;
    registered: number;
    attended: number;
    category_name: string;
    fillRate: number;
  }>;
  categoryDistribution: Array<{
    category: string;
    total_registrations: number;
    event_count: number;
  }>;
  attendanceBreakdown: Array<{
    attendance_status: string;
    count: number;
  }>;
}

interface OrganizerDashboardChartsProps {
  className?: string;
}

export const OrganizerDashboardCharts: React.FC<OrganizerDashboardChartsProps> = ({
  className = '',
}) => {
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'trend' | 'capacity' | 'turnout'>('trend');

  useEffect(() => {
    fetchAnalytics();
  }, []);

  async function fetchAnalytics() {
    try {
      setLoading(true);
      setError(null);
      const res = await eventService.getOrganizerAnalytics();
      if (res.success && res.analytics) {
        setData(res.analytics);
      } else {
        setError('No analytics data available.');
      }
    } catch (err: any) {
      console.error('Failed to fetch organizer analytics', err);
      setError('Unable to load chart metrics.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className={`academic-card p-6 space-y-4 ${className}`}>
        <div className="h-6 w-48 skeleton-shimmer rounded" />
        <div className="h-64 skeleton-shimmer rounded-[10px]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={`academic-card p-6 text-center space-y-3 ${className}`}>
        <p className="text-xs text-[#8B9BB4]">{error || 'No chart data'}</p>
        <button
          onClick={fetchAnalytics}
          className="btn-secondary text-xs h-8 inline-flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Loading</span>
        </button>
      </div>
    );
  }

  const attendancePieData = [
    {
      name: 'Admitted & Present',
      value: data.summary.totalAttended,
      color: '#4ADE80', // emerald/green
    },
    {
      name: 'Registered / Waiting',
      value: Math.max(0, data.summary.totalRegistered - data.summary.totalAttended),
      color: '#3B82F6', // blue
    },
    {
      name: 'Unfilled Capacity',
      value: Math.max(0, data.summary.totalCapacity - data.summary.totalRegistered),
      color: '#475569', // slate
    },
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      
      {/* Header with Title and Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1F2D4A]">
        <div>
          <div className="flex items-center gap-2 text-[#3B82F6] font-semibold text-xs mb-0.5">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Registration Trends & Capacity Intelligence</span>
          </div>
          <h2 className="text-lg font-bold text-[#F8FAFC] tracking-tight">
            Event Registration Analytics
          </h2>
          <p className="text-xs text-[#8B9BB4] mt-0.5">
            Visualize sign-up volume over time, seat fill-rates, and live gate attendance.
          </p>
        </div>

        {/* View Switcher Controls */}
        <div className="flex items-center gap-1 p-1 bg-[#16223B] border border-[#1F2D4A] rounded-[10px] self-start sm:self-auto text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('trend')}
            className={`px-3 py-1.5 rounded-[8px] transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'trend'
                ? 'btn-primary font-semibold shadow-sm'
                : 'text-[#8B9BB4] hover:text-[#F8FAFC]'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Timeline Trend</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('capacity')}
            className={`px-3 py-1.5 rounded-[8px] transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'capacity'
                ? 'btn-primary font-semibold shadow-sm'
                : 'text-[#8B9BB4] hover:text-[#F8FAFC]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Capacity Fill</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('turnout')}
            className={`px-3 py-1.5 rounded-[8px] transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'turnout'
                ? 'btn-primary font-semibold shadow-sm'
                : 'text-[#8B9BB4] hover:text-[#F8FAFC]'
            }`}
          >
            <PieIcon className="w-3.5 h-3.5" />
            <span>Gate Turnout</span>
          </button>
        </div>
      </div>

      {/* KPI Trend Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-[#111A2E] rounded-[10px] border border-[#1F2D4A]">
          <div className="text-[11px] text-[#8B9BB4] font-medium">Total Registrations</div>
          <div className="text-xl font-bold text-[#F8FAFC] tabular-nums mt-0.5">
            {data.summary.totalRegistered}
          </div>
          <div className="text-[10px] text-[#8B9BB4]">Across {data.summary.totalEvents} events</div>
        </div>

        <div className="p-3 bg-[#111A2E] rounded-[10px] border border-[#1F2D4A]">
          <div className="text-[11px] text-[#8B9BB4] font-medium">Overall Seat Fill Rate</div>
          <div className="text-xl font-bold text-[#60A5FA] tabular-nums mt-0.5">
            {data.summary.overallFillRate}%
          </div>
          <div className="text-[10px] text-[#8B9BB4]">
            {data.summary.totalRegistered} / {data.summary.totalCapacity} capacity
          </div>
        </div>

        <div className="p-3 bg-[#111A2E] rounded-[10px] border border-[#1F2D4A]">
          <div className="text-[11px] text-[#8B9BB4] font-medium">Verified Gate Turnout</div>
          <div className="text-xl font-bold text-[#4ADE80] tabular-nums mt-0.5">
            {data.summary.totalAttended}
          </div>
          <div className="text-[10px] text-[#4ADE80]">
            {data.summary.turnoutRate}% conversion
          </div>
        </div>

        <div className="p-3 bg-[#111A2E] rounded-[10px] border border-[#1F2D4A]">
          <div className="text-[11px] text-[#8B9BB4] font-medium">Seats Remaining</div>
          <div className="text-xl font-bold text-[#CBD5E1] tabular-nums mt-0.5">
            {Math.max(0, data.summary.totalCapacity - data.summary.totalRegistered)}
          </div>
          <div className="text-[10px] text-[#8B9BB4]">Open for enrollment</div>
        </div>
      </div>

      {/* Main Visualizations Rendered with Recharts */}
      <div className="space-y-4">
        
        {/* Tab 1: Timeline Trend (AreaChart) */}
        {activeTab === 'trend' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[#8B9BB4]">
              <span className="font-semibold text-[#CBD5E1]">
                Daily Student Registration Trajectory
              </span>
              <span className="text-[11px]">Cumulative trend by registration date</span>
            </div>

            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data.dailyTrend}
                  margin={{ top: 10, right: 15, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1F2D4A" strokeOpacity={0.8} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#8B9BB4' }}
                    tickLine={false}
                    axisLine={{ stroke: '#1F2D4A' }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#8B9BB4' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F1829',
                      borderRadius: '10px',
                      color: '#F8FAFC',
                      fontSize: '12px',
                      border: '1px solid #1F2D4A',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    }}
                    itemStyle={{ color: '#F8FAFC' }}
                    labelStyle={{ color: '#60A5FA', fontWeight: 'bold' }}
                    formatter={(val: any) => [`${val} students`, 'Registered']}
                  />
                  <Area
                    type="monotone"
                    dataKey="registrations"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#regGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Tab 2: Capacity vs Enrolment (BarChart) */}
        {activeTab === 'capacity' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[#8B9BB4]">
              <span className="font-semibold text-[#CBD5E1]">
                Event Capacity vs. Enrolled Students
              </span>
              <span className="text-[11px]">Comparison across each organized event</span>
            </div>

            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.eventComparison}
                  margin={{ top: 10, right: 15, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1F2D4A" strokeOpacity={0.8} />
                  <XAxis
                    dataKey="shortTitle"
                    tick={{ fontSize: 11, fill: '#8B9BB4' }}
                    tickLine={false}
                    axisLine={{ stroke: '#1F2D4A' }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#8B9BB4' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F1829',
                      borderRadius: '10px',
                      color: '#F8FAFC',
                      fontSize: '12px',
                      border: '1px solid #1F2D4A',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    }}
                    labelStyle={{ color: '#60A5FA', fontWeight: 'bold' }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }}
                  />
                  <Bar
                    dataKey="capacity"
                    name="Max Capacity"
                    fill="#334155"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="registered"
                    name="Enrolled Students"
                    fill="#3B82F6"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="attended"
                    name="Admitted Present"
                    fill="#22C55E"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Tab 3: Gate Turnout & Attendance Breakdown (PieChart / Donut) */}
        {activeTab === 'turnout' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={attendancePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {attendancePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F1829',
                      borderRadius: '10px',
                      color: '#F8FAFC',
                      fontSize: '12px',
                      border: '1px solid #1F2D4A',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    }}
                    formatter={(val: any) => [`${val} seats`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Turnout Stats Ledger */}
            <div className="space-y-3 text-xs">
              <h4 className="font-semibold text-[#CBD5E1] text-sm">
                Gate Turnout & Attendance Conversion
              </h4>
              <p className="text-[#8B9BB4] leading-relaxed text-[11px]">
                Turnout ratio reflecting verified gate check-in scans at the event entrance versus total pre-booked registrations.
              </p>

              <div className="space-y-2 pt-1">
                {attendancePieData.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-[8px] bg-[#111A2E] border border-[#1F2D4A]">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="font-medium text-[#CBD5E1]">{item.name}</span>
                    </div>
                    <span className="font-bold text-[#F8FAFC] tabular-nums font-mono">
                      {item.value} seats
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>

    </div>
  );
};
