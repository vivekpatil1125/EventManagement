import api from './api';

const authService = {
    /**
     * Registers a new user by translating frontend inputs to backend DTO properties
     */
    register: async (userData) => {
        const payload = {
            fullName: userData.fullName,
            email: userData.workEmail, // Maps frontend 'workEmail' to backend 'Email'
            password: userData.password
        };

        try {
            const response = await api.post('/Auth/register', payload);
            return response.data;
        } catch (error) {
            // Extracts explicit validation error details sent by ASP.NET Core
            const backendErrorMessage = error.response?.data?.message || error.response?.data || error.message;
            console.error("Registration endpoint error:", backendErrorMessage);
            throw backendErrorMessage;
        }
    },

    // Add this method inside your existing authService object in services/authService.js
forgotPassword: async (email) => {
    try {
        const response = await api.post('/Auth/forgot-password', { email });
        return response.data;
    } catch (error) {
        const backendErrorMessage = error.response?.data?.message || error.response?.data || error.message;
        console.error("Forgot password endpoint error:", backendErrorMessage);
        throw backendErrorMessage;
    }
},
    /**
     * Logs in a user by translating form credentials to backend DTO properties
     */
    login: async (credentials) => {
        const payload = {
            email: credentials.workEmail, // Maps frontend 'workEmail' to backend 'Email'
            password: credentials.password
        };

        try {
            const response = await api.post('/Auth/login', payload);
            if (response.data && response.data.token) {
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data));
            }
            return response.data;
        } catch (error) {
            const backendErrorMessage = error.response?.data?.message || error.response?.data || error.message;
            console.error("Login endpoint error:", backendErrorMessage);
            throw backendErrorMessage;
        }
    },

    /**
     * Clears local authentication state
     */
    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    }
};

export default authService;