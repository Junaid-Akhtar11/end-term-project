// Configuration for backend API and WebSocket endpoints
// In local development, falls back to relative paths or localhost
// When deployed on Vercel, reads VITE_API_URL (e.g., https://devpulse-api.onrender.com)

const envApiUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/+$/, '') : '';

export const API_BASE_URL = envApiUrl;

export function getApiUrl(path) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}

export function getWsUrl() {
  if (API_BASE_URL) {
    const wsBase = API_BASE_URL.replace(/^http(s)?:\/\//, (match, s) => (s ? 'wss://' : 'ws://'));
    return wsBase;
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}`;
}
