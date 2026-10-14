import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Alert } from '../../components/common/Alert';
import { Lock, Mail, Calendar, ArrowRight, Sparkles } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const from = (location.state as any)?.from?.pathname || null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');
      const res = await login(email, password);
      if (res.success && res.user) {
        if (from) {
          navigate(from, { replace: true });
        } else {
          if (res.user.role === 'admin') {
            navigate('/admin', { replace: true });
          } else if (res.user.role === 'organizer') {
            navigate('/organizer', { replace: true });
          } else {
            navigate('/student/dashboard', { replace: true });
          }
        }
      } else {
        setErrorMessage(res.message || 'Invalid credentials. Please verify your email and password.');
      }
    } catch {
      setErrorMessage('An unexpected error occurred. Please try again.');
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
            Sign In to CampusPulse
          </h1>
          <p className="text-xs sm:text-sm text-[#8B9BB4]">
            Access your event passes, organizer console, or administrative portal
          </p>
        </div>

        {/* Form Card */}
        <div className="academic-card p-6 sm:p-8 space-y-5">
          {errorMessage && <Alert type="error" message={errorMessage} onClose={() => setErrorMessage('')} />}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">
                College Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B9BB4] pointer-events-none" />
                <input
                  type="email"
                  required
                  placeholder="student@campus.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-base w-full pl-10"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#CBD5E1]">
                  Password
                </label>
              </div>
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
              {loading ? 'Authenticating...' : 'Sign In'}
              {!loading && <ArrowRight className="w-4 h-4 ml-1.5" />}
            </button>
          </form>
        </div>

        <div className="text-center text-xs text-[#8B9BB4]">
          Need an account?{' '}
          <Link to="/register" className="font-semibold text-[#3B82F6] hover:text-[#60A5FA] underline transition-colors">
            Register here
          </Link>
        </div>

      </div>
    </div>
  );
};
