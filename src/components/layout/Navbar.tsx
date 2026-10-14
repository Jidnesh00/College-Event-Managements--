import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminService, studentService } from '../../services/api';
import { NotificationDropdown } from '../common/NotificationDropdown';
import {
  Menu,
  X,
  LogOut,
  PlusCircle,
  Calendar,
  ChevronDown,
  User,
  Shield,
  Layers,
  Sparkles,
  Compass,
  Clock,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleCreateEventNav = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role === 'student') {
      try {
        const res = await studentService.getProfile();
        if (!res.profile?.is_complete) {
          navigate('/student/profile', {
            state: { message: 'Complete your profile to create events' },
          });
          return;
        }
      } catch {
        navigate('/student/profile', {
          state: { message: 'Complete your profile to create events' },
        });
        return;
      }
    }
    navigate('/organizer/events/new');
  };

  // Fetch pending events count for admin
  useEffect(() => {
    if (user?.role === 'admin') {
      adminService.getPendingCount().then((res) => {
        if (res.success) {
          setPendingCount(res.count);
        }
      }).catch(() => {});
    }
  }, [user, location.pathname]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
  };

  const getRoleBadgeStyle = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'bg-[#F59E0B]/15 text-[#FBBF24] border-[#F59E0B]/30';
      case 'organizer':
        return 'bg-[#3B82F6]/15 text-[#60A5FA] border-[#3B82F6]/30';
      default:
        return 'bg-[#22C55E]/15 text-[#4ADE80] border-[#22C55E]/30';
    }
  };

  const isLinkActive = (path: string, exact: boolean = false) => {
    if (exact) return location.pathname === path;
    return location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
  };

  const navLinkClass = (path: string, exact: boolean = false) => {
    const active = isLinkActive(path, exact);
    return `relative px-3.5 py-2 text-[13.5px] font-medium transition-colors ${
      active
        ? 'text-[#F8FAFC] font-semibold after:absolute after:bottom-0 after:left-3 after:right-3 after:h-[2px] after:bg-[#3B82F6] after:rounded-full after:shadow-[0_0_8px_rgba(59,130,246,0.5)]'
        : 'text-[#8B9BB4] hover:text-[#F8FAFC]'
    }`;
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0B1220]/80 backdrop-blur-md border-b border-[#1F2D4A]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Wordmark (Left) */}
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="text-base sm:text-lg font-bold tracking-tight text-[#F8FAFC] flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] rounded-lg group"
            >
              <div className="w-8 h-8 rounded-[9px] bg-gradient-to-br from-[#3B82F6] to-[#1D4ED8] group-hover:from-[#60A5FA] group-hover:to-[#2563EB] text-white flex items-center justify-center font-bold text-sm shadow-[0_0_16px_rgba(59,130,246,0.35)] transition-all">
                <Calendar className="w-4 h-4 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-[#F8FAFC] leading-tight flex items-center gap-1.5">
                  CampusPulse
                  <span className="hidden lg:inline-flex text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-[#3B82F6]/15 text-[#60A5FA] border border-[#3B82F6]/30">
                    College Events
                  </span>
                </span>
                <span className="text-[11px] font-medium text-[#8B9BB4] hidden sm:inline -mt-0.5">
                  Management System
                </span>
              </div>
            </Link>
          </div>

          {/* Center Navigation Links with active indicator */}
          <nav className="hidden md:flex items-center gap-1">
            <Link to="/" className={navLinkClass('/', true)}>
              Home
            </Link>

            <Link to="/events" className={navLinkClass('/events')}>
              Events
            </Link>

            {user?.role === 'student' && (
              <>
                <Link to="/student/dashboard" className={navLinkClass('/student/dashboard')}>
                  Dashboard
                </Link>
                <Link to="/student/registrations" className={navLinkClass('/student/registrations')}>
                  My Passes
                </Link>
                <Link to="/student/profile" className={navLinkClass('/student/profile')}>
                  My Profile
                </Link>
              </>
            )}

            {user?.role === 'organizer' && (
              <>
                <Link to="/organizer" className={navLinkClass('/organizer', true)}>
                  Dashboard
                </Link>
                <Link to="/organizer/events" className={navLinkClass('/organizer/events')}>
                  My Events
                </Link>
              </>
            )}

            {user?.role === 'admin' && (
              <>
                <Link to="/admin" className={navLinkClass('/admin', true)}>
                  Overview
                </Link>
                <Link to="/admin/approvals" className={navLinkClass('/admin/approvals')}>
                  <span>Approvals</span>
                  {pendingCount > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#F59E0B]/20 text-[#FBBF24] border border-[#F59E0B]/40 tabular-nums">
                      {pendingCount}
                    </span>
                  )}
                </Link>
                <Link to="/admin/events" className={navLinkClass('/admin/events')}>
                  Events
                </Link>
                <Link to="/admin/users" className={navLinkClass('/admin/users')}>
                  Users
                </Link>
                <Link to="/admin/reports" className={navLinkClass('/admin/reports')}>
                  Reports
                </Link>
              </>
            )}
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {/* Create Event Button */}
            <button
              onClick={handleCreateEventNav}
              className="btn-secondary text-xs h-9 px-3 gap-1.5 font-medium cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5 text-[#3B82F6]" />
              <span>Create Event</span>
            </button>

            {user ? (
              <div className="flex items-center gap-2">
                {/* Real-time Notification Bell */}
                <NotificationDropdown />

                {/* User Avatar with Dropdown */}
                <div className="relative pl-2 border-l border-[#1F2D4A]" ref={dropdownRef}>
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-[10px] hover:bg-[#16223B] transition-colors focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/50 border border-transparent hover:border-[#1F2D4A] cursor-pointer"
                    aria-expanded={userDropdownOpen}
                    aria-label="User account menu"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1E293B] to-[#0F172A] text-[#60A5FA] border border-[#2E4068] flex items-center justify-center text-xs font-bold shadow-sm">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-left text-xs leading-tight">
                      <div className="font-semibold text-[#F8FAFC] truncate max-w-[110px]">
                        {user.name}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full border capitalize ${getRoleBadgeStyle(user.role)}`}>
                          {user.role}
                        </span>
                      </div>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-[#8B9BB4]" />
                  </button>

                  {/* Elevated Dropdown Menu */}
                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-[14px] bg-[#16223B] border border-[#1F2D4A] shadow-[0_16px_36px_rgba(0,0,0,0.5)] py-1.5 z-50 text-xs animate-modal-in">
                      <div className="px-3.5 py-2.5 border-b border-[#1F2D4A]">
                        <div className="font-semibold text-[#F8FAFC] truncate">{user.name}</div>
                        <div className="text-[11px] text-[#8B9BB4] truncate">{user.email}</div>
                        <div className="mt-1.5">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wider ${getRoleBadgeStyle(user.role)}`}>
                            {user.role} Portal
                          </span>
                        </div>
                      </div>

                      <div className="py-1">
                        {user.role === 'student' && (
                          <>
                            <Link
                              to="/student/dashboard"
                              onClick={() => setUserDropdownOpen(false)}
                              className="flex items-center gap-2 px-3.5 py-2 text-[#CBD5E1] hover:bg-[#111A2E] hover:text-[#F8FAFC] transition-colors"
                            >
                              <Layers className="w-3.5 h-3.5 text-[#8B9BB4]" />
                              <span>Student Dashboard</span>
                            </Link>
                            <Link
                              to="/student/registrations"
                              onClick={() => setUserDropdownOpen(false)}
                              className="flex items-center gap-2 px-3.5 py-2 text-[#CBD5E1] hover:bg-[#111A2E] hover:text-[#F8FAFC] transition-colors"
                            >
                              <Calendar className="w-3.5 h-3.5 text-[#8B9BB4]" />
                              <span>My Ticket Passes</span>
                            </Link>
                            <Link
                              to="/student/events"
                              onClick={() => setUserDropdownOpen(false)}
                              className="flex items-center gap-2 px-3.5 py-2 text-[#CBD5E1] hover:bg-[#111A2E] hover:text-[#F8FAFC] transition-colors"
                            >
                              <PlusCircle className="w-3.5 h-3.5 text-[#8B9BB4]" />
                              <span>My Created Events</span>
                            </Link>
                            <Link
                              to="/student/profile"
                              onClick={() => setUserDropdownOpen(false)}
                              className="flex items-center gap-2 px-3.5 py-2 text-[#CBD5E1] hover:bg-[#111A2E] hover:text-[#F8FAFC] transition-colors"
                            >
                              <User className="w-3.5 h-3.5 text-[#8B9BB4]" />
                              <span>My Profile</span>
                            </Link>
                          </>
                        )}

                        {user.role === 'organizer' && (
                          <>
                            <Link
                              to="/organizer"
                              onClick={() => setUserDropdownOpen(false)}
                              className="flex items-center gap-2 px-3.5 py-2 text-[#CBD5E1] hover:bg-[#111A2E] hover:text-[#F8FAFC] transition-colors"
                            >
                              <Layers className="w-3.5 h-3.5 text-[#8B9BB4]" />
                              <span>Organizer Dashboard</span>
                            </Link>
                            <Link
                              to="/organizer/events"
                              onClick={() => setUserDropdownOpen(false)}
                              className="flex items-center gap-2 px-3.5 py-2 text-[#CBD5E1] hover:bg-[#111A2E] hover:text-[#F8FAFC] transition-colors"
                            >
                              <Calendar className="w-3.5 h-3.5 text-[#8B9BB4]" />
                              <span>My Managed Events</span>
                            </Link>
                            <Link
                              to="/organizer/events/new"
                              onClick={() => setUserDropdownOpen(false)}
                              className="flex items-center gap-2 px-3.5 py-2 text-[#3B82F6] hover:bg-[#111A2E] font-semibold transition-colors"
                            >
                              <PlusCircle className="w-3.5 h-3.5 text-[#3B82F6]" />
                              <span>Create New Event</span>
                            </Link>
                          </>
                        )}

                        {user.role === 'admin' && (
                          <>
                            <Link
                              to="/admin"
                              onClick={() => setUserDropdownOpen(false)}
                              className="flex items-center gap-2 px-3.5 py-2 text-[#CBD5E1] hover:bg-[#111A2E] hover:text-[#F8FAFC] transition-colors"
                            >
                              <Shield className="w-3.5 h-3.5 text-[#8B9BB4]" />
                              <span>Admin Console</span>
                            </Link>
                            <Link
                              to="/admin/approvals"
                              onClick={() => setUserDropdownOpen(false)}
                              className="flex items-center justify-between px-3.5 py-2 text-[#CBD5E1] hover:bg-[#111A2E] hover:text-[#F8FAFC] transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5 text-[#8B9BB4]" />
                                <span>Event Approvals</span>
                              </div>
                              {pendingCount > 0 && (
                                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#F59E0B]/20 text-[#FBBF24] border border-[#F59E0B]/40">
                                  {pendingCount}
                                </span>
                              )}
                            </Link>
                            <Link
                              to="/admin/events"
                              onClick={() => setUserDropdownOpen(false)}
                              className="flex items-center gap-2 px-3.5 py-2 text-[#CBD5E1] hover:bg-[#111A2E] hover:text-[#F8FAFC] transition-colors"
                            >
                              <Calendar className="w-3.5 h-3.5 text-[#8B9BB4]" />
                              <span>Manage Events</span>
                            </Link>
                            <Link
                              to="/admin/reports"
                              onClick={() => setUserDropdownOpen(false)}
                              className="flex items-center gap-2 px-3.5 py-2 text-[#CBD5E1] hover:bg-[#111A2E] hover:text-[#F8FAFC] transition-colors"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-[#8B9BB4]" />
                              <span>Reports & Analytics</span>
                            </Link>
                          </>
                        )}
                      </div>

                      <div className="pt-1 border-t border-[#1F2D4A]">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2 px-3.5 py-2 text-[#EF4444] hover:bg-[#111A2E] text-left transition-colors font-medium cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Log Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="btn-secondary text-xs h-9"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="btn-primary text-xs h-9"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-2">
            {user && <NotificationDropdown />}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-[#CBD5E1] hover:text-[#F8FAFC] rounded-lg hover:bg-[#16223B] transition-colors"
              aria-label="Toggle mobile navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#1F2D4A] bg-[#0B1220] px-4 pt-3 pb-6 space-y-3">
          <div className="flex flex-col space-y-1 text-sm font-medium text-[#CBD5E1]">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`py-2 px-3 rounded-lg transition-colors ${
                location.pathname === '/' ? 'bg-[#16223B] text-[#3B82F6] font-semibold' : 'hover:bg-[#16223B]'
              }`}
            >
              Home
            </Link>
            <Link
              to="/events"
              onClick={() => setMobileMenuOpen(false)}
              className={`py-2 px-3 rounded-lg transition-colors ${
                location.pathname.startsWith('/events') ? 'bg-[#16223B] text-[#3B82F6] font-semibold' : 'hover:bg-[#16223B]'
              }`}
            >
              Events
            </Link>

            {user?.role === 'student' && (
              <>
                <Link
                  to="/student/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`py-2 px-3 rounded-lg transition-colors ${
                    location.pathname === '/student/dashboard' ? 'bg-[#16223B] text-[#3B82F6] font-semibold' : 'hover:bg-[#16223B]'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/student/registrations"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`py-2 px-3 rounded-lg transition-colors ${
                    location.pathname === '/student/registrations' ? 'bg-[#16223B] text-[#3B82F6] font-semibold' : 'hover:bg-[#16223B]'
                  }`}
                >
                  My Passes
                </Link>
                <Link
                  to="/student/events"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 px-3 hover:bg-[#16223B] rounded-lg transition-colors"
                >
                  My Created Events
                </Link>
                <Link
                  to="/student/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`py-2 px-3 rounded-lg transition-colors ${
                    location.pathname === '/student/profile' ? 'bg-[#16223B] text-[#3B82F6] font-semibold' : 'hover:bg-[#16223B]'
                  }`}
                >
                  My Profile
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleCreateEventNav();
                  }}
                  className="py-2 px-3 text-left text-[#3B82F6] font-semibold hover:bg-[#16223B] rounded-lg transition-colors cursor-pointer"
                >
                  + Create Event
                </button>
              </>
            )}

            {user?.role === 'organizer' && (
              <>
                <Link
                  to="/organizer"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 px-3 hover:bg-[#16223B] rounded-lg transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  to="/organizer/events"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 px-3 hover:bg-[#16223B] rounded-lg transition-colors"
                >
                  My Events
                </Link>
                <Link
                  to="/organizer/events/new"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 px-3 text-[#3B82F6] font-semibold hover:bg-[#16223B] rounded-lg transition-colors"
                >
                  + Create Event
                </Link>
              </>
            )}

            {user?.role === 'admin' && (
              <>
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 px-3 hover:bg-[#16223B] rounded-lg transition-colors"
                >
                  Overview
                </Link>
                <Link
                  to="/admin/approvals"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 px-3 hover:bg-[#16223B] rounded-lg transition-colors flex items-center justify-between"
                >
                  <span>Event Approvals</span>
                  {pendingCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F59E0B]/20 text-[#FBBF24]">
                      {pendingCount}
                    </span>
                  )}
                </Link>
                <Link
                  to="/admin/events"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 px-3 hover:bg-[#16223B] rounded-lg transition-colors"
                >
                  Manage Events
                </Link>
                <Link
                  to="/admin/users"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 px-3 hover:bg-[#16223B] rounded-lg transition-colors"
                >
                  Manage Users
                </Link>
                <Link
                  to="/admin/reports"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 px-3 hover:bg-[#16223B] rounded-lg transition-colors"
                >
                  Reports
                </Link>
              </>
            )}
          </div>

          <div className="pt-3 border-t border-[#1F2D4A]">
            {user ? (
              <div className="flex items-center justify-between">
                <div className="text-xs">
                  <div className="font-semibold text-[#F8FAFC]">{user.name}</div>
                  <div className="text-[#8B9BB4] capitalize">{user.role} · {user.email}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-xs font-semibold text-[#EF4444] hover:underline px-2 py-1"
                >
                  Log Out
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 py-2 text-center text-xs font-semibold border border-[#1F2D4A] text-[#CBD5E1] rounded-lg hover:bg-[#16223B]"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 py-2 text-center text-xs font-semibold text-[#FFFFFF] bg-gradient-to-r from-[#3B82F6] to-[#2563EB] rounded-lg shadow-sm"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
