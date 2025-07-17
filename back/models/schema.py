from pydantic import BaseModel
from typing import Optional 

class DiaryRequest(BaseModel):
    diary_text: str
    font_path: Optional[str] = "NanumGothic.ttf"
    user_name: Optional[str] = "나"
    gender: Optional[str] = "female"
