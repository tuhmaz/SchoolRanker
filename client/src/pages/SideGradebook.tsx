import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Download, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SideGradebook() {
  const { toast } = useToast();
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("appSettings");
      if (!raw) return;
      const saved = JSON.parse(raw);
      setClasses(Array.isArray(saved.classes) ? saved.classes : []);
      setStudents(Array.isArray(saved.students) ? saved.students : []);
    } catch (_) {
      // ignore
    }
  }, []);

  const [lastId, setLastId] = useState<string | null>(null);

  const handleGenerate = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/export/side-gradebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: (()=>{ let s: any = {}; try{s=JSON.parse(localStorage.getItem("appSettings")||"{}");}catch{} return JSON.stringify({ classes, students, teacherName:s?.teacherName||"", school:s?.school||"", directorate:s?.directorate||"", town:s?.town||"", program:s?.program||s?.schoolInfo?.program||"", year:s?.year||"", isHomeroom: !!s?.isHomeroom, homeroomClass: s?.homeroomClass||"" }); })(),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setLastId(data.id || null);
      toast({ title: "تم إنشاء السجل", description: `تم تجهيز الملف: ${data.filename}` });
    } catch (e: any) {
      toast({ title: "فشل إنشاء الملف", description: e?.message || "تعذر إنشاء ملف Excel", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const res = await fetch("/api/export/side-gradebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: (()=>{ let s: any = {}; try{s=JSON.parse(localStorage.getItem("appSettings")||"{}");}catch{} return JSON.stringify({ classes, students, teacherName:s?.teacherName||"", school:s?.school||"", directorate:s?.directorate||"", town:s?.town||"", program:s?.program||s?.schoolInfo?.program||"", year:s?.year||"", isHomeroom: !!s?.isHomeroom, homeroomClass: s?.homeroomClass||"" }); })(),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const id = data.id;
      setLastId(id);
      window.open(`/api/export/side-gradebook?id=${encodeURIComponent(id)}`, "_blank");
    } catch (_) {}
  };

  const preview = useMemo(() => {
    if (classes.length === 0) return null;
    const cg = classes[0];
    const div = cg?.divisions?.[0];
    if (!div) return null;
    const list = students.filter((s: any) => s.class === cg.className && s.division === div.division);
    return { className: cg.className, division: div.division, list };
  }, [classes, students]);

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold text-foreground">سجل العلامات الجانبي</h1>
        <p className="text-muted-foreground mt-2">أنشئ واطبع سجلاً جانبياً منظماً لكل صف وشعبة.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>تصدير وطباعة</CardTitle>
          <CardDescription>يستخدم بيانات الإعدادات التي قمت بحفظها سابقاً.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-accent/50 rounded-lg p-6 text-center">
            <FileSpreadsheet className="w-16 h-16 mx-auto text-primary mb-4" />
            <p className="text-muted-foreground">يولد ملف Excel في المسار المحلي ثم يمكنك تنزيله أو طباعته.</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleGenerate} disabled={loading || classes.length === 0} data-testid="button-generate-side-gradebook">
              <FileSpreadsheet className="w-4 h-4 ml-2" />
              إنشاء ملف السجل
            </Button>
            <Button variant="outline" onClick={handleDownload} disabled={loading || classes.length === 0} data-testid="button-download-excel">
              <Download className="w-4 h-4 ml-2" />
              تنزيل كملف Excel
            </Button>
            <Button variant="outline" onClick={() => window.print()} data-testid="button-print">
              <Printer className="w-4 h-4 ml-2" />
              طباعة
            </Button>
          </div>

          {preview && (
            <div className="mt-6 border rounded-md overflow-hidden bg-white text-black p-4 print:p-0">
              <div className="flex items-center justify-between mb-3">
                <div>الصف: {preview.className}</div>
                <div>الشعبة: {preview.division}</div>
                <div>سجل علامات جانبي</div>
              </div>
              <table className="w-full text-sm border-collapse" style={{ direction: "rtl" }}>
                <thead>
                  <tr>
                    <th className="border px-2 py-1">م</th>
                    <th className="border px-2 py-1 text-right">اسم الطالب</th>
                    <th className="border px-2 py-1">التقويم الأول</th>
                    <th className="border px-2 py-1">التقويم الثاني</th>
                    <th className="border px-2 py-1">التقويم الثالث</th>
                    <th className="border px-2 py-1">الاختبار النهائي</th>
                    <th className="border px-2 py-1">المجموع</th>
                    <th className="border px-2 py-1">المعدل</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.list.map((s: any, i: number) => (
                    <tr key={s.id || i}>
                      <td className="border px-2 py-1 text-center">{i + 1}</td>
                      <td className="border px-2 py-1">{s.name}</td>
                      <td className="border px-2 py-1"></td>
                      <td className="border px-2 py-1"></td>
                      <td className="border px-2 py-1"></td>
                      <td className="border px-2 py-1"></td>
                      <td className="border px-2 py-1"></td>
                      <td className="border px-2 py-1"></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}



