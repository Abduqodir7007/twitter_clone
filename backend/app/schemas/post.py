from pydantic import BaseModel, field_serializer
from datetime import datetime
from uuid import UUID
from typing import Optional
from app.schemas.user import UserResponse


class PostResponse(BaseModel):
    id: UUID
    text: str
    user: UserResponse
    likes_count: int | None = 0
    is_liked: bool | None = False
    created_at: datetime
    image_path: Optional[str] = None

    model_config = {"from_attributes": True}

    @field_serializer("id")
    def serialize_id(self, value: UUID) -> str:
        return str(value)
