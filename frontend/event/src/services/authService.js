import api from './api';

const authService = {
    // 1. Register a new user account
    register: async (fullName, email, password) => {
        try {
            const response = await api.post('/Auth/register', {
                fullName,
                email,
                password
            });
            
            // If the server returns a token successfully, log the user in right away
            if (response.data && response.data.token) {
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify({
                    email: response.data.email,
                    role: response.data.role
                }));
            }
            return response.data;
        } catch (error) {
            console.error("Registration endpoint error:", error.response?.data || error.message);
            throw error.response?.data || new Error("Registration failed");
        }
    },

    // 2. Authenticate and log in an existing user
    login: async (email, password) => {
        try {
            const response = await api.post('/Auth/login', {
                email,
                password
            });

            // Store token and user role payload securely on the client machine
            if (response.data && response.data.token) {
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify({
                    email: response.data.email,
                    role: response.data.role
                }));
            }
            return response.data;
        } catch (error) {
            console.error("Login endpoint error:", error.response?.data || error.message);
            throw error.response?.data || new Error("Login failed");
        }
    },

    // 3. Clear user tokens on logout
    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },

    // 4. Client helper utility to quickly retrieve cached user info
    getCurrentUser: () => {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    }
};

export default authService;