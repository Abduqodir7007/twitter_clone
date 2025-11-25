from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.endpoints import auth, post
from contextlib import asynccontextmanager
from app.database import Base, engine
import os


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield


app = FastAPI(title="STEAM Project", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if os.path.exists("uploads"):
    app.mount(
        "/uploads", StaticFiles(directory="uploads"), name="uploads"
    )  # Learn to handel static files

app.include_router(auth.router, prefix="/api")
app.include_router(post.router, prefix="/api")
