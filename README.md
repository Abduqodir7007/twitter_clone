# 🚀 Full-Stack Social Media App

A modern social media application built with **FastAPI** (backend) and **React + Vite** (frontend). Features include user authentication, posts with images, likes, comments, follow system, and real-time updates.

---

## 📋 Table of Contents

-   [Features](#-features)
-   [Tech Stack](#-tech-stack)
-   [Project Structure](#-project-structure)
-   [Prerequisites](#-prerequisites)
-   [Installation](#-installation)
-   [Running the Application](#-running-the-application)
-   [Environment Variables](#-environment-variables)
-   [API Documentation](#-api-documentation)
-   [Contributing](#-contributing)

---

## ✨ Features

### User Features

-   ✅ User registration and login with JWT authentication
-   ✅ Profile management with avatar upload
-   ✅ View and edit profile information
-   ✅ Follow/unfollow other users
-   ✅ View followers and following counts

### Post Features

-   ✅ Create posts with text and images
-   ✅ Like/unlike posts
-   ✅ View post like counts
-   ✅ Delete your own posts
-   ✅ Real-time feed updates

### UI/UX

-   ✅ Dark theme (Twitter/X inspired design)
-   ✅ Responsive layout
-   ✅ Real-time notifications
-   ✅ "Who to follow" recommendations
-   ✅ Image preview before upload

---

## 🛠 Tech Stack

### Backend

-   **FastAPI** - Modern Python web framework
-   **PostgreSQL** - Database
-   **SQLAlchemy** - ORM (async)
-   **Alembic** - Database migrations
-   **Pydantic** - Data validation
-   **JWT** - Authentication
-   **Uvicorn** - ASGI server

### Frontend

-   **React 18** - UI library
-   **Vite** - Build tool
-   **Tailwind CSS** - Styling
-   **React Router** - Navigation
-   **Fetch API** - HTTP requests

---

## 📁 Project Structure

```
full-stack-app/
├── backend/
│   ├── app/
│   │   ├── endpoints/
│   │   │   ├── auth.py          # Auth endpoints
│   │   │   └── post.py          # Post endpoints
│   │   ├── models/
│   │   │   ├── user.py          # User model
│   │   │   └── posts.py         # Post model
│   │   ├── schemas/
│   │   │   ├── user.py          # User schemas
│   │   │   └── post.py          # Post schemas
│   │   ├── database.py          # Database config
│   │   ├── config.py            # App config
│   │   └── utils.py             # Utilities
│   ├── alembic/                 # Database migrations
│   ├── uploads/images/          # User uploads (gitignored)
│   ├── main.py                  # FastAPI app entry
│   ├── requirements.txt         # Python dependencies
│   └── .env                     # Environment variables
│
├── src/
│   ├── components/
│   │   ├── Sidebar.jsx          # Navigation sidebar
│   │   ├── PostCard.jsx         # Post display component
│   │   ├── PostComposer.jsx     # Create post form
│   │   └── WhoToFollow.jsx      # Follow suggestions
│   ├── pages/
│   │   ├── Login.jsx            # Login page
│   │   ├── Register.jsx         # Registration page
│   │   ├── Home.jsx             # Home feed
│   │   └── Profile.jsx          # User profile
│   ├── api/
│   │   └── client.js            # API client
│   ├── App.jsx                  # Main app component
│   └── main.jsx                 # React entry point
│
├── .gitignore                   # Git ignore rules
├── package.json                 # Node dependencies
├── tailwind.config.js           # Tailwind config
├── vite.config.js               # Vite config
└── README.md                    # This file
```

---

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

-   **Python 3.10+**
-   **Node.js 18+** and **npm**
-   **PostgreSQL 14+**
-   **Git**

---

## 🔧 Installation

### 1️⃣ Clone the Repository

```bash
git clone <your-repo-url>
cd full-stack-app
```

### 2️⃣ Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file (see Environment Variables section)
cp .env.example .env  # Or create manually

# Run database migrations
alembic upgrade head
```

### 3️⃣ Frontend Setup

```bash
# Navigate to frontend directory (from project root)
cd ..  # Go back to root
# OR if src is in root:
# Frontend files are in root

# Install dependencies
npm install

# Create .env file
echo "VITE_API_URL=http://localhost:8000" > .env
```

---

## 🚀 Running the Application

### Start Backend Server

```bash
# Make sure you're in backend directory with venv activated
cd backend
.venv\Scripts\activate  # Windows
# or
source .venv/bin/activate  # macOS/Linux

# Run FastAPI server
uvicorn main:app --reload

# Backend will run on: http://localhost:8000
# API docs available at: http://localhost:8000/docs
```

### Start Frontend Server

```bash
# In a new terminal, from project root
npm run dev

# Frontend will run on: http://localhost:3000
```

### Access the Application

-   **Frontend:** http://localhost:3000
-   **Backend API:** http://localhost:8000
-   **API Documentation:** http://localhost:8000/docs

---
