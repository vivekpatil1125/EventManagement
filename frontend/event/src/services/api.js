import axios from 'axios';

// Adjusted to match the exact running URL from your Swagger UI screenshot
const API_BASE_URL = 'https://localhost:7165/api'; 

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// This interceptor automatically grabs your JWT token from localStorage 
// and injects it into the Authorization header for all future requests
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