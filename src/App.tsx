/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { NotificationToastContainer } from './components/common/NotificationToastContainer';
import { ProtectedRoute } from './components/routes/ProtectedRoute';

// Public Pages
import { HomePage } from './pages/public/HomePage';
import { EventsPage } from './pages/public/EventsPage';
import { EventDetailPage } from './pages/public/EventDetailPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';

// Student Pages
import { StudentDashboard } from './pages/student/StudentDashboard';
import { MyRegistrationsPage } from './pages/student/MyRegistrationsPage';
import { StudentProfilePage } from './pages/student/StudentProfilePage';

// Organizer Pages
import { OrganizerDashboard } from './pages/organizer/OrganizerDashboard';
import { ManageMyEventsPage } from './pages/organizer/ManageMyEventsPage';
import { CreateEventPage } from './pages/organizer/CreateEventPage';
import { EditEventPage } from './pages/organizer/EditEventPage';
import { EventParticipantsPage } from './pages/organizer/EventParticipantsPage';
import { QRScannerPage } from './pages/organizer/QRScannerPage';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { ManageUsersPage } from './pages/admin/ManageUsersPage';
import { ManageEventsPage } from './pages/admin/ManageEventsPage';
import { EventApprovalsPage } from './pages/admin/EventApprovalsPage';
import { ManageRegistrationsPage } from './pages/admin/ManageRegistrationsPage';
import { ManageCategoriesPage } from './pages/admin/ManageCategoriesPage';
import { AdminReportsPage } from './pages/admin/AdminReportsPage';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <div className="min-h-screen flex flex-col bg-[#0B1220] text-[#CBD5E1] font-sans antialiased selection:bg-[#3B82F6] selection:text-white transition-colors duration-200">
              <NotificationToastContainer />
              <Navbar />
              
              <main className="flex-1">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/events/:id" element={<EventDetailPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Student Protected Routes */}
              <Route
                path="/student/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <StudentDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/registrations"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <MyRegistrationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/profile"
                element={
                  <ProtectedRoute allowedRoles={['student', 'organizer', 'admin']}>
                    <StudentProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/events"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <StudentDashboard defaultTab="created" />
                  </ProtectedRoute>
                }
              />

              {/* Organizer Protected Routes */}
              <Route
                path="/organizer"
                element={
                  <ProtectedRoute allowedRoles={['organizer', 'admin']}>
                    <OrganizerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/organizer/events"
                element={
                  <ProtectedRoute allowedRoles={['organizer', 'admin']}>
                    <ManageMyEventsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/organizer/events/new"
                element={
                  <ProtectedRoute allowedRoles={['student', 'organizer', 'admin']}>
                    <CreateEventPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/organizer/events/:id/edit"
                element={
                  <ProtectedRoute allowedRoles={['student', 'organizer', 'admin']}>
                    <EditEventPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/organizer/events/:id/participants"
                element={
                  <ProtectedRoute allowedRoles={['organizer', 'admin']}>
                    <EventParticipantsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/organizer/events/:id/scanner"
                element={
                  <ProtectedRoute allowedRoles={['organizer', 'admin']}>
                    <QRScannerPage />
                  </ProtectedRoute>
                }
              />

              {/* Admin Protected Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <ManageUsersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/events"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <ManageEventsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/approvals"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <EventApprovalsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/registrations"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <ManageRegistrationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/categories"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <ManageCategoriesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/reports"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminReportsPage />
                  </ProtectedRoute>
                }
              />

              {/* Fallback to Home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

            <Footer />
            </div>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
