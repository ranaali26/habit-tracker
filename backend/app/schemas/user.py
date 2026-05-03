import uuid
from pydantic import BaseModel, EmailStr

class UserRead(BaseModel):
    id: uuid.UUID
    username: str
    email: EmailStr
    timezone: str

    class Config:
        from_attributes = True