"""
OpenAI API 기반 공감 피드백 생성 서비스 (선택사항)
"""
import asyncio
from typing import Dict
import logging
import os
from datetime import datetime
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()

# OpenAI 패키지 선택적 import
try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
    OpenAI_class = OpenAI
except ImportError:
    OPENAI_AVAILABLE = False
    OpenAI_class = None

from models.emotion import EmotionLabel, EmotionAnalysisRequest
from models.feedback import FeedbackGenerationRequest, FeedbackResult, FeedbackResponse
from config.settings import settings

logger = logging.getLogger(__name__)

class OpenAIFeedbackGenerator:
    """OpenAI API 기반 공감 피드백 생성기 (fallback 지원)"""
    
    def __init__(self):
        # OpenAI 클라이언트 초기화
        if OPENAI_AVAILABLE and OpenAI_class is not None:
            api_key = os.getenv("OPENAI_API_KEY")
            print(f"DEBUG: OPENAI_API_KEY found: {bool(api_key)}")
            if api_key:
                print(f"DEBUG: API Key starts with: {api_key[:10]}...")
            else:
                print("DEBUG: No API key found in environment")
                
            if api_key:
                try:
                    self.client = OpenAI_class(api_key=api_key)
                    print("DEBUG: OpenAI client initialized successfully")
                    logger.info("OpenAI API 클라이언트 초기화 성공")
                except Exception as e:
                    print(f"DEBUG: OpenAI client init failed: {e}")
                    logger.error(f"OpenAI 클라이언트 초기화 실패: {e}")
                    self.client = None
            else:
                logger.warning("OPENAI_API_KEY 환경변수가 설정되지 않았습니다.")
                print("OPENAI_API_KEY 환경변수가 설정되지 않았습니다.")
                self.client = None
        else:
            logger.warning("OpenAI 패키지가 설치되지 않았습니다. fallback 피드백을 사용합니다.")
            self.client = None
        
        # 감정별 피드백 컨텍스트
        self.emotion_contexts = {
            EmotionLabel.JOY: {
                "thinking": "분석적이고 논리적인 관점에서 긍정적인 경험을 성찰하고 향후 발전 방향을 제시",
                "feeling": "공감하며 따뜻하게 기쁨을 함께 나누고 격려하는 감정적 지지"
            },
            EmotionLabel.SADNESS: {
                "thinking": "객관적이고 체계적인 분석을 통해 문제 해결 방안을 제시하고 희망적 관점 제공",
                "feeling": "깊이 공감하며 위로하고 함께 있어주는 따뜻한 감정적 지지"
            },
            EmotionLabel.ANGER: {
                "thinking": "분노의 원인을 냉정하게 분석하고 건설적인 해결 방안을 논리적으로 제시",
                "feeling": "화난 감정을 이해하고 공감하며 마음을 달래주는 감정적 지지"
            },
            EmotionLabel.FEAR: {
                "thinking": "두려움의 원인을 분석하고 체계적인 대처 방안을 제시하여 안정감 제공",
                "feeling": "불안한 마음을 이해하고 안심시키며 용기를 주는 감정적 지지"
            },
            EmotionLabel.SURPRISE: {
                "thinking": "예상치 못한 상황을 분석하고 새로운 기회로 활용할 수 있는 방안 제시",
                "feeling": "놀라운 상황에 대해 함께 놀라며 새로운 가능성을 응원하는 지지"
            },
            EmotionLabel.DISGUST: {
                "thinking": "불쾌한 상황을 객관적으로 분석하고 향후 대응 방안을 논리적으로 제시",
                "feeling": "불쾌한 감정을 이해하고 공감하며 마음을 정화시켜주는 감정적 지지"
            },
            EmotionLabel.NEUTRAL: {
                "thinking": "현재 상황을 균형있게 분석하고 향후 계획을 체계적으로 제시",
                "feeling": "평온한 상태를 인정하고 내면의 평화를 격려하는 따뜻한 지지"
            }
        }
    
    async def load_model(self):
        """OpenAI API는 별도 모델 로드가 필요 없음"""
        try:
            # 클라이언트 확인
            if not self.client:
                logger.warning("OpenAI API 키가 설정되지 않았습니다. fallback 피드백을 사용합니다.")
            else:
                logger.info("OpenAI API 피드백 생성기 초기화 완료")
        except Exception as e:
            logger.error(f"OpenAI API 초기화 실패: {e}")
            raise
    
    async def generate_feedback(self, request: FeedbackGenerationRequest) -> FeedbackResponse:
        """공감 피드백 생성 (감정분석 포함)"""
        try:
            # 입력 검증
            if not request.text or not request.text.strip():
                raise ValueError("입력 텍스트가 비어있습니다.")
            
            # 1. 감정분석 먼저 수행
            from services.emotion_service import emotion_service
            emotion_request = EmotionAnalysisRequest(text=request.text, user_id=request.user_id)
            emotion_result = await emotion_service.analyze_emotion(emotion_request)
            detected_emotion = emotion_result.primary_emotion
            
            # 2. 피드백 생성 (OpenAI API 또는 fallback 사용)
            if self.client:
                try:
                    feedback_text = await self._generate_openai_feedback(request, detected_emotion)
                    model_used = "openai_gpt"
                    confidence = 0.95
                except Exception as e:
                    logger.warning(f"OpenAI API 피드백 생성 실패, fallback 사용: {e}")
                    feedback_text = self._get_fallback_feedback(detected_emotion, request.style)
                    model_used = "fallback"
                    confidence = 0.8
            else:
                logger.info("OpenAI API 키가 없어 fallback 피드백 사용")
                feedback_text = self._get_fallback_feedback(detected_emotion, request.style)
                model_used = "fallback"
                confidence = 0.8
            
            # 3. 응답 생성
            response = FeedbackResponse(
                feedback_text=feedback_text,
                style=request.style,
                confidence=confidence,
                model_used=model_used
            )
            
            logger.info(f"피드백 생성 완료: {detected_emotion} ({request.style}) - {model_used}")
            return response
            
        except Exception as e:
            logger.error(f"피드백 생성 실패: {e}")
            # 최종 안전 장치
            return FeedbackResponse(
                feedback_text="죄송합니다. 피드백 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
                style=request.style,
                confidence=0.5,
                model_used="error_fallback"
            )
    
    async def _generate_openai_feedback(self, request: FeedbackGenerationRequest, emotion: EmotionLabel) -> str:
        """OpenAI API를 사용한 피드백 생성"""
        try:
            # 클라이언트 확인
            if not self.client:
                raise RuntimeError("OpenAI 클라이언트가 초기화되지 않았습니다.")
            
            # 스타일별 시스템 프롬프트 생성
            context = self.emotion_contexts.get(emotion, self.emotion_contexts[EmotionLabel.NEUTRAL])
            style_context = context[request.style]
            
            # 시스템 프롬프트 구성
            system_prompt = f"""
당신은 전문적이고 공감적인 심리 상담사입니다. 
사용자의 감정과 상황을 깊이 이해하고, {style_context}하는 피드백을 제공해주세요.

감정: {emotion.value}
스타일: {request.style}

피드백 조건:
1. 한국어로 자연스럽게 작성
2. 3-5문장 정도의 적절한 길이
3. 사용자의 감정을 인정하고 공감
4. 건설적이고 도움이 되는 내용
5. 따뜻하고 진심어린 톤
"""
            
            # 사용자 프롬프트
            user_prompt = f"다음 일기 내용에 대해 피드백을 해주세요:\n\n{request.text}"
            
            # OpenAI API 호출
            response = await asyncio.to_thread(
                self.client.chat.completions.create,
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=300,
                temperature=0.7,
                top_p=1.0,
                frequency_penalty=0.0,
                presence_penalty=0.0
            )
            
            # 응답 텍스트 추출
            feedback_text = response.choices[0].message.content
            if not feedback_text:
                raise RuntimeError("OpenAI API에서 빈 응답을 받았습니다.")
            
            feedback_text = feedback_text.strip()
            
            return feedback_text
            
        except Exception as e:
            logger.error(f"OpenAI API 피드백 생성 실패: {e}")
            # 예외를 다시 발생시켜 상위에서 처리하도록 함
            raise
    
    def _get_fallback_feedback(self, emotion: EmotionLabel, style: str) -> str:
        """OpenAI API 실패 시 기본 피드백"""
        fallback_messages = {
            EmotionLabel.JOY: {
                "thinking": "긍정적인 경험을 하셨네요. 이런 좋은 순간들을 통해 더 큰 성장을 이루실 수 있을 것입니다.",
                "feeling": "정말 기쁜 소식이네요! 당신의 행복한 순간을 함께 나누게 되어 저도 기뻐요."
            },
            EmotionLabel.SADNESS: {
                "thinking": "어려운 시간을 보내고 계시는군요. 하지만 이 또한 지나갈 것이며, 더 나은 내일을 위한 경험이 될 것입니다.",
                "feeling": "힘든 시간을 보내고 계시는군요. 혼자가 아니라는 것을 기억해 주세요. 당신을 응원합니다."
            },
            EmotionLabel.ANGER: {
                "thinking": "분노를 느끼는 상황이군요. 이 감정을 건설적으로 활용하여 문제를 해결해 나가시기 바랍니다.",
                "feeling": "화가 나는 상황이었군요. 그런 감정을 느끼는 것은 자연스러운 일이에요. 당신의 마음을 이해합니다."
            },
            EmotionLabel.FEAR: {
                "thinking": "두려움을 느끼고 계시는군요. 체계적으로 준비하고 대처한다면 충분히 극복할 수 있을 것입니다.",
                "feeling": "불안한 마음이 드시는군요. 두려움을 느끼는 것은 당연해요. 용기를 내시면 분명 헤쳐나갈 수 있을 거예요."
            },
            EmotionLabel.SURPRISE: {
                "thinking": "예상치 못한 일이 일어났군요. 이를 새로운 기회로 받아들이고 활용해 보시기 바랍니다.",
                "feeling": "놀라운 일이 있었나 보네요! 예상치 못한 변화가 때로는 좋은 기회가 되기도 해요."
            },
            EmotionLabel.DISGUST: {
                "thinking": "불쾌한 상황을 경험하셨군요. 이런 경험을 통해 더 나은 선택을 할 수 있는 지혜를 얻으시기 바랍니다.",
                "feeling": "불쾌한 감정을 느끼셨군요. 그런 감정을 갖는 것도 자연스러운 일이에요. 당신의 감정을 존중합니다."
            },
            EmotionLabel.NEUTRAL: {
                "thinking": "균형잡힌 상태를 유지하고 계시는군요. 이런 안정적인 마음가짐을 바탕으로 계획을 세워보시기 바랍니다.",
                "feeling": "평온한 상태시군요. 마음의 평화를 유지하고 계시는 모습이 보기 좋아요."
            }
        }
        
        return fallback_messages.get(emotion, fallback_messages[EmotionLabel.NEUTRAL])[style]

# 전역 피드백 생성기 인스턴스
feedback_generator = OpenAIFeedbackGenerator() 