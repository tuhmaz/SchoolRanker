import { useMemo } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AdSidebar } from "@/components/AdSidebar";
import { AdFooter } from "@/components/AdFooter";
import { StructuredData } from "@/components/StructuredData";
import { Logo } from "@/components/Logo";
import Home from "@/pages/Home";
import Settings from "@/pages/Settings";
import SideGradebook from "@/pages/SideGradebook";
import Performance from "@/pages/Performance";
import MainGradebook from "@/pages/MainGradebook";
import Attendance from "@/pages/Attendance";
import { StudentSchedulePage } from "@/pages/StudentSchedule";
import Templates from "@/pages/Templates";
import Instructions from "@/pages/Instructions";
import About from "@/pages/About";
import NotFound from "@/pages/not-found";

const adSupportedPaths = new Set([
  "/side-gradebook",
  "/performance",
  "/main-gradebook",
  "/attendance",
  "/schedule",
]);

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/settings" component={Settings} />
      <Route path="/side-gradebook" component={SideGradebook} />
      <Route path="/performance" component={Performance} />
      <Route path="/main-gradebook" component={MainGradebook} />
      <Route path="/attendance" component={Attendance} />
      <Route path="/schedule" component={StudentSchedulePage} />
      <Route path="/templates" component={Templates} />
      <Route path="/instructions" component={Instructions} />
      <Route path="/about" component={About} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  const [location] = useLocation();
  const showAds = useMemo(() => adSupportedPaths.has(location), [location]);

  const faqData = {
    questions: [
      {
        '@type': 'Question',
        name: 'ما هو نظام خدمتك لإدارة سجلات الطلبة؟',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'نظام خدمتك هو منصة إلكترونية مجانية متكاملة لإدارة سجلات الطلبة والمعلمين، توفر دفتر علامات إلكتروني، سجل حضور وغياب، وتقارير أكاديمية شاملة. النظام متوافق بالكامل مع منصة أجيال التابعة لوزارة التربية والتعليم.',
        },
      },
      {
        '@type': 'Question',
        name: 'هل النظام متوافق مع منصة أجيال؟',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'نعم، نظام خدمتك متوافق 100% مع منصة أجيال. يمكنك استيراد بيانات الطلبة مباشرة من ملفات Excel الصادرة عن منصة أجيال، ويدعم النظام جميع التنسيقات المعتمدة.',
        },
      },
      {
        '@type': 'Question',
        name: 'هل النظام مجاني؟',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'نعم، نظام خدمتك مجاني بالكامل للمعلمين والمعلمات في جميع المدارس. لا توجد رسوم أو اشتراكات مخفية.',
        },
      },
      {
        '@type': 'Question',
        name: 'ما هي الميزات الرئيسية في نظام خدمتك؟',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'النظام يوفر: دفتر العلامات الإلكتروني (الفرعي والرئيسي)، سجل الحضور والغياب اليومي، تقارير الأداء الأكاديمي الشاملة، جداول الطلبة، معالجة ملفات Excel من منصة أجيال، وقوالب جاهزة للطباعة.',
        },
      },
      {
        '@type': 'Question',
        name: 'هل بيانات الطلبة آمنة في النظام؟',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'نعم، جميع البيانات مخزنة محلياً في متصفحك ولا يتم إرسالها إلى أي خادم خارجي. النظام يحترم خصوصية بيانات الطلبة ويوفر حماية كاملة للمعلومات.',
        },
      },
      {
        '@type': 'Question',
        name: 'كيف أبدأ باستخدام نظام خدمتك؟',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'البداية سهلة: 1) قم برفع ملف Excel من منصة أجيال، 2) أدخل معلومات المعلم والمدرسة، 3) حدد المواد الدراسية، 4) ابدأ بإدخال العلامات أو الحضور. يمكنك الرجوع لدليل الاستخدام للمزيد من التفاصيل.',
        },
      },
    ],
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <StructuredData type="Organization" />
        <StructuredData type="WebApplication" />
        <StructuredData type="FAQPage" data={faqData} />
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
              <header className="flex items-center justify-between p-3 border-b border-border bg-background">
                <div className="flex items-center gap-3">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <Logo size="sm" showText={false} className="md:hidden" />
                  <Logo size="md" showText={true} className="hidden md:flex" />
                </div>
                <ThemeToggle />
              </header>
              <main className="flex-1 overflow-y-auto p-6 bg-background">
                <div className="flex gap-6 w-full">
                  <div className="flex-1">
                    <div className="max-w-4xl mx-auto">
                      <Router />
                    </div>
                  </div>
                  {showAds && <AdSidebar />}
                </div>
              </main>
              {showAds && <AdFooter />}
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
