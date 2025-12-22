from pydantic import BaseModel, field_serializer
from uuid import UUID


class OpenChatRequest(BaseModel):
    id: UUID

    @field_serializer("recipeint_id")
    def serialize_id(cls, id: UUID) -> str:
        return str(id)
