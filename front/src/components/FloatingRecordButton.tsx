import { Mic } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FloatingRecordButtonProps {
  onClick: () => void;
}

export const FloatingRecordButton = ({ onClick }: FloatingRecordButtonProps) => {
  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
      <Button
        onClick={onClick}
        className="w-16 h-16 rounded-full bg-gradient-primary hover:shadow-soft transition-all duration-300 hover:scale-110 border-0 shadow-lg"
        size="icon"
      >
        <Mic className="w-8 h-8 text-white" />
      </Button>
    </div>
  );
};