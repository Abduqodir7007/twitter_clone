import { useState, useRef, useEffect } from "react";
import { apiClient } from "../api/client";

export default function PostComposer({ onPostCreated }) {
    const [text, setText] = useState("");
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [userAvatar, setUserAvatar] = useState(null);
    const [userInitials, setUserInitials] = useState("U");
    const fileInputRef = useRef(null);

    useEffect(() => {
        loadUserProfile();
    }, []);

    const loadUserProfile = async () => {
        try {
            const token = localStorage.getItem("access_token");
            const response = await apiClient.get("/api/auth/me", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.first_name && response.last_name) {
                setUserInitials(
                    `${response.first_name[0].toUpperCase()}${response.last_name[0].toUpperCase()}`
                );
            }
            if (response.image_path) {
                setUserAvatar(response.image_path);
            }
        } catch (err) {
            // Silent error - just use default avatar
        }
    };

    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImage(file);
            // Create preview URL
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = () => {
        setImage(null);
        setImagePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handlePost = async () => {
        if (!text.trim() && !image) return;

        setLoading(true);
        setError("");
        setSuccess(false);

        try {
            const formData = new FormData();

            if (text.trim()) {
                formData.append("text", text.trim());
            }

            if (image) {
                formData.append("image", image);
            }

            let token = localStorage.getItem("access_token");

            if (!token) {
                setError("You must be logged in to post.");
                setLoading(false);
                return;
            }

            let response = await fetch(
                `${apiClient.BASE_URL}/api/post/create`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: formData,
                }
            );

            // If 401, try to refresh token and retry
            if (response.status === 401) {
                try {
                    const refreshToken = localStorage.getItem("refresh_token");

                    if (!refreshToken) {
                        setError("Session expired. Please login again.");
                        setTimeout(() => {
                            window.location.href = "/login";
                        }, 2000);
                        return;
                    }

                    // Refresh the token
                    const refreshResponse = await fetch(
                        `${apiClient.BASE_URL}/api/auth/refresh`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                refresh_token: refreshToken,
                            }),
                        }
                    );

                    if (!refreshResponse.ok) {
                        throw new Error("Token refresh failed");
                    }

                    const tokenData = await refreshResponse.json();
                    localStorage.setItem(
                        "access_token",
                        tokenData.access_token
                    );
                    localStorage.setItem(
                        "refresh_token",
                        tokenData.refresh_token
                    );

                    // Retry the post with new token
                    response = await fetch(
                        `${apiClient.BASE_URL}/api/post/create`,
                        {
                            method: "POST",
                            headers: {
                                Authorization: `Bearer ${tokenData.access_token}`,
                            },
                            body: formData,
                        }
                    );
                } catch (refreshError) {
                    localStorage.removeItem("access_token");
                    localStorage.removeItem("refresh_token");
                    setError("Session expired. Redirecting to login...");
                    setTimeout(() => {
                        window.location.href = "/login";
                    }, 2000);
                    return;
                }
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw { status: response.status, data: errorData };
            }

            const data = await response.json();

            // Show success message
            setSuccess(true);

            // Clear form
            setText("");
            setImage(null);
            setImagePreview(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }

            // Hide success message after 3 seconds
            setTimeout(() => {
                setSuccess(false);
            }, 3000);

            // Notify parent component to refresh posts
            if (onPostCreated) {
                onPostCreated();
            }
        } catch (err) {
            if (err.status === 422) {
                setError("Invalid input. Please check your post.");
            } else if (err.status === 401) {
                setError("You must be logged in to post.");
            } else {
                setError("Failed to create post. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    const isPostDisabled = (!text.trim() && !image) || loading;

    return (
        <div className="p-4" style={{ borderBottom: "1px solid #2f3336" }}>
            {/* Success Toast */}
            {success && (
                <div
                    className="fixed top-20 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full shadow-lg z-50 flex items-center space-x-2"
                    style={{ backgroundColor: "#00ba7c", color: "#ffffff" }}
                >
                    <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                        />
                    </svg>
                    <span className="font-medium">Post is created</span>
                </div>
            )}

            {error && (
                <div
                    className="mb-4 p-3 rounded"
                    style={{
                        backgroundColor: "#2c1518",
                        border: "1px solid #5e1a1f",
                        color: "#f4212e",
                    }}
                >
                    {error}
                </div>
            )}

            <div className="flex space-x-3">
                {/* User Avatar */}
                <div className="flex-shrink-0">
                    <div
                        className="w-12 h-12 rounded-full flex items-center justify-center font-semibold"
                        style={{
                            backgroundColor: "#1d9bf0",
                            color: "#e8eaeb",
                            backgroundImage: userAvatar
                                ? `url(${apiClient.BASE_URL}/${userAvatar})`
                                : "none",
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                        }}
                    >
                        {!userAvatar && userInitials}
                    </div>
                </div>

                {/* Input Area */}
                <div className="flex-1">
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="What's happening?"
                        className="w-full text-lg border-none focus:outline-none resize-none"
                        style={{
                            backgroundColor: "#000000",
                            color: "#e8eaeb",
                            caretColor: "#e8eaeb",
                        }}
                        rows="3"
                    />

                    {/* Image Preview */}
                    {imagePreview && (
                        <div className="relative mt-3">
                            <img
                                src={imagePreview}
                                alt="Preview"
                                className="rounded-2xl max-h-80 w-full object-cover"
                                style={{ border: "1px solid #2f3336" }}
                            />
                            <button
                                onClick={handleRemoveImage}
                                className="absolute top-2 right-2 rounded-full p-2 transition"
                                style={{
                                    backgroundColor: "rgba(0, 0, 0, 0.7)",
                                    color: "#e8eaeb",
                                }}
                                onMouseEnter={(e) =>
                                    (e.currentTarget.style.backgroundColor =
                                        "#000000")
                                }
                                onMouseLeave={(e) =>
                                    (e.currentTarget.style.backgroundColor =
                                        "rgba(0, 0, 0, 0.7)")
                                }
                            >
                                <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>
                    )}

                    {/* Actions */}
                    <div
                        className="flex items-center justify-between mt-3 pt-3"
                        style={{ borderTop: "1px solid #2f3336" }}
                    >
                        <div className="flex items-center space-x-2">
                            {/* Image Upload Button */}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2 rounded-full transition"
                                style={{ color: "#1d9bf0" }}
                                onMouseEnter={(e) =>
                                    (e.currentTarget.style.backgroundColor =
                                        "#031018")
                                }
                                onMouseLeave={(e) =>
                                    (e.currentTarget.style.backgroundColor =
                                        "transparent")
                                }
                                title="Add image"
                            >
                                <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                </svg>
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageSelect}
                                className="hidden"
                            />
                        </div>

                        {/* Post Button */}
                        <button
                            onClick={handlePost}
                            disabled={isPostDisabled}
                            className="px-6 py-2 font-semibold rounded-full transition"
                            style={{
                                backgroundColor: isPostDisabled
                                    ? "#0e4465"
                                    : "#1d9bf0",
                                color: isPostDisabled ? "#8b8b8b" : "#e8eaeb",
                                cursor: isPostDisabled
                                    ? "not-allowed"
                                    : "pointer",
                            }}
                        >
                            {loading ? "Posting..." : "Post"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
