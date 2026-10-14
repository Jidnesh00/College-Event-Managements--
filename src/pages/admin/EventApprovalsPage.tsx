import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { eventService, adminService, categoryService } from '../../services/api';
import { CollegeEvent, Category } from '../../types';
import { Modal } from '../../components/common/Modal';
import { Alert } from '../../components/common/Alert';
import {
  Calendar,
  CheckCircle,
  XCircle,
  Eye,
  Search,
  Filter,
  Clock,
  Users,
  Shield,
  Layers,
  Award,
  FileSpreadsheet,
  FileCheck,
  LayoutDashboard,
} from 'lucide-react';

export const EventApprovalsPage: React.FC = () => {
  const [pendingEvents, setPendingEvents] = useState<CollegeEvent[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [alertInfo, setAlertInfo] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Reject modal state
  const [rejectTarget, setRejectTarget] = useState<CollegeEvent | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [eventsRes, catRes] = await Promise.all([
        eventService.getAll({ status: 'pending', sort: 'desc' }),
        categoryService.getAll(),
      ]);

      if (eventsRes.success) {
        setPendingEvents(eventsRes.events || []);
      }
      if (catRes.success) {
        setCategories(catRes.categories || []);
      }
    } catch (err: any) {
      setAlertInfo({ type: 'error', message: 'Failed to load pending events.' });
    } finally {
      setLoading(false);
    }
  }

  const handleApprove = async (event: CollegeEvent) => {
    try {
      setActionLoading(true);
      setAlertInfo(null);
      const res = await adminService.approveEvent(event.id);
      if (res.success) {
        setAlertInfo({ type: 'success', message: `Event "${event.title}" has been approved and published.` });
        setPendingEvents((prev) => prev.filter((e) => e.id !== event.id));
      }
    } catch (err: any) {
      setAlertInfo({ type: 'error', message: err.response?.data?.message || 'Failed to approve event.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenReject = (event: CollegeEvent) => {
    setRejectTarget(event);
    setRejectReason('');
  };

  const handleConfirmReject = async () => {
    if (!rejectTarget) return;
    try {
      setActionLoading(true);
      const res = await adminService.rejectEvent(rejectTarget.id, rejectReason);
      if (res.success) {
        setAlertInfo({ type: 'success', message: `Event "${rejectTarget.title}" was rejected.` });
        setPendingEvents((prev) => prev.filter((e) => e.id !== rejectTarget.id));
        setRejectTarget(null);
        setRejectReason('');
      }
    } catch (err: any) {
      setAlertInfo({ type: 'error', message: err.response?.data?.message || 'Failed to reject event.' });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredEvents = pendingEvents.filter((ev) => {
    const matchesSearch =
      ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.organizer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.venue.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter ? String(ev.category_id) === categoryFilter : true;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-page-enter">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Sidebar (3 Cols) */}
        <aside className="lg:col-span-3 space-y-4">
          <div className="bg-[#0D1526] rounded-[14px] border border-[#1F2D4A] p-4 shadow-sm space-y-4">
            <div className="pb-3 border-b border-[#1F2D4A]">
              <span className="text-[11px] font-semibold text-[#8B9BB4] uppercase tracking-wider">
                Administration
              </span>
              <h2 className="text-sm font-bold text-[#F8FAFC] mt-0.5">
                Central Admin Console
              </h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#F59E0B]/15 text-[#FBBF24] border border-[#F59E0B]/30 mt-1">
                Super Admin
              </span>
            </div>

            <nav className="space-y-1 text-sm font-medium">
              <Link
                to="/admin"
                className="flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-[#CBD5E1] hover:text-[#F8FAFC] hover:bg-[#16223B] transition-colors"
              >
                <LayoutDashboard className="w-4 h-4 text-[#8B9BB4]" />
                <span>Overview</span>
              </Link>

              <Link
                to="/admin/approvals"
                className="flex items-center justify-between px-3 py-2 rounded-[10px] bg-[#3B82F6]/15 text-[#60A5FA] font-semibold"
              >
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-[#3B82F6]" />
                  <span>Event Approvals</span>
                </div>
                {pendingEvents.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#F59E0B]/20 text-[#FBBF24] border border-[#F59E0B]/40 tabular-nums">
                    {pendingEvents.length}
                  </span>
                )}
              </Link>

              <Link
                to="/admin/events"
                className="flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-[#CBD5E1] hover:text-[#F8FAFC] hover:bg-[#16223B] transition-colors"
              >
                <Layers className="w-4 h-4 text-[#8B9BB4]" />
                <span>All Events</span>
              </Link>

              <Link
                to="/admin/users"
                className="flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-[#CBD5E1] hover:text-[#F8FAFC] hover:bg-[#16223B] transition-colors"
              >
                <Users className="w-4 h-4 text-[#8B9BB4]" />
                <span>User Roles</span>
              </Link>

              <Link
                to="/admin/categories"
                className="flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-[#CBD5E1] hover:text-[#F8FAFC] hover:bg-[#16223B] transition-colors"
              >
                <Award className="w-4 h-4 text-[#8B9BB4]" />
                <span>Event Categories</span>
              </Link>

              <Link
                to="/admin/registrations"
                className="flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-[#CBD5E1] hover:text-[#F8FAFC] hover:bg-[#16223B] transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 text-[#8B9BB4]" />
                <span>All Registrations</span>
              </Link>

              <Link
                to="/admin/reports"
                className="flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-[#CBD5E1] hover:text-[#F8FAFC] hover:bg-[#16223B] transition-colors"
              >
                <FileCheck className="w-4 h-4 text-[#8B9BB4]" />
                <span>Audit & Reports</span>
              </Link>
            </nav>
          </div>

          <div className="bg-[#111A2E] rounded-[14px] border border-[#1F2D4A] p-4 space-y-2 text-xs text-[#CBD5E1]">
            <div className="font-semibold text-[#F8FAFC] flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-[#3B82F6]" />
              <span>Approval Workflow</span>
            </div>
            <p className="leading-relaxed text-[#8B9BB4]">
              New organizer events stay hidden from public lists until approved. You can review venue availability, capacity, and details before publishing.
            </p>
          </div>
        </aside>

        {/* Right Main Content (9 Cols) */}
        <main className="lg:col-span-9 space-y-6">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1F2D4A]">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC]">
                  Event Approvals
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#F59E0B]/15 text-[#FBBF24] border border-[#F59E0B]/30 tabular-nums">
                  {pendingEvents.length} Pending
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#8B9BB4] mt-1">
                Review proposed events submitted by club organizers and faculty. Approved events go live immediately.
              </p>
            </div>

            <Link
              to="/admin/events"
              className="btn-secondary text-xs self-start"
            >
              <span>View All Events</span>
            </Link>
          </div>

          {alertInfo && <Alert type={alertInfo.type} message={alertInfo.message} />}

          {/* Search and Category Filter Bar */}
          <div className="academic-card p-3 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B9BB4] pointer-events-none" />
              <input
                type="text"
                placeholder="Search pending events by title, organizer, or venue..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-base w-full pl-10 text-xs"
              />
            </div>

            <div className="w-full sm:w-48">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="input-base w-full text-xs cursor-pointer"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Pending Events Table */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 skeleton-shimmer rounded-[14px]" />
              ))}
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="p-12 text-center academic-card space-y-2">
              <Calendar className="w-10 h-10 text-[#8B9BB4] mx-auto opacity-60" />
              <h3 className="text-sm font-semibold text-[#F8FAFC]">
                {searchQuery || categoryFilter
                  ? 'No pending events matched your filters'
                  : 'No Pending Event Approvals'}
              </h3>
              <p className="text-xs text-[#8B9BB4]">
                {searchQuery || categoryFilter
                  ? 'Try clearing the search term or category filter.'
                  : 'All proposed events have been reviewed. New organizer submissions will appear here.'}
              </p>
            </div>
          ) : (
            <div className="academic-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Created By & Role</th>
                      <th>Category</th>
                      <th>Date</th>
                      <th>Seats</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEvents.map((ev) => (
                      <tr key={ev.id}>
                        {/* Title */}
                        <td>
                          <div className="font-semibold text-[#F8FAFC] line-clamp-1 max-w-xs">
                            <Link to={`/events/${ev.id}`} className="hover:text-[#3B82F6] transition-colors">
                              {ev.title}
                            </Link>
                          </div>
                          <div className="text-[11px] text-[#8B9BB4] truncate max-w-[200px]">
                            {ev.venue}
                          </div>
                        </td>

                        {/* Created By & Role */}
                        <td>
                          <div className="font-medium text-[#CBD5E1]">
                            {ev.organizer_name || 'Organizer'}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {ev.organizer_role === 'student' ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-[#10B981]/15 text-[#34D399] border-[#10B981]/30">
                                Created by Student
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full border bg-[#3B82F6]/15 text-[#60A5FA] border-[#3B82F6]/30 capitalize">
                                {ev.organizer_role || 'organizer'}
                              </span>
                            )}
                            <span className="text-[11px] text-[#8B9BB4] truncate max-w-[120px]">
                              {ev.organizer_email}
                            </span>
                          </div>
                        </td>

                        {/* Category */}
                        <td>
                          <span className="text-xs font-medium text-[#CBD5E1]">
                            {ev.category_name}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="text-[#CBD5E1] tabular-nums text-xs">
                          {ev.date_tbd ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#A855F7]/15 text-[#C084FC] border border-[#A855F7]/30">
                              Date TBD
                            </span>
                          ) : (
                            <div>
                              <div className="font-medium">
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

                        {/* Seats */}
                        <td className="tabular-nums text-xs text-[#CBD5E1]">
                          {ev.max_participants !== null && ev.max_participants !== undefined
                            ? `${ev.max_participants} seats`
                            : 'Unlimited'}
                        </td>

                        {/* Actions */}
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              to={`/events/${ev.id}`}
                              className="px-2.5 py-1 text-xs font-semibold text-[#CBD5E1] bg-[#16223B] hover:bg-[#1E2E4E] hover:text-[#F8FAFC] border border-[#1F2D4A] rounded-[8px] transition-colors inline-flex items-center gap-1"
                              title="View Event"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View</span>
                            </Link>

                            <button
                              onClick={() => handleApprove(ev)}
                              disabled={actionLoading}
                              className="px-2.5 py-1 text-xs font-semibold text-[#4ADE80] bg-[#22C55E]/15 hover:bg-[#22C55E]/25 border border-[#22C55E]/30 rounded-[8px] transition-colors inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              title="Approve Event"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>

                            <button
                              onClick={() => handleOpenReject(ev)}
                              disabled={actionLoading}
                              className="px-2.5 py-1 text-xs font-semibold text-[#F87171] bg-[#EF4444]/15 hover:bg-[#EF4444]/25 border border-[#EF4444]/30 rounded-[8px] transition-colors inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              title="Reject Event"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Reject</span>
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

        </main>
      </div>

      {/* Reject Modal with optional reason field */}
      {rejectTarget && (
        <Modal
          isOpen={Boolean(rejectTarget)}
          onClose={() => setRejectTarget(null)}
          title="Reject Event Proposal"
          maxWidth="sm"
          footer={
            <>
              <button
                onClick={() => setRejectTarget(null)}
                disabled={actionLoading}
                className="btn-secondary text-xs h-9 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={actionLoading}
                className="btn-danger text-xs h-9 cursor-pointer"
              >
                {actionLoading ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </>
          }
        >
          <div className="space-y-4 text-xs text-[#CBD5E1]">
            <p>
              Are you sure you want to decline the proposal for{' '}
              <strong className="text-[#F8FAFC]">{rejectTarget.title}</strong> created by{' '}
              <span className="text-[#60A5FA] font-medium">{rejectTarget.organizer_name}</span>?
            </p>

            <div>
              <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">
                Reason for Rejection <span className="text-[#8B9BB4] font-normal">(Optional)</span>
              </label>
              <textarea
                rows={3}
                placeholder="Explain why this proposal was declined (e.g., schedule conflict, missing safety plan). This will be sent to the organizer."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full rounded-[10px] border border-[#1F2D4A] bg-[#0F1829] p-3 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/25 transition-all placeholder:text-[#64748B]"
              />
              <p className="text-[11px] text-[#8B9BB4] mt-1">
                The organizer will be able to address your feedback, edit their event, and resubmit it.
              </p>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};
