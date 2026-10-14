import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { categoryService, eventService, studentService } from '../../services/api';
import { Category } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Alert } from '../../components/common/Alert';
import { ImageUploadDropzone } from '../../components/common/ImageUploadDropzone';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  FileText,
  ExternalLink,
  HelpCircle,
} from 'lucide-react';

export const CreateEventPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');

  // Date & Time
  const [dateTbd, setDateTbd] = useState(false);
  const [date, setDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('09:00 AM');
  const [endTime, setEndTime] = useState('04:00 PM');

  // Logistics
  const [venue, setVenue] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('60');
  const [registrationDeadline, setRegistrationDeadline] = useState('');
  const [image, setImage] = useState('');
  const [googleFormUrl, setGoogleFormUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [alertInfo, setAlertInfo] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    async function checkStudentProfile() {
      if (user?.role === 'student') {
        try {
          const res = await studentService.getProfile();
          if (!res.profile?.is_complete) {
            navigate('/student/profile', {
              state: { message: 'Complete your profile to create events' },
            });
          }
        } catch (e) {
          console.warn('Student profile check failed', e);
        }
      }
    }
    checkStudentProfile();
  }, [user, navigate]);

  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await categoryService.getAll();
        if (res.success && res.categories.length > 0) {
          setCategories(res.categories);
          setCategoryId(String(res.categories[0].id));
        }
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    }
    loadCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim() || !venue.trim() || !categoryId) {
      setAlertInfo({ type: 'error', message: 'Please complete all required fields.' });
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
      setLoading(true);
      setAlertInfo(null);

      const res = await eventService.create({
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
        image: image.trim() || '',
        google_form_url: googleFormUrl.trim() || null,
        status: 'pending',
      });

      if (res.success) {
        if (image.trim() && res.event?.id) {
          eventService.uploadMedia(res.event.id, {
            media_type: 'banner',
            image_url: image.trim(),
            caption: `${title.trim()} Hero Banner`,
            aspect_ratio: '16:9',
            set_as_banner: true,
          }).catch((e) => console.warn('[Banner Media Save Error]:', e));
        }

        setAlertInfo({ type: 'success', message: 'Event submitted successfully and is awaiting admin approval.' });
        setTimeout(() => {
          navigate(user?.role === 'student' ? '/student/dashboard' : '/organizer/events');
        }, 1200);
      }
    } catch (err: any) {
      setAlertInfo({ type: 'error', message: err.response?.data?.message || 'Failed to create event.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-page-enter">
      
      {/* Header with back button */}
      <div>
        <Link
          to={user?.role === 'student' ? '/student/dashboard' : '/organizer/events'}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8B9BB4] hover:text-[#3B82F6] transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{user?.role === 'student' ? 'Back to Dashboard' : 'Back to My Events'}</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC]">
          Create Event
        </h1>
        <p className="text-xs sm:text-sm text-[#8B9BB4] mt-1">
          Set up basic info, schedule, venue capacity, banner image, and optional Google Form details.
        </p>
      </div>

      {alertInfo && <Alert type={alertInfo.type} message={alertInfo.message} />}

      {/* Single-Column Form Card */}
      <div className="academic-card p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-7">
          
          {/* Section 1: Basic Info */}
          <div className="space-y-4">
            <div className="pb-2 border-b border-[#1F2D4A] flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#F8FAFC] flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#3B82F6]/15 text-[#3B82F6] flex items-center justify-center text-[11px] font-bold">1</span>
                Basic Information
              </h2>
              <span className="text-xs text-[#8B9BB4]">Required</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">
                Event Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Annual Hackathon 2026 or Spring Career Fair"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input-base w-full"
              />
              <p className="text-xs text-[#8B9BB4] mt-1">A descriptive and clear title for attendees</p>
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
              <p className="text-xs text-[#8B9BB4] mt-1">Helps students discover this event in category filters</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">
                Description & Agenda *
              </label>
              <textarea
                required
                rows={4}
                placeholder="Provide event overview, schedule highlights, eligibility, and what participants should bring..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-[10px] border border-[#1F2D4A] bg-[#0F1829] p-3 text-sm text-[#F8FAFC] focus:outline-none focus:border-[#3B82F6] focus:ring-[3px] focus:ring-[#3B82F6]/25 transition-all placeholder:text-[#64748B]"
              />
            </div>
          </div>

          {/* Section 2: Date & Time */}
          <div className="space-y-4 pt-2 border-t border-[#1F2D4A]">
            <div className="pb-2 border-b border-[#1F2D4A] flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#F8FAFC] flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#3B82F6]/15 text-[#3B82F6] flex items-center justify-center text-[11px] font-bold">2</span>
                Date & Time
              </h2>
              <span className="text-xs text-[#8B9BB4]">Schedule</span>
            </div>

            {/* Date TBD Checkbox */}
            <div className="p-3.5 rounded-[10px] bg-[#0F1829] border border-[#1F2D4A] flex items-start gap-3">
              <input
                type="checkbox"
                id="createDateTbd"
                checked={dateTbd}
                onChange={(e) => setDateTbd(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-[#1F2D4A] bg-[#111A2E] text-[#3B82F6] focus:ring-[#3B82F6] cursor-pointer"
              />
              <label htmlFor="createDateTbd" className="cursor-pointer select-none">
                <span className="text-xs font-semibold text-[#F8FAFC] block">Date TBD (To Be Determined)</span>
                <span className="text-[11px] text-[#8B9BB4] block mt-0.5">
                  Check this if event dates are not finalized yet. It will appear with a "Date TBD" badge.
                </span>
              </label>
            </div>

            {/* Date & Time Inputs (Hidden when TBD) */}
            {!dateTbd ? (
              <div className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      required={!dateTbd}
                      value={date}
                      onChange={(e) => {
                        setDate(e.target.value);
                        if (!registrationDeadline) setRegistrationDeadline(e.target.value);
                      }}
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">
                      Start Time *
                    </label>
                    <div className="relative">
                      <Clock className="w-4 h-4 text-[#8B9BB4] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        required={!dateTbd}
                        placeholder="09:00 AM"
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
                        placeholder="e.g., 04:30 PM (or leave empty)"
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
                <span>Date and timing are marked as TBD. You can add specific dates later.</span>
              </div>
            )}
          </div>

          {/* Section 3: Venue & Seats */}
          <div className="space-y-4 pt-2 border-t border-[#1F2D4A]">
            <div className="pb-2 border-b border-[#1F2D4A] flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#F8FAFC] flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#3B82F6]/15 text-[#3B82F6] flex items-center justify-center text-[11px] font-bold">3</span>
                Venue & Seats
              </h2>
              <span className="text-xs text-[#8B9BB4]">Logistics</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">
                  Location / Venue *
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B9BB4] pointer-events-none" />
                  <input
                    type="text"
                    required
                    placeholder="e.g., Auditorium Hall B or Tech Lab 3"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    className="input-base w-full pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">
                  Total Seats / Max Capacity <span className="text-[#8B9BB4] font-normal">(Optional)</span>
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

            {!dateTbd && (
              <div>
                <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">
                  Registration Deadline <span className="text-[#8B9BB4] font-normal">(Optional)</span>
                </label>
                <div className="relative max-w-sm">
                  <Calendar className="w-4 h-4 text-[#8B9BB4] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="date"
                    value={registrationDeadline}
                    onChange={(e) => setRegistrationDeadline(e.target.value)}
                    className="input-base w-full pl-10 text-xs sm:text-sm"
                  />
                </div>
                <p className="text-xs text-[#8B9BB4] mt-1">Optional. Registrations will close after this date if set</p>
              </div>
            )}
          </div>

          {/* Section 4: Image */}
          <div className="space-y-4 pt-2 border-t border-[#1F2D4A]">
            <div className="pb-2 border-b border-[#1F2D4A] flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#F8FAFC] flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#3B82F6]/15 text-[#3B82F6] flex items-center justify-center text-[11px] font-bold">4</span>
                Image
              </h2>
              <span className="text-xs text-[#8B9BB4]">Banner Art</span>
            </div>

            <ImageUploadDropzone
              value={image}
              onChange={setImage}
              helperText="Upload a crisp event banner image. Will be compressed cleanly for ultra-fast loading."
            />
          </div>

          {/* Section 5: Event Form Link */}
          <div className="space-y-4 pt-2 border-t border-[#1F2D4A]">
            <div className="pb-2 border-b border-[#1F2D4A] flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#F8FAFC] flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#3B82F6]/15 text-[#3B82F6] flex items-center justify-center text-[11px] font-bold">5</span>
                Event Form Link
              </h2>
              <span className="text-xs text-[#8B9BB4]">Optional Info</span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-[#CBD5E1]">
                  Event Form Link (Optional)
                </label>
                {googleFormUrl && (
                  <a
                    href={googleFormUrl}
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
              <p className="text-xs text-[#8B9BB4] mt-1.5 leading-relaxed">
                Add a Google Form link with more details about this event, such as the event form or an info sheet. Students will see it on the event page.
              </p>
            </div>
          </div>

          {/* Submit Action Buttons */}
          <div className="pt-4 border-t border-[#1F2D4A] flex items-center justify-end gap-3">
            <Link
              to="/organizer/events"
              className="btn-secondary"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Creating Event...' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
