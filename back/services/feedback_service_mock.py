"""
Mock Feedback Service for testing without AI models
"""
import logging
from typing import Dict, List, Any
from models.feedback import FeedbackGenerationRequest, FeedbackResponse
import random

logger = logging.getLogger(__name__)

class MockFeedbackService:
    """Mock 피드백 생성 서비스"""
    
    def __init__(self):
        self.feedback_templates = {
            "empathetic": {
                "기쁨": [
                    "정말 기쁜 일이 있었나보네요! 그 행복한 감정이 글에서 느껴집니다.",
                    "이런 즐거운 순간들이 소중한 것 같아요. 행복한 마음이 전해져요.",
                    "좋은 일이 있으셨나 봐요. 그 기쁨이 마음에 오래 남았으면 좋겠어요."
                ],
                "슬픔": [
                    "힘든 시간을 보내고 계시는군요. 그 마음이 충분히 이해됩니다.",
                    "슬픈 일이 있었나 봐요. 이런 감정도 자연스러운 것이니까요.",
                    "지금 느끼는 감정이 무겁게 느껴지실 것 같아요. 함께 이겨내봐요."
                ],
                "분노": [
                    "화가 나는 일이 있었나 봐요. 그 감정을 표현하는 것도 중요해요.",
                    "분노는 자연스러운 감정이에요. 그 마음을 이해할 수 있을 것 같아요.",
                    "정말 속상하셨을 것 같아요. 그 감정이 충분히 공감됩니다."
                ],
                "중성": [
                    "평온한 하루를 보내신 것 같네요. 이런 일상도 소중한 것 같아요.",
                    "잔잔한 마음이 글에서 느껴져요. 때로는 이런 평온함이 필요해요.",
                    "특별하지 않은 일상도 나름의 의미가 있는 것 같아요."
                ]
            },
            "encouraging": {
                "기쁨": [
                    "이런 긍정적인 에너지가 계속 이어졌으면 좋겠어요! 정말 멋져요.",
                    "행복한 순간을 잘 기록해두셨네요. 앞으로도 이런 순간들이 많아지길!",
                    "기쁨이 가득한 하루였나 봐요. 이런 에너지로 앞으로도 화이팅!"
                ],
                "슬픔": [
                    "힘든 시간이지만 이겨낼 수 있을 거예요. 응원하고 있어요!",
                    "슬픈 일이 있어도 곧 좋은 일이 찾아올 거예요. 힘내세요!",
                    "지금은 힘들지만 이 또한 지나갈 거예요. 당신은 충분히 강해요!"
                ],
                "분노": [
                    "화가 나는 일이 있었지만 이를 통해 더 성장할 수 있을 거예요!",
                    "분노도 성장의 원동력이 될 수 있어요. 이를 긍정적으로 활용해보세요!",
                    "힘든 감정이지만 이를 통해 더 나은 내일을 만들어가요!"
                ],
                "중성": [
                    "평온한 하루도 소중해요. 이런 일상이 쌓여 멋진 삶이 되는 거예요!",
                    "잔잔한 일상 속에서도 작은 행복을 찾아보세요. 화이팅!",
                    "평범한 일상도 특별하게 만들 수 있어요. 오늘도 수고하셨어요!"
                ]
            },
            "analytical": {
                "기쁨": [
                    "긍정적인 감정이 주요하게 나타나는 것으로 분석됩니다. 이런 감정 상태가 전반적인 웰빙에 도움이 될 것 같아요.",
                    "기쁨의 감정이 강하게 표출되고 있네요. 이런 감정 패턴이 지속되면 좋을 것 같습니다.",
                    "행복한 감정이 주된 톤으로 나타났습니다. 이런 긍정적 감정이 일상에 미치는 영향을 관찰해보세요."
                ],
                "슬픔": [
                    "부정적인 감정이 주요하게 나타나고 있습니다. 이런 감정의 원인을 파악해보는 것이 도움이 될 것 같아요.",
                    "슬픔의 감정이 강하게 표현되었네요. 이런 감정 패턴의 주기를 관찰해보시는 것이 좋겠어요.",
                    "우울한 감정이 주된 톤으로 분석됩니다. 이런 감정에 대한 대처 방안을 생각해보세요."
                ],
                "분노": [
                    "강한 분노의 감정이 나타나고 있습니다. 이런 감정의 트리거를 분석해보는 것이 중요해요.",
                    "화난 감정이 주요하게 표출되었네요. 이런 감정 패턴의 관리 방법을 고민해보시면 좋겠어요.",
                    "분노의 감정이 강하게 나타났습니다. 이런 감정을 건설적으로 활용하는 방법을 찾아보세요."
                ],
                "중성": [
                    "중립적인 감정 상태가 주요하게 나타나고 있습니다. 이런 안정적인 감정 상태가 유지되고 있네요.",
                    "평온한 감정이 주된 톤으로 분석됩니다. 이런 감정적 안정감이 긍정적으로 보입니다.",
                    "중성적인 감정 패턴이 나타났습니다. 이런 균형 잡힌 감정 상태가 지속되면 좋겠어요."
                ]
            }
        }
    
    async def generate_feedback(self, request: FeedbackGenerationRequest) -> FeedbackResponse:
        """피드백 생성 (Mock 버전)"""
        try:
            # 감정과 스타일에 따른 피드백 선택
            emotion = request.primary_emotion
            style = request.style
            
            # 해당 감정에 대한 템플릿이 없으면 중성으로 대체
            if emotion not in self.feedback_templates[style]:
                emotion = "중성"
            
            # 랜덤하게 피드백 선택
            feedback_options = self.feedback_templates[style][emotion]
            selected_feedback = random.choice(feedback_options)
            
            return FeedbackResponse(
                feedback_text=selected_feedback,
                style=style,
                confidence=random.uniform(0.7, 0.9),
                user_id=request.user_id
            )
            
        except Exception as e:
            logger.error(f"Mock 피드백 생성 중 오류: {e}")
            # 기본값 반환
            return FeedbackResponse(
                feedback_text="오늘 하루도 수고하셨어요. 일기를 쓰는 것만으로도 의미 있는 시간이었을 거예요.",
                style=request.style,
                confidence=0.7,
                user_id=request.user_id
            )

# 싱글톤 인스턴스 생성
feedback_service = MockFeedbackService() 