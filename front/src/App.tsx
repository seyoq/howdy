import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import Home from "@/pages/Home";
import DiaryDetail from "@/pages/DiaryDetail";
import Recording from "@/pages/Recording";
import EmotionSelection from "@/pages/EmotionSelection";
import Statistics from "@/pages/Statistics";
import Settings from "@/pages/Settings";
import Login from "@/pages/Login";
import EmailLogin from "@/pages/EmailLogin";
import SignUp from "@/pages/SignUp";
import NotFound from "@/pages/NotFound";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AuthProvider } from "@/contexts/AuthContext";
import { LockProvider } from "@/contexts/LockContext";
import Bookmarks from "@/pages/Bookmarks";
import DiaryGeneration from "@/pages/DiaryGeneration";
import DiaryFeedback from "@/pages/DiaryFeedback";
import TextEdit from "@/pages/TextEdit";
import Result from "@/pages/Result";

function App() {
  return (
    <AuthProvider>
      <LockProvider>
        <Router>
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />
            <Route
              path="/diary/:id"
              element={
                <ProtectedRoute>
                  <DiaryDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/recording"
              element={
                <ProtectedRoute>
                  <Recording />
                </ProtectedRoute>
              }
            />
            <Route
              path="/text-edit"
              element={
                <ProtectedRoute>
                  <TextEdit />
                </ProtectedRoute>
              }
            />
            <Route
              path="/diary-feedback"
              element={
                <ProtectedRoute>
                  <DiaryFeedback />
                </ProtectedRoute>
              }
            />
            <Route
              path="/diary-generation"
              element={
                <ProtectedRoute>
                  <DiaryGeneration />
                </ProtectedRoute>
              }
            />
            <Route
              path="/emotion-selection"
              element={
                <ProtectedRoute>
                  <EmotionSelection />
                </ProtectedRoute>
              }
            />
            <Route
              path="/statistics"
              element={
                <ProtectedRoute>
                  <Statistics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bookmarks"
              element={
                <ProtectedRoute>
                  <Bookmarks />
                </ProtectedRoute>
              }
            />
            <Route
              path="/result"
              element={
                <ProtectedRoute>
                  <Result />
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<Login />} />
            <Route path="/email-login" element={<EmailLogin />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
        </Router>
      </LockProvider>
    </AuthProvider>
  );
}

export default App;
