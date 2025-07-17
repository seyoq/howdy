"""
감정 분류 서비스
"""
import torch
import numpy as np
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from typing import Dict, List, Tuple
import logging
from abc import ABC, abstractmethod
import openai
from openai import OpenAI
import json

from models.emotion import EmotionLabel, EmotionScore, EmotionAnalysisResult
from config.settings import settings

logger = logging.getLogger(__name__)

class EmotionClassifier(ABC):
    """감정 분류기 베이스 클래스"""
    
    def __init__(self, model_name: str):
        self.model_name = model_name
        self.tokenizer = None
        self.model = None
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
    @abstractmethod
    async def load_model(self):
        """모델 로드"""
        pass
    
    @abstractmethod
    async def predict(self, text: str) -> EmotionAnalysisResult:
        """텍스트 감정 예측"""
        pass


class OpenAIEmotionClassifier(EmotionClassifier):
    """OpenAI API를 사용한 감정 분류기 (가장 정확)"""
    
    def __init__(self):
        super().__init__("openai-gpt-3.5-turbo")
        self.client = None
        
    async def load_model(self):
        """OpenAI 클라이언트 초기화"""
        try:
            if settings.openai_api_key:
                self.client = OpenAI(api_key=settings.openai_api_key)
                logger.info("OpenAI 감정 분류기 초기화 완료")
            else:
                raise ValueError("OpenAI API 키가 설정되지 않았습니다.")
        except Exception as e:
            logger.error(f"OpenAI 감정 분류기 초기화 실패: {e}")
            raise
    
    async def predict(self, text: str) -> EmotionAnalysisResult:
        """OpenAI API를 사용한 감정 예측"""
        if self.client is None:
            await self.load_model()
        
        try:
            # 감정 분류 프롬프트
            prompt = f"""
다음 한국어 텍스트의 감정을 분석해주세요. 
7가지 감정 중 하나로 분류하고, 각 감정의 확률을 0.0-1.0 사이로 제공해주세요.

감정 종류:
1. JOY (기쁨)
2. SADNESS (슬픔)  
3. ANGER (분노)
4. FEAR (두려움)
5. SURPRISE (놀람)
6. DISGUST (혐오)
7. NEUTRAL (중성)

텍스트: "{text}"

응답을 다음 JSON 형식으로 제공해주세요:
{{
    "primary_emotion": "JOY",
    "confidence": 0.85,
    "emotions": {{
        "JOY": 0.85,
        "SADNESS": 0.05,
        "ANGER": 0.03,
        "FEAR": 0.02,
        "SURPRISE": 0.02,
        "DISGUST": 0.01,
        "NEUTRAL": 0.02
    }}
}}
"""
            
            if self.client is None:
                raise ValueError("OpenAI 클라이언트가 초기화되지 않았습니다.")
            
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "당신은 한국어 텍스트의 감정을 정확히 분석하는 전문가입니다."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=300
            )
            
            # 응답 파싱
            response_content = response.choices[0].message.content
            if response_content is None:
                raise ValueError("OpenAI 응답이 비어있습니다.")
            
            response_text = response_content.strip()
            
            # JSON 응답 파싱
            try:
                result_json = json.loads(response_text)
                primary_emotion_str = result_json["primary_emotion"]
                confidence = result_json["confidence"]
                emotion_scores = result_json["emotions"]
                
                # 감정 라벨 매핑
                emotion_label_map = {
                    "JOY": EmotionLabel.JOY,
                    "SADNESS": EmotionLabel.SADNESS,
                    "ANGER": EmotionLabel.ANGER,
                    "FEAR": EmotionLabel.FEAR,
                    "SURPRISE": EmotionLabel.SURPRISE,
                    "DISGUST": EmotionLabel.DISGUST,
                    "NEUTRAL": EmotionLabel.NEUTRAL
                }
                
                primary_emotion = emotion_label_map[primary_emotion_str]
                primary_emotion_score = emotion_scores[primary_emotion_str]
                primary_emotion_emoji = self._get_emotion_emoji(primary_emotion)
                
                # 모든 감정 점수 생성
                all_emotions = []
                for emotion_str, score in emotion_scores.items():
                    emotion = emotion_label_map[emotion_str]
                    emoji = self._get_emotion_emoji(emotion)
                    all_emotions.append(EmotionScore(
                        emotion=emotion,
                        score=score,
                        emoji=emoji
                    ))
                
                return EmotionAnalysisResult(
                    text=text,
                    primary_emotion=primary_emotion,
                    primary_emotion_score=primary_emotion_score,
                    primary_emotion_emoji=primary_emotion_emoji,
                    all_emotions=all_emotions,
                    model_used="openai-gpt-3.5-turbo",
                    confidence=confidence
                )
                
            except json.JSONDecodeError:
                logger.error(f"OpenAI 응답 JSON 파싱 실패: {response_text}")
                # 폴백: 기본 감정 분석
                return self._fallback_analysis(text)
            
        except Exception as e:
            logger.error(f"OpenAI 감정 예측 실패: {e}")
            # 폴백: 기본 감정 분석
            return self._fallback_analysis(text)
    
    def _fallback_analysis(self, text: str) -> EmotionAnalysisResult:
        """OpenAI 실패 시 폴백 감정 분석"""
        # 간단한 키워드 기반 분석
        text_lower = text.lower()
        
        if any(keyword in text_lower for keyword in ["기쁘", "행복", "즐거", "좋", "사랑"]):
            primary_emotion = EmotionLabel.JOY
            primary_score = 0.7
        elif any(keyword in text_lower for keyword in ["슬프", "우울", "눈물", "힘들"]):
            primary_emotion = EmotionLabel.SADNESS
            primary_score = 0.7
        elif any(keyword in text_lower for keyword in ["화", "짜증", "분노", "열받"]):
            primary_emotion = EmotionLabel.ANGER
            primary_score = 0.7
        elif any(keyword in text_lower for keyword in ["무서", "두려", "걱정", "불안"]):
            primary_emotion = EmotionLabel.FEAR
            primary_score = 0.7
        elif any(keyword in text_lower for keyword in ["놀라", "신기", "와", "대박"]):
            primary_emotion = EmotionLabel.SURPRISE
            primary_score = 0.7
        elif any(keyword in text_lower for keyword in ["더러", "역겨", "혐오"]):
            primary_emotion = EmotionLabel.DISGUST
            primary_score = 0.7
        else:
            primary_emotion = EmotionLabel.NEUTRAL
            primary_score = 0.6
        
        all_emotions = []
        for emotion in EmotionLabel:
            score = primary_score if emotion == primary_emotion else 0.3 / 6
            emoji = self._get_emotion_emoji(emotion)
            all_emotions.append(EmotionScore(
                emotion=emotion,
                score=score,
                emoji=emoji
            ))
        
        return EmotionAnalysisResult(
            text=text,
            primary_emotion=primary_emotion,
            primary_emotion_score=primary_score,
            primary_emotion_emoji=self._get_emotion_emoji(primary_emotion),
            all_emotions=all_emotions,
            model_used="fallback-keyword",
            confidence=0.6
        )
    
    def _get_emotion_emoji(self, emotion: EmotionLabel) -> str:
        """감정에 해당하는 이모지 반환"""
        emotion_emoji_map = {
            EmotionLabel.JOY: "😊",
            EmotionLabel.SADNESS: "😢",
            EmotionLabel.ANGER: "😠",
            EmotionLabel.FEAR: "😨",
            EmotionLabel.SURPRISE: "😮",
            EmotionLabel.DISGUST: "🤢",
            EmotionLabel.NEUTRAL: "😐"
        }
        return emotion_emoji_map.get(emotion, "❓")


class KoELECTRAGeneralizedClassifier(EmotionClassifier):
    """일반화된 KoELECTRA 감정 분류기 (오프라인 대안)"""
    
    def __init__(self):
        super().__init__("Copycats/koelectra-base-v3-generalized-sentiment-analysis")
        
    async def load_model(self):
        """KoELECTRA 일반화 모델 로드"""
        try:
            logger.info(f"KoELECTRA 일반화 모델 로딩 시작: {self.model_name}")
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self.model = AutoModelForSequenceClassification.from_pretrained(self.model_name)
            self.model.to(self.device)
            self.model.eval()
            logger.info("KoELECTRA 일반화 모델 로딩 완료")
        except Exception as e:
            logger.error(f"KoELECTRA 일반화 모델 로딩 실패: {e}")
            raise
    
    async def predict(self, text: str) -> EmotionAnalysisResult:
        """KoELECTRA 일반화 모델을 사용한 감정 예측"""
        if self.model is None or self.tokenizer is None:
            await self.load_model()
        
        try:
            # 텍스트 토크나이징
            inputs = self.tokenizer(
                text,
                return_tensors="pt",
                max_length=512,
                truncation=True,
                padding=True
            )
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
            
            # 예측 수행
            with torch.no_grad():
                outputs = self.model(**inputs)
                logits = outputs.logits
                probabilities = torch.softmax(logits, dim=-1)
                probabilities = probabilities.cpu().numpy()[0]
            
            # 이진 분류 결과를 7개 감정으로 매핑
            negative_score = float(probabilities[0])
            positive_score = float(probabilities[1])
            
            # 텍스트 분석을 통한 세부 감정 분류
            emotion_scores = self._analyze_detailed_emotion(text, negative_score, positive_score)
            
            # 모든 감정 점수 생성
            all_emotions = []
            for emotion in EmotionLabel:
                score = emotion_scores[emotion]
                emoji = self._get_emotion_emoji(emotion)
                all_emotions.append(EmotionScore(
                    emotion=emotion,
                    score=score,
                    emoji=emoji
                ))
            
            # 가장 높은 점수의 감정 찾기
            primary_emotion = max(emotion_scores.keys(), key=lambda x: emotion_scores[x])
            primary_emotion_score = emotion_scores[primary_emotion]
            primary_emotion_emoji = self._get_emotion_emoji(primary_emotion)
            
            # 신뢰도 계산
            sorted_scores = sorted(emotion_scores.values(), reverse=True)
            confidence = sorted_scores[0] - sorted_scores[1] if len(sorted_scores) > 1 else sorted_scores[0]
            
            return EmotionAnalysisResult(
                text=text,
                primary_emotion=primary_emotion,
                primary_emotion_score=primary_emotion_score,
                primary_emotion_emoji=primary_emotion_emoji,
                all_emotions=all_emotions,
                model_used="koelectra-generalized",
                confidence=confidence
            )
            
        except Exception as e:
            logger.error(f"KoELECTRA 일반화 감정 예측 실패: {e}")
            raise
    
    def _analyze_detailed_emotion(self, text: str, negative_score: float, positive_score: float) -> Dict[EmotionLabel, float]:
        """텍스트 분석을 통한 세부 감정 분류 (개선된 버전)"""
        text_lower = text.lower()
        
        # 개선된 감정별 키워드 - 더 정확하고 세밀한 분류
        emotion_keywords = {
            EmotionLabel.JOY: [
                "기쁘", "행복", "즐거", "좋아", "사랑", "웃", "신나", "만족", "뿌듯", "설레", "감사",
                "축하", "성공", "완벽", "최고", "멋져", "훌륭", "대단", "놀라운", "기대", "희망",
                "고마워", "감동", "사랑해", "재미", "좋다", "최고다", "완전", "진짜 좋", "너무 좋",
                "정말 좋", "마음에 들", "기분 좋", "행복해", "즐거워", "신이", "기뻐", "만족해",
                "뿌듯해", "감사해", "고마워", "사랑스러", "예쁘", "멋있", "대박", "짱"
            ],
            EmotionLabel.SADNESS: [
                "슬프", "우울", "눈물", "울", "힘들", "괴로", "아프", "서러", "막막", "절망", "실망",
                "후회", "그리워", "외로", "쓸쓸", "비참", "허탈", "안타까", "가슴", "마음이 아프",
                "그만두", "포기", "못하겠", "지쳐", "피곤", "스트레스", "안 좋", "최악", "망했",
                "혼났", "꾸중", "야단", "책망", "서글", "애처로", "처량", "쓸쓸", "적적", "무력",
                "의기소침", "낙담", "좌절", "침울", "우울해", "슬퍼", "아파", "힘들어", "어려워"
            ],
            EmotionLabel.ANGER: [
                "화", "짜증", "분노", "열받", "빡쳐", "미쳐", "싫어", "증오", "혐오", "빡치", "욕",
                "정말", "진짜", "완전", "너무", "욕먹", "비난", "문제", "잘못", "못해", "어이없",
                "한심", "멍청", "바보", "화나", "짜증나", "열받아", "빡쳐", "미쳐", "싫어죽겠",
                "화딱지", "약오르", "분통", "격분", "격노", "분개", "울분", "분함", "성나", "노여워"
            ],
            EmotionLabel.FEAR: [
                "무서", "두려", "걱정", "불안", "염려", "떨려", "긴장", "조심", "위험", "겁", "공포",
                "무서워", "두려워", "떨어", "심장", "조마조마", "불안해", "걱정돼", "염려돼", "떨려",
                "긴장돼", "조심스러", "위험해", "겁나", "공포스러", "무시무시", "소름", "떨림", "전율"
            ],
            EmotionLabel.SURPRISE: [
                "놀라", "신기", "와", "헉", "어", "대박", "세상", "믿을 수 없", "어떻게", "갑자기",
                "예상", "뜻밖", "의외", "깜짝", "놀랍", "신기해", "와우", "우와", "어머", "이런",
                "세상에", "대단해", "놀래", "깜짝", "엄청", "정말", "진짜", "허걱", "까무러칠"
            ],
            EmotionLabel.DISGUST: [
                "더러", "역겨", "싫", "혐오", "구역", "토할", "지겨", "못 견디", "참을 수 없",
                "끔찍", "불쾌", "짜증나", "지긋지긋", "더러워", "역겨워", "싫어", "혐오스러",
                "구역질", "토할 것 같", "지겨워", "못 견디겠", "참을 수 없어", "끔찍해", "불쾌해"
            ],
            EmotionLabel.NEUTRAL: [
                "그냥", "보통", "평범", "일반적", "그럭저럭", "그저", "별로", "음", "글쎄", "모르겠",
                "그런가", "아무래도", "그런 것 같", "그런지", "그런데", "하지만", "그런데도"
            ]
        }
        
        # 감정 강도 키워드 (감정을 강화하는 부사)
        intensity_keywords = {
            "high": ["너무", "정말", "진짜", "완전", "엄청", "매우", "극도로", "정말로", "진짜로", "완전히"],
            "medium": ["좀", "조금", "약간", "다소", "어느 정도", "그런대로", "그럭저럭"],
            "low": ["살짝", "조금씩", "약간씩", "가볍게", "조금만"]
        }
        
        # 부정 키워드 (감정을 뒤집는 단어들)
        negation_keywords = ["안", "않", "못", "아니", "없", "말고", "아님", "절대", "전혀", "결코"]
        
        # 키워드 매칭 및 강도 계산
        emotion_scores = {}
        for emotion, keywords in emotion_keywords.items():
            score = 0
            for keyword in keywords:
                if keyword in text_lower:
                    base_score = 1
                    
                    # 강도 수정자 적용
                    for intensity_type, intensity_words in intensity_keywords.items():
                        for intensity_word in intensity_words:
                            if intensity_word in text_lower:
                                if intensity_type == "high":
                                    base_score *= 1.5
                                elif intensity_type == "medium":
                                    base_score *= 1.2
                                elif intensity_type == "low":
                                    base_score *= 0.8
                    
                    # 부정 키워드 확인
                    negated = False
                    for neg_keyword in negation_keywords:
                        if neg_keyword in text_lower:
                            # 부정 키워드가 감정 키워드 앞에 있는지 확인
                            neg_pos = text_lower.find(neg_keyword)
                            keyword_pos = text_lower.find(keyword)
                            if neg_pos < keyword_pos and keyword_pos - neg_pos < 10:  # 10자 이내
                                negated = True
                                break
                    
                    if negated:
                        base_score *= -0.5  # 부정된 감정은 반대 감정으로 약간 이동
                    
                    score += base_score
            
            emotion_scores[emotion] = max(0, score)  # 음수 점수는 0으로 처리
        
        # 전체 키워드 매칭 수
        total_keyword_matches = sum(emotion_scores.values())
        
        # 최종 감정 점수 계산
        final_scores = {}
        
        if total_keyword_matches > 0:
            # 키워드 매칭이 있는 경우
            for emotion in EmotionLabel:
                keyword_score = emotion_scores.get(emotion, 0) / total_keyword_matches
                
                # 이진 분류 결과와 결합 (가중치 조정)
                if emotion in [EmotionLabel.SADNESS, EmotionLabel.ANGER, EmotionLabel.FEAR, EmotionLabel.DISGUST]:
                    final_scores[emotion] = keyword_score * 0.7 + negative_score * 0.3
                elif emotion == EmotionLabel.JOY:
                    final_scores[emotion] = keyword_score * 0.7 + positive_score * 0.3
                elif emotion == EmotionLabel.SURPRISE:
                    final_scores[emotion] = keyword_score * 0.8 + (positive_score + negative_score) * 0.1
                else:  # NEUTRAL
                    final_scores[emotion] = keyword_score * 0.6 + 0.2
        else:
            # 키워드 매칭이 없는 경우 이진 분류 결과만 사용
            if positive_score > negative_score:
                final_scores[EmotionLabel.JOY] = positive_score * 0.7
                final_scores[EmotionLabel.SURPRISE] = positive_score * 0.2
                final_scores[EmotionLabel.NEUTRAL] = 0.3
                final_scores[EmotionLabel.SADNESS] = negative_score * 0.3
                final_scores[EmotionLabel.ANGER] = negative_score * 0.2
                final_scores[EmotionLabel.FEAR] = negative_score * 0.2
                final_scores[EmotionLabel.DISGUST] = negative_score * 0.2
            else:
                final_scores[EmotionLabel.SADNESS] = negative_score * 0.4
                final_scores[EmotionLabel.ANGER] = negative_score * 0.2
                final_scores[EmotionLabel.FEAR] = negative_score * 0.2
                final_scores[EmotionLabel.DISGUST] = negative_score * 0.2
                final_scores[EmotionLabel.JOY] = positive_score * 0.4
                final_scores[EmotionLabel.SURPRISE] = positive_score * 0.2
                final_scores[EmotionLabel.NEUTRAL] = 0.4
        
        # 점수 정규화
        total_score = sum(final_scores.values())
        if total_score > 0:
            final_scores = {k: v / total_score for k, v in final_scores.items()}
        else:
            # 모든 점수가 0인 경우 중성으로 처리
            final_scores = {emotion: 0.0 for emotion in EmotionLabel}
            final_scores[EmotionLabel.NEUTRAL] = 1.0
        
        return final_scores
    
    def _get_emotion_emoji(self, emotion: EmotionLabel) -> str:
        """감정에 해당하는 이모지 반환"""
        emotion_emoji_map = {
            EmotionLabel.JOY: "😊",
            EmotionLabel.SADNESS: "😢",
            EmotionLabel.ANGER: "😠",
            EmotionLabel.FEAR: "😨",
            EmotionLabel.SURPRISE: "😮",
            EmotionLabel.DISGUST: "🤢",
            EmotionLabel.NEUTRAL: "😐"
        }
        return emotion_emoji_map.get(emotion, "❓")

# 분류기 인스턴스 생성 - OpenAI와 일반화 모델만 사용
openai_classifier = OpenAIEmotionClassifier()
koelectra_generalized_classifier = KoELECTRAGeneralizedClassifier()