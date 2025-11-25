import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import PostCard from "../components/PostCard";
import PostComposer from "../components/PostComposer";
import WhoToFollow from "../components/WhoToFollow";
import { apiClient } from "../api/client";

export default function Home() {
    const navigate = useNavigate();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadPosts = async () => {
        setLoading(true);
        setError("");

        try {
            const token = localStorage.getItem("access_token");

            const response = await apiClient.get("/api/post/", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            setPosts(response);
        } catch (err) {
            setError("Failed to load posts. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Check if user is logged in
        const token = localStorage.getItem("access_token");
        if (!token) {
            navigate("/login");
            return;
        }

        loadPosts();
    }, [navigate]);

    const handlePostCreated = () => {
        // Reload posts when a new post is created
        loadPosts();
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
                    <h2
                        className="text-xl font-bold p-4"
                        style={{ color: "#e8eaeb" }}
                    >
                        Home
                    </h2>
                </div>

                {/* Post Composer */}
                <PostComposer onPostCreated={handlePostCreated} />

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

                {/* Posts Feed */}
                <div>
                    {loading ? (
                        <div
                            className="p-8 text-center"
                            style={{ color: "#8b8b8b" }}
                        >
                            <div
                                className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto"
                                style={{ borderColor: "#1d9bf0" }}
                            ></div>
                            <p className="mt-4">Loading posts...</p>
                        </div>
                    ) : posts.length === 0 ? (
                        <div
                            className="p-8 text-center"
                            style={{ color: "#8b8b8b" }}
                        >
                            <p>No posts yet. Be the first to post!</p>
                        </div>
                    ) : (
                        posts.map((post) => (
                            <PostCard
                                key={post.id}
                                post={post}
                                onReply={(post) => {
                                    // TODO: Open reply modal
                                    console.log("Reply to post:", post.id);
                                }}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* Right Sidebar */}
            <div className="hidden lg:block w-80 p-4">
                <WhoToFollow />
            </div>
        </div>
    );
}
