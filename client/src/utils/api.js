/**
 * api.js
 * Utility to accurately determine the backend API and Socket URL dynamically.
 * If accessed via a local network IP (e.g. 192.168.x.x), it correctly points
 * the backend requests to that same IP instead of hardcoding 'localhost',
 * which would fail on mobile devices.
 */

export const getApiUrl = () => {
    const envApiUrl = import.meta.env.VITE_API_URL;
    if (envApiUrl && !envApiUrl.includes('localhost')) {
        return envApiUrl; // Used in production
    }
    // Dynamically use the current hostname (e.g., 192.168.1.5 or localhost) on port 3000
    return `${window.location.protocol}//${window.location.hostname}:3000`;
};

export const getSocketUrl = () => {
    const envSocketUrl = import.meta.env.VITE_SOCKET_URL;
    if (envSocketUrl && !envSocketUrl.includes('localhost')) {
        return envSocketUrl; // Used in production
    }
    return `${window.location.protocol}//${window.location.hostname}:3000`;
};
