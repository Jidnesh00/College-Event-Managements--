import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { categoryService, eventService } from '../../services/api';
import { Category, CollegeEvent } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Alert } from '../../components/common/Alert';
import { ImageUploadDropzone } from '../../components/common/ImageUploadDropzone';
import { EventMediaManager } from '../../components/organizer/EventMediaManager';
import { ArrowLeft, MapPin, Users, FileText, ExternalLink, Calendar, Clock } from 'lucide-react';

export const EditEventPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');

  // Date & Time
  const [dateTbd, setDateTbd] = useState(false);
  const [date, setDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // Logistics
  const [venue, setVenue] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [registrationDeadline, setRegistrationDeadline] = useState('');
  const [image, setImage] = useState('');
  const [googleFormUrl, setGoogleFormUrl] = useState('');
  const [status, setStatus] = useState<string>('approved');

  const [saving, setSaving] = useState(false);
  const [alertInfo, setAlertInfo] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        setInitialLoading(true);
        const [catRes, eventRes] = await Promise.all([
          categoryService.getAll(),
          eventService.getById(id),
        ]);

        if (catRes.success) setCategories(catRes.categories);
        if (eventRes.success && eventRes.event) {
          const ev = eventRes.event;
          setTitle(ev.title || '');
          setDescription(ev.description || '');
          setCategoryId(String(ev.category_id || ''));
          setDateTbd(Boolean(ev.date_tbd));
          setDate(ev.date || '');
          setEndDate(ev.end_date || '');
          setStartTime(ev.start_time || '');
          setEndTime(ev.end_time || '');
          setVenue(ev.venue || '');
          setMaxParticipants(
            ev.max_participants !== null && ev.max_participants !== undefined
              ? String(ev.max_participants)
              : ''
          );
          setRegistrationDeadline(ev.registration_deadline || '');
          setImage(ev.image || '');
          setGoogleFormUrl(ev.google_form_url || '');
          setStatus(ev.status || 'approved');
        }
      } catch (err: any) {
        setAlertInfo({ type: 'error', message: 'Failed to load event data.' });
      } finally {
        setInitialLoading(false);
      }
    }
    loadData();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    if (!title.trim() || !description.trim() || !venue.trim() || !categoryId) {
      setAlertInfo({ type: 'error', message: 'Please fill in all mandatory fields.' });
      return;
    }

    if (!dateTbd) {
      if (!date) {
        setAlertInfo({ type: 'error', message: 'Event start date is required.' });
        return;
      }
      if (!startTime.trim()) {
        setAlertInfo({ type: 'error', message: 'Start time is required.' });
        return;
      }
      if (endDate && new Date(endDate) < new Date(date)) {
        setAlertInfo({ type: 'error', message: 'End date cannot be before the start date.' });
        return;
      }
      if (registrationDeadline) {
        const lastDate = endDate || date;
        if (new Date(registrationDeadline) > new Date(lastDate)) {
          setAlertInfo({ type: 'error', message: 'Registration deadline cannot be after the event date.' });
          return;
        }
      }
    }

    let parsedMaxParticipants: number | null = null;
    if (maxParticipants.trim()) {
      const num = Number(maxParticipants);
      if (isNaN(num) || num < 1) {
        setAlertInfo({ type: 'error', message: 'Number of seats must be at least 1 or left empty for unlimited seats.' });
        return;
      }
      parsedMaxParticipants = num;
    }

    if (googleFormUrl.trim()) {
      try {
        const parsed = new URL(googleFormUrl.trim());
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          setAlertInfo({ type: 'error', message: 'Google Form link must start with http:// or https://' });
          return;
        }
      } catch {
        setAlertInfo({
          type: 'error',
          message: 'Please provide a valid URL for the Google Form link (e.g., https://forms.gle/... or https://docs.google.com/forms/...)',
        });
        return;
      }
    }

    try {
      setSaving(true);
      setAlertInfo(null);

      const res = await eventService.update(id, {
        title: title.trim(),
        description: description.trim(),
        category_id: Number(categoryId),
        date: dateTbd ? null : date,
        date_tbd: dateTbd,
        end_date: dateTbd ? null : (endDate.trim() || null),
        start_time: dateTbd ? null : (startTime.trim() || null),
        end_time: dateTbd ? null : (endTime.trim() || null),
        venue: venue.trim(),
        max_participants: parsedMaxParticipants,
        registration_deadline: dateTbd ? null : (registrationDeadline.trim() || null),
        image: image.trim(),
        google_form_url: googleFormUrl.trim() || null,
        status: status as any,
      });

      if (res.success) {
        setAlertInfo({ type: 'success', message: 'Event updated successfully.' });
        setTimeout(() => {
          navigate(user?.role === 'student' ? '/student/dashboard' : '/organizer/events');
        }, 1200);
      }
    } catch (err: any) {
      setAlertInfo({ type: 'error', message: err.response?.data?.message || 'Failed to update event.' });
    } finally {
      setSaving(false);
    }
  };

  const isStudentAndApproved = user?.role === 'student' && status === 'approved';

  if (initialLoading) {
    return (
      <div className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-page-enter">
        <div className="h-64 academic-card skeleton-shimmer" />
      </div>
    );
  }

  return (
    <div className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-page-enter">
      
      {/* Top Header */}
      <div>
        <Link
          to={user?.role === 'student' ? '/student/dashboard' : '/organizer/events'}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8B9BB4] hover:text-[#3B82F6] transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{user?.role === 'student' ? 'Back to Dashboard' : 'Back to My Events'}</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC]">
          Edit Event #{id}
        </h1>
        <p className="text-xs sm:text-sm text-[#8B9BB4] mt-1">
          {isStudentAndApproved
            ? 'This event is approved. Approved events cannot be edited directly; please contact an admin.'
            : 'Update event details, timing, venue capacity, and optional links.'}
        </p>
      </div>

      {alertInfo && <Alert type={alertInfo.type} message={alertInfo.message} />}

      {/* Centered Single-Column Form Card */}
      <div className="academic-card p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">
                Event Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input-base w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">
                Category *
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="input-base w-full cursor-pointer bg-[#0F1829] text-[#F8FAFC]"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#111A2E] text-[#F8FAFC]">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">
              Event Description *
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-[10px] border border-[#1F2D4A] bg-[#0F1829] p-3 text-sm text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6] focus:ring-[3px] focus:ring-[#3B82F6]/25 transition-all placeholder:text-[#64748B]"
            />
          </div>

          {/* Date & Time Section */}
          <div className="pt-2 border-t border-[#1F2D4A] space-y-4">
            {/* Date TBD Checkbox */}
            <div className="p-3.5 rounded-[10px] bg-[#0F1829] border border-[#1F2D4A] flex items-start gap-3">
              <input
                type="checkbox"
                id="editDateTbd"
                checked={dateTbd}
                onChange={(e) => setDateTbd(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-[#1F2D4A] bg-[#111A2E] text-[#3B82F6] focus:ring-[#3B82F6] cursor-pointer"
              />
              <label htmlFor="editDateTbd" className="cursor-pointer select-none">
                <span className="text-xs font-semibold text-[#F8FAFC] block">Date TBD (To Be Determined)</span>
                <span className="text-[11px] text-[#8B9BB4] block mt-0.5">
                  Check this if the event date and schedule are not yet finalized.
                </span>
              </label>
            </div>

            {!dateTbd ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      required={!dateTbd}
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="input-base w-full text-xs sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">
                      End Date <span className="text-[#8B9BB4] font-normal">(Optional for multi-day events)</span>
                    </label>
                    <input
                      type="date"
                      min={date || undefined}
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="input-base w-full text-xs sm:text-sm"
                    />
                    <p className="text-[11px] text-[#8B9BB4] mt-1">If empty, event ends on the start date</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">
                      Start Time *
                    </label>
                    <div className="relative">
                      <Clock className="w-4 h-4 text-[#8B9BB4] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        required={!dateTbd}
                        placeholder="e.g. 10:00 AM"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="input-base w-full pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">
                      End Time <span className="text-[#8B9BB4] font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <Clock className="w-4 h-4 text-[#8B9BB4] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="e.g. 04:00 PM (or leave empty)"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="input-base w-full pl-10"
                      />
                    </div>
                    <p className="text-[11px] text-[#8B9BB4] mt-1">Optional ("No end time" is allowed)</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-[10px] bg-[#16223B]/60 border border-[#1F2D4A] text-xs text-[#CBD5E1] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#A855F7]" />
                <span>Date and timing are marked as TBD.</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">
                Venue *
              </label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B9BB4] pointer-events-none" />
                <input
                  type="text"
                  required
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  className="input-base w-full pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">
                Maximum Seats <span className="text-[#8B9BB4] font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B9BB4] pointer-events-none" />
                <input
                  type="number"
                  min="1"
                  placeholder="Leave empty for unlimited seats"
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(e.target.value)}
                  className="input-base w-full pl-10"
                />
              </div>
              <p className="text-[11px] text-[#8B9BB4] mt-1">Leave empty for unlimited seats</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {!dateTbd ? (
              <div>
                <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">
                  Registration Deadline <span className="text-[#8B9BB4] font-normal">(Optional)</span>
                </label>
                <input
                  type="date"
                  value={registrationDeadline}
                  onChange={(e) => setRegistrationDeadline(e.target.value)}
                  className="input-base w-full text-xs sm:text-sm"
                />
                <p className="text-[11px] text-[#8B9BB4] mt-1">Registrations will close after this date if set</p>
              </div>
            ) : (
              <div />
            )}

            <div>
              <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">
                Event Status
              </label>
              {user?.role === 'admin' ? (
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="input-base w-full capitalize cursor-pointer bg-[#0F1829] text-[#F8FAFC]"
                >
                  <option value="approved" className="bg-[#111A2E] text-[#F8FAFC]">Approved / Live</option>
                  <option value="pending" className="bg-[#111A2E] text-[#F8FAFC]">Pending Approval</option>
                  <option value="rejected" className="bg-[#111A2E] text-[#F8FAFC]">Rejected</option>
                  <option value="cancelled" className="bg-[#111A2E] text-[#F8FAFC]">Cancelled</option>
                  <option value="completed" className="bg-[#111A2E] text-[#F8FAFC]">Completed</option>
                </select>
              ) : (
                <div className="p-2.5 rounded-[10px] bg-[#111A2E] border border-[#1F2D4A] space-y-1.5">
                  <div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                      status === 'approved'
                        ? 'bg-[#22C55E]/15 text-[#4ADE80] border-[#22C55E]/30'
                        : status === 'pending'
                        ? 'bg-[#F59E0B]/15 text-[#FBBF24] border-[#F59E0B]/30'
                        : status === 'rejected'
                        ? 'bg-[#EF4444]/15 text-[#F87171] border-[#EF4444]/30'
                        : status === 'cancelled'
                        ? 'bg-[#EF4444]/15 text-[#F87171] border-[#EF4444]/30'
                        : 'bg-[#16223B] text-[#CBD5E1] border-[#1F2D4A]'
                    }`}>
                      {status === 'pending'
                        ? 'Pending approval'
                        : status === 'approved'
                        ? 'Approved'
                        : status === 'rejected'
                        ? 'Rejected'
                        : status === 'cancelled'
                        ? 'Cancelled'
                        : status}
                    </span>
                  </div>
                  {status === 'rejected' && (
                    <p className="text-[11px] text-[#FBBF24] leading-relaxed">
                      Editing and saving this rejected event will automatically resubmit it to Campus Administration for review (status resets to Pending approval).
                    </p>
                  )}
                  {status === 'pending' && (
                    <p className="text-[11px] text-[#8B9BB4] leading-relaxed">
                      This event is currently awaiting approval from campus administration before appearing publicly.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Primary Banner Uploader */}
          <div className="pt-4 border-t border-[#1F2D4A]">
            <ImageUploadDropzone
              value={image}
              targetRatio="16:9"
              label="Primary Event Hero Banner (16:9 Widescreen)"
              helperText="Upload or replace the main event banner. Automatically compressed client-side."
              onChange={(dataUrl) => setImage(dataUrl)}
            />
          </div>

          {/* Event Form Link (Optional) */}
          <div className="pt-4 border-t border-[#1F2D4A] space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-[#CBD5E1] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#3B82F6]" />
                <span>Event Form Link (Optional)</span>
              </label>
              {googleFormUrl.trim() && (
                <a
                  href={googleFormUrl.trim()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#3B82F6] hover:text-[#60A5FA] underline"
                >
                  <span>Test Form Link</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <input
              type="url"
              placeholder="https://forms.gle/... or https://docs.google.com/forms/..."
              value={googleFormUrl}
              onChange={(e) => setGoogleFormUrl(e.target.value)}
              className="input-base w-full font-mono text-xs placeholder:font-sans"
            />

            <p className="text-xs text-[#8B9BB4] leading-relaxed">
              Add a Google Form link with more details about this event, such as the event form or an info sheet. Students will see it on the event page.
            </p>
          </div>

          {isStudentAndApproved && (
            <div className="p-3.5 bg-[#3B82F6]/10 border border-[#3B82F6]/25 rounded-[10px] text-xs text-[#93C5FD]">
              <strong>Approved Event:</strong> This event is approved and published. Approved events cannot be edited directly by students. Please contact a campus administrator to request updates.
            </div>
          )}

          <div className="pt-4 border-t border-[#1F2D4A] flex items-center justify-end gap-3">
            <Link
              to={user?.role === 'student' ? '/student/dashboard' : '/organizer/events'}
              className="btn-secondary"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving || isStudentAndApproved}
              className={`btn-primary ${isStudentAndApproved ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isStudentAndApproved
                ? 'Approved (Locked)'
                : saving
                ? 'Saving Changes...'
                : 'Save Event Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Embedded Event Media & Photo Gallery Manager */}
      {id && (
        <EventMediaManager
          eventId={id}
          eventTitle={title || 'Event'}
          onBannerUpdated={(newBannerUrl) => setImage(newBannerUrl)}
        />
      )}

    </div>
  );
};
