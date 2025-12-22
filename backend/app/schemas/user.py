from pydantic import BaseModel, Field, field_validator, EmailStr
from sqlalchemy import UUID


class UserCreate(BaseModel):
    first_name: str = Field(min_length=3, max_length=25)
    last_name: str = Field(min_length=3, max_length=25)
    email: EmailStr
    password: str = Field(min_length=8)

    @field_validator("first_name")
    def normalize_first_name(cls, value):

        if value.isdigit():
            raise ValueError("First name cannot contain number")
        return value.strip().lower().replace(" ", "")

    @field_validator("last_name")
    def normalize_last_name(cls, value):

        if value.isdigit():
            raise ValueError("Last name cannot contain number")

        return value.strip().lower().replace(" ", "")

    @field_validator("email")
    def normalize_email(cls, value):
        return value.strip().lower()


class UserResponse(BaseModel):
    first_name: str
    last_name: str

    model_config = {"from_attributes": True}


class UserProfileReponse(BaseModel):
    id: str
    first_name: str
    last_name: str
    email: str
    image_path: str | None = None
    post_count: int | None = 0
    followers: int | None = 0
    following: int | None = 0

    model_config = {"from_attributes": True}


class UserLogin(BaseModel):
    email: EmailStr
    password: str

    model_config = {"from_attributes": True}


class UserProfileUpdate(BaseModel):

    first_name: str | None = None
    last_name: str | None = None

    model_config = {"from_attributes": True}


class RefreshTokenRequest(BaseModel):
    refresh_token: str
