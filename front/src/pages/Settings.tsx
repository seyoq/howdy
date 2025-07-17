import { useState, useEffect, useRef } from "react";
import { Bell, BellOff, Clock, Heart, Calendar, Volume2, VolumeX, ChevronRight, Lock, Unlock, ArrowLeft, Mic, MicOff, Play, Pause, Square, Upload, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { db, storage } from "@/lib/firebase";
import { doc, getDoc, setDoc, collection, addDoc, query, orderBy, limit, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { useAuth } from "@/contexts/AuthContext";
import PinInput from "@/components/PinInput";

interface NotificationSetting {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
  time?: string;
}

type PinSetupStep = 'none' | 'setup' | 'confirm' | 'change_current' | 'change_new' | 'change_confirm';

const Settings = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  // 보안 설정 상태
  const [lockEnabled, setLockEnabled] = useState(false);
  const [loadingLock, setLoadingLock] = useState(true);
  const [pinSetupStep, setPinSetupStep] = useState<PinSetupStep>('none');
  const [tempPin, setTempPin] = useState('');
  const [pinError, setPinError] = useState('');

  // 기존 알림 설정 상태
  const [masterNotification, setMasterNotification] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const { toast } = useToast();

  // 오디오 테스트 상태
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isTestingSTT, setIsTestingSTT] = useState(false);
  const [sttResult, setSttResult] = useState<string>("");
  const [savedAudios, setSavedAudios] = useState<Array<{id: string, url: string, name: string, createdAt: string}>>([]);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [notifications, setNotifications] = useState<NotificationSetting[]>([
    {
      id: "daily_reminder",
      title: "일일 일기 알림",
      description: "매일 저녁 일기 작성을 알려드립니다",
      enabled: true,
      time: "20:00"
    },
    {
      id: "mood_check",
      title: "기분 체크 알림",
      description: "하루 3번 기분 상태를 확인합니다",
      enabled: true,
      time: "09:00, 15:00, 21:00"
    },
    {
      id: "weekly_review",
      title: "주간 감정 리포트",
      description: "매주 월요일 감정 통계를 보내드립니다",
      enabled: false,
      time: "월요일 09:00"
    },
    {
      id: "streak_reminder",
      title: "연속 작성 격려",
      description: "연속으로 일기를 작성할 때 격려 메시지를 보냅니다",
      enabled: true
    },
    {
      id: "memory_reminder",
      title: "추억 알림",
      description: "1년 전 오늘의 일기를 알려드립니다",
      enabled: false
    }
  ]);

  // 간단한 해시 함수
  function simpleHash(str: string) {
    let hash = 0, i, chr;
    if (str.length === 0) return hash.toString();
    for (i = 0; i < str.length; i++) {
      chr = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    return hash.toString();
  }

  // Firestore에서 lock 정보 불러오기
  useEffect(() => {
    if (!currentUser) return;
    setLoadingLock(true);
    const fetchLock = async () => {
      try {
        const ref = doc(db, "users", currentUser.uid, "security", "lock");
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setLockEnabled(!!data.enabled);
        }
      } catch (error) {
        console.error("잠금 설정 불러오기 실패:", error);
      }
      setLoadingLock(false);
    };
    fetchLock();
  }, [currentUser]);

  // 잠금 토글 핸들러
  const handleLockToggle = (checked: boolean) => {
    if (checked) {
      // 잠금 활성화 - PIN 설정 시작
      setPinSetupStep('setup');
    } else {
      // 잠금 비활성화
      handleDisableLock();
    }
  };

  // 잠금 비활성화
  const handleDisableLock = async () => {
    if (!currentUser) return;
    
    try {
      const ref = doc(db, "users", currentUser.uid, "security", "lock");
      await setDoc(ref, {
        enabled: false,
        pin: null,
        updatedAt: new Date().toISOString(),
      });
      setLockEnabled(false);
      toast({ title: "잠금이 비활성화되었습니다." });
    } catch (error) {
      console.error("잠금 비활성화 실패:", error);
      toast({ title: "오류가 발생했습니다.", variant: "destructive" });
    }
  };

  // PIN 설정 완료 핸들러
  const handlePinComplete = async (pin: string) => {
    if (!currentUser) return;

    switch (pinSetupStep) {
      case 'setup':
        setTempPin(pin);
        setPinSetupStep('confirm');
        break;
        
      case 'confirm':
        if (pin === tempPin) {
          // PIN 일치 - 저장
          try {
            const ref = doc(db, "users", currentUser.uid, "security", "lock");
            await setDoc(ref, {
              enabled: true,
              pin: simpleHash(pin),
              updatedAt: new Date().toISOString(),
            });
            setLockEnabled(true);
            setPinSetupStep('none');
            setTempPin('');
            setPinError('');
            toast({ title: "잠금이 설정되었습니다." });
          } catch (error) {
            console.error("PIN 저장 실패:", error);
            setPinError("저장 중 오류가 발생했습니다.");
          }
        } else {
          setPinError("비밀번호가 일치하지 않습니다.");
        }
        break;
        
      case 'change_current':
        // 현재 PIN 확인
        try {
          const ref = doc(db, "users", currentUser.uid, "security", "lock");
          const snap = await getDoc(ref);
          if (snap.exists()) {
            const data = snap.data();
            if (data.pin === simpleHash(pin)) {
              setPinSetupStep('change_new');
              setPinError('');
            } else {
              setPinError("현재 비밀번호가 올바르지 않습니다.");
            }
          }
        } catch (error) {
          setPinError("확인 중 오류가 발생했습니다.");
        }
        break;
        
      case 'change_new':
        setTempPin(pin);
        setPinSetupStep('change_confirm');
        break;
        
      case 'change_confirm':
        if (pin === tempPin) {
          // 새 PIN 저장
          try {
            const ref = doc(db, "users", currentUser.uid, "security", "lock");
            await setDoc(ref, {
              enabled: true,
              pin: simpleHash(pin),
              updatedAt: new Date().toISOString(),
            });
            setPinSetupStep('none');
            setTempPin('');
            setPinError('');
            toast({ title: "비밀번호가 변경되었습니다." });
          } catch (error) {
            setPinError("저장 중 오류가 발생했습니다.");
          }
        } else {
          setPinError("새 비밀번호가 일치하지 않습니다.");
        }
        break;
    }
  };

  // PIN 설정 취소
  const handlePinCancel = () => {
    setPinSetupStep('none');
    setTempPin('');
    setPinError('');
  };

  // PIN 변경 시작
  const handleChangePin = () => {
    setPinSetupStep('change_current');
  };

  // 에러 클리어
  const clearError = () => {
    setPinError('');
  };

  // 오디오 테스트 함수들
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudioBlob(audioBlob);
        setAudioUrl(URL.createObjectURL(audioBlob));
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      toast({ title: "녹음 시작", description: "음성을 녹음하고 있습니다." });
    } catch (error) {
      console.error('녹음 시작 실패:', error);
      toast({ title: "녹음 실패", description: "마이크 권한을 확인해주세요.", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast({ title: "녹음 완료", description: "녹음이 완료되었습니다." });
    }
  };

  const playAudio = () => {
    if (audioUrl && audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.play();
      setIsPlaying(true);
      
      audioRef.current.onended = () => {
        setIsPlaying(false);
      };
    }
  };

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const uploadToFirebase = async () => {
    if (!audioBlob || !currentUser) return;
    
    setIsUploading(true);
    try {
      const fileName = `audio_test_${Date.now()}.wav`;
      const storageRef = ref(storage, `users/${currentUser.uid}/audio_tests/${fileName}`);
      
      // 파일 업로드
      const snapshot = await uploadBytes(storageRef, audioBlob);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      // Firestore에 메타데이터 저장
      await addDoc(collection(db, "users", currentUser.uid, "audio_tests"), {
        name: fileName,
        url: downloadURL,
        createdAt: new Date().toISOString(),
        size: audioBlob.size,
        type: audioBlob.type
      });
      
      toast({ title: "업로드 완료", description: "오디오 파일이 저장되었습니다." });
      loadSavedAudios(); // 저장된 오디오 목록 새로고침
    } catch (error) {
      console.error('업로드 실패:', error);
      toast({ title: "업로드 실패", description: "파일 업로드에 실패했습니다.", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const testSTT = async () => {
    if (!audioBlob) return;
    
    setIsTestingSTT(true);
    setSttResult("");
    
    try {
      const formData = new FormData();
      const audioFile = new File([audioBlob], 'test_audio.wav', { type: 'audio/wav' });
      formData.append('audio', audioFile);
      
      const response = await fetch('http://localhost:8000/api/speech-to-text', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`STT 서버 오류: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setSttResult(result.text);
        toast({ title: "STT 테스트 완료", description: "음성이 텍스트로 변환되었습니다." });
      } else {
        throw new Error(result.error || '음성 인식 실패');
      }
    } catch (error) {
      console.error('STT 테스트 실패:', error);
      setSttResult("STT 테스트에 실패했습니다. 서버가 실행 중인지 확인해주세요.");
      toast({ title: "STT 테스트 실패", description: "음성 인식에 실패했습니다.", variant: "destructive" });
    } finally {
      setIsTestingSTT(false);
    }
  };

  const loadSavedAudios = async () => {
    if (!currentUser) return;
    
    try {
      const q = query(
        collection(db, "users", currentUser.uid, "audio_tests"),
        orderBy("createdAt", "desc"),
        limit(5)
      );
      const querySnapshot = await getDocs(q);
      
      const audios = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Array<{id: string, url: string, name: string, createdAt: string}>;
      
      setSavedAudios(audios);
    } catch (error) {
      console.error('저장된 오디오 불러오기 실패:', error);
    }
  };

  const clearRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setSttResult("");
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
  };

  // 저장된 오디오 목록 로드
  useEffect(() => {
    if (currentUser) {
      loadSavedAudios();
    }
  }, [currentUser]);

  // PIN 설정 단계별 제목과 부제목
  const getPinStepInfo = () => {
    switch (pinSetupStep) {
      case 'setup':
        return { 
          title: "비밀번호 설정", 
          subtitle: "4자리 숫자를 입력해주세요",
          backgroundType: 'setup' as const
        };
      case 'confirm':
        return { 
          title: "비밀번호 확인", 
          subtitle: "같은 비밀번호를 다시 입력해주세요",
          backgroundType: 'confirm' as const
        };
      case 'change_current':
        return { 
          title: "현재 비밀번호", 
          subtitle: "현재 비밀번호를 입력해주세요",
          backgroundType: 'current' as const
        };
      case 'change_new':
        return { 
          title: "새 비밀번호", 
          subtitle: "새로운 4자리 비밀번호를 입력해주세요",
          backgroundType: 'new' as const
        };
      case 'change_confirm':
        return { 
          title: "새 비밀번호 확인", 
          subtitle: "새 비밀번호를 다시 입력해주세요",
          backgroundType: 'confirm' as const
        };
      default:
        return { 
          title: "", 
          subtitle: "",
          backgroundType: 'setup' as const
        };
    }
  };

  // PIN 입력 화면 표시
  if (pinSetupStep !== 'none') {
    const { title, subtitle, backgroundType } = getPinStepInfo();
    return (
      <PinInput
        key={pinSetupStep} // 단계별 고유 key 제공
        title={title}
        subtitle={subtitle}
        backgroundType={backgroundType}
        onComplete={handlePinComplete}
        onBack={handlePinCancel}
        error={pinError}
        clearError={clearError}
      />
    );
  }

  // 나머지 기존 함수들...
  const toggleNotification = (id: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, enabled: !notif.enabled } : notif
      )
    );
    
    const notification = notifications.find(n => n.id === id);
    toast({
      title: notification?.enabled ? "알림 비활성화" : "알림 활성화",
      description: `${notification?.title}이(가) ${notification?.enabled ? "비활성화" : "활성화"}되었습니다.`,
    });
  };

  const handleTimeChange = (id: string) => {
    toast({
      title: "시간 설정",
      description: "알림 시간을 변경할 수 있습니다.",
    });
  };

  const handleTestNotification = () => {
    toast({
      title: "🔔 테스트 알림",
      description: "안녕하세요! 오늘의 감정은 어떠신가요?",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 숨겨진 오디오 태그 */}
      <audio ref={audioRef} style={{ display: 'none' }} />
      
      {loadingLock && <div className="p-6 text-center text-muted-foreground">보안 설정 불러오는 중...</div>}
      
      {/* 헤더 */}
      <div className="bg-gradient-header p-6 pt-12">
        <div className="flex items-center mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-10 w-10 text-white hover:bg-white/10 mr-4"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">환경설정</h1>
          <p className="text-white/80">앱의 다양한 환경을 설정할 수 있습니다</p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* 보안 설정 */}
        <div className="bg-card rounded-lg p-4 shadow-card">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            보안 설정
          </h3>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {lockEnabled ? (
                <Lock className="w-6 h-6 text-primary" />
              ) : (
                <Unlock className="w-6 h-6 text-muted-foreground" />
              )}
              <div>
                <h4 className="font-medium">화면잠금(비밀번호)</h4>
                <p className="text-sm text-muted-foreground">
                  앱 실행 시 4자리 비밀번호로 잠금화면을 표시합니다
                </p>
              </div>
            </div>
            <Switch checked={lockEnabled} onCheckedChange={handleLockToggle} />
          </div>
          
          {lockEnabled && (
            <div className="mt-4">
              <Button
                variant="outline"
                onClick={handleChangePin}
                className="w-full"
              >
                비밀번호 변경
              </Button>
            </div>
          )}
        </div>

        {/* 전체 알림 설정 */}
        <div className="bg-card rounded-lg p-4 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {masterNotification ? (
                <Bell className="w-6 h-6 text-primary" />
              ) : (
                <BellOff className="w-6 h-6 text-muted-foreground" />
              )}
              <div>
                <h3 className="font-semibold">전체 알림</h3>
                <p className="text-sm text-muted-foreground">
                  모든 알림을 {masterNotification ? "활성화" : "비활성화"}
                </p>
              </div>
            </div>
            <Switch
              checked={masterNotification}
              onCheckedChange={setMasterNotification}
            />
          </div>

          {masterNotification && (
            <>
              <Separator className="my-4" />
              
              {/* 사운드 및 진동 설정 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {soundEnabled ? (
                      <Volume2 className="w-5 h-5 text-primary" />
                    ) : (
                      <VolumeX className="w-5 h-5 text-muted-foreground" />
                    )}
                    <Label htmlFor="sound">알림 소리</Label>
                  </div>
                  <Switch
                    id="sound"
                    checked={soundEnabled}
                    onCheckedChange={setSoundEnabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 flex items-center justify-center">
                      📳
                    </div>
                    <Label htmlFor="vibration">진동</Label>
                  </div>
                  <Switch
                    id="vibration"
                    checked={vibrationEnabled}
                    onCheckedChange={setVibrationEnabled}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* 개별 알림 설정 */}
        <div className="bg-card rounded-lg p-4 shadow-card">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5 text-primary" />
            상세 알림 설정
          </h3>

          <div className="space-y-4">
            {notifications.map((notification, index) => (
              <div key={notification.id}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-medium text-sm">{notification.title}</h4>
                      {notification.enabled && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                          ON
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {notification.description}
                    </p>
                    {notification.time && notification.enabled && (
                      <button
                        onClick={() => handleTimeChange(notification.id)}
                        className="flex items-center gap-2 text-xs text-primary hover:underline"
                      >
                        <Clock className="w-3 h-3" />
                        {notification.time}
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <Switch
                    checked={notification.enabled && masterNotification}
                    onCheckedChange={() => toggleNotification(notification.id)}
                    disabled={!masterNotification}
                  />
                </div>
                {index < notifications.length - 1 && <Separator className="my-4" />}
              </div>
            ))}
          </div>
        </div>

        {/* 알림 시간대 설정 */}
        <div className="bg-card rounded-lg p-4 shadow-card">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            방해 금지 시간
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-sm">야간 방해 금지</h4>
                <p className="text-xs text-muted-foreground">
                  22:00 - 08:00 알림을 받지 않습니다
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-sm">주말 방해 금지</h4>
                <p className="text-xs text-muted-foreground">
                  주말에는 알림을 최소화합니다
                </p>
              </div>
              <Switch />
            </div>
          </div>
        </div>

        {/* 오디오 테스트 */}
        <div className="bg-card rounded-lg p-4 shadow-card">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Mic className="w-5 h-5 text-primary" />
            오디오 테스트
          </h3>
          
          <div className="space-y-4">
            {/* 녹음 컨트롤 */}
            <div className="flex items-center gap-2">
              {!isRecording ? (
                <Button
                  onClick={startRecording}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <Mic className="w-4 h-4 mr-2" />
                  녹음 시작
                </Button>
              ) : (
                <Button
                  onClick={stopRecording}
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                >
                  <Square className="w-4 h-4 mr-2" />
                  녹음 중지
                </Button>
              )}
              
              {audioUrl && (
                <Button
                  onClick={clearRecording}
                  variant="outline"
                  size="sm"
                >
                  초기화
                </Button>
              )}
            </div>

            {/* 재생 및 테스트 컨트롤 */}
            {audioUrl && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Button
                    onClick={isPlaying ? pauseAudio : playAudio}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4 mr-2" />
                    ) : (
                      <Play className="w-4 h-4 mr-2" />
                    )}
                    {isPlaying ? "재생 중지" : "재생"}
                  </Button>
                  
                  <Button
                    onClick={uploadToFirebase}
                    variant="outline"
                    size="sm"
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    저장
                  </Button>
                </div>
                
                <Button
                  onClick={testSTT}
                  variant="default"
                  size="sm"
                  className="w-full"
                  disabled={isTestingSTT}
                >
                  {isTestingSTT ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Volume2 className="w-4 h-4 mr-2" />
                  )}
                  STT 테스트
                </Button>
              </div>
            )}

            {/* STT 결과 표시 */}
            {sttResult && (
              <div className="bg-muted/50 rounded-lg p-3">
                <h4 className="font-medium text-sm mb-2">STT 결과:</h4>
                <p className="text-sm text-muted-foreground">{sttResult}</p>
              </div>
            )}

            {/* 저장된 오디오 목록 */}
            {savedAudios.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="font-medium text-sm mb-3">최근 저장된 오디오</h4>
                <div className="space-y-2">
                  {savedAudios.map((audio) => (
                    <div key={audio.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                      <div className="flex-1">
                        <p className="text-xs font-medium">{audio.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(audio.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <Button
                        onClick={() => window.open(audio.url, '_blank')}
                        variant="ghost"
                        size="sm"
                      >
                        <Download className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 테스트 및 추가 옵션 */}
        <div className="space-y-4">
          <Button
            onClick={handleTestNotification}
            variant="outline"
            className="w-full"
          >
            <Bell className="w-4 h-4 mr-2" />
            테스트 알림 보내기
          </Button>

          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium text-sm mb-2">💡 알림 활용 팁</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• 일정한 시간에 알림을 받으면 일기 작성 습관을 기를 수 있어요</li>
              <li>• 기분 체크 알림으로 감정 변화를 더 잘 파악할 수 있어요</li>
              <li>• 방해 금지 시간을 설정하여 필요할 때만 알림을 받으세요</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;