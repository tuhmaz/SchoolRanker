import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

interface StoredSettings {
  teacherName?: string;
  directorate?: string;
  school?: string;
  classes?: any[];
  students?: any[];
}

interface SheetPreview {
  name: string;
  html: string;
}

export default function Performance() {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);
  const [settings, setSettings] = useState<StoredSettings | null>(null);
  const [sheetPreviews, setSheetPreviews] = useState<SheetPreview[]>([]);
  const [downloadInfo, setDownloadInfo] = useState<{ id: string; filename?: string } | null>(null);
  const [excelBlob, setExcelBlob] = useState<Blob | null>(null);
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const [isDownloadingCover, setIsDownloadingCover] = useState(false);
  const [coverDownloadInfo, setCoverDownloadInfo] = useState<{ id: string; filename?: string } | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("appSettings");
      if (!raw) return;
      const parsed = JSON.parse(raw) as StoredSettings;
      setSettings(parsed);
    } catch (_) {
      toast({
        title: "تعذر تحميل البيانات",
        description: "لم نتمكن من قراءة التجهيزات المحفوظة",
        variant: "destructive",
      });
    }
  }, [toast]);

  const hasPreparedData = useMemo(() => {
    const cls = settings?.classes;
    const sts = settings?.students;
    return Array.isArray(cls) && cls.length > 0 && Array.isArray(sts) && sts.length > 0;
  }, [settings]);

  const canGenerateCover = useMemo(() => {
    const cls = settings?.classes;
    return (
      Boolean(settings?.directorate?.trim()) &&
      Boolean(settings?.school?.trim()) &&
      Array.isArray(cls) && cls.length > 0
    );
  }, [settings]);

  const prepareSheetPreviews = useCallback(async (id: string) => {
    const response = await fetch(`/api/export/performance?id=${encodeURIComponent(id)}`);
    if (!response.ok) {
      throw new Error("فشل تحميل ملف الإكسل للمعاينة");
    }

    const arrayBuffer = await response.arrayBuffer();
    const blob = new Blob([arrayBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    setExcelBlob(blob);

    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
    const previews: SheetPreview[] = workbook.SheetNames.map((sheetName, index) => {
      const sheet = workbook.Sheets[sheetName];
      const rawHtml = XLSX.utils.sheet_to_html(sheet, { id: `sheet-${index}` });
      const doc = new DOMParser().parseFromString(rawHtml, "text/html");
      const body = doc.body;
      body.setAttribute("dir", "rtl");
      const header = body.querySelector("h1");
      if (header) header.remove();
      body.querySelectorAll("img").forEach((img) => {
        img.removeAttribute("src");
        img.remove();
      });
      body.querySelectorAll("colgroup, col, caption").forEach((el) => el.remove());
      body.querySelectorAll("td, th").forEach((cell) => {
        if (cell.textContent?.includes("_x000D_")) {
          cell.textContent = cell.textContent.replace(/_x000D_/g, "\n");
        }
      });
      body.querySelectorAll("table").forEach((table) => {
        table.setAttribute(
          "style",
          `${table.getAttribute("style") || ""};width:100%;border-collapse:collapse;direction:rtl;text-align:right;`
        );
      });
      body.querySelectorAll("th").forEach((cell) => {
        cell.setAttribute(
          "style",
          `${cell.getAttribute("style") || ""};border:1px solid #d4d4d8;padding:6px 8px;background:#f4f4f5;font-weight:600;`
        );
      });
      body.querySelectorAll("td").forEach((cell) => {
        cell.setAttribute(
          "style",
          `${cell.getAttribute("style") || ""};border:1px solid #e4e4e7;padding:6px 8px;`
        );
      });
      return { name: sheetName, html: body.innerHTML };
    });

    setSheetPreviews(previews);
  }, []);

  const handleGenerate = async () => {
    if (!hasPreparedData) {
      toast({
        title: "البيانات غير مكتملة",
        description: "يرجى تجهيز الصفوف والطلبة من صفحة التجهيزات أولاً",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsGenerating(true);
      setDownloadInfo(null);
      setSheetPreviews([]);
      setExcelBlob(null);
      toast({
        title: "جاري المعالجة",
        description: "سيتم إنشاء سجل الأداء والملاحظات الآن",
      });

      const response = await fetch("/api/export/performance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teacherName: settings?.teacherName,
          classes: settings?.classes ?? [],
          students: settings?.students ?? [],
        }),
      });

      if (!response.ok) {
        throw new Error("فشل إنشاء السجل");
      }

      const data = await response.json();
      if (!data?.id) {
        throw new Error("الاستجابة غير صالحة");
      }

      setDownloadInfo({ id: data.id as string, filename: data.filename as string | undefined });
      await prepareSheetPreviews(data.id as string);

      toast({
        title: "اكتمل الإنشاء",
        description: "تم إنشاء السجل ويمكنك معاينته وتنزيله الآن",
      });
    } catch (error: any) {
      toast({
        title: "تعذر إنشاء السجل",
        description: error?.message || "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateCover = async () => {
    if (!settings) {
      toast({
        title: "البيانات غير مكتملة",
        description: "يرجى تجهيز بيانات المدرسة من صفحة التجهيزات",
        variant: "destructive",
      });
      return;
    }

    if (!canGenerateCover) {
      toast({
        title: "بيانات الغلاف ناقصة",
        description: "تأكد من إدخال اسم المديرية والمدرسة وإضافة الصفوف",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsGeneratingCover(true);
      setCoverDownloadInfo(null);
      toast({
        title: "جاري المعالجة",
        description: "سيتم إنشاء الغلاف",
      });

      const response = await fetch("/api/export/performance-cover", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          directorate: settings.directorate,
          school: settings.school,
          teacherName: settings.teacherName,
          classes: settings.classes ?? [],
        }),
      });

      if (!response.ok) {
        throw new Error("فشل إنشاء الغلاف");
      }

      const data = await response.json();
      if (!data?.id) {
        throw new Error("الاستجابة غير صالحة");
      }

      setCoverDownloadInfo({ id: data.id as string, filename: data.filename as string | undefined });
      toast({
        title: "تم إنشاء الغلاف",
        description: data.filename ? `تم تجهيز الغلاف: ${data.filename}` : "يمكنك تنزيل الغلاف الآن",
      });
    } catch (error: any) {
      toast({
        title: "تعذر إنشاء الغلاف",
        description: error?.message || "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingCover(false);
    }
  };

  const handleDownloadCover = async () => {
    if (!coverDownloadInfo) {
      toast({
        title: "لا يوجد ملف",
        description: "يرجى إنشاء الغلاف أولاً",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsDownloadingCover(true);
      const response = await fetch(`/api/export/performance-cover?id=${encodeURIComponent(coverDownloadInfo.id)}`);
      if (!response.ok) {
        throw new Error("فشل تحميل الغلاف");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = coverDownloadInfo.filename || "غلاف_السجلات.xlsx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: "تعذر تنزيل الغلاف",
        description: error?.message || "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setIsDownloadingCover(false);
    }
  };

  const handleDownloadExcel = async () => {
    if (!downloadInfo) {
      toast({
        title: "لا يوجد سجل",
        description: "يرجى إنشاء السجل أولاً",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsDownloadingExcel(true);
      if (!excelBlob) {
        const response = await fetch(`/api/export/performance?id=${encodeURIComponent(downloadInfo.id)}`);
        if (!response.ok) {
          throw new Error("فشل تحميل الملف");
        }
        const freshBlob = await response.blob();
        setExcelBlob(freshBlob);
      }

      const blob = excelBlob ?? (await (async () => {
        const response = await fetch(`/api/export/performance?id=${encodeURIComponent(downloadInfo.id)}`);
        if (!response.ok) {
          throw new Error("فشل تحميل الملف");
        }
        return await response.blob();
      })());
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = downloadInfo.filename || "سجلات_الاداء_والملاحظات.xlsx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: "تعذر تحميل الملف",
        description: error?.message || "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setIsDownloadingExcel(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold text-foreground">إنشاء سجل أداء وملاحظة</h1>
        <p className="text-muted-foreground mt-2">
          قم بإنشاء سجل الأداء والملاحظات للطلبة
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>سجل الأداء والملاحظات</CardTitle>
          <CardDescription>
            اذهب إلى صفحة "التجهيزات" لرفع ملف الطلبة أولاً، ثم اضغط على الزر أدناه
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-accent/50 rounded-lg p-6 text-center">
            <FileText className="w-16 h-16 mx-auto text-primary mb-4" />
            <p className="text-muted-foreground">سجل شامل لتقييم أداء الطلبة</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleGenerate} data-testid="button-generate-performance" disabled={isGenerating || !hasPreparedData}>
              <FileText className="w-4 h-4 ml-2" />
              معالجة وإنشاء السجل
            </Button>
            <Button
              variant="outline"
              data-testid="button-download-excel"
              onClick={handleDownloadExcel}
              disabled={!downloadInfo || isDownloadingExcel}
            >
              <Download className="w-4 h-4 ml-2" />
              تحميل Excel
            </Button>
            <Button
              onClick={handleGenerateCover}
              data-testid="button-generate-cover"
              disabled={isGeneratingCover || !canGenerateCover}
            >
              <FileText className="w-4 h-4 ml-2" />
              إنشاء الغلاف
            </Button>
            <Button
              variant="outline"
              data-testid="button-download-cover"
              onClick={handleDownloadCover}
              disabled={!coverDownloadInfo || isDownloadingCover}
            >
              <Download className="w-4 h-4 ml-2" />
              تحميل الغلاف
            </Button>
          </div>

          {sheetPreviews.length > 0 && (
            <div ref={previewRef} className="mt-8 space-y-6" data-testid="performance-preview">
              {sheetPreviews.map((preview) => (
                <div key={preview.name} className="border border-border/60 rounded-lg bg-white shadow-sm overflow-hidden">
                  <div className="border-b border-border/40 bg-muted/30 px-4 py-3 font-semibold text-foreground">
                    {preview.name}
                  </div>
                  <div className="p-4 overflow-x-auto" dir="rtl">
                    <div
                      className="excel-preview space-y-4"
                      dangerouslySetInnerHTML={{ __html: preview.html }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
