import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { eventService } from '../../services/api';
import { CollegeEvent } from '../../types';
import { Modal } from '../../components/common/Modal';
import { QRScannerModal } from '../../components/organizer/QRScannerModal';
import { Alert } from '../../components/common/Alert';
import {
  Calendar,
  Users,
  PlusCircle,
  Edit2,
  Trash2,
  Search,
  Camera,
  FileText,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';

export const ManageMyEventsPage: React.FC = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<CollegeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Scanner modal state
  const [scanningEvent, setScanningEvent] = useState<CollegeEvent | null>(null);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<CollegeEvent | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [alertInfo, setAlertInfo] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadEvents();
  }, [user]);

  async function loadEvents() {
    if (!user) return;
    try {
      setLoading(true);
      const res = await eventService.getAll({ organizer_id: user.id });
      if (res.success) {
        setEvents(res.events || []);
      }
    } catch (err) {
      console.error('Failed to load organizer events', err);
    } finally {
      setLoading(false);
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      const res = await eventService.delete(deleteTarget.id);
      if (res.success) {
        setAlertInfo({ type: 'success', message: 'Event deleted successfully.' });
        setEvents((prev) => prev.filter((e) => e.id !== deleteTarget.id));
        setDeleteTarget(null);
      }
    } catch (err: any) {
      setAlertInfo({ type: 'error', message: err.response?.data?.message || 'Failed to delete event.' });
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredEvents = events.filter((ev) =>
    ev.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ev.venue.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-page-enter">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1F2D4A]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC]">
            Manage My Events
          </h1>
          <p className="text-xs sm:text-sm text-[#8B9BB4] mt-1">
            Update event information, review attendee registrations, or admit attendees with QR check-in.
          </p>
        </div>

        <Link
          to="/organizer/events/new"
          className="btn-primary text-xs self-start"
        >
          <PlusCircle className="w-4 h-4 mr-1.5" />
          <span>New Event</span>
        </Link>
      </div>

      {alertInfo && <Alert type={alertInfo.type} message={alertInfo.message} />}

      {/* Search Bar */}
      <div className="academic-card p-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B9BB4] pointer-events-none" />
          <input
            type="text"
            placeholder="Filter your events by title or venue..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-base w-full pl-10 text-xs"
          />
        </div>
      </div>

      {/* Events Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 skeleton-shimmer rounded-[14px]" />
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="p-12 text-center academic-card space-y-3">
          <Calendar className="w-8 h-8 text-[#8B9BB4] mx-auto opacity-60" />
          <h3 className="text-sm font-semibold text-[#F8FAFC]">No events matched</h3>
          <p className="text-xs text-[#8B9BB4]">
            {searchTerm ? 'No events found matching your search term.' : "You haven't posted any events yet."}
          </p>
        </div>
      ) : (
        <div className="academic-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Schedule</th>
                  <th>Venue</th>
                  <th>Capacity</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((ev) => (
                  <tr key={ev.id}>
                    {/* Event Title & Category */}
                    <td>
                      <div className="font-semibold text-[#F8FAFC] line-clamp-1 max-w-xs">
                        <Link to={`/events/${ev.id}`} className="hover:text-[#3B82F6] transition-colors">
                          {ev.title}
                        </Link>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-[#60A5FA] font-medium">{ev.category_name}</span>
                        {ev.google_form_url && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-[#60A5FA] bg-[#3B82F6]/15 border border-[#3B82F6]/30 px-1.5 py-0.5 rounded font-medium">
                            <FileText className="w-2.5 h-2.5" />
                            <span>Form Attached</span>
                          </span>
                        )}
                      </div>

                      {/* Rejection Reason Notice if present */}
                      {ev.status === 'rejected' && ev.rejection_reason && (
                        <div className="mt-2 p-2 bg-[#EF4444]/10 border border-[#EF4444]/25 rounded-[8px] text-[11px] text-[#F87171] max-w-sm space-y-0.5">
                          <div className="font-semibold flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-[#F87171]" />
                            <span>Admin Rejection Reason:</span>
                          </div>
                          <p className="italic pl-4 text-[#CBD5E1]">"{ev.rejection_reason}"</p>
                        </div>
                      )}
                    </td>

                    {/* Schedule */}
                    <td className="text-[#CBD5E1] tabular-nums">
                      <div>
                        {ev.date_tbd
                          ? 'Date TBD'
                          : ev.end_date && ev.end_date !== ev.date
                          ? `${ev.date} - ${ev.end_date}`
                          : ev.date || 'Date TBD'}
                      </div>
                      {!ev.date_tbd && ev.start_time && (
                        <div className="text-[#8B9BB4] text-[11px]">
                          {ev.end_time ? `${ev.start_time} - ${ev.end_time}` : ev.start_time}
                        </div>
                      )}
                    </td>

                    {/* Venue */}
                    <td className="text-[#CBD5E1] max-w-[140px] truncate">
                      {ev.venue}
                    </td>

                    {/* Capacity */}
                    <td className="tabular-nums">
                      <div className="font-medium text-[#F8FAFC]">
                        {ev.registered_count} / {ev.max_participants !== null && ev.max_participants !== undefined ? ev.max_participants : 'Unlimited'}
                      </div>
                      {ev.max_participants !== null && ev.max_participants !== undefined && (
                        <div className="w-24 bg-[#16223B] rounded-full h-1.5 mt-1 overflow-hidden">
                          <div
                            className="bg-[#3B82F6] h-1.5 rounded-full"
                            style={{
                              width: `${Math.min(100, Math.round((ev.registered_count / Number(ev.max_participants)) * 100))}%`,
                            }}
                          />
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                        ev.status === 'approved'
                          ? 'bg-[#22C55E]/15 text-[#4ADE80] border-[#22C55E]/30'
                          : ev.status === 'pending'
                          ? 'bg-[#F59E0B]/15 text-[#FBBF24] border-[#F59E0B]/30'
                          : ev.status === 'rejected'
                          ? 'bg-[#EF4444]/15 text-[#F87171] border-[#EF4444]/30'
                          : ev.status === 'cancelled'
                          ? 'bg-[#EF4444]/15 text-[#F87171] border-[#EF4444]/30'
                          : 'bg-[#16223B] text-[#CBD5E1] border-[#1F2D4A]'
                      }`}>
                        {ev.status === 'pending'
                          ? 'Pending approval'
                          : ev.status === 'approved'
                          ? 'Approved'
                          : ev.status === 'rejected'
                          ? 'Rejected'
                          : ev.status === 'cancelled'
                          ? 'Cancelled'
                          : ev.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {ev.google_form_url && (
                          <a
                            href={ev.google_form_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open Google Form Link"
                            className="p-1.5 text-[#60A5FA] hover:bg-[#16223B] rounded-[8px] transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          onClick={() => setScanningEvent(ev)}
                          title="Open Entry Gate QR Scanner"
                          className="px-2.5 py-1 text-[#4ADE80] bg-[#22C55E]/15 hover:bg-[#22C55E]/25 border border-[#22C55E]/30 rounded-[8px] flex items-center gap-1 font-semibold text-[11px] transition-colors cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Scan QR</span>
                        </button>
                        <Link
                          to={`/organizer/events/${ev.id}/participants`}
                          title="View Registered Students"
                          className="p-1.5 text-[#8B9BB4] hover:text-[#F8FAFC] hover:bg-[#16223B] rounded-[8px] transition-colors"
                        >
                          <Users className="w-4 h-4" />
                        </Link>
                        {(ev.status === 'pending' || ev.status === 'rejected') && (
                          <>
                            <Link
                              to={`/organizer/events/${ev.id}/edit`}
                              title="Edit Event"
                              className="p-1.5 text-[#8B9BB4] hover:text-[#F8FAFC] hover:bg-[#16223B] rounded-[8px] transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => setDeleteTarget(ev)}
                              title="Delete Event"
                              className="p-1.5 text-[#8B9BB4] hover:text-[#EF4444] rounded-[8px] hover:bg-[#EF4444]/10 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
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
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete Event"
        footer={
          <>
            <button
              onClick={() => setDeleteTarget(null)}
              disabled={deleteLoading}
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
        {deleteTarget && (
          <div className="space-y-3 text-xs text-[#CBD5E1]">
            <p>
              Are you sure you want to delete <strong className="text-[#F8FAFC]">{deleteTarget.title}</strong>?
            </p>
            <p className="text-[#8B9BB4]">
              This action cannot be undone. All student registrations associated with this event will also be removed.
            </p>
          </div>
        )}
      </Modal>

      {/* Entry Gate QR Scanner Modal */}
      {scanningEvent && (
        <QRScannerModal
          isOpen={Boolean(scanningEvent)}
          onClose={() => setScanningEvent(null)}
          eventId={scanningEvent.id}
          eventTitle={scanningEvent.title}
          onAttendeeAdmitted={() => {
            loadEvents();
          }}
        />
      )}

    </div>
  );
};
