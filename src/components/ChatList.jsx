import { useState, useEffect } from "react";
import { apiClient } from "../api/client";

export default function ChatList({ onSelectChat, selectedChatId }) {
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadChats();
    }, []);

    const loadChats = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("access_token");
            const response = await fetch(`${apiClient.BASE_URL}/api/chat/`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error("Failed to load chats");
            }

            const data = await response.json();
            setChats(data);
        } catch (err) {
            console.error("Error loading chats:", err);
        } finally {
            setLoading(false);
        }
    };

    const capitalizeName = (name) => {
        if (!name) return "";
        return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    };

    const formatTime = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        const now = new Date();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return date.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
            });
        } else if (diffDays === 1) {
            return "Yesterday";
        } else if (diffDays < 7) {
            return date.toLocaleDateString([], { weekday: "short" });
        }
        return date.toLocaleDateString([], { month: "short", day: "numeric" });
    };

    const truncateMessage = (message, maxLength = 30) => {
        if (!message) return "No messages yet";
        if (message.length <= maxLength) return message;
        return message.substring(0, maxLength) + "...";
    };

    if (loading) {
        return (
            <div className="p-4 text-center" style={{ color: "#8b8b8b" }}>
                <div
                    className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto"
                    style={{ borderColor: "#1d9bf0" }}
                ></div>
                <p className="mt-2 text-sm">Loading chats...</p>
            </div>
        );
    }

    if (chats.length === 0) {
        return (
            <div className="p-4 text-center" style={{ color: "#8b8b8b" }}>
                <svg
                    className="w-12 h-12 mx-auto mb-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                </svg>
                <p className="text-sm">No conversations yet</p>
                <p className="text-xs mt-1">
                    Start a chat from someone's profile
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col">
            {chats.map((chat) => (
                <button
                    key={chat.id}
                    onClick={() => onSelectChat(chat)}
                    className="flex items-center p-3 transition"
                    style={{
                        backgroundColor:
                            selectedChatId === chat.id
                                ? "#1a1a1a"
                                : "transparent",
                        borderBottom: "1px solid #2f3336",
                    }}
                    onMouseEnter={(e) => {
                        if (selectedChatId !== chat.id) {
                            e.currentTarget.style.backgroundColor = "#0a0a0a";
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (selectedChatId !== chat.id) {
                            e.currentTarget.style.backgroundColor =
                                "transparent";
                        }
                    }}
                >
                    {/* Avatar */}
                    <div
                        className="w-12 h-12 rounded-full flex items-center justify-center font-semibold flex-shrink-0"
                        style={{
                            backgroundColor: "#1d9bf0",
                            color: "#e8eaeb",
                            backgroundImage: chat.other_user?.image_path
                                ? `url(${apiClient.BASE_URL}/${chat.other_user.image_path})`
                                : "none",
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                        }}
                    >
                        {!chat.other_user?.image_path &&
                        chat.other_user?.first_name &&
                        chat.other_user?.last_name
                            ? `${chat.other_user.first_name[0].toUpperCase()}${chat.other_user.last_name[0].toUpperCase()}`
                            : "?"}
                    </div>

                    {/* Chat Info */}
                    <div className="flex-1 ml-3 text-left overflow-hidden">
                        <div className="flex items-center justify-between">
                            <span
                                className="font-semibold text-sm truncate"
                                style={{ color: "#e8eaeb" }}
                            >
                                {capitalizeName(chat.other_user?.first_name)}{" "}
                                {capitalizeName(chat.other_user?.last_name)}
                            </span>
                            <span
                                className="text-xs flex-shrink-0 ml-2"
                                style={{ color: "#8b8b8b" }}
                            >
                                {formatTime(chat.last_message?.created_at)}
                            </span>
                        </div>
                        <p
                            className="text-sm truncate mt-0.5"
                            style={{ color: "#8b8b8b" }}
                        >
                            {truncateMessage(chat.last_message?.content)}
                        </p>
                    </div>
                </button>
            ))}
        </div>
    );
}
