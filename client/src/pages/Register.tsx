import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import type { AuthMeResponse } from "@/hooks/useAuth";

export default function Register() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [name, setName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await apiRequest("POST", "/api/auth/register", {
        username,
        password,
        name,
        schoolName,
      });
      const data = (await res.json()) as AuthMeResponse;
      queryClient.setQueryData(["/api/auth/me"], data);
      setLocation(data.dashboard?.path ?? "/dashboard");
    } catch (err: any) {
      toast({
        title: "تعذر إنشاء الحساب",
        description: String(err?.message ?? "حدث خطأ غير متوقع"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>إنشاء حساب</CardTitle>
          <CardDescription>أنشئ حساباً جديداً للوصول إلى لوحة التحكم</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="name">اسم المعلم</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="schoolName">اسم المدرسة</Label>
              <Input id="schoolName" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">اسم المستخدم</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "إنشاء"}
            </Button>
            <div className="text-sm text-muted-foreground">
              لديك حساب بالفعل؟ <Link href="/login" className="text-primary underline">تسجيل الدخول</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

