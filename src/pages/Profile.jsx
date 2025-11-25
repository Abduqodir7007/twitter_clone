import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import WhoToFollow from "../components/WhoToFollow";
import { apiClient } from "../api/client";
import PostCard from "../components/PostCard";

export default function Profile() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState("posts");
    const [userPosts, setUserPosts] = useState([]);
    const [postsLoading, setPostsLoading] = useState(false);
    const [postsError, setPostsError] = useState("");
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [avatarFile, setAvatarFile] = useState(null);

    const [userData, setUserData] = useState({
        first_name: "",
        last_name: "",
        email: "",
        post_count: 0,
        followers: 0,
        following: 0,
        joined_date: new Date().toISOString(),
        image_path: null,
    });

    const [editData, setEditData] = useState({
        first_name: "",
        last_name: "",
    });

    useEffect(() => {
        const token = localStorage.getItem("access_token");
        if (!token) {
            navigate("/login");
            return;
        }

        loadProfile();
    }, [navigate]);

    useEffect(() => {
        if (activeTab === "posts" && !isEditing) {
            loadUserPosts();
        }
    }, [activeTab, isEditing]);

    const loadProfile = async () => {
        setLoading(true);
        setError("");

        try {
            const token = localStorage.getItem("access_token");

            const response = await apiClient.get("/api/auth/me", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            // Use real data from backend
            setUserData({
                ...response,
                joined_date: new Date().toISOString(),
            });

            setEditData({
                first_name: response.first_name,
                last_name: response.last_name,
            });
        } catch (err) {
            setError("Failed to load profile. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const loadUserPosts = async () => {
        setPostsLoading(true);
        setPostsError("");

        try {
            const token = localStorage.getItem("access_token");

            const response = await apiClient.get("/api/auth/user/posts", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            setUserPosts(response);
        } catch (err) {
            setPostsError("Failed to load posts. Please try again.");
        } finally {
            setPostsLoading(false);
        }
    };

    const handleDeletePost = async (postId) => {
        if (!window.confirm("Are you sure you want to delete this post?")) {
            return;
        }

        try {
            const token = localStorage.getItem("access_token");

            const response = await fetch(
                `${apiClient.BASE_URL}/api/post/delete/${postId}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error("Failed to delete post");
            }

            // Remove post from the list
            setUserPosts((prevPosts) =>
                prevPosts.filter((post) => post.id !== postId)
            );

            // Update post count
            setUserData((prev) => ({
                ...prev,
                post_count: Math.max(0, prev.post_count - 1),
            }));
        } catch (err) {
            alert("Failed to delete post. Please try again.");
        }
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

    const capitalizeName = (name) => {
        if (!name) return "";
        return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    };

    const formatJoinDate = (dateString) => {
        const date = new Date(dateString);
        const months = [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December",
        ];
        return `Joined ${months[date.getMonth()]} ${date.getFullYear()}`;
    };

    const handleEditChange = (e) => {
        setEditData({
            ...editData,
            [e.target.name]: e.target.value,
        });
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const extension = file.name.split(".").pop().toLowerCase();

            // Check for unsupported formats
            if (extension === "heic" || extension === "heif") {
                alert(
                    "HEIC/HEIF images are not supported. Please convert to JPG or PNG first."
                );
                e.target.value = "";
                return;
            }

            setAvatarFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCancelEdit = () => {
        setEditData({
            first_name: userData.first_name,
            last_name: userData.last_name,
        });
        setAvatarFile(null);
        setAvatarPreview(null);
        setIsEditing(false);
        setError("");
    };

    const handleSaveEdit = async () => {
        setSaving(true);
        setError("");

        try {
            const token = localStorage.getItem("access_token");
            const formData = new FormData();

            if (editData.first_name) {
                formData.append("first_name", editData.first_name);
            }
            if (editData.last_name) {
                formData.append("last_name", editData.last_name);
            }
            if (avatarFile) {
                formData.append("profile_picture", avatarFile);
            }

            const response = await fetch(
                `${apiClient.BASE_URL}/api/auth/me/update`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: formData,
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw { status: response.status, data: errorData };
            }

            // Update local state with new data
            setUserData({
                ...userData,
                ...editData,
            });
            setAvatarFile(null);
            setAvatarPreview(null);
            setIsEditing(false);

            // Show success message
            alert("Profile updated successfully!");

            // Reload profile to get fresh data including new avatar path
            loadProfile();
        } catch (err) {
            if (err.status === 422) {
                const validationError =
                    err.data?.detail?.[0]?.msg ||
                    "Invalid input. Please check your information.";
                setError(`Validation error: ${validationError}`);
            } else if (err.status === 401) {
                setError("Session expired. Please login again.");
            } else {
                setError("Failed to update profile. Please try again.");
            }
        } finally {
            setSaving(false);
        }
    };

    const tabs = [
        { id: "posts", label: "Posts" },
        { id: "replies", label: "Replies" },
        { id: "highlights", label: "Highlights" },
        { id: "articles", label: "Articles" },
        { id: "media", label: "Media" },
        { id: "likes", label: "Likes" },
    ];

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
                    <div className="p-4">
                        <div className="flex items-center space-x-8">
                            <button
                                onClick={() => navigate(-1)}
                                className="p-2 rounded-full transition hover:bg-gray-900"
                            >
                                <svg
                                    className="w-5 h-5"
                                    style={{ color: "#e8eaeb" }}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M10 19l-7-7m0 0l7-7m-7 7h18"
                                    />
                                </svg>
                            </button>
                            <div>
                                <h2
                                    className="text-xl font-bold"
                                    style={{ color: "#e8eaeb" }}
                                >
                                    {capitalizeName(userData.first_name)}{" "}
                                    {capitalizeName(userData.last_name)}
                                </h2>
                                <p
                                    className="text-sm"
                                    style={{ color: "#8b8b8b" }}
                                >
                                    {userData.post_count} posts
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div
                        className="p-8 text-center"
                        style={{ color: "#8b8b8b" }}
                    >
                        <div
                            className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto"
                            style={{ borderColor: "#1d9bf0" }}
                        ></div>
                        <p className="mt-4">Loading profile...</p>
                    </div>
                ) : (
                    <div>
                        {/* Cover & Profile Picture */}
                        <div className="relative">
                            {/* Cover Photo Placeholder */}
                            <div
                                className="h-48"
                                style={{ backgroundColor: "#333639" }}
                            ></div>

                            {/* Profile Picture */}
                            <div className="absolute -bottom-16 left-4">
                                <div
                                    className="w-32 h-32 rounded-full flex items-center justify-center text-4xl font-bold border-4"
                                    style={{
                                        backgroundColor: "#1d9bf0",
                                        color: "#e8eaeb",
                                        borderColor: "#000000",
                                        backgroundImage: userData.image_path
                                            ? `url(${apiClient.BASE_URL}/${userData.image_path})`
                                            : "none",
                                        backgroundSize: "cover",
                                        backgroundPosition: "center",
                                    }}
                                    onError={(e) => {
                                        // If image fails to load, show initials
                                        e.currentTarget.style.backgroundImage =
                                            "none";
                                    }}
                                >
                                    {!userData.image_path &&
                                    userData.first_name &&
                                    userData.last_name
                                        ? `${userData.first_name[0].toUpperCase()}${userData.last_name[0].toUpperCase()}`
                                        : !userData.image_path
                                        ? "?"
                                        : ""}
                                </div>
                            </div>

                            {/* Edit Profile Button */}
                            {!isEditing && (
                                <div className="absolute top-4 right-4">
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="px-4 py-2 rounded-full font-semibold transition"
                                        style={{
                                            border: "1px solid #536471",
                                            color: "#e8eaeb",
                                            backgroundColor: "transparent",
                                        }}
                                        onMouseEnter={(e) =>
                                            (e.currentTarget.style.backgroundColor =
                                                "rgba(239, 243, 244, 0.1)")
                                        }
                                        onMouseLeave={(e) =>
                                            (e.currentTarget.style.backgroundColor =
                                                "transparent")
                                        }
                                    >
                                        Edit profile
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Profile Info */}
                        <div className="mt-20 px-4 pb-4">
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

                            {isEditing ? (
                                /* Edit Mode */
                                <div className="space-y-4">
                                    {/* Avatar Upload */}
                                    <div>
                                        <label
                                            className="block text-sm font-medium mb-2"
                                            style={{ color: "#8b8b8b" }}
                                        >
                                            Profile Picture
                                        </label>
                                        <div className="flex items-center space-x-4">
                                            <div
                                                className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold border-2"
                                                style={{
                                                    backgroundColor: "#1d9bf0",
                                                    color: "#e8eaeb",
                                                    borderColor: "#2f3336",
                                                    backgroundImage:
                                                        avatarPreview ||
                                                        (userData.image_path
                                                            ? `url(${apiClient.BASE_URL}/${userData.image_path})`
                                                            : "none"),
                                                    backgroundSize: "cover",
                                                    backgroundPosition:
                                                        "center",
                                                }}
                                            >
                                                {!avatarPreview &&
                                                !userData.image_path &&
                                                userData.first_name &&
                                                userData.last_name
                                                    ? `${userData.first_name[0].toUpperCase()}${userData.last_name[0].toUpperCase()}`
                                                    : ""}
                                            </div>
                                            <input
                                                type="file"
                                                accept="image/jpeg,image/png,image/gif,image/webp"
                                                onChange={handleAvatarChange}
                                                className="text-sm"
                                                style={{ color: "#e8eaeb" }}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label
                                            className="block text-sm font-medium mb-2"
                                            style={{ color: "#8b8b8b" }}
                                        >
                                            First Name
                                        </label>
                                        <input
                                            type="text"
                                            name="first_name"
                                            value={editData.first_name}
                                            onChange={handleEditChange}
                                            className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            style={{
                                                backgroundColor: "#1a1a1a",
                                                color: "#e8eaeb",
                                                border: "1px solid #2f3336",
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label
                                            className="block text-sm font-medium mb-2"
                                            style={{ color: "#8b8b8b" }}
                                        >
                                            Last Name
                                        </label>
                                        <input
                                            type="text"
                                            name="last_name"
                                            value={editData.last_name}
                                            onChange={handleEditChange}
                                            className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            style={{
                                                backgroundColor: "#1a1a1a",
                                                color: "#e8eaeb",
                                                border: "1px solid #2f3336",
                                            }}
                                        />
                                    </div>

                                    <div className="flex space-x-3 pt-4">
                                        <button
                                            onClick={handleSaveEdit}
                                            disabled={saving}
                                            className="px-6 py-2 rounded-full font-semibold transition"
                                            style={{
                                                backgroundColor: saving
                                                    ? "#0e4465"
                                                    : "#1d9bf0",
                                                color: "#e8eaeb",
                                            }}
                                        >
                                            {saving ? "Saving..." : "Save"}
                                        </button>
                                        <button
                                            onClick={handleCancelEdit}
                                            disabled={saving}
                                            className="px-6 py-2 rounded-full font-semibold transition"
                                            style={{
                                                border: "1px solid #536471",
                                                color: "#e8eaeb",
                                                backgroundColor: "transparent",
                                            }}
                                            onMouseEnter={(e) =>
                                                (e.currentTarget.style.backgroundColor =
                                                    "rgba(239, 243, 244, 0.1)")
                                            }
                                            onMouseLeave={(e) =>
                                                (e.currentTarget.style.backgroundColor =
                                                    "transparent")
                                            }
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                /* View Mode */
                                <div>
                                    <h1
                                        className="text-xl font-bold"
                                        style={{ color: "#e8eaeb" }}
                                    >
                                        {capitalizeName(userData.first_name)}{" "}
                                        {capitalizeName(userData.last_name)}
                                    </h1>
                                    <p
                                        className="text-sm mt-1"
                                        style={{ color: "#8b8b8b" }}
                                    >
                                        @{userData.email.split("@")[0]}
                                    </p>

                                    {/* Join Date */}
                                    <div
                                        className="flex items-center mt-3 text-sm"
                                        style={{ color: "#8b8b8b" }}
                                    >
                                        <svg
                                            className="w-4 h-4 mr-1"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                            />
                                        </svg>
                                        {formatJoinDate(userData.joined_date)}
                                    </div>

                                    {/* Following/Followers */}
                                    <div className="flex space-x-6 mt-3">
                                        <div className="hover:underline cursor-pointer">
                                            <span
                                                className="font-bold"
                                                style={{ color: "#e8eaeb" }}
                                            >
                                                {userData.following || 0}
                                            </span>
                                            <span
                                                className="text-sm ml-1"
                                                style={{ color: "#8b8b8b" }}
                                            >
                                                Following
                                            </span>
                                        </div>
                                        <div className="hover:underline cursor-pointer">
                                            <span
                                                className="font-bold"
                                                style={{ color: "#e8eaeb" }}
                                            >
                                                {userData.followers || 0}
                                            </span>
                                            <span
                                                className="text-sm ml-1"
                                                style={{ color: "#8b8b8b" }}
                                            >
                                                Followers
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Tabs */}
                        {!isEditing && (
                            <div
                                className="border-b"
                                style={{ borderColor: "#2f3336" }}
                            >
                                <div className="flex">
                                    {tabs.map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className="flex-1 px-4 py-4 text-sm font-semibold transition hover:bg-gray-900"
                                            style={{
                                                color:
                                                    activeTab === tab.id
                                                        ? "#e8eaeb"
                                                        : "#8b8b8b",
                                                borderBottom:
                                                    activeTab === tab.id
                                                        ? "4px solid #1d9bf0"
                                                        : "4px solid transparent",
                                            }}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Tab Content */}
                        {!isEditing && (
                            <div>
                                {activeTab === "posts" ? (
                                    <div>
                                        {postsLoading ? (
                                            <div
                                                className="p-8 text-center"
                                                style={{ color: "#8b8b8b" }}
                                            >
                                                <div
                                                    className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto"
                                                    style={{
                                                        borderColor: "#1d9bf0",
                                                    }}
                                                ></div>
                                                <p className="mt-4">
                                                    Loading posts...
                                                </p>
                                            </div>
                                        ) : postsError ? (
                                            <div
                                                className="p-8 text-center"
                                                style={{ color: "#f4212e" }}
                                            >
                                                <p>{postsError}</p>
                                            </div>
                                        ) : userPosts.length === 0 ? (
                                            <div
                                                className="p-8 text-center"
                                                style={{ color: "#8b8b8b" }}
                                            >
                                                <p className="text-2xl font-bold mb-2">
                                                    No posts yet
                                                </p>
                                                <p className="text-sm">
                                                    When you post, they'll show
                                                    up here.
                                                </p>
                                            </div>
                                        ) : (
                                            userPosts.map((post) => (
                                                <div
                                                    key={post.id}
                                                    className="relative"
                                                >
                                                    <PostCard
                                                        post={post}
                                                        onReply={(post) => {
                                                            console.log(
                                                                "Reply to post:",
                                                                post.id
                                                            );
                                                        }}
                                                    />
                                                    {/* Delete Button - Only on profile page */}
                                                    <button
                                                        onClick={() =>
                                                            handleDeletePost(
                                                                post.id
                                                            )
                                                        }
                                                        className="absolute top-4 right-4 p-2 rounded-full transition hover:bg-red-900/20"
                                                        title="Delete post"
                                                    >
                                                        <svg
                                                            className="w-5 h-5"
                                                            style={{
                                                                color: "#f4212e",
                                                            }}
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                            />
                                                        </svg>
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                ) : (
                                    <div
                                        className="p-8 text-center"
                                        style={{ color: "#8b8b8b" }}
                                    >
                                        <p>No {activeTab} yet</p>
                                        <p className="text-sm mt-2">
                                            Content will appear here when
                                            available
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
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
