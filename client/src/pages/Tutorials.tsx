import { PlayCircle, Download } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const videos = [
  {
    title: "التجهيزات الأساسية",
    description: "شرح تفصيلي لخطوات تجهيز النظام ورفع ملفات منصة أجيال واختيار الإعدادات المناسبة قبل البدء.",
    filename: "التجهيزات الأساسية.mp4",
    duration: "14:32",
  },
  {
    title: "سجل علامات جانبي",
    description: "توضيح آلية استعمال دفتر العلامات الجانبي لتتبع أداء الطلبة حسب المبحث أو المجموعة.",
    filename: "سجل علامات جانبي.mp4",
    duration: "8:27",
  },
  {
    title: "سجل إداء و ملاحظة",
    description: "شرح خطوات إعداد سجل الأداء والملاحظات وتوثيق التطور الأكاديمي للطلبة.",
    filename: "سجل إداء و ملاحظة.mp4",
    duration: "9:45",
  },
  {
    title: "دفتر علامات رئيسي",
    description: "دليل شامل للتعامل مع دفتر العلامات الرئيسي وإدخال الدرجات ومراجعة النتائج النهائية.",
    filename: "دفتر علامات رئيسي.mp4",
    duration: "13:54",
  },
  {
    title: "دفتر الحضور السنوي او الشهري",
    description: "كيفية تجهيز دفتر الحضور السنوي أو الشهري مع ضبط التواريخ والغيابات والملاحظات.",
    filename: "دفتر الحضور السنوي او الشهري.mp4",
    duration: "18:07",
  },
  {
    title: "سجل الحصة الصفية",
    description: "كيفية إنشاء سجل الحصة الصفية وتعبئة تفاصيل الحصة والملاحظات اليومية.",
    filename: "سجل الحصة الصفية.mp4",
    duration: "11:03",
  },
  {
    title: "جدول الطلبة و مجموع الغياب",
    description: "طريقة إنشاء جدول الطلبة ومتابعة مجموع أيام الغياب مع شرح طرق التحديث الدوري.",
    filename: "جدول الطلبة و مجموع الغياب.mp4",
    duration: "12:18",
  },
  {
    title: "إنشاء الشهادات النهائية",
    description: "شرح كامل لخطوات تجهيز ملف الشهادات النهائية وتصديره بصيغة Excel مع ضبط الإعدادات المطلوبة.",
    filename: "انشاء شهادات النهائية.mp4",
    duration: "11:05",
  },
  {
    title: "إنشاء شهادات الفصل الدراسي الأول",
    description: "كيفية توليد شهادات الفصل الأول مع توضيح طريقة اختيار المواد والفصول التي سيتم تضمينها.",
    filename: "انشاء شهادات الفصل الدراسي الأول.mp4",
    duration: "09:42",
  },
] as const;

const buildVideoUrl = (filename: string) => `/tutorials/videos/${encodeURIComponent(filename)}`;

const groupVideos = <T,>(items: readonly T[], size: number): T[][] => {
  const groups: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    groups.push(items.slice(i, i + size) as T[]);
  }
  return groups;
};

export default function TutorialsPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-3 text-center sm:text-start">
        <Badge variant="secondary" className="inline-flex items-center gap-2 px-3 py-1 text-xs font-medium">
          <PlayCircle className="h-4 w-4" />
          دليل الفيديوهات التعليمية
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">تعرف على النظام خطوة بخطوة</h1>
        <p className="text-muted-foreground text-sm sm:text-base max-w-3xl">
          في هذه الصفحة ستجد مجموعة من الفيديوهات التعليمية القصيرة التي تشرح جميع أقسام النظام، ابتداءً من التجهيزات
          الأساسية وحتى إنشاء السجلات المتقدمة. يمكنك تشغيل الفيديو مباشرة أو تحميله للاطلاع عليه لاحقًا بدون اتصال.
        </p>
      </header>

      <div className="space-y-8">
        {groupVideos(videos, 2).map((row, rowIndex) => (
          <div key={`row-${rowIndex}`} className="grid gap-6 md:grid-cols-2">
            {row.map((video, index) => {
              const absoluteIndex = rowIndex * 2 + index;
              return (
                <Card
                  key={video.filename}
                  className="flex h-full flex-col border-border/70 bg-background/80 shadow-sm backdrop-blur-sm"
                >
                  <CardHeader className="space-y-1">
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="text-xl font-semibold">{video.title}</CardTitle>
                      <Badge variant="outline">الفيديو #{absoluteIndex + 1}</Badge>
                    </div>
                    <CardDescription className="leading-relaxed">{video.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col space-y-4">
                    <div className="relative w-full overflow-hidden rounded-lg border border-border/60 bg-black shadow-inner" style={{ aspectRatio: "16 / 9" }}>
                      <video
                        key={video.filename}
                        controls
                        preload="metadata"
                        className="h-full w-full"
                      >
                        <source src={buildVideoUrl(video.filename)} type="video/mp4" />
                        متصفحك لا يدعم تشغيل الفيديو. يمكنك تحميل الملف من الزر أدناه.
                      </video>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <PlayCircle className="h-3.5 w-3.5" />
                          مدة الفيديو: {video.duration}
                        </span>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <a href={buildVideoUrl(video.filename)} download>
                          <Download className="mr-2 h-4 w-4" />
                          تنزيل الفيديو
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
