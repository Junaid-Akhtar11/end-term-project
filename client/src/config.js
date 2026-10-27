// Configuration for backend API and WebSocket endpoints
// Reads VITE_API_URL or defaults to the production Render backend when hosted on Vercel

const RENDER_PROD_URL = 'https://end-term-project-yx5p.onrender.com';

const envApiUrl = import.meta.env.VITE_API_URL 
  ? import.meta.env.VITE_API_URL.replace(/\/+$/, '') 
  : (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app') ? RENDER_PROD_URL : '');

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
