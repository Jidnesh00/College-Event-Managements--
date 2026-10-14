import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-[#1F2D4A] bg-[#0B1220] text-[#7C8BA8] text-xs">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Brand & Purpose */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-[#F1F5F9] font-bold text-sm">
              <div className="w-6 h-6 rounded-[6px] bg-[#3B82F6] text-white flex items-center justify-center font-bold text-xs shadow-[0_0_10px_rgba(59,130,246,0.3)]">
                <Calendar className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-bold tracking-tight">CampusPulse</span>
            </div>
            <p className="text-[#7C8BA8] leading-relaxed text-xs">
              College event management platform facilitating student registrations, organizer coordination, and verified venue check-in.
            </p>
            <div className="pt-1 text-[11px] text-[#7C8BA8]/70">
              Department of Computer Science & Engineering
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-2">
            <div className="font-semibold text-[#F1F5F9] uppercase tracking-wider text-[11px]">
              Navigation
            </div>
            <ul className="space-y-1.5">
              <li>
                <Link to="/" className="text-[#CBD5E1] hover:text-[#3B82F6] transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/events" className="text-[#CBD5E1] hover:text-[#3B82F6] transition-colors">
                  Campus Events
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-[#CBD5E1] hover:text-[#3B82F6] transition-colors">
                  Sign In
                </Link>
              </li>
              <li>
                <Link to="/register" className="text-[#CBD5E1] hover:text-[#3B82F6] transition-colors">
                  Register Account
                </Link>
              </li>
            </ul>
          </div>

          {/* Portals */}
          <div className="space-y-2">
            <div className="font-semibold text-[#F1F5F9] uppercase tracking-wider text-[11px]">
              Portals
            </div>
            <ul className="space-y-1.5">
              <li>
                <Link to="/student/dashboard" className="text-[#CBD5E1] hover:text-[#3B82F6] transition-colors">
                  Student Dashboard
                </Link>
              </li>
              <li>
                <Link to="/organizer" className="text-[#CBD5E1] hover:text-[#3B82F6] transition-colors">
                  Organizer Console
                </Link>
              </li>
              <li>
                <Link to="/admin" className="text-[#CBD5E1] hover:text-[#3B82F6] transition-colors">
                  Admin Overview
                </Link>
              </li>
              <li>
                <Link to="/organizer/events/new" className="text-[#CBD5E1] hover:text-[#3B82F6] transition-colors">
                  Publish Event
                </Link>
              </li>
            </ul>
          </div>

          {/* Academic Info */}
          <div className="space-y-2">
            <div className="font-semibold text-[#F1F5F9] uppercase tracking-wider text-[11px]">
              About Project
            </div>
            <p className="text-xs text-[#7C8BA8] leading-relaxed">
              Designed as a modern, unified event solution for university student activities, technical symposiums, and cultural festivals.
            </p>
            <div className="pt-2 text-[11px] text-[#22D3EE] font-medium">
              Verified Digital QR Passes
            </div>
          </div>

        </div>

        {/* Bottom copyright row */}
        <div className="mt-8 pt-6 border-t border-[#1F2D4A] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#7C8BA8]">
          <div>
            &copy; {new Date().getFullYear()} CampusPulse · College Event Management System
          </div>
          <div>
            Academic Project · All rights reserved
          </div>
        </div>
      </div>
    </footer>
  );
};
