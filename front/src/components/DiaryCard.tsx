import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

interface DiaryEntry {
  id: string;
  date: string;
  title: string;
  emotion: string;
  emotionEmoji: string;
  summary: string;
  thumbnail?: string;
}

interface DiaryCardProps {
  entry: DiaryEntry;
}

export const DiaryCard = ({ entry }: DiaryCardProps) => {
  const navigate = useNavigate();

  const emotionColors: Record<string, string> = {
    happy: "bg-emotion-happy",
    sad: "bg-emotion-sad", 
    angry: "bg-emotion-angry",
    excited: "bg-emotion-excited",
    calm: "bg-emotion-calm",
    anxious: "bg-emotion-anxious"
  };

  const handleClick = () => {
    navigate(`/diary/${entry.id}`);
  };

  return (
    <Card 
      className="p-4 mb-4 bg-gradient-card shadow-card border-0 hover:shadow-soft transition-all duration-300 cursor-pointer hover:scale-[1.02]"
      onClick={handleClick}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full ${emotionColors[entry.emotion] || 'bg-muted'} flex items-center justify-center text-2xl`}>
            {entry.emotionEmoji}
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-lg">{entry.title}</h3>
            <p className="text-muted-foreground text-sm">{entry.date}</p>
          </div>
        </div>
        {entry.thumbnail && (
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted">
            <img 
              src={entry.thumbnail} 
              alt="일기 썸네일" 
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>
      <p className="text-foreground text-sm leading-relaxed line-clamp-3">
        {entry.summary}
      </p>
    </Card>
  );
};