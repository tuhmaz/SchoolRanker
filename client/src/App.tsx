import { Suspense, lazy, useEffect, useRef, useState, type ComponentType } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { StructuredData } from "@/components/StructuredData";
import { Logo } from "@/components/Logo";
import { Canonical } from "@/components/Canonical";
import { MetaTags } from "./components/MetaTags";
import { useAuth } from "@/hooks/useAuth";
import Home from "@/pages/Home";
const CombinedSettings = lazy(() => import("@/pages/CombinedSettings"));
const TeacherAgial = lazy(() => import("@/pages/TeacherAgial"));
const SideGradebook = lazy(() => import("@/pages/SideGradebook"));
const Performance = lazy(() => import("@/pages/Performance"));
const MainGradebook = lazy(() => import("@/pages/MainGradebook"));
const Attendance = lazy(() => import("@/pages/Attendance"));
const LessonAttendance = lazy(() => import("@/pages/LessonAttendance"));
const StudentSchedulePage = lazy(() => import("@/pages/StudentSchedule"));
const Templates = lazy(() => import("@/pages/Templates"));
const Instructions = lazy(() => import("@/pages/Instructions"));
const About = lazy(() => import("@/pages/About"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const GradebookAnalyzer = lazy(() => import("@/pages/GradebookAnalyzer"));
const Tutorials = lazy(() => import("@/pages/Tutorials"));
const Login = lazy(() => import("@/pages/Login"));
const Register = lazy(() => import("@/pages/Register"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const AdminUsers = lazy(() => import("@/pages/AdminUsers"));
const DashboardExports = lazy(() => import("@/pages/DashboardExports"));
const DashboardRecords = lazy(() => import("@/pages/DashboardRecords"));
const DashboardSideGradebook = lazy(() => import("@/pages/DashboardSideGradebook"));
const DashboardPerformance = lazy(() => import("@/pages/DashboardPerformance"));
const DashboardMainGradebook = lazy(() => import("./pages/DashboardMainGradebook"));
const NotFound = lazy(() => import("@/pages/not-found"));

function withAdmin(Component: ComponentType<any>) {
  return function WithAdmin(props: any) {
    const { user, isLoading } = useAuth();
    const [, setLocation] = useLocation();

    useEffect(() => {
      if (!isLoading && !user) setLocation("/login");
    }, [isLoading, user, setLocation]);

    if (isLoading) {
      return <div className="p-6 text-center text-muted-foreground">جارٍ التحقق من الحساب...</div>;
    }

    if (!user) return null;
    if (user.role !== "admin") {
      return <div className="p-6 text-center text-muted-foreground">غير مصرح</div>;
    }

    return <Component {...props} />;
  };
}

function withAuth(Component: ComponentType<any>) {
  return function WithAuth(props: any) {
    const { user, isLoading } = useAuth();
    const [, setLocation] = useLocation();

    useEffect(() => {
      if (!isLoading && !user) setLocation("/login");
    }, [isLoading, user, setLocation]);

    if (isLoading) {
      return <div className="p-6 text-center text-muted-foreground">جارٍ التحقق من الحساب...</div>;
    }

    if (!user) return null;
    return <Component {...props} />;
  };
}

const ProtectedDashboard = withAuth(Dashboard);
const ProtectedAdminUsers = withAdmin(AdminUsers);
const ProtectedDashboardExports = withAuth(DashboardExports);
const ProtectedDashboardRecords = withAuth(DashboardRecords);
const ProtectedDashboardSideGradebook = withAuth(DashboardSideGradebook);
const ProtectedDashboardMainGradebook = withAuth(DashboardMainGradebook);
const ProtectedDashboardAttendance = withAuth(Attendance);
const ProtectedDashboardLessonAttendance = withAuth(LessonAttendance);
const ProtectedDashboardPerformance = withAuth(DashboardPerformance);

function Router({ isNotFound }: { isNotFound: boolean }) {
  if (isNotFound) {
    return <NotFound />;
  }

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/dashboard/admin/users" component={ProtectedAdminUsers} />
      <Route path="/dashboard/exports" component={ProtectedDashboardExports} />
      <Route path="/dashboard/records" component={ProtectedDashboardRecords} />
      <Route path="/dashboard/side-gradebook" component={ProtectedDashboardSideGradebook} />
      <Route path="/dashboard/main-gradebook" component={ProtectedDashboardMainGradebook} />
      <Route path="/dashboard/attendance" component={ProtectedDashboardAttendance} />
      <Route path="/dashboard/lesson-attendance" component={ProtectedDashboardLessonAttendance} />
      <Route path="/dashboard/performance" component={ProtectedDashboardPerformance} />
      <Route path="/dashboard/admin" component={ProtectedDashboard} />
      <Route path="/dashboard" component={ProtectedDashboard} />
      <Route path="/settings" component={CombinedSettings} />
      <Route path="/teacher-agial" component={TeacherAgial} />
      <Route path="/side-gradebook" component={SideGradebook} />
      <Route path="/performance" component={Performance} />
      <Route path="/main-gradebook" component={MainGradebook} />
      <Route path="/attendance" component={Attendance} />
      <Route path="/lesson-attendance" component={LessonAttendance} />
      <Route path="/schedule" component={StudentSchedulePage} />
      <Route path="/gradebook-analyzer" component={GradebookAnalyzer} />
      <Route path="/templates" component={Templates} />
      <Route path="/instructions" component={Instructions} />
      <Route path="/tutorials" component={Tutorials} />
      <Route path="/about" component={About} />
      <Route path="/privacy" component={Privacy} />
      <Route component={() => null} />
    </Switch>
  );
}

function App() {
  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  const [location] = useLocation();
  const isDashboardRoute = location.startsWith("/dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(() => !isDashboardRoute);
  const lastNonDashboardOpenRef = useRef(true);

  useEffect(() => {
    if (!isDashboardRoute) {
      lastNonDashboardOpenRef.current = sidebarOpen;
    }
  }, [isDashboardRoute, sidebarOpen]);

  useEffect(() => {
    if (isDashboardRoute) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(lastNonDashboardOpenRef.current);
    }
  }, [isDashboardRoute]);

  // Define valid routes
  const validRoutes = [
    "/",
    "/login",
    "/register",
    "/dashboard",
    "/dashboard/admin",
    "/dashboard/exports",
    "/dashboard/records",
    "/dashboard/side-gradebook",
    "/dashboard/main-gradebook",
    "/dashboard/attendance",
    "/dashboard/lesson-attendance",
    "/dashboard/performance",
    "/dashboard/admin/users",
    "/settings",
    "/teacher-agial",
    "/side-gradebook",
    "/performance",
    "/main-gradebook",
    "/attendance",
    "/lesson-attendance",
    "/schedule",
    "/gradebook-analyzer",
    "/templates",
    "/instructions",
    "/tutorials",
    "/about",
    "/privacy",
  ];

  // Check if current location is a valid route
  const isNotFound = !validRoutes.includes(location);

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

  // If 404, render NotFound page without layout
  if (isNotFound) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Suspense fallback={<div className="p-6 text-center text-muted-foreground">جارٍ التحميل...</div>}>
            {/* Inject meta and canonical for 404 route too */}
            <MetaTags isNotFound />
            <Canonical />
            <Router isNotFound={true} />
          </Suspense>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  const isAuthRoute = location === "/login" || location === "/register";

  if (isAuthRoute) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <MetaTags />
          <Canonical />
          <Suspense fallback={<div className="p-6 text-center text-muted-foreground">جارٍ التحميل...</div>}>
            <Router isNotFound={false} />
          </Suspense>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {/* Inject route-specific meta and canonical in normal layout */}
      <MetaTags />
      <Canonical />
        <StructuredData type="Organization" />
        <StructuredData type="WebApplication" />
        <StructuredData type="FAQPage" data={faqData} />
        <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen} style={style as React.CSSProperties}>
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
                    <div className={isDashboardRoute ? "w-full" : "max-w-4xl mx-auto"}>
                      <Suspense fallback={<div className="p-6 text-center text-muted-foreground">جارٍ التحميل...</div>}>
                        <Router isNotFound={false} />
                      </Suspense>
                    </div>
                  </div>
                </div>
              </main>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
