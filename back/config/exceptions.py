"""
전역 예외 처리 및 커스텀 예외
"""
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import logging
from typing import Any, Dict

logger = logging.getLogger(__name__)

# 커스텀 예외 클래스들
class VoiceDiaryException(Exception):
    """기본 음성 일기 예외"""
    def __init__(self, message: str, detail: Any = None):
        self.message = message
        self.detail = detail
        super().__init__(self.message)

class ModelLoadException(VoiceDiaryException):
    """AI 모델 로딩 실패 예외"""
    pass

class EmotionAnalysisException(VoiceDiaryException):
    """감정 분석 실패 예외"""
    pass

class FeedbackGenerationException(VoiceDiaryException):
    """피드백 생성 실패 예외"""
    pass

class DatabaseException(VoiceDiaryException):
    """데이터베이스 연결/조작 실패 예외"""
    pass

class ValidationException(VoiceDiaryException):
    """입력 데이터 검증 실패 예외"""
    pass

# 전역 예외 처리기들
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """입력 데이터 검증 예외 처리"""
    logger.error(f"검증 실패 - {request.url}: {exc.errors()}")
    
    error_messages = []
    is_json_error = False
    
    for error in exc.errors():
        field = " -> ".join(str(loc) for loc in error["loc"])
        message = error["msg"]
        error_type = error.get("type", "")
        
        # JSON 파싱 오류 감지
        if "json_invalid" in error_type or "Invalid control character" in message:
            is_json_error = True
            error_messages.append(f"JSON 형식 오류: 텍스트에 허용되지 않는 제어 문자가 포함되어 있습니다.")
        else:
            error_messages.append(f"{field}: {message}")
    
    # JSON 파싱 오류인 경우 특별한 처리
    if is_json_error:
        return JSONResponse(
            status_code=400,
            content={
                "error": "JSON 파싱 오류",
                "message": "요청 데이터에 허용되지 않는 문자가 포함되어 있습니다.",
                "details": [
                    "텍스트에 탭, 제어 문자, 특수 문자가 포함되어 있을 수 있습니다.",
                    "일반적인 텍스트만 사용해주세요.",
                    "복사-붙여넣기 시 숨겨진 제어 문자가 포함될 수 있습니다."
                ],
                "type": "json_parsing_error",
                "suggestion": "텍스트를 다시 입력하거나 불필요한 특수 문자를 제거해주세요."
            }
        )
    
    return JSONResponse(
        status_code=422,
        content={
            "error": "입력 데이터 검증 실패",
            "message": "요청 데이터의 형식이 올바르지 않습니다.",
            "details": error_messages,
            "type": "validation_error"
        }
    )

async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """HTTP 예외 처리"""
    logger.error(f"HTTP 예외 - {request.url}: {exc.status_code} - {exc.detail}")
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": f"HTTP {exc.status_code}",
            "message": exc.detail,
            "type": "http_error"
        }
    )

async def voice_diary_exception_handler(request: Request, exc: VoiceDiaryException):
    """커스텀 음성 일기 예외 처리"""
    logger.error(f"서비스 예외 - {request.url}: {exc.message}")
    
    status_code = 500
    if isinstance(exc, ValidationException):
        status_code = 400
    elif isinstance(exc, (ModelLoadException, EmotionAnalysisException, FeedbackGenerationException)):
        status_code = 503  # Service Unavailable
    elif isinstance(exc, DatabaseException):
        status_code = 500
    
    return JSONResponse(
        status_code=status_code,
        content={
            "error": exc.__class__.__name__,
            "message": exc.message,
            "detail": exc.detail,
            "type": "service_error"
        }
    )

async def general_exception_handler(request: Request, exc: Exception):
    """일반 예외 처리"""
    logger.exception(f"예상치 못한 오류 - {request.url}: {str(exc)}")
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "내부 서버 오류",
            "message": "예상치 못한 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
            "type": "internal_error"
        }
    )

# 에러 응답 표준화 함수
def create_error_response(
    status_code: int,
    error: str,
    message: str,
    detail: Any = None
) -> Dict[str, Any]:
    """표준화된 에러 응답 생성"""
    response = {
        "error": error,
        "message": message,
        "type": "api_error"
    }
    
    if detail is not None:
        response["detail"] = detail
    
    return response

# 성공 응답 표준화 함수  
def create_success_response(
    data: Any,
    message: str = "요청이 성공적으로 처리되었습니다."
) -> Dict[str, Any]:
    """표준화된 성공 응답 생성"""
    return {
        "success": True,
        "message": message,
        "data": data
    } 