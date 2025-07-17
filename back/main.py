from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import tempfile
import whisper
import librosa
import soundfile as sf
import logging
import uvicorn
import numpy as np
import torch
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException
import uvicorn
import logging
# from routers import emotion, diary, feedback, statistics
# from config.database import db_manager
# from config.settings import settings
# from config.exceptions import (
#     validation_exception_handler,
#     http_exception_handler,
#     voice_diary_exception_handler,
#     general_exception_handler,
#     VoiceDiaryException
# )
# 로깅 설정
from fastapi import FastAPI
from pydantic import BaseModel
from PIL import Image, ImageDraw, ImageFont
import openai
import requests
import uuid
import io
import os
import textwrap
import time
import dotenv
from fastapi import UploadFile, File
from typing import List
from fastapi.responses import JSONResponse
from openai import OpenAI
from dotenv import load_dotenv
load_dotenv()
import firebase_admin
from firebase_admin import credentials, storage
cred = credentials.Certificate("diaryemo-5e11e-firebase-adminsdk-fbsvc-3960bbf582.json")

firebase_admin.initialize_app(cred, {
    'storageBucket': 'diaryemo-5e11e.firebasestorage.app'
})

bucket = storage.bucket()
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

whisper_model = None

@app.on_event("startup")
async def startup_event():
    """애플리케이션 시작 시 실행"""
    try:
        await db_manager.connect_to_database()
        logger.info("데이터베이스 연결 완료")
    except Exception as e:
        logger.warning(f"데이터베이스 연결 실패 (테스트 모드로 실행): {e}")
    
    # OpenAI API 피드백 생성기 초기화 (Mock 버전에서는 주석 처리)
    # try:
    #     await feedback_generator.load_model()
    #     logger.info("OpenAI API 피드백 생성기 초기화 완료")
    # except Exception as e:
    #     logger.error(f"OpenAI API 피드백 생성기 초기화 실패: {e}")
    #     # 피드백 생성기 없이도 서버 시작 가능 (fallback 사용)
    #     logger.info("fallback 피드백 생성기를 사용하여 서버 시작")
    logger.info("Mock 서비스로 서버 시작")
    
    logger.info("음성 인식 일기 백엔드 서버 시작 완료")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def load_whisper_model():
    """OpenAI Whisper 모델 로드 (패딩 문제 없음)"""
    global whisper_model
    try:
        logger.info("OpenAI Whisper 모델을 로드하는 중...")
        
        # GPU 사용 가능 여부 확인
        device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"사용 중인 디바이스: {device}")
        
        # Whisper 모델 로드 (tiny 모델 - 빠르고 안정적)
        whisper_model = whisper.load_model("tiny", device=device)
        
        logger.info("OpenAI Whisper 모델 로드 완료!")
        return True
    except Exception as e:
        logger.error(f"Whisper 모델 로드 실패: {e}")
        return False

def preprocess_audio_simple(audio_data):
    """간단한 오디오 전처리"""
    try:
        # 임시 파일에 오디오 데이터 저장
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
            temp_file.write(audio_data)
            temp_file_path = temp_file.name
        
        try:
            # 오디오 로드 및 기본 전처리
            audio, sr = librosa.load(temp_file_path, sr=16000)
            
            # 기본 정보 로깅
            duration = len(audio) / sr
            logger.info(f"오디오 길이: {duration:.2f}초")
            
            # 너무 짧은 오디오 처리
            if duration < 0.1:
                logger.warning("오디오가 너무 짧습니다. 0.5초로 패딩합니다.")
                target_length = int(0.5 * sr)
                audio = np.pad(audio, (0, max(0, target_length - len(audio))), 'constant')
            
            # 너무 긴 오디오 처리 (30초로 제한)
            if duration > 30:
                audio = audio[:30*sr]
                logger.info("오디오를 30초로 자름")
            
            # 볼륨 정규화
            if np.max(np.abs(audio)) > 0:
                audio = audio / np.max(np.abs(audio)) * 0.95
            
            # 처리된 오디오 저장
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as processed_temp:
                sf.write(processed_temp.name, audio, sr)
                processed_path = processed_temp.name
            
            # 원본 임시 파일 삭제
            os.unlink(temp_file_path)
            
            logger.info(f"오디오 전처리 완료: {len(audio)/sr:.2f}초")
            return processed_path
            
        except Exception as preprocessing_error:
            logger.error(f"오디오 전처리 실패: {preprocessing_error}")
            return temp_file_path
            
    except Exception as e:
        logger.error(f"오디오 전처리 중 오류: {e}")
        return None

def transcribe_audio(audio_file_path):
    """OpenAI Whisper로 음성 인식 (패딩 문제 없음)"""
    try:
        if whisper_model is None:
            return "Whisper 모델이 로드되지 않았습니다."
        
        # 파일 크기 확인
        file_size = os.path.getsize(audio_file_path)
        logger.info(f"음성 인식할 파일 크기: {file_size} bytes")
        
        if file_size < 1000:
            return "오디오 파일이 너무 작습니다. 더 길게 녹음해주세요."
        
        if file_size > 25 * 1024 * 1024:  # 25MB 제한
            return "오디오 파일이 너무 큽니다. 더 짧게 녹음해주세요."
        
        # OpenAI Whisper로 음성 인식
        logger.info("OpenAI Whisper로 음성 인식 시작...")
        
        # 옵션 설정
        options = {
            "language": "ko",  # 한국어 설정
            "task": "transcribe",
            "fp16": torch.cuda.is_available(),  # GPU 사용 시 fp16 활성화
            "no_speech_threshold": 0.6,
            "logprob_threshold": -1.0,
            "condition_on_previous_text": False,  # 이전 텍스트 조건 비활성화
            "initial_prompt": None,
            "word_timestamps": False
        }
        
        # 음성 인식 실행
        result = whisper_model.transcribe(audio_file_path, **options)
        
        # 결과 텍스트 추출
        text = result.get("text", "").strip()
        
        if text:
            logger.info(f"음성 인식 성공: {text}")
            return text
        else:
            logger.warning("음성 인식 결과가 비어있습니다.")
            return "음성을 인식할 수 없습니다. 더 명확하게 말씀해주세요."
            
    except Exception as e:
        logger.error(f"음성 인식 실패: {e}")
        return "음성 인식 중 오류가 발생했습니다. 다시 시도해주세요."

# @app.get("/")
# async def root():
#     """메인 페이지"""
#     return {
#         'message': 'STT 서버가 실행 중입니다!',
#         'model': 'OpenAI Whisper (패딩 문제 완전 해결)',
#         'version': '2.0.0',
#         'status': 'ready' if whisper_model else 'loading',
#         'docs': '/docs'
#     }

# @app.get("/health")
# async def health_check():
#     """서버 상태 확인"""
#     return {
#         'status': 'healthy',
#         'model_loaded': whisper_model is not None,
#         'device': 'cuda' if torch.cuda.is_available() else 'cpu'
#     }

# @app.post("/api/speech-to-text")
# async def convert_speech(audio: UploadFile = File(...)):
#     """음성을 텍스트로 변환하는 API (OpenAI Whisper 사용)"""
#     try:
#         # 모델 로드 확인
#         if whisper_model is None:
#             raise HTTPException(
#                 status_code=503, 
#                 detail="Whisper 모델이 아직 로드되지 않았습니다. 잠시 후 다시 시도해주세요."
#             )
        
#         # 파일 검증
#         if not audio.filename:
#             raise HTTPException(status_code=400, detail="파일이 선택되지 않았습니다.")
        
#         logger.info(f"음성 파일 수신: {audio.filename}")
        
#         # 오디오 데이터 읽기
#         audio_data = await audio.read()
        
#         # 오디오 전처리
#         processed_audio_path = preprocess_audio_simple(audio_data)
#         if processed_audio_path is None:
#             raise HTTPException(status_code=400, detail="오디오 전처리 실패")
        
#         try:
#             # 음성 인식 실행
#             text = transcribe_audio(processed_audio_path)
            
#             return {
#                 'success': True,
#                 'text': text,
#                 'message': '음성 변환이 완료되었습니다.'
#             }
            
#         finally:
#             # 임시 파일 정리
#             if os.path.exists(processed_audio_path):
#                 os.unlink(processed_audio_path)
            
#     except HTTPException:
#         raise
#     except Exception as e:
#         logger.error(f"API 오류: {e}")
#         return JSONResponse(
#             status_code=500,
#             content={
#                 'success': False,
#                 'text': '',
#                 'message': f'서버 오류가 발생했습니다: {str(e)}'
#             }
#         )

# 서버 시작 시 모델 로드
@app.on_event("startup")
async def startup_event():
    """서버 시작 시 실행"""
    logger.info("=" * 50)
    logger.info("STT 서버 시작 중...")
    logger.info("OpenAI Whisper 사용 (패딩 문제 해결)")
    logger.info("=" * 50)
    
    success = load_whisper_model()
    if not success:
        logger.error("❌ Whisper 모델 로드 실패!")
        logger.error("서버는 시작되지만 STT 기능을 사용할 수 없습니다.")
    else:
        logger.info("✅ Whisper 모델 로드 완료!")
        logger.info("서버 준비 완료!")
    
    logger.info("=" * 50)
    logger.info("서버 주소: http://localhost:8000")
    logger.info("API 엔드포인트: /api/speech-to-text")
    logger.info("API 문서: http://localhost:8000/docs")
    logger.info("=" * 50)

# if __name__ == "__main__":
#     uvicorn.run(app, host="0.0.0.0", port=8000)
























# AI 모델 임포트 (Mock 버전)
# from services.feedback_generator import feedback_generator

# 로깅 설정
# logging.basicConfig(
#     level=logging.INFO,
#     format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
# )
# logger = logging.getLogger(__name__)

# app = FastAPI(
#     title="음성 인식 일기 백엔드 API",
#     description="""
#     ## 음성 인식 기반 일기 서비스 🎤📖
    
#     한국어 음성 인식으로 작성한 텍스트를 기반으로 감정 분석과 AI 피드백을 제공하는 일기 서비스입니다.
    
#     ### 주요 기능
#     - 🤖 **KoBERT/KoELECTRA 감정 분석**: 7가지 감정 분류 (기쁨, 슬픔, 분노, 두려움, 놀람, 혐오, 중성)
#     - 💬 **KoGPT 공감 피드백**: 공감형, 격려형, 분석형 3가지 스타일
#     - 📊 **감정 통계 분석**: 일/주/월/년 단위 감정 추이 및 인사이트
#     - 📝 **일기 관리**: CRUD 기능 및 자동 감정 분석/피드백 연동
    
#     ### API 엔드포인트
#     - `/api/v1/emotion/`: 감정 분석 관련 API
#     - `/api/v1/feedback/`: 피드백 생성 관련 API  
#     - `/api/v1/diary/`: 일기 관리 관련 API
#     - `/api/v1/statistics/`: 감정 통계 관련 API
#     """,
#     version="1.0.0",
#     docs_url="/docs",
#     redoc_url="/redoc",
#     openapi_tags=[
#         {
#             "name": "감정분석",
#             "description": "KoBERT/KoELECTRA 모델을 활용한 텍스트 감정 분석"
#         },
#         {
#             "name": "피드백생성", 
#             "description": "KoGPT 모델을 활용한 공감 피드백 생성"
#         },
#         {
#             "name": "일기처리",
#             "description": "Firebase 저장된 일기 데이터 감정 분석/피드백 처리"
#         },
#         {
#             "name": "통계분석",
#             "description": "감정 통계 분석 및 인사이트 제공"
#         }
#     ]
# )



# @app.get("/")
# async def root():
#     """서버 상태 확인 엔드포인트"""
#     return {
#         "message": "음성 인식 일기 백엔드 서버가 정상 동작 중입니다.",
#         "status": "running",
#         "version": "1.0.0",
#         "test_page": "http://localhost:8000/static/index.html",
#         "api_docs": "http://localhost:8000/docs"
#     }

# @app.get("/health")
# async def health_check():
#     """헬스 체크 엔드포인트"""
#     return {"status": "healthy"}

# # 예외 처리기 등록
# app.add_exception_handler(RequestValidationError, validation_exception_handler)
# app.add_exception_handler(StarletteHTTPException, http_exception_handler)
# app.add_exception_handler(VoiceDiaryException, voice_diary_exception_handler)
# app.add_exception_handler(Exception, general_exception_handler)

# @app.on_event("shutdown")
# async def shutdown_event():
#     """애플리케이션 종료 시 실행"""
#     try:
#         await db_manager.close_database_connection()
#         logger.info("음성 인식 일기 백엔드 서버 종료 완료")
#     except Exception as e:
#         logger.error(f"서버 종료 중 오류: {e}")

# # Static 파일 서빙 (테스트 페이지용)
# app.mount("/static", StaticFiles(directory="static"), name="static")

# # 라우터 등록
# app.include_router(emotion.router, prefix="/api/v1/emotion", tags=["감정분석"])
# app.include_router(feedback.router, prefix="/api/v1/feedback", tags=["피드백생성"])
# app.include_router(diary.router, prefix="/api/v1/diary", tags=["일기처리"])
# app.include_router(statistics.router, prefix="/api/v1/statistics", tags=["통계분석"])

# # if __name__ == "__main__":
# #     uvicorn.run(
# #         "main:app",
# #         host="0.0.0.0",
# #         port=8001,
# #         reload=True
# #     ) 




class DiaryRequest(BaseModel):
    diary_text: str
    font_path: str = "NanumGothic.ttf"  # 기본 폰트 경로
    user_name: str = "나"
    gender: str = "여성"  # 기본 성별
def get_script(user_name:str,diary: str) -> list:
    CHARACTER_STYLES = {
    "female": {
        "default": "A kind-looking Korean woman in her 20s with straight black hair, wearing casual indoor clothes.",
    },
    "male": {
        "default": "A calm Korean man in his late 20s with short black hair and glasses, wearing a hoodie.",
    },
}
    prompt = f"""
    
You are a Japanese comic writer INOUE TAKEHIKO. The following diary entry is written by {user_name}.
Do not use speech bubbles.
First, translate the diary entry to fluent English if it's not already in English.
Then, generate a 4-panel wholesome slice-of-life comic scenario only with {CHARACTER_STYLES}.

Each panel must include a 'Scene' and a 'Dialogue' in the following format:

[Panel 1]
Scene: ...
Dialogue: ...

[Panel 2]
...


Diary: {diary}
"""

    res = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
    )
    text = res.choices[0].message.content.strip()
    print("\n========== GPT RESPONSE START ==========")
    print(text)
    print("=========== GPT RESPONSE END ===========\n")

    scenes = []
    for i in range(1, 5):
        start_token = f"[Panel {i}]"
        end_token = f"[Panel {i+1}]" if i < 4 else None

        if start_token not in text:
            raise ValueError(f"{start_token} not found in GPT output.")

        part = text.split(start_token)[1]
        if end_token and end_token in part:
            part = part.split(end_token)[0]

        lines = part.strip().splitlines()
        scene = {"scene": "", "dialogue": ""}
        for line in lines:
            if line.lower().startswith("scene:"):
                scene["scene"] = line.split(":", 1)[-1].strip()
            elif line.lower().startswith("dialogue:"):
                scene["dialogue"] = line.split(":", 1)[-1].strip()
        scenes.append(scene)
    
    return scenes

def translate_text_to_korean(text: str) -> str:
    res = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "user", "content": f"Translate this into comics style natural Korean:\n{text}"}
        ],
        temperature=0.5,
    )
    return res.choices[0].message.content.strip()

# def build_combined_prompt(scenes: list) -> str:
    
#     prompt = "Create a 4-panel wholesome slice-of-life comic. Each panel is described below:\n"
#     for i, scene in enumerate(scenes, 1):
#         prompt += f"[Panel {i}] Scene: {scene['scene']}. Dialogue: {scene['dialogue']}\n"
#     prompt += (
#         "Draw all 4 panels in a single 1024x1024 image, arranged in 2x2 layout. "
#         "Do not include any text for image generation. Asian style art, and consistent korean characters. "
#         "Avoid violence, sensitive topics, or anything that violates content policies."
#     )
#     return prompt



def build_combined_prompt(scenes: list, user_name: str, gender: str) -> str:
    CHARACTER_STYLES = {
    "female": {
        "default": "A sexy-looking Japanese woman in her 20s with straight black hair.",
    },
    "male": {
        "default": "A handsome-looking South Korean man in his 20s with short black hair.",
    },
}
    character_desc = CHARACTER_STYLES.get(gender, {}).get("default", "")
    prompt = (
        f"The main character is {user_name}. "
        f"{character_desc} "
        "Do not use speech bubbles.Create a 4-panel wholesome slice-of-life comic. Each panel is described below:\n"
    )
    for i, scene in enumerate(scenes, 1):
        prompt += f"[Panel {i}] Scene: {scene['scene']}. Dialogue: {scene['dialogue']}\n"
    prompt += (
        "Draw all 4 panels in a single 1024x1024 image, arranged in 2x2 layout. "
        "Do not include any text for image generation. Asian style art, and consistent Korean characters. "
        "Avoid violence, sensitive topics, or anything that violates content policies."
    )
    return prompt


def generate_combined_image(prompt: str, max_retries: int = 3) -> Image.Image:
    for attempt in range(1, max_retries + 1):
        try:
            response = client.images.generate(
                model="dall-e-3",
                prompt=prompt,
                size="1024x1024",
                quality="standard",
                n=1,
                response_format="url",
                style="natural",
            )
            image_url = response.data[0].url
            image_data = requests.get(image_url).content
            return Image.open(io.BytesIO(image_data))
        except openai.BadRequestError as e:
            if "content_policy_violation" in str(e):
                print(f"🚫 Policy violation (attempt {attempt}/{max_retries})")
                if attempt == max_retries:
                    raise RuntimeError("Content policy violation – all retries failed.")
                time.sleep(1)
            else:
                raise

# def add_text_boxes_to_combined_image(
#     img: Image.Image,
#     scenes: list,
#     font_path: str = None,
#     *,
#     font_size: int = 28,
#     box_height_ratio: float = 0.22,
#     padding: int = 20,
#     text_color: str = "black",
#     box_fill: str = "white",
#     box_outline: str = "black",
#     max_chars_per_line: int = 17
# ) -> Image.Image:
#     draw = ImageDraw.Draw(img)
#     font = ImageFont.truetype(font_path, font_size) if font_path else ImageFont.load_default()

#     panel_width = img.width // 2
#     panel_height = img.height // 2
#     box_height = int(panel_height * box_height_ratio)

#     positions = [
#         (0, 0), (panel_width, 0),
#         (0, panel_height), (panel_width, panel_height)
#     ]

#     for idx, (x, y) in enumerate(positions):
#         original_dialogue = scenes[idx]['dialogue']
#         translated = translate_text_to_korean(original_dialogue)
#         wrapped = textwrap.fill(translated, width=max_chars_per_line)
#         lines = wrapped.split("\n")

#         box_top = y + panel_height - box_height
#         box_bottom = y + panel_height
#         draw.rectangle(
#             [x, box_top, x + panel_width, box_bottom],
#             fill=box_fill,
#             outline=box_outline
#         )

#         text_y = box_top + padding
#         for line in lines:
#             draw.text((x + padding, text_y), line, fill=text_color, font=font)
#             text_y += font_size + 6

#     return img

def add_text_boxes_to_combined_image(
    img: Image.Image,
    scenes: list,
    font_path: str = None,
    *,
    base_font_size: int = 28,
    min_font_size: int = 14,
    box_height_ratio: float = 0.22,
    padding: int = 20,
    text_color: str = "black",
    box_fill: str = "white",
    box_outline: str = "white",
    max_chars_per_line: int = 20,
    max_lines: int = 5
) -> Image.Image:
    draw = ImageDraw.Draw(img)
    panel_width = img.width // 2
    panel_height = img.height // 2
    box_height = int(panel_height * box_height_ratio)

    positions = [
        (0, 0), (panel_width, 0),
        (0, panel_height), (panel_width, panel_height)
    ]

    for idx, (x, y) in enumerate(positions):
        original_dialogue = scenes[idx]['dialogue']
        translated = translate_text_to_korean(original_dialogue)

        font_size = base_font_size
        while font_size >= min_font_size:
            font = ImageFont.truetype(font_path, font_size) if font_path else ImageFont.load_default()
            wrapped = textwrap.fill(translated, width=max_chars_per_line)
            lines = wrapped.split('\n')

            total_text_height = len(lines) * (font_size + 6) + padding * 2
            if total_text_height <= box_height:
                break
            font_size -= 2

        if font_size < min_font_size:
            font_size = min_font_size
            font = ImageFont.truetype(font_path, font_size) if font_path else ImageFont.load_default()
            wrapped = textwrap.fill(translated, width=max_chars_per_line)
            lines = wrapped.split('\n')
            if len(lines) > max_lines:
                lines = lines[:max_lines]
                lines[-1] = lines[-1].rstrip() + "..."
        else:
            font = ImageFont.truetype(font_path, font_size) if font_path else ImageFont.load_default()

        box_top = y + panel_height - box_height
        box_bottom = y + panel_height
        draw.rectangle(
            [x, box_top, x + panel_width, box_bottom],
            fill=box_fill,
            outline=box_outline
        )

        text_y = box_top + padding
        for line in lines:
            draw.text((x + padding, text_y), line, fill=text_color, font=font)
            text_y += font_size + 6

    return img


# @app.post("/generate-comic")
# def generate_comic(req: DiaryRequest):
    
#     scenes = get_script(req.user_name, req.diary_text)
#     prompt = build_combined_prompt(scenes, req.user_name, req.gender)
#     comic_img = generate_combined_image(prompt)
#     comic_img = add_text_boxes_to_combined_image(comic_img, scenes, font_path="Danjo-bold-Regular.otf")

#     filename = f"comic_{uuid.uuid4().hex[:8]}.png"
#     output_dir = "outputs"
#     os.makedirs(output_dir, exist_ok=True)
#     output_path = os.path.join(output_dir, filename)
#     comic_img.save(output_path)

#     return {
#     "filename": filename,
#     "url": f"http://localhost:8080/outputs/{filename}",
#     "original_text": req.diary_text
# }

import uuid

@app.post("/generate-comic")
def generate_comic(req: DiaryRequest):
    scenes = get_script(req.user_name, req.diary_text)
    prompt = build_combined_prompt(scenes, req.user_name, req.gender)
    comic_img = generate_combined_image(prompt)
    comic_img = add_text_boxes_to_combined_image(comic_img, scenes, font_path="Danjo-bold-Regular.otf")

    filename = f"comic_{uuid.uuid4().hex[:8]}.png"
    output_dir = "outputs"
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, filename)
    comic_img.save(output_path)

    temp_local_path = output_path
    blob = bucket.blob(f"comics/{filename}")

    blob.upload_from_filename(temp_local_path)
    blob.make_public()
    public_url = blob.public_url

    return {
        "filename": filename,
        "url": public_url,
        "original_text": req.diary_text
    }

@app.post("/api/speech-to-text")
async def speech_to_diary(audio: UploadFile = File(...)):
    """음성을 텍스트로 변환하고 ChatGPT로 일기 형식 정리"""
    try:
        # Whisper 모델 확인
        if whisper_model is None:
            raise HTTPException(
                status_code=503,
                detail="Whisper 모델이 아직 로드되지 않았습니다."
            )
        
        if not audio.filename:
            raise HTTPException(status_code=400, detail="파일이 선택되지 않았습니다.")

        logger.info(f"음성 파일 수신: {audio.filename}")
        audio_data = await audio.read()

        # 오디오 전처리
        processed_audio_path = preprocess_audio_simple(audio_data)
        if processed_audio_path is None:
            raise HTTPException(status_code=400, detail="오디오 전처리 실패")

        try:
            # 1. Whisper로 텍스트 변환
            raw_text = transcribe_audio(processed_audio_path)

            # 2. ChatGPT로 일기 형태로 정리
            diary_text = generate_diary_text(raw_text)

            return {
                'success': True,
                # 'raw_text': raw_text,
                'text': diary_text,
                'message': '음성이 일기 형식으로 정리되었습니다.'
            }

        finally:
            if os.path.exists(processed_audio_path):
                os.unlink(processed_audio_path)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"API 오류: {e}")
        return JSONResponse(
            status_code=500,
            content={
                'success': False,
                
                'text': '',
                'message': f'서버 오류가 발생했습니다: {str(e)}'
            }
        )
def generate_diary_text(text: str) -> str:
    prompt = f"""
    사용자가 대충 음성으로 녹음해서 텍스트로 변환된 내용이에요. 일기로 만들면 되요. 더하거나 덜지 말고 자연스럽게 만드세요. 내용 전체를 표현하는 감정 이모지도 전달하세요.
    "{text}"
    
    일기 형식으로 정리된 글:
    """

    response = openai.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "너는 사용자의 하루를 정리해주는 일기 작가야."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.7,
        max_tokens=600
    )

    return response.choices[0].message.content