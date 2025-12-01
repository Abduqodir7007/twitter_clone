import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import WhoToFollow from "../components/WhoToFollow";
import { apiClient } from "../api/client";

export default function PostDetail() {
    const { postId } = useParams();
    const navigate = useNavigate();
    const [replies, setReplies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [replyText, setReplyText] = useState("");
    const [replyLoading, setReplyLoading] = useState(false);
    const [replyError, setReplyError] = useState("");
    const [userAvatar, setUserAvatar] = useState(null);
    const [userInitials, setUserInitials] = useState("U");
    const [replyLikes, setReplyLikes] = useState({});

    useEffect(() => {
        const token = localStorage.getItem("access_token");
        if (!token) {
            navigate("/login");
            return;
        }

        fetchReplies();
        loadUserProfile();
    }, [postId, navigate]);

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

    const fetchReplies = async () => {
        setLoading(true);
        setError("");

        try {
            const token = localStorage.getItem("access_token");

            const response = await fetch(
                `${apiClient.BASE_URL}/api/post/${postId}`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error("Failed to load replies");
            }

            const data = await response.json();

            // Backend returns a post object with a reply property
            // Handle both cases: if data is an array or a single object
            if (Array.isArray(data)) {
                setReplies(data);
            } else if (data.reply && Array.isArray(data.reply)) {
                setReplies(data.reply);
            } else {
                setReplies([]);
            }
        } catch (err) {
            setError("Failed to load replies. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handlePostReply = async () => {
        if (!replyText.trim()) return;

        setReplyLoading(true);
        setReplyError("");

        try {
            const token = localStorage.getItem("access_token");
            const formData = new FormData();
            formData.append("text", replyText.trim());

            const response = await fetch(
                `${apiClient.BASE_URL}/api/post/${postId}/reply/`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: formData,
                }
            );

            if (!response.ok) {
                throw new Error("Failed to post reply");
            }

            setReplyText("");
            await fetchReplies();
        } catch (err) {
            setReplyError("Failed to post reply. Please try again.");
        } finally {
            setReplyLoading(false);
        }
    };

    const handleLikeReply = async (replyId) => {
        try {
            const token = localStorage.getItem("access_token");

            const response = await fetch(
                `${apiClient.BASE_URL}/api/post/reply/${replyId}/create-delete-like/`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error("Failed to like reply");
            }

            // Toggle like state for this reply
            setReplyLikes((prev) => ({
                ...prev,
                [replyId]: !prev[replyId],
            }));
        } catch (err) {
            console.error("Error liking reply:", err);
        }
    };

    const capitalizeName = (name) => {
        if (!name) return "";
        return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    };

    const getDaysAgo = (date) => {
        const now = new Date();
        const postDate = new Date(date);
        const diffTime = Math.abs(now - postDate);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return "Today";
        if (diffDays === 1) return "1 day ago";
        return `${diffDays} days ago`;
    };

    return (
        <div
            className="flex min-h-screen"
            style={{ backgroundColor: "#000000" }}
        >
            <Sidebar />

            {/* Main Content */}
            <div
                className="flex-1 max-w-2xl"
                style={{
                    borderLeft: "1px solid #2f3336",
                    borderRight: "1px solid #2f3336",
                    backgroundColor: "#000000",
                }}
            >
                {/* Header */}
                <div
                    className="sticky top-0 backdrop-blur-md z-10"
                    style={{
                        backgroundColor: "rgba(0, 0, 0, 0.8)",
                        borderBottom: "1px solid #2f3336",
                    }}
                >
                    <div className="flex items-center p-4 space-x-4">
                        <button
                            onClick={() => navigate(-1)}
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
                                    d="M15 19l-7-7 7-7"
                                />
                            </svg>
                        </button>
                        <h2
                            className="text-xl font-bold"
                            style={{ color: "#e8eaeb" }}
                        >
                            Replies
                        </h2>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="p-4">
                        <div
                            className="p-3 rounded"
                            style={{
                                backgroundColor: "#2c1518",
                                border: "1px solid #5e1a1f",
                                color: "#f4212e",
                            }}
                        >
                            {error}
                        </div>
                    </div>
                )}

                {/* Reply Composer */}
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
                            {replyError && (
                                <div
                                    className="mt-2 p-2 rounded text-sm"
                                    style={{
                                        backgroundColor: "#2c1518",
                                        border: "1px solid #5e1a1f",
                                        color: "#f4212e",
                                    }}
                                >
                                    {replyError}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end mt-3">
                        <button
                            onClick={handlePostReply}
                            disabled={!replyText.trim() || replyLoading}
                            className="px-6 py-2 font-semibold rounded-full transition"
                            style={{
                                backgroundColor:
                                    !replyText.trim() || replyLoading
                                        ? "#0e4465"
                                        : "#1d9bf0",
                                color:
                                    !replyText.trim() || replyLoading
                                        ? "#8b8b8b"
                                        : "#e8eaeb",
                                cursor:
                                    !replyText.trim() || replyLoading
                                        ? "not-allowed"
                                        : "pointer",
                            }}
                        >
                            {replyLoading ? "Posting..." : "Reply"}
                        </button>
                    </div>
                </div>

                {/* Loading State */}
                {loading ? (
                    <div
                        className="p-8 text-center"
                        style={{ color: "#8b8b8b" }}
                    >
                        <div
                            className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto"
                            style={{ borderColor: "#1d9bf0" }}
                        ></div>
                        <p className="mt-4">Loading replies...</p>
                    </div>
                ) : replies.length === 0 ? (
                    <div
                        className="p-8 text-center"
                        style={{ color: "#8b8b8b" }}
                    >
                        <p>No replies yet.</p>
                    </div>
                ) : (
                    <div>
                        {replies.map((reply, index) => (
                            <div
                                key={reply.id || index}
                                className="p-4 transition"
                                style={{ borderBottom: "1px solid #2f3336" }}
                                onMouseEnter={(e) =>
                                    (e.currentTarget.style.backgroundColor =
                                        "#080808")
                                }
                                onMouseLeave={(e) =>
                                    (e.currentTarget.style.backgroundColor =
                                        "transparent")
                                }
                            >
                                <div className="flex space-x-3">
                                    <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center font-semibold flex-shrink-0"
                                        style={{
                                            backgroundColor: "#1d9bf0",
                                            color: "#e8eaeb",
                                            backgroundImage: reply.user
                                                ?.image_path
                                                ? `url(${apiClient.BASE_URL}/${reply.user.image_path})`
                                                : "none",
                                            backgroundSize: "cover",
                                            backgroundPosition: "center",
                                        }}
                                    >
                                        {!reply.user?.image_path &&
                                        reply.user?.first_name
                                            ? `${reply.user.first_name[0].toUpperCase()}${
                                                  reply.user.last_name?.[0].toUpperCase() ||
                                                  ""
                                              }`
                                            : "?"}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-2">
                                            <span
                                                className="font-semibold text-sm"
                                                style={{ color: "#e8eaeb" }}
                                            >
                                                {reply.user?.first_name &&
                                                reply.user?.last_name
                                                    ? `${capitalizeName(
                                                          reply.user.first_name
                                                      )} ${capitalizeName(
                                                          reply.user.last_name
                                                      )}`
                                                    : "Unknown User"}
                                            </span>
                                            <span
                                                className="text-sm"
                                                style={{ color: "#8b8b8b" }}
                                            >
                                                · {getDaysAgo(reply.created_at)}
                                            </span>
                                        </div>
                                        <p
                                            className="text-sm mt-1"
                                            style={{ color: "#e8eaeb" }}
                                        >
                                            {reply.reply}
                                        </p>

                                        {/* Reply Actions */}
                                        <div
                                            className="flex items-center space-x-4 mt-3"
                                            style={{ color: "#8b8b8b" }}
                                        >
                                            {/* Like Button */}
                                            <button
                                                onClick={() =>
                                                    handleLikeReply(reply.id)
                                                }
                                                className="flex items-center space-x-2 transition hover:text-red-500 group"
                                            >
                                                <div className="p-2 rounded-full transition group-hover:bg-red-500/10">
                                                    <svg
                                                        className="w-4 h-4"
                                                        fill={
                                                            replyLikes[reply.id]
                                                                ? "currentColor"
                                                                : "none"
                                                        }
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                        style={{
                                                            color: replyLikes[
                                                                reply.id
                                                            ]
                                                                ? "#f91880"
                                                                : "inherit",
                                                        }}
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                                                        />
                                                    </svg>
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Right Sidebar */}
            <div className="hidden lg:block w-80 p-4">
                <WhoToFollow />
            </div>
        </div>
    );
}
