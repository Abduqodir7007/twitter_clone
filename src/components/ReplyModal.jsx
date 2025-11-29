import { useState, useEffect } from "react";
import { apiClient } from "../api/client";

export default function ReplyModal({ post, isOpen, onClose, onReplyCreated }) {
    const [replyText, setReplyText] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [userAvatar, setUserAvatar] = useState(null);
    const [userInitials, setUserInitials] = useState("U");

    useEffect(() => {
        if (isOpen) {
            loadUserProfile();
        }
    }, [isOpen]);

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
            // Silent error
        }
    };

    const handleCreateReply = async () => {
        if (!replyText.trim() || !post) return;

        setLoading(true);
        setError("");

        try {
            const token = localStorage.getItem("access_token");
            const formData = new FormData();
            formData.append("text", replyText.trim());

            const response = await fetch(
                `${apiClient.BASE_URL}/api/post/${post.id}/reply/`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: formData,
                }
            );

            if (!response.ok) {
                throw new Error("Failed to create reply");
            }

            setReplyText("");
            onClose();

            if (onReplyCreated) {
                onReplyCreated();
            }
        } catch (err) {
            setError("Failed to create reply. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const capitalizeName = (name) => {
        if (!name) return "";
        return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div
                className="w-full max-w-2xl rounded-2xl"
                style={{ backgroundColor: "#000000" }}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between p-4 border-b"
                    style={{ borderColor: "#2f3336" }}
                >
                    <h3
                        className="text-xl font-bold"
                        style={{ color: "#e8eaeb" }}
                    >
                        Reply to Post
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full transition hover:bg-gray-900"
                    >
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            style={{ color: "#e8eaeb" }}
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

                {/* Original Post Preview */}
                {post && (
                    <div
                        className="p-4 border-b"
                        style={{ borderColor: "#2f3336" }}
                    >
                        <div className="flex space-x-3">
                            <div
                                className="w-10 h-10 rounded-full flex items-center justify-center font-semibold flex-shrink-0"
                                style={{
                                    backgroundColor: "#1d9bf0",
                                    color: "#e8eaeb",
                                    backgroundImage: post.user?.image_path
                                        ? `url(${apiClient.BASE_URL}/${post.user.image_path})`
                                        : "none",
                                    backgroundSize: "cover",
                                    backgroundPosition: "center",
                                }}
                            >
                                {!post.user?.image_path && post.user?.first_name
                                    ? `${post.user.first_name[0].toUpperCase()}${
                                          post.user.last_name?.[0].toUpperCase() ||
                                          ""
                                      }`
                                    : "?"}
                            </div>
                            <div className="flex-1">
                                <span
                                    className="font-semibold text-sm"
                                    style={{ color: "#e8eaeb" }}
                                >
                                    {post.user?.first_name &&
                                    post.user?.last_name
                                        ? `${capitalizeName(
                                              post.user.first_name
                                          )} ${capitalizeName(
                                              post.user.last_name
                                          )}`
                                        : "Unknown User"}
                                </span>
                                <p
                                    className="text-sm mt-1"
                                    style={{ color: "#e8eaeb" }}
                                >
                                    {post.text}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Reply Composer */}
                <div className="p-4">
                    <div className="flex space-x-3">
                        <div
                            className="w-10 h-10 rounded-full flex items-center justify-center font-semibold flex-shrink-0"
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
                        <div className="flex-1">
                            <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Post your reply..."
                                className="w-full text-base border-none focus:outline-none resize-none"
                                style={{
                                    backgroundColor: "#000000",
                                    color: "#e8eaeb",
                                    caretColor: "#e8eaeb",
                                }}
                                rows="3"
                            />
                            {error && (
                                <div
                                    className="mt-2 p-2 rounded text-sm"
                                    style={{
                                        backgroundColor: "#2c1518",
                                        border: "1px solid #5e1a1f",
                                        color: "#f4212e",
                                    }}
                                >
                                    {error}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end mt-3">
                        <button
                            onClick={handleCreateReply}
                            disabled={!replyText.trim() || loading}
                            className="px-6 py-2 font-semibold rounded-full transition"
                            style={{
                                backgroundColor:
                                    !replyText.trim() || loading
                                        ? "#0e4465"
                                        : "#1d9bf0",
                                color:
                                    !replyText.trim() || loading
                                        ? "#8b8b8b"
                                        : "#e8eaeb",
                                cursor:
                                    !replyText.trim() || loading
                                        ? "not-allowed"
                                        : "pointer",
                            }}
                        >
                            {loading ? "Posting..." : "Reply"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
