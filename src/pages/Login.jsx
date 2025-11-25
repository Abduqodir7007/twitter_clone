import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";

export default function Login() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
        setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const response = await apiClient.post("/api/auth/login", {
                email: formData.email,
                password: formData.password,
            });

            // Store tokens in localStorage
            localStorage.setItem("access_token", response.access_token);
            localStorage.setItem("refresh_token", response.refresh_token);

            // Redirect to home page
            navigate("/home");
        } catch (err) {
            if (err.status === 401) {
                setError("Invalid email or password");
            } else if (err.status === 422) {
                setError("Please enter valid email and password");
            } else {
                setError("An unexpected error occurred. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center px-4"
            style={{ backgroundColor: "#000000" }}
        >
            <div
                className="max-w-md w-full rounded-lg shadow-md p-8"
                style={{ backgroundColor: "#1a1a1a" }}
            >
                <h2
                    className="text-2xl font-bold text-center mb-6"
                    style={{ color: "#e8eaeb" }}
                >
                    Sign In
                </h2>

                {error && (
                    <div
                        className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded"
                        style={{ color: "#e8eaeb" }}
                    >
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label
                            htmlFor="email"
                            className="block text-sm font-medium mb-1"
                            style={{ color: "#e8eaeb" }}
                        >
                            Email
                        </label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            style={{
                                backgroundColor: "#2a2a2a",
                                color: "#e8eaeb",
                                border: "1px solid #3a3a3a",
                            }}
                            placeholder="you@example.com"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="password"
                            className="block text-sm font-medium mb-1"
                            style={{ color: "#e8eaeb" }}
                        >
                            Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            style={{
                                backgroundColor: "#2a2a2a",
                                color: "#e8eaeb",
                                border: "1px solid #3a3a3a",
                            }}
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed transition"
                        style={{
                            backgroundColor: loading ? "#4a4a4a" : "#1d9bf0",
                            color: "#e8eaeb",
                        }}
                    >
                        {loading ? "Signing In..." : "Sign In"}
                    </button>
                </form>

                <p
                    className="mt-4 text-center text-sm"
                    style={{ color: "#8b8b8b" }}
                >
                    Don't have an account?{" "}
                    <a
                        href="/register"
                        className="font-medium hover:underline"
                        style={{ color: "#1d9bf0" }}
                    >
                        Sign up
                    </a>
                </p>
            </div>
        </div>
    );
}
