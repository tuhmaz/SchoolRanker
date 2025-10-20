import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { AlertCircle, Home, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  const [, setLocation] = useLocation();
  const [countdown, setCountdown] = useState(6);

  useEffect(() => {
    // Countdown timer
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setLocation("/");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [setLocation]);

  const handleGoHome = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      {/* Logo at top */}
      <div className="absolute top-8 right-8">
        <Logo size="lg" showText={true} />
      </div>

      {/* Main 404 Content */}
      <div className="text-center space-y-8 max-w-2xl mx-auto">
        {/* 404 Number */}
        <div className="relative">
          <h1 className="text-9xl md:text-[12rem] font-bold text-gray-200 dark:text-gray-700 select-none">
            404
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <AlertCircle className="h-24 w-24 md:h-32 md:w-32 text-red-500 animate-pulse" />
          </div>
        </div>

        {/* Error Message */}
        <div className="space-y-4" dir="rtl">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-100">
            عذراً، الصفحة غير موجودة
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            الصفحة التي تبحث عنها قد تكون محذوفة أو تم نقلها أو غير متاحة مؤقتاً
          </p>
        </div>

        {/* Countdown Timer */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700" dir="rtl">
          <p className="text-gray-700 dark:text-gray-300 text-lg">
            سيتم توجيهك تلقائياً إلى الصفحة الرئيسية خلال{" "}
            <span className="font-bold text-primary text-2xl">{countdown}</span>{" "}
            {countdown === 1 ? "ثانية" : "ثواني"}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
          <Button
            onClick={handleGoHome}
            size="lg"
            className="gap-2 text-lg px-8 py-6"
          >
            <Home className="h-5 w-5" />
            العودة إلى الصفحة الرئيسية
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Additional Help */}
        <div className="text-sm text-gray-500 dark:text-gray-400 pt-8" dir="rtl">
          <p>إذا كنت تعتقد أن هذا خطأ، يرجى التواصل مع فريق الدعم</p>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-gray-100 dark:from-gray-900 to-transparent pointer-events-none"></div>
    </div>
  );
}
