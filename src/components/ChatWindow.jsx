import { useState, useEffect, useRef } from "react";
import { apiClient } from "../api/client";

export default function ChatWindow({ chat, onBack }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);
    const wsRef = useRef(null);
    const currentUserId = useRef(null);
    const processedMessageIds = useRef(new Set()); // Track processed message IDs

    useEffect(() => {
        if (chat?.id) {
            loadMessages();
            // Load user first, then connect WebSocket
            loadCurrentUser().then(() => {
                connectWebSocket();
            });
        }

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [chat?.id]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const loadCurrentUser = async () => {
        try {
            const token = localStorage.getItem("access_token");
            const response = await apiClient.get("/api/auth/me", {
                headers: { Authorization: `Bearer ${token}` },
            });
            currentUserId.current = String(response.id);
            return response.id;
        } catch (err) {
            console.error("Error loading current user:", err);
            return null;
        }
    };

    const connectWebSocket = () => {
        const wsUrl = apiClient.BASE_URL.replace("http", "ws");
        const ws = new WebSocket(`${wsUrl}/api/chat/ws/${chat.id}`);

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === "new_message") {
                    const senderId = String(data.message.sender_id)
                        .toLowerCase()
                        .trim();
                    const myId = String(currentUserId.current)
                        .toLowerCase()
                        .trim();
                    const messageId = String(data.message.id);

                    // Skip if from current user - they already see it via optimistic update
                    if (senderId === myId) {
                        return;
                    }

                    // Skip if already processed this message
                    if (processedMessageIds.current.has(messageId)) {
                        return;
                    }

                    // Mark as processed and add to messages
                    processedMessageIds.current.add(messageId);
                    setMessages((prev) => {
                        const exists = prev.some(
                            (msg) => String(msg.id) === messageId
                        );
                        if (exists) {
                            return prev;
                        }
                        return [...prev, { ...data.message, is_own: false }];
                    });
                }
            } catch (err) {
                console.error("Error parsing WebSocket message:", err);
            }
        };

        wsRef.current = ws;
    };

    const loadMessages = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("access_token");
            const response = await fetch(
                `${apiClient.BASE_URL}/api/chat/${chat.id}/messages`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error("Failed to load messages");
            }

            const data = await response.json();
            setMessages(data);
        } catch (err) {
            console.error("Error loading messages:", err);
        } finally {
            setLoading(false);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || sending) return;

        const messageContent = newMessage.trim();
        setNewMessage("");
        setSending(true);

        // Optimistic update
        const tempMessage = {
            id: `temp-${Date.now()}`,
            content: messageContent,
            sender_id: currentUserId.current,
            created_at: new Date().toISOString(),
            is_own: true,
        };
        setMessages((prev) => [...prev, tempMessage]);

        try {
            const token = localStorage.getItem("access_token");
            const response = await fetch(
                `${apiClient.BASE_URL}/api/chat/${chat.id}/messages`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ content: messageContent }),
                }
            );

            if (!response.ok) {
                throw new Error("Failed to send message");
            }

            const data = await response.json();

            // Mark this message ID as processed to prevent WebSocket duplicate
            processedMessageIds.current.add(String(data.id));

            // Replace temp message with real one
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === tempMessage.id ? { ...data, is_own: true } : msg
                )
            );
        } catch (err) {
            console.error("Error sending message:", err);
            // Remove failed message
            setMessages((prev) =>
                prev.filter((msg) => msg.id !== tempMessage.id)
            );
            setNewMessage(messageContent);
        } finally {
            setSending(false);
        }
    };

    const capitalizeName = (name) => {
        if (!name) return "";
        return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    };

    const formatTime = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return date.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <div
            className="flex flex-col h-full overflow-hidden"
            style={{ backgroundColor: "#000000" }}
        >
            {/* Header */}
            <div
                className="flex-shrink-0 flex items-center p-4"
                style={{ borderBottom: "1px solid #2f3336" }}
            >
                <button
                    onClick={onBack}
                    className="p-2 rounded-full transition hover:bg-gray-900 mr-3"
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

                {/* User Avatar */}
                <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-semibold"
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

                <div className="ml-3">
                    <h3 className="font-semibold" style={{ color: "#e8eaeb" }}>
                        {capitalizeName(chat.other_user?.first_name)}{" "}
                        {capitalizeName(chat.other_user?.last_name)}
                    </h3>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loading ? (
                    <div className="text-center" style={{ color: "#8b8b8b" }}>
                        <div
                            className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto"
                            style={{ borderColor: "#1d9bf0" }}
                        ></div>
                        <p className="mt-2 text-sm">Loading messages...</p>
                    </div>
                ) : messages.length === 0 ? (
                    <div
                        className="text-center py-8"
                        style={{ color: "#8b8b8b" }}
                    >
                        <p>No messages yet</p>
                        <p className="text-sm mt-1">Say hello! 👋</p>
                    </div>
                ) : (
                    messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex ${
                                message.is_own ? "justify-end" : "justify-start"
                            }`}
                        >
                            <div
                                className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                                    message.is_own
                                        ? "rounded-br-md"
                                        : "rounded-bl-md"
                                }`}
                                style={{
                                    backgroundColor: message.is_own
                                        ? "#1d9bf0"
                                        : "#2f3336",
                                    color: "#e8eaeb",
                                }}
                            >
                                <p className="break-words">{message.content}</p>
                                <p
                                    className="text-xs mt-1 text-right"
                                    style={{
                                        color: message.is_own
                                            ? "rgba(255,255,255,0.7)"
                                            : "#8b8b8b",
                                    }}
                                >
                                    {formatTime(message.created_at)}
                                </p>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form
                onSubmit={handleSendMessage}
                className="flex-shrink-0 p-4"
                style={{ borderTop: "1px solid #2f3336" }}
            >
                <div className="flex items-center space-x-3">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Start a new message"
                        className="flex-1 px-4 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                        style={{
                            backgroundColor: "#202327",
                            color: "#e8eaeb",
                            border: "1px solid #2f3336",
                        }}
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim() || sending}
                        className="p-3 rounded-full transition"
                        style={{
                            backgroundColor:
                                newMessage.trim() && !sending
                                    ? "#1d9bf0"
                                    : "#0e4465",
                            color:
                                newMessage.trim() && !sending
                                    ? "#e8eaeb"
                                    : "#8b8b8b",
                            cursor:
                                newMessage.trim() && !sending
                                    ? "pointer"
                                    : "not-allowed",
                        }}
                    >
                        <svg
                            className="w-5 h-5"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                        </svg>
                    </button>
                </div>
            </form>
        </div>
    );
}
