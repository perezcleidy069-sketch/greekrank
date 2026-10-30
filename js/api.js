const API_BASE = 'http://localhost:3000/api';

async function apiRequest(endpoint, method = 'GET', body = null) {
    const token = localStorage.getItem('jwt_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : null
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Error en la petición API');
        return data;
    } catch (error) {
        showNotification(error.message, 'error');
        throw error;
    }
}