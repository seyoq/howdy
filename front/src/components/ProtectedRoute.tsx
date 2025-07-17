import { useAuth } from "@/contexts/AuthContext";
import { useLock } from "@/contexts/LockContext";
import LockScreen from "./LockScreen";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { currentUser, loading: authLoading } = useAuth();
  const { isLocked, loading: lockLoading } = useLock();

  // 로딩 중일 때
  if (authLoading || lockLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-orange-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 사용자가 로그인하지 않은 경우
  if (!currentUser) {
    return <>{children}</>;
  }

  // 잠금이 활성화되어 잠겨있는 경우
  if (isLocked) {
    return <LockScreen />;
  }

  // 정상적으로 컨텐츠 표시
  return <>{children}</>;
};

export default ProtectedRoute; 