from uuid import uuid4
from datetime import datetime
from sqlalchemy.orm import relationship
from ..database import get_db, Base
from sqlalchemy import (
    Column,
    Integer,
    ForeignKey,
    DateTime,
    Boolean,
    UniqueConstraint,
    UUID,
    Text,
)


class Chat(Base):
    __tablename__ = "chats"

    id = Column(UUID, primary_key=True, default=uuid4)
    is_private = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now())

    user1_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    user2_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    __table_args__ = (
        UniqueConstraint("user1_id", "user2_id", name="unique_private_chat"),
    )


class Message(Base):
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    chat_id = Column(UUID(as_uuid=True), ForeignKey("chats.id", ondelete="CASCADE"))
    sender_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))

    content = Column(Text)
    created_at = Column(DateTime, default=datetime.now())

    is_deleted = Column(Boolean, default=False)


class ChatParticipant(Base):
    __tablename__ = "chat_participants"

    id = Column(UUID, primary_key=True, default=uuid4)
    chat_id = Column(UUID(as_uuid=True), ForeignKey("chats.id", ondelete="CASCADE"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))

    joined_at = Column(DateTime, default=datetime.now())
    last_read_message_id = Column(UUID(as_uuid=True), nullable=True)
