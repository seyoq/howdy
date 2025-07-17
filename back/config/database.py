"""
Firebase Firestore 데이터베이스 연결 관리
"""
import firebase_admin
from firebase_admin import credentials, firestore
from config.settings import settings
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime
import json

logger = logging.getLogger(__name__)

class MockFirestore:
    """테스트 모드용 Mock Firestore"""
    
    def __init__(self):
        self.collections = {}
        self.counter = 1
    
    def collection(self, collection_name: str):
        if collection_name not in self.collections:
            self.collections[collection_name] = MockCollection(collection_name)
        return self.collections[collection_name]

class MockCollection:
    """테스트 모드용 Mock 컬렉션"""
    
    def __init__(self, name: str):
        self.name = name
        self.documents = {}
        self.counter = 1
    
    def add(self, document: Dict[str, Any]):
        """문서 추가 시뮬레이션"""
        doc_id = f"mock_{self.counter}"
        document["created_at"] = datetime.utcnow()
        self.documents[doc_id] = document
        self.counter += 1
        
        class MockDocRef:
            def __init__(self, id):
                self.id = id
        
        return None, MockDocRef(doc_id)
    
    def document(self, doc_id: str):
        """문서 참조 시뮬레이션"""
        return MockDocumentReference(doc_id, self)
    
    def where(self, field: str, operator: str, value: Any):
        """쿼리 시뮬레이션"""
        query = MockQuery(self.documents)
        query.filters = [(field, operator, value)]
        return query
    
    def order_by(self, field: str, direction=None):
        """정렬 시뮬레이션"""
        return MockQuery(self.documents)
    
    def limit(self, count: int):
        """제한 시뮬레이션"""
        return MockQuery(self.documents)
    
    def get(self):
        """전체 문서 조회 시뮬레이션"""
        return MockQuerySnapshot(self.documents)

class MockDocumentReference:
    """테스트 모드용 Mock 문서 참조"""
    
    def __init__(self, doc_id: str, collection: MockCollection):
        self.id = doc_id
        self.collection = collection
    
    def get(self):
        """문서 조회 시뮬레이션"""
        if self.id in self.collection.documents:
            return MockDocumentSnapshot(self.id, self.collection.documents[self.id])
        return MockDocumentSnapshot(self.id, None)
    
    def set(self, data: Dict[str, Any]):
        """문서 설정 시뮬레이션"""
        data["updated_at"] = datetime.utcnow()
        self.collection.documents[self.id] = data
        return None
    
    def update(self, data: Dict[str, Any]):
        """문서 업데이트 시뮬레이션"""
        if self.id in self.collection.documents:
            self.collection.documents[self.id].update(data)
            self.collection.documents[self.id]["updated_at"] = datetime.utcnow()
        return None
    
    def delete(self):
        """문서 삭제 시뮬레이션"""
        if self.id in self.collection.documents:
            del self.collection.documents[self.id]
        return None

class MockDocumentSnapshot:
    """테스트 모드용 Mock 문서 스냅샷"""
    
    def __init__(self, doc_id: str, data: Optional[Dict[str, Any]]):
        self.id = doc_id
        self._data = data
    
    def exists(self):
        return self._data is not None
    
    def to_dict(self):
        return self._data

class MockQuery:
    """테스트 모드용 Mock 쿼리"""
    
    def __init__(self, documents: Dict[str, Any]):
        self.documents = documents
        self.filters = []
    
    def where(self, field: str, operator: str, value: Any):
        """추가 조건 추가"""
        new_query = MockQuery(self.documents)
        new_query.filters = self.filters + [(field, operator, value)]
        return new_query
    
    def order_by(self, field: str, direction="asc"):
        """정렬 조건 추가"""
        return self  # 간단한 구현
    
    def limit(self, count: int):
        """제한 조건 추가"""
        return self  # 간단한 구현
    
    def get(self):
        """쿼리 실행 시뮬레이션"""
        if not self.filters:
            return MockQuerySnapshot(self.documents)
        
        # 필터 적용
        filtered_docs = {}
        for doc_id, doc_data in self.documents.items():
            match = True
            for field, operator, value in self.filters:
                if field not in doc_data:
                    match = False
                    break
                
                doc_value = doc_data[field]
                
                if operator == "==":
                    if doc_value != value:
                        match = False
                        break
                elif operator == ">=":
                    if doc_value < value:
                        match = False
                        break
                elif operator == "<=":
                    if doc_value > value:
                        match = False
                        break
                elif operator == ">":
                    if doc_value <= value:
                        match = False
                        break
                elif operator == "<":
                    if doc_value >= value:
                        match = False
                        break
            
            if match:
                filtered_docs[doc_id] = doc_data
        
        return MockQuerySnapshot(filtered_docs)

class MockQuerySnapshot:
    """테스트 모드용 Mock 쿼리 스냅샷"""
    
    def __init__(self, documents: Dict[str, Any]):
        self.documents = documents
    
    def __iter__(self):
        for doc_id, data in self.documents.items():
            yield MockDocumentSnapshot(doc_id, data)

class FirebaseManager:
    """Firebase Firestore 연결 관리 클래스"""
    
    def __init__(self):
        self.db: Optional[firestore.Client] = None
        self.mock_db: Optional[MockFirestore] = None
        self.is_connected = False
    
    async def connect_to_database(self):
        """Firebase 데이터베이스 연결"""
        if settings.test_mode:
            logger.info("테스트 모드: Firebase 연결 건너뛰기")
            if self.mock_db is None:
                self.mock_db = MockFirestore()
            self.is_connected = False
            return
        
        try:
            # Firebase 앱이 이미 초기화되어 있는지 확인
            if not firebase_admin._apps:
                # Firebase 서비스 계정 키 파일 로드
                cred = credentials.Certificate(settings.firebase_credentials_path)
                config = {'projectId': settings.firebase_project_id}
                if settings.firebase_database_url:
                    config['databaseURL'] = settings.firebase_database_url
                firebase_admin.initialize_app(cred, config)
            
            self.db = firestore.client()
            logger.info(f"Firebase Firestore 연결 성공: {settings.firebase_project_id}")
            self.is_connected = True
            
        except Exception as e:
            logger.error(f"Firebase 연결 실패: {e}")
            self.is_connected = False
            if not settings.test_mode:
                raise
    
    async def close_database_connection(self):
        """데이터베이스 연결 종료"""
        if self.db:
            logger.info("Firebase 연결 종료")
            # Firebase Admin SDK는 자동으로 연결을 관리함
    
    def get_collection(self, collection_name: str):
        """컬렉션 반환"""
        if settings.test_mode or not self.is_connected:
            if self.mock_db is None:
                self.mock_db = MockFirestore()
            return self.mock_db.collection(collection_name)
        
        if self.db is None:
            raise Exception("Firebase 데이터베이스가 연결되지 않았습니다.")
        return self.db.collection(collection_name)

# 전역 데이터베이스 관리자 인스턴스
db_manager = FirebaseManager() 