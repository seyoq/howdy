"""
애플리케이션 설정 관리
"""
import os
from pydantic_settings import BaseSettings
from typing import Optional, List

class Settings(BaseSettings):
    """애플리케이션 설정 클래스"""
    
    # 서버 설정
    app_name: str = "음성 인식 일기 백엔드"
    app_version: str = "1.0.0"
    debug: bool = True
    
    # CORS 설정
    cors_origins: List[str] = ["*"]  # 프로덕션에서는 특정 도메인으로 제한
    cors_allow_credentials: bool = True
    cors_allow_methods: List[str] = ["*"]
    cors_allow_headers: List[str] = ["*"]
    
    # 테스트 모드 설정
    test_mode: bool = True  # DB 연결 없이 테스트 모드로 실행
    
    # Firebase 설정
    firebase_credentials_path: str = "firebase-credentials.json"
    firebase_project_id: str = "voice-diary-project"
    firebase_database_url: Optional[str] = None
    
    # AI 모델 설정
    kogpt_model_name: str = "skt/kogpt2-base-v2"
    
    # OpenAI API 설정
    openai_api_key: Optional[str] = None
    
    # Groq API 설정
    groq_api_key: Optional[str] = None
    
    # API 설정
    max_text_length: int = 1000
    
    # 감정 라벨 설정
    emotion_labels: list = [
        "기쁨", "슬픔", "분노", "두려움", "놀람", "혐오", "중성"
    ]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

# 전역 설정 인스턴스
settings = Settings() 