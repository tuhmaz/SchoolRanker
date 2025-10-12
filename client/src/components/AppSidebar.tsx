import { Settings, FileSpreadsheet, FileText, FileCheck, ClipboardList, Calendar, HelpCircle, Info } from "lucide-react";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { useLocation } from "wouter";

const menuItems = [
  { title: "التجهيزات الأساسية", url: "/", icon: Settings, testId: "nav-settings" },
  { title: "سجل علامات جانبي", url: "/side-gradebook", icon: FileSpreadsheet, testId: "nav-side-gradebook" },
  { title: "سجل أداء وملاحظة", url: "/performance", icon: FileText, testId: "nav-performance" },
  { title: "دفتر علامات رئيسي", url: "/main-gradebook", icon: FileCheck, testId: "nav-main-gradebook" },
  { title: "دفتر حضور وغياب", url: "/attendance", icon: ClipboardList, testId: "nav-attendance" },
  { title: "اختيار نماذج الكشوفات", url: "/templates", icon: Calendar, testId: "nav-templates" },
  { title: "التعليمات", url: "/instructions", icon: HelpCircle, testId: "nav-instructions" },
  { title: "عن النظام", url: "/about", icon: Info, testId: "nav-about" },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-lg font-bold mb-2">نظام إدارة السجلات</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={location === item.url} data-testid={item.testId}>
                    <a href={item.url}>
                      <item.icon className="w-5 h-5" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
