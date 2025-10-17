import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AdSidebar } from "@/components/AdSidebar";
import { AdFooter } from "@/components/AdFooter";
import Settings from "@/pages/Settings";
import SideGradebook from "@/pages/SideGradebook";
import Performance from "@/pages/Performance";
import MainGradebook from "@/pages/MainGradebook";
import Attendance from "@/pages/Attendance";
import { StudentSchedulePage } from "@/pages/StudentSchedule";
import Templates from "@/pages/Templates";
import Instructions from "@/pages/Instructions";
import About from "@/pages/About";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Settings} />
      <Route path="/side-gradebook" component={SideGradebook} />
      <Route path="/performance" component={Performance} />
      <Route path="/main-gradebook" component={MainGradebook} />
      <Route path="/attendance" component={Attendance} />
      <Route path="/schedule" component={StudentSchedulePage} />
      <Route path="/templates" component={Templates} />
      <Route path="/instructions" component={Instructions} />
      <Route path="/about" component={About} />
    </Switch>
  );
}

function App() {
  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
              <header className="flex items-center justify-between p-3 border-b border-border bg-background">
                <div className="flex items-center gap-3">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <div className="hidden md:block">
                    <h2 className="text-lg font-bold text-foreground">نظام إدارة سجلات الطلبة</h2>
                    <p className="text-xs text-muted-foreground">متوافقة مع منصة أجيال - وزارة التربية والتعليم</p>
                  </div>
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
                  <AdSidebar />
                </div>
              </main>
              <AdFooter />
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
