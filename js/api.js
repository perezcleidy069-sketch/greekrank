const configuredApiBase = document.querySelector('meta[name="api-base"]')?.content.trim();
const isLocalEnvironment = location.protocol === 'file:'
    || location.hostname === 'localhost'
    || location.hostname === '127.0.0.1';
const defaultApiBase = isLocalEnvironment
    ? 'http://localhost:3000/api/v1'
    : 'https://karen-weld.vercel.app/api/v1';
const API_BASE = (configuredApiBase || defaultApiBase).replace(/\/+$/, '');

async function apiRequest(endpoint, method = 'GET', body = null) {
    const token = localStorage.getItem('jwt_token');
    const headers = {};

    if (body !== null) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;

    let response;
    try {
        response = await fetch(`${API_BASE}${endpoint}`, {
            method,
            headers,
            body: body === null ? null : JSON.stringify(body)
        });
    } catch (error) {
        throw new Error(`No se pudo conectar con la API (${API_BASE}). Verifica que el servidor esté encendido y que la dirección sea correcta.`);
    }

    const data = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) {
        const message = data?.error || data?.message || `Error HTTP ${response.status}`;
        const error = new Error(message);
        error.status = response.status;
        throw error;
    }

    return data;
}
