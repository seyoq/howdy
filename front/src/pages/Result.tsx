import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

const ComicResult = () => {
  const [comic, setComic] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComic = async () => {
      const user = getAuth().currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      const q = query(
        collection(db, "comics"),
        orderBy("createdAt", "desc")
      );

      const querySnapshot = await getDocs(q);
      const userComics = querySnapshot.docs
        .map(doc => doc.data())
        .filter(doc => doc.userId === user.uid);

      if (userComics.length > 0) {
        setComic(userComics[0]); // 최신 하나
      }

      setLoading(false);
    };

    fetchComic();
  }, []);

  if (loading) return <div className="text-center py-8">로딩 중...</div>;
  if (!comic) return <div className="text-center py-8">결과 이미지가 없습니다.</div>;

  return (
    <div className="p-6 flex flex-col items-center justify-center">
      <h2 className="text-2xl font-bold mb-2">나의 하루 일기</h2>
      {comic.emoji && (
        <div className="text-4xl mb-2">{comic.emoji}</div>
      )}
      <p className="text-center text-gray-700 mb-6 whitespace-pre-line">
        {comic.diaryText || comic.originalText}
      </p>

      {/* <h3 className="text-xl font-semibold mb-2">🎬 </h3> */}
      {comic.frames && comic.frames.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 mb-6">
          {comic.frames.map((frameUrl: string, index: number) => (
            <img
              key={index}
              src={frameUrl}
              alt={`웹툰 프레임 ${index + 1}`}
              className="rounded shadow-md w-full"
            />
          ))}
        </div>
      ) : (
        <img
          src={comic.imageUrl}
          alt="Generated Comic"
          className="rounded-lg shadow-xl w-full max-w-md mb-6"
        />
      )}

      <p className="text-sm text-gray-400">
        생성일: {comic.createdAt?.toDate?.().toLocaleString() || "알 수 없음"}
      </p>
    </div>
  );
};

export default ComicResult;
