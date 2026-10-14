import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { eventService, adminService } from '../../services/api';
import { CollegeEvent, EventStatus } from '../../types';
import { Modal } from '../../components/common/Modal';
import { Alert } from '../../components/common/Alert';
import {
  Calendar,
  Users,
  Trash2,
  Search,
  Eye,
  PlusCircle,
} from 'lucide-react';

export const ManageEventsPage: React.FC = () => {
  const [events, setEvents] = useState<CollegeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<CollegeEvent | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Cancel modal state
  const [cancelTarget, setCancelTarget] = useState<CollegeEvent | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  const [alertInfo, setAlertInfo] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadEvents();
  }, [statusFilter]);

  async function loadEvents() {
    try {
      setLoading(true);
      const res = await eventService.getAll({
        status: statusFilter || undefined,
        sort: 'desc',
      });
      if (res.success) {
        setEvents(res.events || []);
      }
    } catch (err: any) {
      setAlertInfo({ type: 'error', message: 'Failed to load events.' });
    } finally {
      setLoading(false);
    }
  }

  const handleStatusChange = async (eventId: number, newStatus: EventStatus) => {
    try {
      setAlertInfo(null);
      const res = await adminService.updateEventStatus(eventId, newStatus);
      if (res.success) {
        setAlertInfo({ type: 'success', message: `Event status updated to ${newStatus}.` });
        setEvents((prev) =>
          prev.map((e) => (e.id === eventId ? { ...e, status: newStatus } : e))
        );
      }
    } catch (err: any) {
      setAlertInfo({ type: 'error', message: 'Failed to update event status.' });
    }
  };

  const handleCancelConfirm = async () => {
    if (!cancelTarget) return;
    try {
      setCancelLoading(true);
      const res = await adminService.cancelEvent(cancelTarget.id, cancelReason);
      if (res.success) {
        setAlertInfo({ type: 'success', message: `Event "${cancelTarget.title}" cancelled. Attendees notified.` });
        setEvents((prev) =>
          prev.map((e) => (e.id === cancelTarget.id ? { ...e, status: 'cancelled' } : e))
        );
        setCancelTarget(null);
        setCancelReason('');
      }
    } catch (err: any) {
      setAlertInfo({ type: 'error', message: err.response?.data?.message || 'Failed to cancel event.' });
    } finally {
      setCancelLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      const res = await eventService.delete(deleteTarget.id);
      if (res.success) {
        setAlertInfo({ type: 'success', message: 'Event permanently deleted.' });
        setEvents((prev) => prev.filter((e) => e.id !== deleteTarget.id));
        setDeleteTarget(null);
      }
    } catch (err: any) {
      setAlertInfo({ type: 'error', message: 'Failed to delete event.' });
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredEvents = events.filter((ev) =>
    ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ev.organizer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ev.venue.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-page-enter">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1F2D4A]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC]">
            Event Moderation & Oversight
          </h1>
          <p className="text-xs sm:text-sm text-[#8B9BB4] mt-1">
            Review event proposals, audit campus schedules, change status, or remove events.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          <Link
            to="/admin/approvals"
            className="btn-secondary text-xs"
          >
            <span>Event Approvals</span>
          </Link>
          <Link
            to="/organizer/events/new"
            className="btn-primary text-xs"
          >
            <PlusCircle className="w-4 h-4 mr-1.5" />
            <span>Post Official Event</span>
          </Link>
        </div>
      </div>

      {alertInfo && <Alert type={alertInfo.type} message={alertInfo.message} />}

      {/* Filter and Search Bar */}
      <div className="academic-card p-3 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B9BB4] pointer-events-none" />
          <input
            type="text"
            placeholder="Search events by title, organizer, or venue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-base w-full pl-10 text-xs"
          />
        </div>

        <div className="w-full sm:w-48">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-base w-full text-xs"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Events Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 skeleton-shimmer rounded-[14px]" />
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="p-12 text-center academic-card space-y-2">
          <Calendar className="w-8 h-8 text-[#8B9BB4] mx-auto opacity-60" />
          <h3 className="text-sm font-semibold text-[#F8FAFC]">No events found</h3>
          <p className="text-xs text-[#8B9BB4]">No events matched the status or search filter.</p>
        </div>
      ) : (
        <div className="academic-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Organizer</th>
                  <th>Date & Venue</th>
                  <th>Enrollments</th>
                  <th>Status</th>
                  <th className="text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((ev) => (
                  <tr key={ev.id}>
                    {/* Event Info */}
                    <td>
                      <div className="font-semibold text-[#F8FAFC] line-clamp-1 max-w-xs">
                        <Link to={`/events/${ev.id}`} className="hover:text-[#3B82F6] transition-colors">
                          {ev.title}
                        </Link>
                      </div>
                      <div className="text-[11px] text-[#60A5FA] font-medium">
                        {ev.category_name} · #{ev.id}
                      </div>
                    </td>

                    {/* Organizer */}
                    <td>
                      <div className="font-medium text-[#CBD5E1]">{ev.organizer_name}</div>
                      <div className="text-[11px] text-[#8B9BB4]">{ev.organizer_email}</div>
                    </td>

                    {/* Date & Venue */}
                    <td className="text-[#CBD5E1]">
                      <div className="tabular-nums font-medium">
                        {ev.date_tbd
                          ? 'Date TBD'
                          : ev.end_date && ev.end_date !== ev.date
                          ? `${ev.date} - ${ev.end_date}`
                          : ev.date || 'Date TBD'}
                      </div>
                      <div className="text-[11px] text-[#8B9BB4] truncate max-w-[130px]">
                        {ev.venue}
                      </div>
                    </td>

                    {/* Registrations */}
                    <td className="tabular-nums">
                      <span className="font-semibold text-[#F8FAFC]">{ev.registered_count}</span>
                      <span className="text-[#8B9BB4]">
                        {' '}/ {ev.max_participants !== null && ev.max_participants !== undefined ? ev.max_participants : 'Unlimited'}
                      </span>
                    </td>

                    {/* Status Dropdown */}
                    <td>
                      <select
                        value={ev.status}
                        onChange={(e) => handleStatusChange(ev.id, e.target.value as EventStatus)}
                        className="px-2.5 py-1 text-xs bg-[#0F1829] border border-[#1F2D4A] rounded-[8px] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-[#F8FAFC] capitalize"
                      >
                        <option value="approved">Approved</option>
                        <option value="pending">Pending</option>
                        <option value="rejected">Rejected</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>

                    {/* Actions */}
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {ev.status === 'approved' && (
                          <button
                            onClick={() => {
                              setCancelTarget(ev);
                              setCancelReason('');
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-[#F87171] bg-[#EF4444]/15 hover:bg-[#EF4444]/25 border border-[#EF4444]/30 rounded-[8px] transition-colors inline-flex items-center gap-1 cursor-pointer"
                            title="Cancel Approved Event"
                          >
                            <span>Cancel Event</span>
                          </button>
                        )}
                        <Link
                          to={`/events/${ev.id}`}
                          className="p-1.5 text-[#8B9BB4] hover:text-[#F8FAFC] rounded-[8px] hover:bg-[#16223B] transition-colors"
                          title="View Event Page"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => setDeleteTarget(ev)}
                          className="p-1.5 text-[#8B9BB4] hover:text-[#EF4444] rounded-[8px] hover:bg-[#EF4444]/10 transition-colors cursor-pointer"
                          title="Delete Event"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <Modal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          title="Delete Event Confirmation"
          maxWidth="sm"
          footer={
            <>
              <button
                onClick={() => setDeleteTarget(null)}
                className="btn-secondary text-xs h-9"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className="btn-danger text-xs h-9"
              >
                {deleteLoading ? 'Deleting...' : 'Delete Event'}
              </button>
            </>
          }
        >
          <div className="space-y-3 text-xs text-[#CBD5E1]">
            <p>
              Are you sure you want to permanently delete <strong className="text-[#F8FAFC]">{deleteTarget.title}</strong>?
            </p>
            <p className="text-[#8B9BB4]">
              This will remove all associated attendee registrations and entry records from the college database.
            </p>
          </div>
        </Modal>
      )}

      {/* Cancel Event Confirmation Modal with Optional Reason */}
      {cancelTarget && (
        <Modal
          isOpen={Boolean(cancelTarget)}
          onClose={() => setCancelTarget(null)}
          title="Cancel Approved Event"
          maxWidth="sm"
          footer={
            <>
              <button
                onClick={() => setCancelTarget(null)}
                disabled={cancelLoading}
                className="btn-secondary text-xs h-9 cursor-pointer"
              >
                Keep Event
              </button>
              <button
                onClick={handleCancelConfirm}
                disabled={cancelLoading}
                className="btn-danger text-xs h-9 cursor-pointer"
              >
                {cancelLoading ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </>
          }
        >
          <div className="space-y-4 text-xs text-[#CBD5E1]">
            <p>
              Are you sure you want to cancel <strong className="text-[#F8FAFC]">{cancelTarget.title}</strong>?
            </p>
            <p className="text-[#8B9BB4] leading-relaxed">
              Cancelling will hide this event from public lists, preserve existing student registrations with a clear cancelled status, and notify all registered attendees as well as the event organizer.
            </p>

            <div>
              <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">
                Cancellation Reason <span className="text-[#8B9BB4] font-normal">(Optional)</span>
              </label>
              <textarea
                rows={3}
                placeholder="Reason for cancellation (e.g., weather emergency, venue maintenance)..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full rounded-[10px] border border-[#1F2D4A] bg-[#0F1829] p-2.5 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/25 transition-all placeholder:text-[#64748B]"
              />
              <p className="text-[11px] text-[#8B9BB4] mt-1">
                This explanation will be included in real-time notification alerts sent to registered students.
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
