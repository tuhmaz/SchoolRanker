import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";

type UsersResponse = {
  ok: true;
  users: Array<{
    id: string;
    username: string;
    name: string;
    role: string;
    schoolId: string;
    schoolName: string | null;
  }>;
};

export default function AdminUsers() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery<UsersResponse>({
    queryKey: ["/api/auth/users"],
    queryFn: getQueryFn<UsersResponse>({ on401: "throw" }),
    enabled: user?.role === "admin",
    refetchOnWindowFocus: false,
  });

  if (user && user.role !== "admin") {
    return (
      <div className="space-y-6" dir="rtl">
        <Card>
          <CardHeader>
            <CardTitle>غير مصرح</CardTitle>
            <CardDescription>هذه الصفحة متاحة للمشرف فقط</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6" dir="rtl">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>جارٍ تحميل المستخدمين...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold text-foreground">إدارة المستخدمين</h1>
        <p className="text-muted-foreground mt-2">قائمة الحسابات المسجلة</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>المستخدمون</CardTitle>
          <CardDescription>{data?.users?.length ?? 0} حساب</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم المستخدم</TableHead>
                <TableHead>الاسم</TableHead>
                <TableHead>الدور</TableHead>
                <TableHead>المدرسة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.users ?? []).map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.username}</TableCell>
                  <TableCell>{u.name}</TableCell>
                  <TableCell>{u.role}</TableCell>
                  <TableCell>{u.schoolName ?? ""}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

