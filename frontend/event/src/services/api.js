import axios from 'axios';

const API_BASE_URL = 'https://localhost:7165/api'; 

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Append Bearer token if valid
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token && typeof token === 'string' && token.split('.').length === 3) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Auto-clean stale credentials on 401
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
        return Promise.reject(error);
    }
);

// --- Data Access Services ---

export const eventService = {
    // Line 40: /events
    getAll: () => api.get('/events'),
    getById: (id) => api.get(`/events/${id}`),
    create: (data) => api.post('/events', data), 
    update: (id, data) => api.put(`/events/${id}`, data),
    delete: (id) => api.delete(`/events/${id}`),
};

export const registrationService = {
    getAll: () => api.get('/registrations'),
    create: (data) => api.post('/registrations', data),
    delete: (id) => api.delete(`/registrations/${id}`),
};

export const attendanceService = {
    // Line 55: matches AttendanceController
    getAll: () => api.get('/attendance'),
    checkIn: (eventId) => api.post(`/attendance/check-in/${eventId}`),
    toggleCheckIn: (id) => api.put(`/attendance/${id}/toggle`),
};

export const announcementService = {
    getAll: () => api.get('/announcements'),
    create: (data) => api.post('/announcements', data),
};

export default api;