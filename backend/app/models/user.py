from ..database import Base
from sqlalchemy import Column, String, UUID, Table, ForeignKey
from uuid import uuid4
from sqlalchemy.orm import relationship


followers_table = Table(
    "followers",
    Base.metadata,
    Column("follower_id", ForeignKey("users.id"), primary_key=True),
    Column("followee_id", ForeignKey("users.id"), primary_key=True),
)


class Users(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True, default=uuid4)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    image_path = Column(String, nullable=True)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)

    posts = relationship("Posts", back_populates="user")
    likes = relationship("PostLikes", back_populates="user")

    following = relationship(
        "Users",
        secondary=followers_table,
        primaryjoin=id == followers_table.c.follower_id,
        secondaryjoin=id == followers_table.c.followee_id,
        backref="followers",
    )
