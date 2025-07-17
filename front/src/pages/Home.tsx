import { useNavigate } from "react-router-dom";
import { Calendar } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { auth, db } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Settings, User, Plus, BookMarked } from "lucide-react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";

// 일기 데이터 타입 정의
interface DiaryItem {
  id: string;
  text: string;
  emotion_analysis: {
    primary_emotion: string;
    primary_emotion_score: number;
    primary_emotion_emoji: string;
    all_emotions: Array<{
      emotion: string;
      score: number;
      emoji: string;
    }>;
    confidence: number;
  };
  ai_feedback: {
    feedback_text: string;
    style: string;
    confidence: number;
  };
  createdAt: any;
  uid: string;
}

// 감정 색상 정의
const emotions = [
  { name: "기쁨", color: "#FFD93D" },
  { name: "슬픔", color: "#6C9BCF" },
  { name: "분노", color: "#FF6B6B" },
  { name: "두려움", color: "#8B1874" },
  { name: "놀람", color: "#95BDFF" },
  { name: "혐오", color: "#4C3D3D" },
  { name: "중성", color: "#B4B4B3" },
];

// 예시 북마크 데이터
const sampleBookmarks = [
  {
    id: 1,
    title: "봄날의 기억",
    image: "/src/assets/diary-thumb-2.jpg",
    description: "벚꽃이 만개한 날의 일기들",
    count: 5,
  },
  {
    id: 2,
    title: "여름 하늘",
    image: "/src/assets/diary-thumb-1.jpg",
    description: "구름이 예쁜 날의 기록",
    count: 3,
  },
  {
    id: 3,
    title: "특별한 순간들",
    image: "/src/assets/header-illustration.jpg",
    description: "소중한 추억",
    count: 7,
  },
];

export default function Home() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [showDialog, setShowDialog] = useState(false);
  const [showBookmarkDialog, setShowBookmarkDialog] = useState(false);
  const [diaries, setDiaries] = useState<DiaryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const user = auth.currentUser;

  // Firebase에서 일기 데이터 불러오기
  const fetchDiaries = async () => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    try {
      const q = query(
        collection(db, 'diaries'),
        where('uid', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const diaryData: DiaryItem[] = [];

      querySnapshot.forEach((doc) => {
        diaryData.push({
          id: doc.id,
          ...doc.data()
        } as DiaryItem);
      });

      setDiaries(diaryData);
      console.log(`총 ${diaryData.length}개의 일기를 불러왔습니다.`);
    } catch (error) {
      console.error('일기 데이터 불러오기 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDiaries();
  }, [currentUser]);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    const selectedDiary = diaries.find((diary) => {
      if (!diary.createdAt) return false;
      const diaryDate = diary.createdAt.toDate();
      return (
        diaryDate.getFullYear() === date.getFullYear() &&
        diaryDate.getMonth() === date.getMonth() &&
        diaryDate.getDate() === date.getDate()
      );
    });

    if (selectedDiary) {
      // 일기가 있는 경우 상세 페이지로 이동
      navigate(`/diary/${selectedDiary.id}`);
    } else {
      // 일기가 없는 경우 작성 다이얼로그 표시
      setShowDialog(true);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("로그아웃 중 오류 발생:", error);
    }
  };

  // 일기가 있는 날짜 계산
  const hasDiaryDates = diaries
    .filter(diary => diary.createdAt)
    .map(diary => diary.createdAt.toDate())
    .filter(date => date instanceof Date && !isNaN(date.getTime()));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen bg-orange-50 pt-2.5"
    >
      {/* 헤더 영역 - 아이콘만 표시 */}
      <div className="px-4 py-2 flex justify-end items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <User className="h-5 w-5 text-gray-600" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuLabel className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.photoURL || ""} />
                <AvatarFallback className="bg-orange-200 text-sm">
                  {user?.displayName?.[0] || user?.email?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-medium">{user?.displayName || "사용자"}</span>
                <span className="text-xs text-gray-500">{user?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>로그아웃</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/settings')}>
          <Settings className="h-5 w-5 text-gray-600" />
        </Button>
      </div>

      {/* 메인 컨텐츠 영역 */}
      <div className="container mx-auto px-4 py-4 max-w-md">
        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="w-full">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              modifiers={{ 
                highlighted: hasDiaryDates 
              }}
              modifiersStyles={{
                highlighted: {
                  backgroundColor: "rgb(251 146 60 / 0.2)",
                  color: "rgb(251 146 60)",
                  fontWeight: "bold"
                }
              }}
              disabled={{ before: new Date(2024, 0, 1) }}
              fromDate={new Date(2024, 0, 1)}
              toDate={new Date(2025, 11, 31)}
            />
          </div>
        </div>

        {/* 감정 색상 표시 영역 */}
        <div className="mt-4 bg-white rounded-xl shadow-md p-3">
          <div className="grid grid-cols-4 gap-2">
            {emotions.map((emotion) => (
              <div
                key={emotion.name}
                className="flex flex-col items-center gap-1"
              >
                <div
                  className="w-6 h-6 rounded-full"
                  style={{ backgroundColor: emotion.color }}
                />
                <span className="text-[10px] text-gray-600">{emotion.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 최근 일기 섹션 */}
        {diaries.length > 0 && (
          <div className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-800">최근 일기</h2>
              <Button
                variant="ghost"
                size="sm"
                className="text-sm text-gray-500 hover:text-orange-500"
                onClick={() => navigate('/statistics')}
              >
                더보기
              </Button>
            </div>
            
            <div className="space-y-3">
              {diaries.slice(0, 3).map((diary) => (
                <div
                  key={diary.id}
                  className="bg-white rounded-lg shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/diary/${diary.id}`)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <span className="text-2xl">{diary.emotion_analysis.primary_emotion_emoji}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {diary.emotion_analysis.primary_emotion}
                        </span>
                        <span className="text-xs text-gray-500">
                          {diary.createdAt && new Date(diary.createdAt.toDate()).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {diary.text}
                      </p>
                      <div className="flex items-center gap-1 mt-2">
                        <div className="w-2 h-2 rounded-full bg-orange-300"></div>
                        <span className="text-xs text-gray-500">
                          {Math.round(diary.emotion_analysis.primary_emotion_score * 100)}% 신뢰도
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 북마크 섹션 */}
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-800">나의 일기장</h2>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="text-sm text-gray-500 hover:text-orange-500"
                onClick={() => navigate('/bookmarks')}
              >
                전체보기
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-orange-500"
                onClick={() => setShowBookmarkDialog(true)}
              >
                <Plus className="h-5 w-5 mr-1" />
                새 일기장
              </Button>
            </div>
          </div>
          
          <div className="relative">
            <div className="overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <div className="flex gap-4" style={{ paddingRight: '1rem' }}>
                {sampleBookmarks.map((bookmark) => (
                  <motion.div
                    key={bookmark.id}
                    whileHover={{ y: -5 }}
                    className="relative shrink-0 cursor-pointer"
                    style={{ width: '160px' }}
                    onClick={() => navigate(`/bookmark/${bookmark.id}`)}
                  >
                    <div className="aspect-[3/4] rounded-lg overflow-hidden shadow-md bg-white">
                      <div className="absolute inset-0 rounded-lg" style={{ 
                        background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.6) 100%)',
                        maskImage: 'radial-gradient(white, black)',
                        WebkitMaskImage: 'radial-gradient(white, black)'
                      }} />
                      <img
                        src={bookmark.image}
                        alt={bookmark.title}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                        <h3 className="text-sm font-medium mb-1 line-clamp-1">{bookmark.title}</h3>
                        <p className="text-xs opacity-80 line-clamp-2">{bookmark.description}</p>
                        <div className="flex items-center mt-2 text-xs">
                          <BookMarked className="h-3 w-3 mr-1" />
                          {bookmark.count}개의 일기
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 일기 없는 날짜 선택시 모달 */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>일기가 없는 날이에요</DialogTitle>
            <DialogDescription>
              선택하신 날짜에는 아직 일기가 없습니다. 새로운 일기를 작성해보세요!
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowDialog(false)}
            >
              취소
            </Button>
            <Button
              onClick={() => {
                setShowDialog(false);
                navigate("/recording");
              }}
            >
              일기 작성하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 새 북마크 생성 모달 */}
      <Dialog open={showBookmarkDialog} onOpenChange={setShowBookmarkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새로운 일기장 만들기</DialogTitle>
            <DialogDescription>
              소중한 일기들을 모아둘 새로운 일기장을 만들어보세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid w-full items-center gap-1.5">
              <label htmlFor="title" className="text-sm font-medium">
                일기장 제목
              </label>
              <input
                type="text"
                id="title"
                className="w-full px-3 py-2 border rounded-md"
                placeholder="예: 행복했던 순간들"
              />
            </div>
            <div className="grid w-full items-center gap-1.5">
              <label htmlFor="description" className="text-sm font-medium">
                설명
              </label>
              <input
                type="text"
                id="description"
                className="w-full px-3 py-2 border rounded-md"
                placeholder="이 일기장에 대한 간단한 설명을 적어주세요"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowBookmarkDialog(false)}
            >
              취소
            </Button>
            <Button
              onClick={() => {
                setShowBookmarkDialog(false);
              }}
            >
              만들기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}