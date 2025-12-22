import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, LogOut } from "lucide-react";
import type { AuthMeResponse } from "@/hooks/useAuth";

type DashboardResponse = {
  ok: true;
  user: AuthMeResponse["user"];
  dashboard: AuthMeResponse["dashboard"];
  stats: { usersCount: number } | null;
  runtime: { now: string; pendingDownloads: number };
};

export default function Dashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const { data, isLoading, isError } = useQuery<DashboardResponse>({
    queryKey: ["/api/dashboard"],
    queryFn: getQueryFn<DashboardResponse>({ on401: "throw" }),
    refetchOnWindowFocus: false,
  });

  const onLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await apiRequest("POST", "/api/auth/logout");
      queryClient.setQueryData(["/api/auth/me"], null);
      queryClient.removeQueries({ queryKey: ["/api/dashboard"] });
      setLocation("/login");
    } catch (err: any) {
      toast({
        title: "تعذر تسجيل الخروج",
        description: String(err?.message ?? "حدث خطأ غير متوقع"),
        variant: "destructive",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6" dir="rtl">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>جارٍ تحميل لوحة التحكم...</span>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6" dir="rtl">
        <Card>
          <CardHeader>
            <CardTitle>تعذر تحميل لوحة التحكم</CardTitle>
            <CardDescription>حاول إعادة تحميل الصفحة</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">لوحة التحكم</h1>
          <p className="text-muted-foreground mt-1">
            {data.user.name} • {data.user.schoolName ?? ""}
          </p>
        </div>
        <Button variant="outline" onClick={onLogout} disabled={isLoggingOut}>
          {isLoggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
          <span className="ms-2">تسجيل الخروج</span>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>الحالة</CardTitle>
          <CardDescription>معلومات سريعة عن النظام</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="text-sm text-muted-foreground">الدور: {data.dashboard.role}</div>
          {data.stats?.usersCount != null && (
            <div className="text-sm text-muted-foreground">عدد المستخدمين: {data.stats.usersCount}</div>
          )}
          <div className="text-sm text-muted-foreground">ملفات جاهزة للتحميل: {data.runtime.pendingDownloads}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>الصفحات المتاحة</CardTitle>
          <CardDescription>روابط حسب الصلاحيات</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          {data.dashboard.pages.map((page) => (
            <Link key={page.id} href={page.path} className="block rounded-md border border-border p-3 hover:bg-muted/50">
              {page.title}
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

