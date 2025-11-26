from sqlalchemy.orm import relationship
from ..database import get_db, Base
from sqlalchemy import Column, Integer, String, UUID, Text, ForeignKey, DateTime
from uuid import uuid4
from datetime import datetime


class Posts(Base):
    __tablename__ = "posts"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True, default=uuid4)
    text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.now())
    image_path = Column(String, nullable=True)

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    user = relationship("Users", back_populates="posts")

    likes = relationship("PostLikes", back_populates="post")


class PostLikes(Base):
    __tablename__ = "post_likes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    user = relationship("Users", back_populates="likes")

    post_id = Column(UUID(as_uuid=True), ForeignKey("posts.id", ondelete="CASCADE"))
    post = relationship(Posts, back_populates="likes")  
