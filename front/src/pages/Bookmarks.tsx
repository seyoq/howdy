import { useState } from "react";
import { motion } from "framer-motion";
import { BookMarked, Search, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";

// 임시 데이터 (나중에 실제 데이터로 대체)
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

export default function Bookmarks() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredBookmarks = sampleBookmarks.filter(bookmark =>
    bookmark.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-orange-50 p-4"
    >
      {/* 헤더 */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold">나의 일기장</h1>
      </div>

      {/* 검색 */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder="일기장 검색하기"
          className="pl-10 bg-white"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* 북마크 그리드 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {filteredBookmarks.map((bookmark) => (
          <motion.div
            key={bookmark.id}
            whileHover={{ y: -5 }}
            className="relative group cursor-pointer"
            onClick={() => navigate(`/bookmark/${bookmark.id}`)}
          >
            <div className="aspect-[3/4] rounded-lg overflow-hidden shadow-md bg-white">
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/60 rounded-lg" />
              <img
                src={bookmark.image}
                alt={bookmark.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                <h3 className="text-sm font-medium mb-1">{bookmark.title}</h3>
                <p className="text-xs opacity-80">{bookmark.description}</p>
                <div className="flex items-center mt-2 text-xs">
                  <BookMarked className="h-3 w-3 mr-1" />
                  {bookmark.count}개의 일기
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
} 