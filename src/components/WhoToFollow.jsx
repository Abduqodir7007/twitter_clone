import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";

export default function WhoToFollow() {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadRecommendations();
    }, []);

    const loadRecommendations = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("access_token");

            const response = await fetch(
                `${apiClient.BASE_URL}/api/auth/follow/recommendation`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error("Failed to load recommendations");
            }

            const data = await response.json();
            // Show only first 3 users
            setUsers(data.slice(0, 3));
        } catch (err) {
            // Silent error
        } finally {
            setLoading(false);
        }
    };

    const capitalizeName = (name) => {
        if (!name) return "";
        return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    };

    const handleFollow = async (userId, currentlyFollowing) => {
        try {
            const token = localStorage.getItem("access_token");

            const url = `${apiClient.BASE_URL}/api/auth/follow/${userId}`;

            const response = await fetch(url, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error("Follow request failed");
            }

            const data = await response.json();

            // Update the user's is_following status in the list
            setUsers((prevUsers) =>
                prevUsers.map((user) =>
                    user.id === userId
                        ? { ...user, is_following: data.msg === "Followed" }
                        : user
                )
            );
        } catch (err) {
            // Silent error handling
        }
    };

    if (loading) {
        return (
            <div
                className="rounded-2xl p-4"
                style={{ backgroundColor: "#1a1a1a" }}
            >
                <h3
                    className="font-bold text-lg mb-2"
                    style={{ color: "#e8eaeb" }}
                >
                    Who to follow
                </h3>
                <div className="text-center py-4" style={{ color: "#8b8b8b" }}>
                    <p className="text-sm">Loading...</p>
                </div>
            </div>
        );
    }

    if (users.length === 0) {
        return (
            <div
                className="rounded-2xl p-4"
                style={{ backgroundColor: "#1a1a1a" }}
            >
                <h3
                    className="font-bold text-lg mb-2"
                    style={{ color: "#e8eaeb" }}
                >
                    Who to follow
                </h3>
                <p className="text-sm" style={{ color: "#8b8b8b" }}>
                    No suggestions available
                </p>
            </div>
        );
    }

    return (
        <div
            className="rounded-2xl overflow-hidden"
            style={{ backgroundColor: "#1a1a1a" }}
        >
            <h3 className="font-bold text-lg p-4" style={{ color: "#e8eaeb" }}>
                Who to follow
            </h3>

            {users.map((user, index) => (
                <div
                    key={user.id || index}
                    className="p-4 transition hover:bg-gray-900"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            {/* Avatar */}
                            <div
                                className="w-10 h-10 rounded-full flex items-center justify-center font-semibold"
                                style={{
                                    backgroundColor: "#1d9bf0",
                                    color: "#e8eaeb",
                                    backgroundImage: user.image_path
                                        ? `url(${apiClient.BASE_URL}/${user.image_path})`
                                        : "none",
                                    backgroundSize: "cover",
                                    backgroundPosition: "center",
                                }}
                            >
                                {!user.image_path &&
                                user.first_name &&
                                user.last_name
                                    ? `${user.first_name[0].toUpperCase()}${user.last_name[0].toUpperCase()}`
                                    : !user.image_path
                                    ? "?"
                                    : ""}
                            </div>

                            {/* User Info */}
                            <div>
                                <p
                                    className="font-semibold text-sm"
                                    style={{ color: "#e8eaeb" }}
                                >
                                    {capitalizeName(user.first_name)}{" "}
                                    {capitalizeName(user.last_name)}
                                </p>
                            </div>
                        </div>

                        {/* Follow Button */}
                        <div className="flex items-center space-x-2">
                            {/* Message Button */}
                            <button
                                onClick={() =>
                                    navigate(`/messages?userId=${user.id}`)
                                }
                                className="p-2 rounded-full transition"
                                style={{
                                    border: "1px solid #536471",
                                    color: "#e8eaeb",
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor =
                                        "#1a1a1a";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor =
                                        "transparent";
                                }}
                                title="Send message"
                            >
                                <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                    />
                                </svg>
                            </button>

                            <button
                                onClick={() =>
                                    handleFollow(user.id, user.is_following)
                                }
                                className="px-4 py-1.5 rounded-full text-sm font-semibold transition"
                                style={{
                                    backgroundColor: user.is_following
                                        ? "transparent"
                                        : "#e8eaeb",
                                    color: user.is_following
                                        ? "#e8eaeb"
                                        : "#000000",
                                    border: user.is_following
                                        ? "1px solid #536471"
                                        : "none",
                                }}
                                onMouseEnter={(e) => {
                                    if (user.is_following) {
                                        e.currentTarget.style.backgroundColor =
                                            "#2c0d0d";
                                        e.currentTarget.style.borderColor =
                                            "#5e1a1f";
                                        e.currentTarget.style.color = "#f4212e";
                                        e.currentTarget.textContent =
                                            "Unfollow";
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (user.is_following) {
                                        e.currentTarget.style.backgroundColor =
                                            "transparent";
                                        e.currentTarget.style.borderColor =
                                            "#536471";
                                        e.currentTarget.style.color = "#e8eaeb";
                                        e.currentTarget.textContent =
                                            "Following";
                                    }
                                }}
                            >
                                {user.is_following ? "Following" : "Follow"}
                            </button>
                        </div>
                    </div>
                </div>
            ))}

            {/* Show more link */}
            <div className="p-4 hover:bg-gray-900 transition cursor-pointer">
                <p className="text-sm" style={{ color: "#1d9bf0" }}>
                    Show more
                </p>
            </div>
        </div>
    );
}
