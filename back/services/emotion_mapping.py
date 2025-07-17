"""
감정-이모지 매핑 유틸리티
"""
from typing import Dict, List
from models.emotion import EmotionLabel

class EmotionEmojiMapper:
    """감정과 이모지 매핑 클래스"""
    
    def __init__(self):
        self.emotion_emoji_map: Dict[EmotionLabel, str] = {
            EmotionLabel.JOY: "😊",
            EmotionLabel.SADNESS: "😢", 
            EmotionLabel.ANGER: "😠",
            EmotionLabel.FEAR: "😨",
            EmotionLabel.SURPRISE: "😮",
            EmotionLabel.DISGUST: "🤢",
            EmotionLabel.NEUTRAL: "😐"
        }
        
        # 추가 이모지 변형들
        self.emotion_emoji_variants: Dict[EmotionLabel, List[str]] = {
            EmotionLabel.JOY: ["😊", "😄", "😃", "🙂", "😁", "🥰", "😍"],
            EmotionLabel.SADNESS: ["😢", "😭", "😞", "☹️", "😔", "💔", "😿"],
            EmotionLabel.ANGER: ["😠", "😡", "🤬", "👿", "💢", "🔥", "😤"],
            EmotionLabel.FEAR: ["😨", "😰", "😱", "🙀", "😧", "😦", "😳"],
            EmotionLabel.SURPRISE: ["😮", "😯", "😲", "🤯", "😱", "🙄", "👀"],
            EmotionLabel.DISGUST: ["🤢", "🤮", "😷", "🙊", "😖", "😣", "🤧"],
            EmotionLabel.NEUTRAL: ["😐", "😑", "🙃", "😶", "🤐", "😒", "🙂"]
        }
        
        # 감정별 색상 코드
        self.emotion_colors: Dict[EmotionLabel, str] = {
            EmotionLabel.JOY: "#FFD700",      # 금색
            EmotionLabel.SADNESS: "#4169E1",  # 로얄블루
            EmotionLabel.ANGER: "#FF4500",    # 오렌지레드
            EmotionLabel.FEAR: "#800080",     # 퍼플
            EmotionLabel.SURPRISE: "#FF69B4", # 핫핑크
            EmotionLabel.DISGUST: "#32CD32",  # 라임그린
            EmotionLabel.NEUTRAL: "#808080"   # 그레이
        }
    
    def get_emoji(self, emotion: EmotionLabel) -> str:
        """기본 이모지 반환"""
        return self.emotion_emoji_map.get(emotion, "❓")
    
    def get_emoji_variants(self, emotion: EmotionLabel) -> List[str]:
        """감정의 다양한 이모지 변형들 반환"""
        return self.emotion_emoji_variants.get(emotion, ["❓"])
    
    def get_random_emoji(self, emotion: EmotionLabel) -> str:
        """감정에 해당하는 랜덤 이모지 반환"""
        import random
        variants = self.get_emoji_variants(emotion)
        return random.choice(variants)
    
    def get_color(self, emotion: EmotionLabel) -> str:
        """감정에 해당하는 색상 코드 반환"""
        return self.emotion_colors.get(emotion, "#000000")
    
    def get_emotion_description(self, emotion: EmotionLabel) -> str:
        """감정에 대한 한국어 설명 반환"""
        descriptions = {
            EmotionLabel.JOY: "기쁨과 행복감을 나타내는 긍정적인 감정",
            EmotionLabel.SADNESS: "슬픔과 우울감을 나타내는 부정적인 감정",
            EmotionLabel.ANGER: "분노와 짜증을 나타내는 강한 부정적 감정",
            EmotionLabel.FEAR: "두려움과 불안감을 나타내는 감정",
            EmotionLabel.SURPRISE: "놀라움과 당황감을 나타내는 감정",
            EmotionLabel.DISGUST: "혐오와 거부감을 나타내는 부정적 감정",
            EmotionLabel.NEUTRAL: "특별한 감정이 없는 중립적 상태"
        }
        return descriptions.get(emotion, "알 수 없는 감정")
    
    def get_all_mappings(self) -> Dict[str, Dict]:
        """모든 감정 매핑 정보 반환"""
        return {
            emotion.value: {
                "emoji": self.get_emoji(emotion),
                "variants": self.get_emoji_variants(emotion),
                "color": self.get_color(emotion),
                "description": self.get_emotion_description(emotion)
            }
            for emotion in EmotionLabel
        }

# 전역 감정 매퍼 인스턴스
emotion_mapper = EmotionEmojiMapper() 