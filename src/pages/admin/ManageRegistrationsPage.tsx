import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/api';
import { Registration } from '../../types';
import { Search, Ticket, CheckCircle2, XCircle } from 'lucide-react';

export const ManageRegistrationsPage: React.FC = () => {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [attendanceFilter, setAttendanceFilter] = useState('');

  useEffect(() => {
    loadRegistrations();
  }, [attendanceFilter]);

  async function loadRegistrations() {
    try {
      setLoading(true);
      const res = await adminService.getAllRegistrations({
        attendance_status: attendanceFilter || undefined,
      });
      if (res.success) {
        setRegistrations(res.registrations || []);
      }
    } catch (err) {
      console.error('Failed to load global registrations', err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = registrations.filter((r) =>
    r.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.student_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.event_title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-page-enter">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1F2D4A]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC]">
            Campus-Wide Registrations Master List
          </h1>
          <p className="text-xs sm:text-sm text-[#8B9BB4] mt-1">
            Audit student event passes, check attendance validity, and search across all departmental events.
          </p>
        </div>

        <div className="text-xs text-[#CBD5E1] bg-[#16223B] border border-[#1F2D4A] px-3 py-1.5 rounded-[8px] tabular-nums font-medium self-start">
          Total Entries: <span className="font-semibold text-[#F8FAFC]">{registrations.length}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="academic-card p-3 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B9BB4] pointer-events-none" />
          <input
            type="text"
            placeholder="Search by student name, college email, or event title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-base w-full pl-10 text-xs"
          />
        </div>

        <div className="w-full sm:w-48">
          <select
            value={attendanceFilter}
            onChange={(e) => setAttendanceFilter(e.target.value)}
            className="input-base w-full text-xs"
          >
            <option value="">All Attendance States</option>
            <option value="present">Present (Attended)</option>
            <option value="absent">Absent</option>
            <option value="unmarked">Unmarked</option>
          </select>
        </div>
      </div>

      {/* Registrations Master Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 skeleton-shimmer rounded-[14px]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center academic-card space-y-2">
          <Ticket className="w-8 h-8 text-[#8B9BB4] mx-auto opacity-60" />
          <h3 className="text-sm font-semibold text-[#F8FAFC]">No registrations found</h3>
          <p className="text-xs text-[#8B9BB4]">No registration records matched your query.</p>
        </div>
      ) : (
        <div className="academic-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Pass ID</th>
                  <th>Student</th>
                  <th>Event</th>
                  <th>Event Date</th>
                  <th>Registration Date</th>
                  <th>Status</th>
                  <th className="text-right">Attendance</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.registration_id}>
                    <td className="font-mono text-[11px] text-[#8B9BB4] tabular-nums">
                      #{r.registration_id}
                    </td>

                    <td>
                      <div className="font-semibold text-[#F8FAFC]">{r.student_name}</div>
                      <div className="text-[11px] text-[#8B9BB4]">{r.student_email}</div>
                    </td>

                    <td className="max-w-xs truncate">
                      <div className="font-medium text-[#CBD5E1] truncate">{r.event_title}</div>
                      <div className="text-[11px] text-[#60A5FA] font-medium">{r.category_name}</div>
                    </td>

                    <td className="tabular-nums text-[#CBD5E1]">
                      {r.event_date}
                    </td>

                    <td className="tabular-nums text-[#8B9BB4]">
                      {new Date(r.registration_date).toLocaleDateString()}
                    </td>

                    <td>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium capitalize border ${
                        r.registration_status === 'confirmed'
                          ? 'bg-[#22C55E]/15 text-[#4ADE80] border-[#22C55E]/30'
                          : 'bg-[#EF4444]/15 text-[#F87171] border-[#EF4444]/30'
                      }`}>
                        {r.registration_status}
                      </span>
                    </td>

                    <td className="text-right">
                      {r.attendance_status === 'present' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#4ADE80] bg-[#22C55E]/15 border border-[#22C55E]/30 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Present</span>
                        </span>
                      ) : r.attendance_status === 'absent' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#F87171] bg-[#EF4444]/15 border border-[#EF4444]/30 px-2 py-0.5 rounded-full">
                          <XCircle className="w-3 h-3" />
                          <span>Absent</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#8B9BB4] bg-[#16223B] border border-[#1F2D4A] px-2 py-0.5 rounded-full">
                          Unmarked
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
