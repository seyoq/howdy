import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { ArrowLeft } from "lucide-react";

export default function EmailLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/");
    } catch (err: any) {
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-orange-200 via-orange-100 to-teal-100">
      <div className="relative z-10 w-full max-w-md p-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6"
        >
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-orange-800 hover:bg-white/20"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            뒤로가기
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-6"
        >
          <div className="text-center">
            <h1 className="text-2xl font-bold text-orange-800">이메일로 로그인</h1>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-3 text-sm text-red-500 bg-red-100 rounded-md"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-orange-800">이메일</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-orange-200 focus:border-orange-500"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-orange-800">비밀번호</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-orange-200 focus:border-orange-500"
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full h-12 bg-orange-600 hover:bg-orange-700 transition-all duration-300 transform hover:scale-[1.02]"
              disabled={isLoading}
            >
              {isLoading ? "로그인 중..." : "로그인"}
            </Button>
          </form>

          <div className="text-center text-orange-800">
            <p>계정이 없으신가요?</p>
            <Link
              to="/signup"
              className="inline-block mt-2 text-orange-600 hover:text-orange-700 hover:underline"
            >
              회원가입하기
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
} 