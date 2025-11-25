export const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Function to refresh the access token
async function refreshAccessToken() {
    const refreshToken = localStorage.getItem("refresh_token");

    if (!refreshToken) {
        // No refresh token, redirect to login
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        window.location.href = "/login";
        throw new Error("No refresh token available");
    }

    try {
        const response = await fetch(`${BASE_URL}/api/auth/refresh`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (!response.ok) {
            throw new Error("Token refresh failed");
        }

        const data = await response.json();

        // Store new tokens
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("refresh_token", data.refresh_token);

        return data.access_token;
    } catch (error) {
        // Refresh failed, clear tokens and redirect to login
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        window.location.href = "/login";
        throw error;
    }
}

export const apiClient = {
    BASE_URL,

    async request(endpoint, options = {}) {
        const url = `${BASE_URL}${endpoint}`;
        const config = {
            headers: {
                "Content-Type": "application/json",
                ...options.headers,
            },
            ...options,
        };

        let response = await fetch(url, config);

        // If 401 Unauthorized, try to refresh token
        if (response.status === 401) {
            try {
                const newAccessToken = await refreshAccessToken();

                // Retry the original request with new token
                config.headers.Authorization = `Bearer ${newAccessToken}`;
                response = await fetch(url, config);
            } catch (error) {
                // Token refresh failed, error already handled
                throw { status: 401, data: { detail: "Session expired" } };
            }
        }

        const data = await response.json();

        if (!response.ok) {
            throw { status: response.status, data };
        }

        return data;
    },

    get(endpoint, options) {
        return this.request(endpoint, { method: "GET", ...options });
    },

    post(endpoint, body, options) {
        return this.request(endpoint, {
            method: "POST",
            body: JSON.stringify(body), // Body is stringified here
            ...options,
        });
    },
};
