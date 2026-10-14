import axios from 'axios';
import {
  CollegeEvent,
  Category,
  Registration,
  DashboardStats,
  User,
  EventStatus,
  AttendanceStatus,
  NotificationItem,
  NotificationType,
  EventMedia,
  StudentProfile,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically inject JWT Bearer Token if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Standard API response unwrap
export const authService = {
  login: async (credentials: { email: string; password: string }) => {
    const res = await api.post('/auth/login', credentials);
    return res.data;
  },
  register: async (userData: { name: string; email: string; password: string; role?: string; phone?: string; accessCode?: string }) => {
    const res = await api.post('/auth/register', userData);
    return res.data;
  },
  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },
  updateProfile: async (data: { name: string; phone?: string; currentPassword?: string; newPassword?: string }) => {
    const res = await api.put('/auth/profile', data);
    return res.data;
  },
};

export const studentService = {
  getProfile: async () => {
    const res = await api.get<{ success: boolean; profile: StudentProfile }>('/student/profile');
    return res.data;
  },
  updateProfile: async (data: Partial<StudentProfile>) => {
    const res = await api.put<{ success: boolean; message: string; profile: StudentProfile }>('/student/profile', data);
    return res.data;
  },
};

export const eventService = {
  getAll: async (params?: {
    q?: string;
    category?: string | number;
    date?: string;
    status?: string;
    sort?: 'asc' | 'desc';
    organizer_id?: number;
    upcoming_only?: boolean;
  }) => {
    const res = await api.get<{ success: boolean; count: number; events: CollegeEvent[] }>('/events', { params });
    return res.data;
  },
  getById: async (id: number | string) => {
    const res = await api.get<{ success: boolean; event: CollegeEvent }>(`/events/${id}`);
    return res.data;
  },
  create: async (eventData: Partial<CollegeEvent>) => {
    const res = await api.post<{ success: boolean; message: string; event: CollegeEvent }>('/events', eventData);
    return res.data;
  },
  update: async (id: number | string, eventData: Partial<CollegeEvent>) => {
    const res = await api.put<{ success: boolean; message: string; event: CollegeEvent }>(`/events/${id}`, eventData);
    return res.data;
  },
  delete: async (id: number | string) => {
    const res = await api.delete<{ success: boolean; message: string }>(`/events/${id}`);
    return res.data;
  },
  getParticipants: async (id: number | string) => {
    const res = await api.get<{
      success: boolean;
      event: {
        id: number;
        title: string;
        date: string;
        venue: string;
        max_participants: number;
        google_form_url?: string | null;
      };
      stats: {
        total: number;
        confirmed: number;
        present: number;
        absent: number;
        unmarked: number;
        formSubmitted?: number;
      };
      participants: Array<{
        registration_id: number;
        registration_date: string;
        registration_status: string;
        attendance_status: AttendanceStatus;
        google_form_completed?: number | boolean;
        student_id: number;
        student_name: string;
        student_email: string;
        student_phone: string;
      }>;
    }>(`/events/${id}/participants`);
    return res.data;
  },
  updateAttendance: async (eventId: number | string, registrationId: number | string, attendance_status: AttendanceStatus) => {
    const res = await api.patch<{ success: boolean; message: string }>(`/events/${eventId}/attendance/${registrationId}`, { attendance_status });
    return res.data;
  },
  verifyTicket: async (eventId: number | string, data: { qr_data?: string; registration_id?: number | string }) => {
    const res = await api.post<{
      success: boolean;
      isMatchingEvent: boolean;
      ticket: {
        registration_id: number;
        registration_date: string;
        registration_status: string;
        attendance_status: AttendanceStatus;
        student_id: number;
        student_name: string;
        student_email: string;
        student_phone: string;
        event_id: number;
        event_title: string;
        event_date: string;
        event_venue: string;
        start_time: string;
        end_time: string;
        category_name: string;
      };
      message: string;
    }>(`/events/${eventId}/verify-ticket`, data);
    return res.data;
  },
  confirmCheckIn: async (eventId: number | string, registrationId: number | string) => {
    const res = await api.post<{
      success: boolean;
      message: string;
      registrationId: number;
      student_name: string;
      attendance_status: AttendanceStatus;
    }>(`/events/${eventId}/checkin/${registrationId}`);
    return res.data;
  },
  getOrganizerAnalytics: async () => {
    const res = await api.get<{
      success: boolean;
      analytics: {
        summary: {
          totalEvents: number;
          totalCapacity: number;
          totalRegistered: number;
          totalAttended: number;
          overallFillRate: number;
          turnoutRate: number;
        };
        dailyTrend: Array<{ date: string; registrations: number }>;
        eventComparison: Array<{
          id: number;
          title: string;
          shortTitle: string;
          date: string;
          capacity: number;
          registered: number;
          attended: number;
          category_name: string;
          fillRate: number;
        }>;
        categoryDistribution: Array<{
          category: string;
          total_registrations: number;
          event_count: number;
        }>;
        attendanceBreakdown: Array<{
          attendance_status: string;
          count: number;
        }>;
      };
    }>('/events/organizer/analytics');
    return res.data;
  },
  getMedia: async (eventId: number | string) => {
    const res = await api.get<{
      success: boolean;
      count: number;
      banner: EventMedia | null;
      gallery: EventMedia[];
      media: EventMedia[];
    }>(`/events/${eventId}/media`);
    return res.data;
  },
  uploadMedia: async (eventId: number | string, data: {
    media_type?: 'banner' | 'gallery';
    image_url: string;
    caption?: string;
    aspect_ratio?: string;
    file_size?: number;
    width?: number;
    height?: number;
    set_as_banner?: boolean;
  }) => {
    const res = await api.post<{
      success: boolean;
      message: string;
      media: EventMedia;
    }>(`/events/${eventId}/media`, data);
    return res.data;
  },
  deleteMedia: async (eventId: number | string, mediaId: number | string) => {
    const res = await api.delete<{ success: boolean; message: string }>(`/events/${eventId}/media/${mediaId}`);
    return res.data;
  },
  setBanner: async (eventId: number | string, mediaId: number | string) => {
    const res = await api.patch<{ success: boolean; message: string; bannerUrl: string }>(`/events/${eventId}/media/${mediaId}/banner`);
    return res.data;
  },
};

export const registrationService = {
  register: async (event_id: number) => {
    const res = await api.post<{
      success: boolean;
      message: string;
      registrationId: number;
      google_form_url?: string | null;
      event_title?: string;
    }>('/registrations', { event_id });
    return res.data;
  },
  getMyRegistrations: async () => {
    const res = await api.get<{ success: boolean; count: number; registrations: Registration[] }>('/registrations/my');
    return res.data;
  },
  cancel: async (registrationId: number | string) => {
    const res = await api.delete<{ success: boolean; message: string }>(`/registrations/${registrationId}`);
    return res.data;
  },
  updateFormStatus: async (registrationId: number | string, completed: boolean) => {
    const res = await api.patch<{
      success: boolean;
      message: string;
      completed: boolean;
      registrationId: number;
    }>(`/registrations/${registrationId}/form-status`, { completed });
    return res.data;
  },
};

export const categoryService = {
  getAll: async () => {
    const res = await api.get<{ success: boolean; categories: Category[] }>('/categories');
    return res.data;
  },
  create: async (data: { name: string; description: string }) => {
    const res = await api.post<{ success: boolean; message: string; category: Category }>('/categories', data);
    return res.data;
  },
  update: async (id: number | string, data: { name: string; description: string }) => {
    const res = await api.put<{ success: boolean; message: string; category: Category }>(`/categories/${id}`, data);
    return res.data;
  },
  delete: async (id: number | string) => {
    const res = await api.delete<{ success: boolean; message: string }>(`/categories/${id}`);
    return res.data;
  },
};

export const adminService = {
  getStats: async () => {
    const res = await api.get<{ success: boolean; stats: DashboardStats }>('/admin/stats');
    return res.data;
  },
  getUsers: async (params?: { role?: string; q?: string }) => {
    const res = await api.get<{ success: boolean; count: number; users: User[] }>('/admin/users', { params });
    return res.data;
  },
  updateUserRole: async (userId: number | string, role: string) => {
    const res = await api.patch<{ success: boolean; message: string }>(`/admin/users/${userId}/role`, { role });
    return res.data;
  },
  deleteUser: async (userId: number | string) => {
    const res = await api.delete<{ success: boolean; message: string }>(`/admin/users/${userId}`);
    return res.data;
  },
  updateEventStatus: async (eventId: number | string, status: EventStatus) => {
    const res = await api.patch<{ success: boolean; message: string }>(`/admin/events/${eventId}/status`, { status });
    return res.data;
  },
  approveEvent: async (eventId: number | string) => {
    const res = await api.post<{ success: boolean; message: string }>(`/admin/events/${eventId}/approve`);
    return res.data;
  },
  rejectEvent: async (eventId: number | string, reason?: string) => {
    const res = await api.post<{ success: boolean; message: string }>(`/admin/events/${eventId}/reject`, { reason });
    return res.data;
  },
  cancelEvent: async (eventId: number | string, reason?: string) => {
    const res = await api.post<{ success: boolean; message: string }>(`/admin/events/${eventId}/cancel`, { reason });
    return res.data;
  },
  getPendingCount: async () => {
    const res = await api.get<{ success: boolean; count: number }>('/admin/events/pending-count');
    return res.data;
  },
  getAllRegistrations: async (params?: { event_id?: number; status?: string; attendance_status?: string }) => {
    const res = await api.get<{ success: boolean; count: number; registrations: Registration[] }>('/admin/registrations', { params });
    return res.data;
  },
};

export const notificationService = {
  getMyNotifications: async (params?: { type?: string; unread_only?: boolean }) => {
    const res = await api.get<{
      success: boolean;
      count: number;
      unreadCount: number;
      notifications: NotificationItem[];
    }>('/notifications', { params });
    return res.data;
  },
  markAsRead: async (id: number | string) => {
    const res = await api.patch<{ success: boolean; message: string }>(`/notifications/${id}/read`);
    return res.data;
  },
  markAllAsRead: async () => {
    const res = await api.patch<{ success: boolean; message: string }>('/notifications/read-all');
    return res.data;
  },
  delete: async (id: number | string) => {
    const res = await api.delete<{ success: boolean; message: string }>(`/notifications/${id}`);
    return res.data;
  },
  triggerCheckReminders: async () => {
    const res = await api.post<{ success: boolean; message: string }>('/notifications/check-reminders');
    return res.data;
  },
  sendTestAlert: async (data?: { type?: NotificationType; title?: string; message?: string; event_id?: number }) => {
    const res = await api.post<{
      success: boolean;
      message: string;
      notification: NotificationItem;
    }>('/notifications/test', data);
    return res.data;
  },
  broadcastEventAnnouncement: async (eventId: number | string, data: { title: string; message: string }) => {
    const res = await api.post<{
      success: boolean;
      message: string;
      recipientCount: number;
    }>(`/notifications/events/${eventId}/broadcast`, data);
    return res.data;
  },
};

export const systemService = {
  getHealth: async () => {
    const res = await api.get('/health');
    return res.data;
  }
};

export default api;

