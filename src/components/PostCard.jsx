import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";

export default function PostCard({ post, onReply, onLikeUpdate }) {
    const navigate = useNavigate();
    const [likes, setLikes] = useState(post.likes_count || 0);
    const [isLiked, setIsLiked] = useState(post.is_liked || false);
    const [replies, setReplies] = useState(post.reply_count || 0);

    const getDaysAgo = (date) => {
        const now = new Date();
        const postDate = new Date(date);
        const diffTime = Math.abs(now - postDate);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return "Today";
        if (diffDays === 1) return "1 day ago";
        return `${diffDays} days ago`;
    };

    const capitalizeName = (name) => {
        if (!name) return "";
        return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    };

    const handlePostClick = () => {
        navigate(`/post/${post.id}`);
    };

    const handleLike = async (e) => {
        e.stopPropagation();

        // Optimistic UI update
        const previousLikes = likes;
        const previousIsLiked = isLiked;

        if (isLiked) {
            setLikes((prev) => Math.max(0, prev - 1));
            setIsLiked(false);
        } else {
            setLikes((prev) => prev + 1);
            setIsLiked(true);
        }

        try {
            const token = localStorage.getItem("access_token");

            const response = await fetch(
                `${apiClient.BASE_URL}/api/post/create_delete_like/${post.id}/`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error("Failed to like post");
            }

            // Notify parent to refresh posts if needed
            if (onLikeUpdate) {
                onLikeUpdate(post.id);
            }
        } catch (err) {
            // Revert optimistic update on error
            setLikes(previousLikes);
            setIsLiked(previousIsLiked);
        }
    };

    const handleReply = (e) => {
        e.stopPropagation();
        if (onReply) {
            onReply(post);
        }
    };

    return (
        <div
            className="p-4 transition cursor-pointer"
            style={{ borderBottom: "1px solid #2f3336" }}
            onClick={handlePostClick}
            onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#080808")
            }
            onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "transparent")
            }
        >
            <div className="flex space-x-3">
                {/* Avatar */}
                <div className="flex-shrink-0">
                    <div
                        className="w-12 h-12 rounded-full flex items-center justify-center font-semibold"
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
                        {!post.user?.image_path &&
                        post.user?.first_name &&
                        post.user?.last_name
                            ? `${post.user.first_name[0].toUpperCase()}${post.user.last_name[0].toUpperCase()}`
                            : "?"}
                    </div>
                </div>

                {/* Post Content */}
                <div className="flex-1">
                    <div className="flex items-center space-x-2">
                        <span
                            className="font-semibold"
                            style={{ color: "#e8eaeb" }}
                        >
                            {post.user?.first_name && post.user?.last_name
                                ? `${capitalizeName(
                                      post.user.first_name
                                  )} ${capitalizeName(post.user.last_name)}`
                                : "Unknown User"}
                        </span>
                        <span className="text-sm" style={{ color: "#8b8b8b" }}>
                            · {getDaysAgo(post.created_at)}
                        </span>
                    </div>

                    <p className="mt-1" style={{ color: "#e8eaeb" }}>
                        {post.text}
                    </p>

                    {post.image_path && (
                        <img
                            src={`${apiClient.BASE_URL}/${post.image_path}`}
                            alt="Post"
                            className="mt-3 rounded-2xl max-w-full"
                            style={{ border: "1px solid #2f3336" }}
                        />
                    )}

                    {/* Action buttons */}
                    <div
                        className="flex items-center justify-between mt-3 max-w-md"
                        style={{ color: "#8b8b8b" }}
                    >
                        {/* Reply Button */}
                        <button
                            onClick={handleReply}
                            className="flex items-center space-x-2 transition hover:text-blue-500 group"
                        >
                            <div className="p-2 rounded-full transition group-hover:bg-blue-500/10">
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
                                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                    />
                                </svg>
                            </div>
                            {replies > 0 && (
                                <span className="text-sm">{replies}</span>
                            )}
                        </button>

                        {/* Retweet Button */}
                        <button
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center space-x-2 transition hover:text-green-500 group"
                        >
                            <div className="p-2 rounded-full transition group-hover:bg-green-500/10">
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
                                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                    />
                                </svg>
                            </div>
                        </button>

                        {/* Like Button */}
                        <button
                            onClick={handleLike}
                            className="flex items-center space-x-2 transition hover:text-red-500 group"
                        >
                            <div className="p-2 rounded-full transition group-hover:bg-red-500/10">
                                <svg
                                    className="w-5 h-5"
                                    fill={isLiked ? "currentColor" : "none"}
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    style={{
                                        color: isLiked ? "#f91880" : "inherit",
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
                            {likes > 0 && (
                                <span
                                    className="text-sm"
                                    style={{
                                        color: isLiked ? "#f91880" : "inherit",
                                    }}
                                >
                                    {likes}
                                </span>
                            )}
                        </button>

                        {/* Share Button */}
                        <button
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center space-x-2 transition hover:text-blue-500 group"
                        >
                            <div className="p-2 rounded-full transition group-hover:bg-blue-500/10">
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
                                        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                                    />
                                </svg>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
