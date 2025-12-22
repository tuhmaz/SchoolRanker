import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Download, Loader2, RefreshCw, Trash2 } from "lucide-react";

type ExportItem = {
  id: string;
  filename: string;
  kind: string;
  createdAt: string;
  available: boolean;
  downloadUrl: string | null;
};

type ExportsResponse = {
  ok: true;
  exports: ExportItem[];
};

const KIND_LABELS: Record<string, string> = {
  "main-gradebook": "دفتر العلامات الرئيسي",
  certificate: "الشهادات",
  "lesson-attendance": "حضور الحصص",
  "performance-cover": "غلاف السجلات",
  attendance: "الحضور والغياب",
  "side-gradebook": "دفتر العلامات الفرعي",
  performance: "الأداء والملاحظات",
  schedule: "جدول الطلبة",
};

const formatDateTime = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("ar", { hour12: true });
};

export default function DashboardExports() {
  const { toast } = useToast();
  const [isClearing, setIsClearing] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery<ExportsResponse>({
    queryKey: ["/api/dashboard/exports"],
    queryFn: getQueryFn<ExportsResponse>({ on401: "throw" }),
    refetchOnWindowFocus: false,
  });

  const rows = useMemo(() => {
    const exportsList = data?.exports ?? [];
    return exportsList.map((entry) => ({
      ...entry,
      kindLabel: KIND_LABELS[entry.kind] ?? entry.kind,
      createdAtLabel: formatDateTime(entry.createdAt),
    }));
  }, [data?.exports]);

  const onRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["/api/dashboard/exports"] });
  };

  const onRemove = async (id: string) => {
    if (isClearing) return;
    setIsClearing(id);
    try {
      await apiRequest("DELETE", `/api/dashboard/exports/${encodeURIComponent(id)}`);
      await queryClient.invalidateQueries({ queryKey: ["/api/dashboard/exports"] });
    } catch (err: any) {
      toast({
        title: "تعذر حذف السجل",
        description: String(err?.message ?? "حدث خطأ غير متوقع"),
        variant: "destructive",
      });
    } finally {
      setIsClearing(null);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" />
        جارٍ تحميل سجل التصدير...
      </div>
    );
  }

  if (isError || !data) {
    return <div className="p-6 text-center text-muted-foreground">تعذر تحميل سجل التصدير</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>سجل التصدير</CardTitle>
            <CardDescription>يعرض آخر ملفات التصدير التي أنشأتها أثناء تسجيل الدخول.</CardDescription>
          </div>
          <Button variant="outline" onClick={onRefresh} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            تحديث
          </Button>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="text-sm text-muted-foreground">لا يوجد عمليات تصدير مسجلة بعد.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الملف</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="max-w-[18rem] truncate" title={row.filename}>
                      {row.filename}
                    </TableCell>
                    <TableCell>{row.kindLabel}</TableCell>
                    <TableCell className="whitespace-nowrap">{row.createdAtLabel}</TableCell>
                    <TableCell>
                      {row.available ? (
                        <Badge variant="secondary">جاهز</Badge>
                      ) : (
                        <Badge variant="outline">غير متاح</Badge>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex gap-2">
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          disabled={!row.downloadUrl}
                          className="gap-2"
                        >
                          <a href={row.downloadUrl ?? "#"} target="_blank" rel="noreferrer">
                            <Download className="h-4 w-4" />
                            تحميل
                          </a>
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => onRemove(row.id)}
                          disabled={isClearing === row.id}
                          className="gap-2"
                        >
                          {isClearing === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          حذف
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

