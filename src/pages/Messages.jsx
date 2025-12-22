import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import ChatList from "../components/ChatList";
import ChatWindow from "../components/ChatWindow";
import { apiClient } from "../api/client";

export default function Messages() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [selectedChat, setSelectedChat] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("access_token");
        if (!token) {
            navigate("/login");
            return;
        }

        // Check if there's a userId in the URL to start a new chat
        const userId = searchParams.get("userId");
        if (userId) {
            createOrOpenChat(userId);
        }
    }, [navigate, searchParams]);

    const createOrOpenChat = async (userId) => {
        setLoading(true);
        try {
            const token = localStorage.getItem("access_token");
            const response = await fetch(
                `${apiClient.BASE_URL}/api/chat/create`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ recipient_id: userId }),
                }
            );

            if (!response.ok) {
                throw new Error("Failed to create chat");
            }

            const chat = await response.json();
            setSelectedChat(chat);
        } catch (err) {
            console.error("Error creating chat:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectChat = (chat) => {
        setSelectedChat(chat);
    };

    const handleBack = () => {
        setSelectedChat(null);
    };

    return (
        <div
            className="flex h-screen overflow-hidden"
            style={{ backgroundColor: "#000000" }}
        >
            <Sidebar />

            {/* Main Content */}
            <div
                className="flex-1 flex h-screen overflow-hidden"
                style={{
                    borderLeft: "1px solid #2f3336",
                }}
            >
                {/* Chat List Panel */}
                <div
                    className={`w-96 h-screen flex flex-col ${
                        selectedChat ? "hidden md:flex" : "flex"
                    }`}
                    style={{
                        borderRight: "1px solid #2f3336",
                        backgroundColor: "#000000",
                    }}
                >
                    {/* Header */}
                    <div
                        className="flex-shrink-0 p-4"
                        style={{
                            backgroundColor: "#000000",
                            borderBottom: "1px solid #2f3336",
                        }}
                    >
                        <h2
                            className="text-xl font-bold"
                            style={{ color: "#e8eaeb" }}
                        >
                            Messages
                        </h2>
                    </div>

                    {/* Search Bar */}
                    <div
                        className="flex-shrink-0 p-4"
                        style={{ borderBottom: "1px solid #2f3336" }}
                    >
                        <div
                            className="flex items-center px-4 py-2 rounded-full"
                            style={{
                                backgroundColor: "#202327",
                                border: "1px solid #2f3336",
                            }}
                        >
                            <svg
                                className="w-5 h-5 mr-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                style={{ color: "#8b8b8b" }}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search Direct Messages"
                                className="flex-1 bg-transparent focus:outline-none text-sm"
                                style={{ color: "#e8eaeb" }}
                            />
                        </div>
                    </div>

                    {/* Chat List - Scrollable */}
                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div
                                className="p-4 text-center"
                                style={{ color: "#8b8b8b" }}
                            >
                                <div
                                    className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto"
                                    style={{ borderColor: "#1d9bf0" }}
                                ></div>
                            </div>
                        ) : (
                            <ChatList
                                onSelectChat={handleSelectChat}
                                selectedChatId={selectedChat?.id}
                            />
                        )}
                    </div>
                </div>

                {/* Chat Window Panel */}
                <div
                    className={`flex-1 h-screen ${
                        selectedChat ? "flex" : "hidden md:flex"
                    } flex-col overflow-hidden`}
                    style={{ backgroundColor: "#000000" }}
                >
                    {selectedChat ? (
                        <ChatWindow chat={selectedChat} onBack={handleBack} />
                    ) : (
                        <div
                            className="flex-1 flex items-center justify-center"
                            style={{ color: "#8b8b8b" }}
                        >
                            <div className="text-center">
                                <h3
                                    className="text-2xl font-bold mb-2"
                                    style={{ color: "#e8eaeb" }}
                                >
                                    Select a message
                                </h3>
                                <p className="text-sm">
                                    Choose from your existing conversations or
                                    start a new one.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
