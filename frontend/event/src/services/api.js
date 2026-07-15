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

export default api;