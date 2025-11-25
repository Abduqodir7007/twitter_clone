import { useNavigate, useLocation } from "react-router-dom";

export default function Sidebar() {
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        navigate("/login");
    };

    const menuItems = [
        {
            name: "Home",
            path: "/home",
            icon: (
                <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                </svg>
            ),
        },
        {
            name: "Explore",
            path: "/explore",
            icon: (
                <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                </svg>
            ),
            disabled: true,
        },
        {
            name: "Profile",
            path: "/profile",
            icon: (
                <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                </svg>
            ),
            disabled: false,
        },
    ];

    return (
        <div
            className="w-64 h-screen sticky top-0 flex flex-col"
            style={{
                backgroundColor: "#000000",
                borderRight: "1px solid #2f3336",
            }}
        >
            <div className="p-4">
                <h1 className="text-2xl font-bold" style={{ color: "#1d9bf0" }}>
                    Social App
                </h1>
            </div>

            <nav className="flex-1 px-2 py-4 space-y-2">
                {menuItems.map((item) => (
                    <button
                        key={item.name}
                        onClick={() => !item.disabled && navigate(item.path)}
                        disabled={item.disabled}
                        className={`w-full flex items-center space-x-4 px-4 py-3 rounded-full transition ${
                            location.pathname === item.path
                                ? "font-semibold"
                                : item.disabled
                                ? "cursor-not-allowed"
                                : ""
                        }`}
                        style={{
                            backgroundColor:
                                location.pathname === item.path
                                    ? "#1a1a1a"
                                    : "transparent",
                            color: item.disabled ? "#5b5b5b" : "#e8eaeb",
                        }}
                        onMouseEnter={(e) => {
                            if (
                                !item.disabled &&
                                location.pathname !== item.path
                            ) {
                                e.currentTarget.style.backgroundColor =
                                    "#1a1a1a";
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (location.pathname !== item.path) {
                                e.currentTarget.style.backgroundColor =
                                    "transparent";
                            }
                        }}
                    >
                        {item.icon}
                        <span className="text-lg">{item.name}</span>
                    </button>
                ))}
            </nav>

            <div className="p-4" style={{ borderTop: "1px solid #2f3336" }}>
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-4 px-4 py-3 rounded-full transition"
                    style={{ color: "#f4212e" }}
                    onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = "#1a0f0f")
                    }
                    onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "transparent")
                    }
                >
                    <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                    </svg>
                    <span className="text-lg">Logout</span>
                </button>
            </div>
        </div>
    );
}
