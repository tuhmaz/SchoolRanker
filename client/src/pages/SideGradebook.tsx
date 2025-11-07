import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BadgeCheck, Download, FileSpreadsheet, Printer, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { AdSlot } from "@/components/ads/AdSlot";
import { AD_SLOTS } from "@/config/ads";

export default function SideGradebook() {
  const { toast } = useToast();
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showGenerateOverlay, setShowGenerateOverlay] = useState(false);
  const [generateCountdown, setGenerateCountdown] = useState(0);

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

  useEffect(() => {
    if (!showGenerateOverlay) return;
    const interval = window.setInterval(() => {
      setGenerateCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [showGenerateOverlay]);

  const buildRequestBody = () => {
    let settings: any = {};
    try {
      settings = JSON.parse(localStorage.getItem("appSettings") ?? "{}");
    } catch (_) {
      // ignore
    }

    return JSON.stringify({
      classes,
      students,
      teacherName: settings?.teacherName ?? "",
      school: settings?.school ?? "",
      directorate: settings?.directorate ?? "",
      town: settings?.town ?? "",
      program: settings?.program ?? settings?.schoolInfo?.program ?? "",
      year: settings?.year ?? "",
      isHomeroom: Boolean(settings?.isHomeroom),
      homeroomClass: settings?.homeroomClass ?? "",
    });
  };

  const handleGenerate = async () => {
    if (loading) return;

    const WAIT_SECONDS = 10;

    try {
      setLoading(true);
      setGenerateCountdown(WAIT_SECONDS);
      setShowGenerateOverlay(true);

      let exportError: Error | null = null;

      const minDelay = new Promise((resolve) => {
        window.setTimeout(resolve, WAIT_SECONDS * 1000);
      });

      const exportTask = (async () => {
        try {
          const res = await fetch("/api/export/side-gradebook", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: buildRequestBody(),
          });

          if (!res.ok) {
            const message = await res.text();
            throw new Error(message || "تعذر إنشاء ملف Excel");
          }

          const data = await res.json();
          setLastId(data.id || null);
          toast({ title: "تم إنشاء السجل", description: `تم تجهيز الملف: ${data.filename}` });
        } catch (error: any) {
          exportError = error instanceof Error ? error : new Error("تعذر إنشاء ملف Excel");
        }
      })();

      await Promise.all([exportTask, minDelay]);

      if (exportError) {
        throw exportError;
      }
    } catch (e: any) {
      toast({ title: "فشل إنشاء الملف", description: e?.message || "تعذر إنشاء ملف Excel", variant: "destructive" });
    } finally {
      setLoading(false);
      setShowGenerateOverlay(false);
      setGenerateCountdown(0);
    }
  };

  const handleDownload = async () => {
    try {
      const res = await fetch("/api/export/side-gradebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: buildRequestBody(),
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
    <div className="mx-auto max-w-6xl space-y-8 px-4 sm:px-6" dir="rtl">
      {showGenerateOverlay && (
        <LoadingOverlay
          message={`جارٍ إنشاء ملف السجل... يرجى الانتظار ${generateCountdown > 0 ? `${generateCountdown} ثانية` : "قليلًا"}`}
        >
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">بدعم من شركائنا الإعلانيين</p>
            <AdSlot
              slot={AD_SLOTS.contentInline}
              className="border-none bg-transparent p-0"
              showLabel={false}
              insStyle={{ display: "block", minHeight: "120px" }}
            />
          </div>
        </LoadingOverlay>
      )}

      <section className="rounded-3xl border border-border/60 bg-gradient-to-b from-primary/10 via-background to-background px-5 py-7 shadow-sm sm:px-8 sm:py-8 dark:from-primary/20">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <ShieldCheck className="h-4 w-4" /> جاهز للطباعة والتصدير
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              سجل العلامات الجانبي
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              أنشئ نسخة احترافية قابلة للطباعة من سجل العلامات الجانبي لكل صف وشعبة بناءً على البيانات التي قمت
              بإعدادها مسبقًا في النظام.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border/60 bg-background/80 p-4 text-sm">
            <div className="flex items-center gap-3">
              <BadgeCheck className="h-5 w-5 text-primary" />
              <span className="text-muted-foreground">يعتمد على بيانات الإعدادات الحالية</span>
            </div>
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              <span className="text-muted-foreground">تنسيق Excel متوافق مع متطلبات الوزارة</span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">تصدير وطباعة</CardTitle>
            <CardDescription className="leading-relaxed">
              استخدم الأزرار التالية لإنشاء سجل جديد، تحميل ملف Excel، أو طباعة نسخة مباشرة. تأكد من تحديث بياناتك
              قبل التصدير.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-6 text-center dark:bg-primary/15">
              <FileSpreadsheet className="mx-auto mb-4 h-14 w-14 text-primary" />
              <p className="text-sm text-muted-foreground">
                يتم إنشاء الملف باستخدام معلومات المدرسة، الصفوف، والشعب المخزنة لدينا. يمكنك تعديل البيانات في صفحة
                الإعدادات الأساسية قبل المتابعة.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button
                onClick={handleGenerate}
                disabled={loading || classes.length === 0}
                data-testid="button-generate-side-gradebook"
                className="flex-1 min-w-[200px]"
              >
                <FileSpreadsheet className="ml-2 h-4 w-4" /> إنشاء ملف السجل
              </Button>
              <Button
                variant="outline"
                onClick={handleDownload}
                disabled={loading || classes.length === 0}
                data-testid="button-download-excel"
                className="flex-1 min-w-[200px]"
              >
                <Download className="ml-2 h-4 w-4" /> تنزيل كملف Excel
              </Button>
              <Button
                variant="outline"
                onClick={() => window.print()}
                data-testid="button-print"
                className="flex-1 min-w-[200px]"
              >
                <Printer className="ml-2 h-4 w-4" /> طباعة مباشرة
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-muted/40 px-4 py-3 text-xs text-muted-foreground dark:bg-muted/20">
              <span className="font-medium text-foreground">تلميح:</span>
              <span>يمكنك تصدير أكثر من شعبة عبر الإعدادات ثم إعادة إنشاء السجل للحصول على ملفات متعددة.</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl">معاينة سريعة</CardTitle>
              <CardDescription>نموذج مبسّط لما سيتم تضمينه داخل ملف Excel الخاص بالسجل الجانبي.</CardDescription>
            </div>
            <div className="rounded-full bg-accent/60 px-3 py-1 text-xs font-medium text-accent-foreground">
              {preview ? `${preview.className} - ${preview.division}` : "بانتظار اختيار البيانات"}
            </div>
          </CardHeader>
          <CardContent>
            {preview ? (
              <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm dark:border-border">
                <div className="flex flex-col gap-2 border-b border-border/70 bg-muted/40 px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:text-sm dark:bg-muted/10">
                  <span>الصف: <strong className="text-foreground">{preview.className}</strong></span>
                  <span>الشعبة: <strong className="text-foreground">{preview.division}</strong></span>
                  <span>سجل علامات جانبي</span>
                </div>
                <div className="space-y-3 px-4 py-4 sm:hidden">
                  {preview.list.map((s: any, i: number) => (
                    <div
                      key={s.id || i}
                      className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-xs shadow-sm dark:bg-muted/30"
                    >
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-foreground">{s.name}</span>
                        <span className="text-muted-foreground">#{i + 1}</span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                        {[
                          "التقويم الأول",
                          "التقويم الثاني",
                          "التقويم الثالث",
                          "الاختبار النهائي",
                          "المجموع",
                          "المعدل",
                        ].map((label) => (
                          <div key={label} className="flex items-center justify-between gap-2 rounded-md bg-background px-2 py-1 dark:bg-muted/20">
                            <span>{label}</span>
                            <span className="font-medium text-foreground">—</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="hidden overflow-auto sm:block">
                  <table className="w-full min-w-[720px] border-collapse text-sm" style={{ direction: "rtl" }}>
                    <thead className="bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground dark:bg-muted/20 dark:text-muted-foreground">
                      <tr>
                        <th className="border border-border/70 px-3 py-2">م</th>
                        <th className="border border-border/70 px-3 py-2 text-right">اسم الطالب</th>
                        <th className="border border-border/70 px-3 py-2">التقويم الأول</th>
                        <th className="border border-border/70 px-3 py-2">التقويم الثاني</th>
                        <th className="border border-border/70 px-3 py-2">التقويم الثالث</th>
                        <th className="border border-border/70 px-3 py-2">الاختبار النهائي</th>
                        <th className="border border-border/70 px-3 py-2">المجموع</th>
                        <th className="border border-border/70 px-3 py-2">المعدل</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 dark:divide-border/40">
                      {preview.list.map((s: any, i: number) => (
                        <tr key={s.id || i} className="bg-white dark:bg-background">
                          <td className="border border-border/60 px-3 py-2 text-center text-xs font-medium text-muted-foreground">
                            {i + 1}
                          </td>
                          <td className="border border-border/60 px-3 py-2 text-sm font-medium text-foreground">{s.name}</td>
                          <td className="border border-border/60 px-3 py-2 text-center text-xs text-muted-foreground">—</td>
                          <td className="border border-border/60 px-3 py-2 text-center text-xs text-muted-foreground">—</td>
                          <td className="border border-border/60 px-3 py-2 text-center text-xs text-muted-foreground">—</td>
                          <td className="border border-border/60 px-3 py-2 text-center text-xs text-muted-foreground">—</td>
                          <td className="border border-border/60 px-3 py-2 text-center text-xs text-muted-foreground">—</td>
                          <td className="border border-border/60 px-3 py-2 text-center text-xs text-muted-foreground">—</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/60 bg-muted/20 text-center text-sm text-muted-foreground">
                <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
                <p>لم يتم العثور على بيانات مناسبة للمعاينة. يرجى التأكد من رفع بيانات الصفوف والطلبة مسبقًا.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}



