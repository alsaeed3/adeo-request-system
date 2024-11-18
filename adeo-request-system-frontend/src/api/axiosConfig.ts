import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:3000/api',
    withCredentials: true,
    headers: {
        'Accept': 'application/json',
    }
});

// Add request interceptor to handle FormData
api.interceptors.request.use((config) => {
    // Don't set Content-Type when sending FormData
    if (config.data instanceof FormData) {
        // Let axios set the Content-Type automatically to multipart/form-data
        delete config.headers['Content-Type'];
    }
    return config;
});

// Add response interceptor for better error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('API Error:', error.response?.data || error.message);
        return Promise.reject(error);
    }
);

export default api;