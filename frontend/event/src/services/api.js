import axios from 'axios';

// Ensure the secure HTTPS URL on port 7165 is specified
const API_BASE_URL = 'https://localhost:7165/api'; 

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});



// Automatically append the JWT token to requests if a user is logged in
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// --- Data Access Services ---

export const eventService = {
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
    getAll: () => api.get('/attendance'),
    toggleCheckIn: (id) => api.put(`/attendance/${id}/toggle`),
};

export const announcementService = {
    getAll: () => api.get('/announcements'),
    create: (data) => api.post('/announcements', data),
};



export default api;