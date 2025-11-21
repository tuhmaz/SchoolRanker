import { Home, Settings, FileSpreadsheet, FileText, FileCheck, ClipboardList, Calendar, HelpCircle, Info, BookOpen, Users, Shield, Table, Video, GraduationCap } from "lucide-react";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { Link, useLocation } from "wouter";
import { Logo } from "@/components/Logo";
import { AdSlot } from "@/components/ads/AdSlot";
import { AD_SLOTS } from "@/config/ads";

const TEACHER_AGIAL_NEW_START = new Date(2025, 10, 21);
const TEACHER_AGIAL_NEW_END = new Date(2025, 10, 28);

const menuItems = [
  { title: "خدمتك", url: "/", icon: Home, testId: "nav-home" },
  { title: "التجهيزات الأساسية", url: "/settings", icon: Settings, testId: "nav-settings" },
  { title: "صفحة المعلم أجيال", url: "/teacher-agial", icon: GraduationCap, testId: "nav-teacher-agial" },
  { title: "سجل علامات جانبي", url: "/side-gradebook", icon: FileSpreadsheet, testId: "nav-side-gradebook" },
  { title: "سجل أداء وملاحظة", url: "/performance", icon: FileText, testId: "nav-performance" },
  { title: "دفتر علامات رئيسي", url: "/main-gradebook", icon: FileCheck, testId: "nav-main-gradebook" },
  { title: "دفتر حضور وغياب", url: "/attendance", icon: ClipboardList, testId: "nav-attendance" },
  { title: "سجل الحصة الصفية", url: "/lesson-attendance", icon: Users, testId: "nav-lesson-attendance" },
  { title: "جدول الطلبة و مجموع الغياب", url: "/schedule", icon: BookOpen, testId: "nav-schedule" },
  { title: "إنشاء الشهادات", url: "/gradebook-analyzer", icon: Table, testId: "nav-gradebook-analyzer" },
  { title: "الفيديوهات التعليمية", url: "/tutorials", icon: Video, testId: "nav-tutorials" },
  { title: "اختيار نماذج الكشوفات", url: "/templates", icon: Calendar, testId: "nav-templates" },
  { title: "التعليمات", url: "/instructions", icon: HelpCircle, testId: "nav-instructions" },
  { title: "عن النظام", url: "/about", icon: Info, testId: "nav-about" },
  { title: "سياسة الخصوصية", url: "/privacy", icon: Shield, testId: "nav-privacy" },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();
  const currentDate = new Date();
  const showTeacherAgialNewBadge = currentDate >= TEACHER_AGIAL_NEW_START && currentDate < TEACHER_AGIAL_NEW_END;

  const handleNavigate = () => {
    if (isMobile) {
      // Delay closing slightly to allow navigation to trigger without interfering with routing
      window.setTimeout(() => setOpenMobile(false), 50);
    }
  };

  return (
    <Sidebar side="right">
      <SidebarContent>
        <SidebarGroup>
          <div className="px-4 py-4 border-b border-border">
            <Logo size="md" showText={true} />
          </div>
          <SidebarGroupContent className="mt-4 space-y-4">
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={location === item.url} data-testid={item.testId} onClick={handleNavigate}>
                    <Link href={item.url} onClick={handleNavigate} className="flex w-full items-center gap-2">
                      <item.icon className="w-5 h-5" />
                      <span className="flex-1 text-right">{item.title}</span>
                      {item.url === "/teacher-agial" && showTeacherAgialNewBadge && (
                        <span className="ms-auto rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm dark:bg-red-500/80">جديد</span>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
            <AdSlot
              slot={AD_SLOTS.sidebar}
              className="mx-4 border-dashed"
              format="rectangle"
              skeleton
            />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
