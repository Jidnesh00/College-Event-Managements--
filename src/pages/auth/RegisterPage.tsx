import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Alert } from '../../components/common/Alert';
import { User, Mail, Lock, Phone, Key, Calendar, ArrowRight } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'student' | 'organizer' | 'admin'>('student');
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setErrorMessage('Full name is required.');
      return;
    }
    if (!email.includes('@') || !email.includes('.')) {
      setErrorMessage('Please provide a valid college email address.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    if (role === 'organizer' && !accessCode.trim()) {
      setErrorMessage('Organizer Authorization Code is required.');
      return;
    }

    if (role === 'admin' && !accessCode.trim()) {
      setErrorMessage('Dean / Admin Security Passcode is required.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');
      const res = await register({
        name: name.trim(),
        email: email.trim(),
        password,
        phone: phone.trim(),
        role,
        accessCode: accessCode.trim(),
      });

      if (res.success) {
        if (role === 'admin') {
          navigate('/admin');
        } else if (role === 'organizer') {
          navigate('/organizer');
        } else {
          navigate('/student/dashboard');
        }
      } else {
        setErrorMessage(res.message || 'Registration failed.');
      }
    } catch {
      setErrorMessage('An unexpected error occurred during account creation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 animate-page-enter">
      <div className="w-full max-w-md space-y-6">
        
        {/* Header with Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-[14px] bg-[#3B82F6]/15 text-[#60A5FA] border border-[#3B82F6]/30 shadow-sm mb-1">
            <Calendar className="w-6 h-6 text-[#3B82F6]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC]">
            Create an Account
          </h1>
          <p className="text-xs sm:text-sm text-[#8B9BB4]">
            Join CampusPulse to discover, host, or administer college events
          </p>
        </div>

        {/* Form Card */}
        <div className="academic-card p-6 sm:p-8 space-y-5">
          {errorMessage && <Alert type="error" message={errorMessage} onClose={() => setErrorMessage('')} />}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Account Role Selector */}
            <div>
              <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">
                Account Role
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('student')}
                  className={`h-9 text-xs font-semibold rounded-[8px] border text-center transition-colors cursor-pointer ${
                    role === 'student'
                      ? 'border-[#3B82F6] bg-[#3B82F6]/15 text-[#60A5FA]'
                      : 'border-[#1F2D4A] bg-[#0F1829] text-[#8B9BB4] hover:text-[#CBD5E1]'
                  }`}
                >
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setRole('organizer')}
                  className={`h-9 text-xs font-semibold rounded-[8px] border text-center transition-colors cursor-pointer ${
                    role === 'organizer'
                      ? 'border-[#3B82F6] bg-[#3B82F6]/15 text-[#60A5FA]'
                      : 'border-[#1F2D4A] bg-[#0F1829] text-[#8B9BB4] hover:text-[#CBD5E1]'
                  }`}
                >
                  Organizer
                </button>
                <button
                  type="button"
                  onClick={() => setRole('admin')}
                  className={`h-9 text-xs font-semibold rounded-[8px] border text-center transition-colors cursor-pointer ${
                    role === 'admin'
                      ? 'border-[#3B82F6] bg-[#3B82F6]/15 text-[#60A5FA]'
                      : 'border-[#1F2D4A] bg-[#0F1829] text-[#8B9BB4] hover:text-[#CBD5E1]'
                  }`}
                >
                  Admin
                </button>
              </div>
              <p className="text-[11px] text-[#8B9BB4] mt-1.5">
                {role === 'student' && 'Register for campus events and receive verified digital passes.'}
                {role === 'organizer' && 'Publish events, manage attendee rosters, and scan venue QR passes.'}
                {role === 'admin' && 'College event governance, approvals, and report analytics.'}
              </p>
            </div>

            {/* Role Authorization Code Section */}
            {role !== 'student' && (
              <div className="p-3.5 bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-[10px] space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#FBBF24]">
                  <Key className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <span>
                    {role === 'admin' ? 'Dean Security Passcode' : 'Department Authorization Code'}
                  </span>
                </div>
                <div className="relative">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#F59E0B] pointer-events-none" />
                  <input
                    type="password"
                    required
                    placeholder={role === 'admin' ? 'Enter Dean passcode' : 'Enter department authorization code'}
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    className="input-base w-full pl-10 border-[#F59E0B]/40 focus:border-[#F59E0B] focus:ring-[#F59E0B]/20"
                  />
                </div>
              </div>
            )}

            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B9BB4] pointer-events-none" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Jordan Rivera"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-base w-full pl-10"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">
                College Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B9BB4] pointer-events-none" />
                <input
                  type="email"
                  required
                  placeholder="jordan@campus.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-base w-full pl-10"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">
                Phone Number (Optional)
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B9BB4] pointer-events-none" />
                <input
                  type="tel"
                  placeholder="+1 (555) 0123"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input-base w-full pl-10"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">
                Password (min. 6 characters)
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B9BB4] pointer-events-none" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-base w-full pl-10"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2 h-10 text-xs font-semibold justify-center"
            >
              {loading ? 'Creating Account...' : 'Complete Registration'}
              {!loading && <ArrowRight className="w-4 h-4 ml-1.5" />}
            </button>
          </form>

          <div className="pt-3 border-t border-[#1F2D4A] text-center text-xs text-[#8B9BB4]">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-[#3B82F6] hover:text-[#60A5FA] underline transition-colors">
              Sign in
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};
