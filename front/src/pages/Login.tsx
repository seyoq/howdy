import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

export default function Login() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    console.log("🔐 Login: Setting up auth listeners");
    
    // 리다이렉트 결과 처리
    const handleRedirectResult = async () => {
      try {
        console.log("🔐 Login: Checking redirect result...");
        const result = await getRedirectResult(auth);
        if (result) {
          console.log("✅ Login: Google login successful via redirect:", result.user.email);
          navigate("/");
        } else {
          console.log("ℹ️ Login: No redirect result found");
        }
      } catch (error) {
        console.error("❌ Login: Google login redirect failed:", error);
        setError("Google 로그인에 실패했습니다: " + error.message);
        setIsLoading(false);
      }
    };

    handleRedirectResult();

    // 인증 상태 변경 감지
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("🔐 Login: Auth state changed:", user ? `User: ${user.email}` : "No user");
      if (user) {
        console.log("✅ Login: User authenticated, navigating to home");
        navigate("/");
      }
    });

    return unsubscribe;
  }, [navigate]);

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      setError("");
      
      console.log("🔐 Login: Starting Google login");
      
      // 먼저 popup 방식 시도
      try {
        console.log("🔐 Login: Trying popup method...");
        const result = await signInWithPopup(auth, googleProvider);
        console.log("✅ Login: Popup login successful:", result.user.email);
        navigate("/");
      } catch (popupError) {
        console.warn("⚠️ Login: Popup failed, trying redirect:", popupError);
        
        // popup 실패 시 redirect 방식 시도
        if (popupError.code === 'auth/popup-blocked' || 
            popupError.code === 'auth/popup-closed-by-user' ||
            popupError.message.includes('Cross-Origin-Opener-Policy')) {
          
          console.log("🔐 Login: Switching to redirect method");
          await signInWithRedirect(auth, googleProvider);
          console.log("🔐 Login: Redirect initiated");
        } else {
          throw popupError;
        }
      }
    } catch (error) {
      console.error("❌ Login: Google login failed:", error);
      setError("Google 로그인에 실패했습니다: " + error.message);
      setIsLoading(false);
    }
  };

  const handleEmailLogin = () => {
    navigate("/email-login");
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-orange-200 via-orange-100 to-teal-100">
      <div className="relative z-10 w-full max-w-md p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold tracking-tight text-orange-800 mb-4">
            감성 일기 Bloom
          </h1>
          <p className="text-lg text-orange-700">
            당신의 하루를 기록하고 감성을 피워보세요
          </p>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded"
          >
            {error}
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="space-y-4"
        >
          <Button
            onClick={handleEmailLogin}
            className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-white transition-all duration-300 transform hover:scale-[1.02]"
            disabled={isLoading}
          >
            이메일로 로그인
          </Button>
          
          <Button
            onClick={handleGoogleLogin}
            variant="outline"
            className="w-full h-12 border-2 border-orange-600 text-orange-700 hover:bg-orange-50 transition-all duration-300 transform hover:scale-[1.02]"
            disabled={isLoading}
          >
            {isLoading ? "로그인 중..." : "Google로 로그인"}
          </Button>
        </motion.div>
      </div>
    </div>
  );
} 