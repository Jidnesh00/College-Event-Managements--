import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { studentService } from '../../services/api';
import { StudentProfile } from '../../types';
import { Alert } from '../../components/common/Alert';
import {
  User,
  Mail,
  Phone,
  GraduationCap,
  Building,
  Hash,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
  Save,
  Lock,
  Calendar,
} from 'lucide-react';

export const StudentProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Personal section state
  const [name, setName] = useState('');
  const [age, setAge] = useState<string>('');
  const [gender, setGender] = useState<string>('');
  const [phone, setPhone] = useState('');

  // Academic section state
  const [collegeName, setCollegeName] = useState('');
  const [department, setDepartment] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState<string>('');
  const [rollNumber, setRollNumber] = useState('');

  // Account section state
  const email = user?.email || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alertInfo, setAlertInfo] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  // Check if routed here with a warning message (e.g. from Create Event attempt)
  useEffect(() => {
    const passedMessage = (location.state as any)?.message;
    const searchParams = new URLSearchParams(location.search);
    const queryPrompt = searchParams.get('message') || (searchParams.get('prompt') === 'create_event' ? 'Complete your profile to create events' : null);

    if (passedMessage) {
      setAlertInfo({ type: 'warning', message: passedMessage });
    } else if (queryPrompt) {
      setAlertInfo({ type: 'warning', message: queryPrompt });
    }
  }, [location]);

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        const res = await studentService.getProfile();
        if (res.success && res.profile) {
          const p = res.profile;
          setName(p.name || user?.name || '');
          setPhone(p.phone || user?.phone || '');
          setAge(p.age !== null && p.age !== undefined && p.age !== '' ? String(p.age) : '');
          setGender(p.gender || '');
          setCollegeName(p.college_name || '');
          setDepartment(p.department || '');
          setYearOfStudy(p.year_of_study || '');
          setRollNumber(p.roll_number || '');
        } else {
          setName(user?.name || '');
          setPhone(user?.phone || '');
        }
      } catch (err) {
        console.warn('Notice loading student profile:', err);
        setName(user?.name || '');
        setPhone(user?.phone || '');
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [user]);

  // Client-side phone validator
  const isValidPhone = (val: string): boolean => {
    if (!val || !val.trim()) return false;
    const digits = val.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) return false;
    return /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,16}$/.test(val.trim());
  };

  // Client-side age validator
  const isValidAgeNum = (val: string): boolean => {
    if (!val || val.trim() === '') return false;
    const num = Number(val);
    return !isNaN(num) && Number.isInteger(num) && num >= 15 && num <= 60;
  };

  // Dynamic completion calculation
  const checks = [
    Boolean(name.trim()),
    isValidAgeNum(age),
    Boolean(gender && ['Male', 'Female', 'Other', 'Prefer not to say'].includes(gender)),
    isValidPhone(phone),
    Boolean(collegeName.trim()),
    Boolean(department.trim()),
    Boolean(yearOfStudy && ['1st', '2nd', '3rd', '4th'].includes(yearOfStudy)),
    Boolean(rollNumber.trim()),
  ];

  const filledCount = checks.filter(Boolean).length;
  const completionPercentage = Math.round((filledCount / checks.length) * 100);
  const isComplete = filledCount === checks.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validate Personal section
    if (!name.trim()) {
      setAlertInfo({ type: 'error', message: 'Full name is required.' });
      return;
    }

    if (!isValidAgeNum(age)) {
      setAlertInfo({ type: 'error', message: 'Age is required and must be a number between 15 and 60.' });
      return;
    }

    if (!gender) {
      setAlertInfo({ type: 'error', message: 'Gender selection is required.' });
      return;
    }

    if (!isValidPhone(phone)) {
      setAlertInfo({
        type: 'error',
        message: 'Please provide a valid phone number (at least 7 to 15 digits).',
      });
      return;
    }

    // 2. Validate Academic section
    if (!collegeName.trim()) {
      setAlertInfo({ type: 'error', message: 'College name is required.' });
      return;
    }

    if (!department.trim()) {
      setAlertInfo({ type: 'error', message: 'Branch / Department is required.' });
      return;
    }

    if (!yearOfStudy) {
      setAlertInfo({ type: 'error', message: 'Year of study is required (1st, 2nd, 3rd, or 4th).' });
      return;
    }

    if (!rollNumber.trim()) {
      setAlertInfo({ type: 'error', message: 'Roll number / PRN is required.' });
      return;
    }

    try {
      setSaving(true);
      setAlertInfo(null);

      const payload: Partial<StudentProfile> = {
        name: name.trim(),
        age: Number(age),
        gender,
        phone: phone.trim(),
        college_name: collegeName.trim(),
        department: department.trim(),
        year_of_study: yearOfStudy as any,
        roll_number: rollNumber.trim(),
      };

      const res = await studentService.updateProfile(payload);
      if (res.success) {
        setAlertInfo({
          type: 'success',
          message: 'Profile saved successfully! Your profile is 100% complete and you can now create events.',
        });
        await refreshUser();
      }
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update profile. Please verify your inputs.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-page-enter">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#1F2D4A]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC]">
            My Profile
          </h1>
          <p className="text-xs sm:text-sm text-[#8B9BB4] mt-1">
            Complete your personal and academic information to unlock event creation privileges.
          </p>
        </div>

        {isComplete && (
          <Link
            to="/organizer/events/new"
            className="btn-primary text-xs self-start gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Event</span>
          </Link>
        )}
      </div>

      {alertInfo && <Alert type={alertInfo.type} message={alertInfo.message} />}

      {/* Profile Completion Indicator */}
      <div className="academic-card p-5 sm:p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-[10px] flex items-center justify-center font-bold text-sm ${
                isComplete
                  ? 'bg-[#22C55E]/15 text-[#4ADE80] border border-[#22C55E]/30'
                  : 'bg-[#F59E0B]/15 text-[#FBBF24] border border-[#F59E0B]/30'
              }`}
            >
              {isComplete ? (
                <CheckCircle2 className="w-5 h-5 text-[#4ADE80]" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-[#FBBF24]" />
              )}
            </div>
            <div>
              <div className="text-sm font-bold text-[#F8FAFC] flex items-center gap-2">
                <span>Profile {completionPercentage}% complete</span>
                {isComplete ? (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#22C55E]/15 text-[#4ADE80] border border-[#22C55E]/30">
                    Ready to Create Events
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F59E0B]/15 text-[#FBBF24] border border-[#F59E0B]/30">
                    Action Required
                  </span>
                )}
              </div>
              <p className="text-xs text-[#8B9BB4] mt-0.5">
                {isComplete
                  ? 'All required fields are complete. You can create college events for admin approval.'
                  : 'Complete all 8 required fields below to reach 100% and enable event creation.'}
              </p>
            </div>
          </div>

          <span className="text-base font-bold text-[#F8FAFC] tabular-nums hidden sm:inline">
            {completionPercentage}%
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#16223B] rounded-full h-2.5 overflow-hidden border border-[#1F2D4A]/50">
          <div
            className={`h-2.5 rounded-full transition-all duration-500 ease-out ${
              isComplete
                ? 'bg-gradient-to-r from-[#22C55E] to-[#4ADE80]'
                : completionPercentage >= 50
                ? 'bg-gradient-to-r from-[#3B82F6] to-[#60A5FA]'
                : 'bg-gradient-to-r from-[#F59E0B] to-[#FBBF24]'
            }`}
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      {/* Main Profile Form */}
      {loading ? (
        <div className="academic-card p-8 space-y-4">
          <div className="h-6 w-48 skeleton-shimmer rounded" />
          <div className="h-20 skeleton-shimmer rounded-[10px]" />
          <div className="h-20 skeleton-shimmer rounded-[10px]" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="academic-card p-6 sm:p-7 space-y-8">
          
          {/* SECTION 1: Personal */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[#1F2D4A]">
              <User className="w-4 h-4 text-[#3B82F6]" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#F8FAFC]">
                1. Personal Details
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">
                  Full Name <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sarah Connor"
                  required
                  className="input-base w-full text-xs"
                />
              </div>

              {/* Age */}
              <div>
                <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">
                  Age (15 - 60) <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  type="number"
                  min="15"
                  max="60"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 21"
                  required
                  className="input-base w-full text-xs tabular-nums"
                />
                {age && !isValidAgeNum(age) && (
                  <p className="text-[11px] text-[#F87171] mt-1">
                    Age must be an integer between 15 and 60.
                  </p>
                )}
              </div>

              {/* Gender */}
              <div>
                <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">
                  Gender <span className="text-[#EF4444]">*</span>
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  required
                  className="input-base w-full text-xs cursor-pointer"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">
                  Phone Number <span className="text-[#EF4444]">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8B9BB4]" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +1-555-0177 or 9876543210"
                    required
                    className="input-base w-full pl-9 text-xs"
                  />
                </div>
                {phone && !isValidPhone(phone) && (
                  <p className="text-[11px] text-[#F87171] mt-1">
                    Please enter a valid phone number (7-15 digits).
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 2: Academic */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[#1F2D4A]">
              <GraduationCap className="w-4 h-4 text-[#3B82F6]" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#F8FAFC]">
                2. Academic Details
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* College Name */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">
                  College Name <span className="text-[#EF4444]">*</span>
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8B9BB4]" />
                  <input
                    type="text"
                    value={collegeName}
                    onChange={(e) => setCollegeName(e.target.value)}
                    placeholder="e.g. University School of Engineering & Technology"
                    required
                    className="input-base w-full pl-9 text-xs"
                  />
                </div>
              </div>

              {/* Branch / Department */}
              <div>
                <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">
                  Branch / Department <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Computer Science & Engineering"
                  required
                  className="input-base w-full text-xs"
                />
              </div>

              {/* Year of Study */}
              <div>
                <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">
                  Year of Study <span className="text-[#EF4444]">*</span>
                </label>
                <select
                  value={yearOfStudy}
                  onChange={(e) => setYearOfStudy(e.target.value)}
                  required
                  className="input-base w-full text-xs cursor-pointer"
                >
                  <option value="">Select Year of Study</option>
                  <option value="1st">1st Year</option>
                  <option value="2nd">2nd Year</option>
                  <option value="3rd">3rd Year</option>
                  <option value="4th">4th Year</option>
                </select>
              </div>

              {/* Roll Number / PRN */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">
                  Roll Number / PRN <span className="text-[#EF4444]">*</span>
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8B9BB4]" />
                  <input
                    type="text"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    placeholder="e.g. CS2023-4589 or PRN982341"
                    required
                    className="input-base w-full pl-9 text-xs uppercase"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: Account */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[#1F2D4A]">
              <Mail className="w-4 h-4 text-[#3B82F6]" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#F8FAFC]">
                3. Account
              </h2>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">
                Email Address (read-only)
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8B9BB4]" />
                <input
                  type="email"
                  value={email}
                  disabled
                  readOnly
                  className="input-base w-full pl-9 pr-9 text-xs opacity-75 bg-[#16223B]/60 cursor-not-allowed select-none text-[#CBD5E1]"
                />
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8B9BB4]" />
              </div>
              <p className="text-[11px] text-[#8B9BB4] mt-1">
                Your email is tied to your student account login and cannot be modified.
              </p>
            </div>
          </div>

          {/* Submit Action Bar */}
          <div className="pt-4 border-t border-[#1F2D4A] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-[#8B9BB4]">
              {isComplete ? (
                <span className="text-[#4ADE80] font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Profile complete · Event creation enabled
                </span>
              ) : (
                <span>
                  Filled {filledCount} of 8 fields ({completionPercentage}% complete)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary w-full sm:w-auto text-xs px-5 h-9"
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                <span>{saving ? 'Saving Profile...' : 'Save Profile'}</span>
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
