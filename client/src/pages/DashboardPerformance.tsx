import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowRight, Clock, Loader2, Save, Plus, Trash2, History, Archive, Edit, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";

type Student = { id: string; name: string; class: string; division: string };
type ClassGroup = { className: string; divisions: Array<{ id: string; division: string; subjects?: Array<{ id: string; name: string }> }> };

type RecordsData = {
  teacherName?: string;
  directorate?: string;
  school?: string;
  town?: string;
  program?: string;
  year?: string;
  students: Student[];
  classes: ClassGroup[];
};

type RecordsResponse = {
  ok: true;
  record: { data: RecordsData; updatedAt: string } | null;
};

type PerformanceRecord = {
  id: string;
  className: string;
  divisionId: string;
  studentId: string;
  evaluationDate: string;
  academicTerm: string;
  performanceScores: {
    academic: number;
    behavioral: number;
    participation: number;
  };
  notes: string[];
  attachments: string[];
  version: number;
  archived: boolean;
  archivedAt?: string;
  updatedAt: string;
};

type PerformanceResponse = {
  ok: true;
  performanceRecords: PerformanceRecord[];
  updatedAt: string | null;
};

const normalizeText = (value: unknown) => {
  const text = value != null ? String(value).trim() : "";
  return text;
};

export default function DashboardPerformance() {
  const { toast } = useToast();

  const {
    data: recordsRes,
    isLoading: isRecordsLoading,
  } = useQuery<RecordsResponse>({
    queryKey: ["/api/dashboard/records"],
    queryFn: getQueryFn<RecordsResponse>({ on401: "throw" }),
    refetchOnWindowFocus: false,
  });

  const {
    data: perfRes,
    isLoading: isPerfLoading,
  } = useQuery<PerformanceResponse>({
    queryKey: ["/api/dashboard/performance-records"],
    queryFn: getQueryFn<PerformanceResponse>({ on401: "throw" }),
    refetchOnWindowFocus: false,
  });

  const settings = recordsRes?.record?.data ?? null;
  const classes = settings?.classes ?? [];
  const students = settings?.students ?? [];
  const performanceRecords = perfRes?.performanceRecords ?? [];

  const [selectedClassName, setSelectedClassName] = useState("");
  const [selectedDivision, setSelectedDivision] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");

  const {
    data: mainGbRes,
  } = useQuery<any>({
    queryKey: ["/api/dashboard/main-gradebook"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!selectedStudentId,
  });

  const {
    data: sideGbRes,
  } = useQuery<any>({
    queryKey: ["/api/dashboard/side-gradebook"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!selectedStudentId,
  });

  const [evaluationDate, setEvaluationDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [academicTerm, setAcademicTerm] = useState("الفصل الأول");
  const [scores, setScores] = useState({ academic: 80, behavioral: 90, participation: 85 });
  const [currentNote, setCurrentNote] = useState("");
  const [notes, setNotes] = useState<string[]>([]);
  const [currentAttachment, setCurrentAttachment] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);


  const classOptions = useMemo(() => {
    const order: string[] = [];
    classes.forEach((c) => {
      const name = normalizeText(c.className);
      if (name && !order.includes(name)) order.push(name);
    });
    return order;
  }, [classes]);

  const divisionOptions = useMemo(() => {
    const selected = normalizeText(selectedClassName) || "غير محدد";
    const fromClasses = classes
      .filter((c) => (normalizeText(c.className) || "غير محدد") === selected)
      .flatMap((c) =>
        Array.isArray(c.divisions)
          ? c.divisions.map((d) => normalizeText((d as any)?.division) || "بدون شعبة")
          : [],
      );
    return Array.from(new Set(fromClasses));
  }, [classes, selectedClassName]);

  const activeStudents = useMemo(() => {
    const cls = normalizeText(selectedClassName) || "غير محدد";
    const div = normalizeText(selectedDivision) || "بدون شعبة";
    return students
      .filter((s) => (normalizeText(s.class) || "غير محدد") === cls && (normalizeText(s.division) || "بدون شعبة") === div)
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "ar", { sensitivity: "base" }));
  }, [selectedClassName, selectedDivision, students]);

  const studentRecords = useMemo(() => {
    if (!selectedStudentId) return [];
    return performanceRecords
      .filter(r => r.studentId === selectedStudentId && !r.archived)
      .sort((a, b) => new Date(b.evaluationDate).getTime() - new Date(a.evaluationDate).getTime());
  }, [performanceRecords, selectedStudentId]);

  const archivedRecords = useMemo(() => {
    if (!selectedStudentId) return [];
    return performanceRecords
      .filter(r => r.studentId === selectedStudentId && r.archived)
      .sort((a, b) => new Date(b.evaluationDate).getTime() - new Date(a.evaluationDate).getTime());
  }, [performanceRecords, selectedStudentId]);

  useEffect(() => {
    if (!selectedClassName && classOptions.length > 0) setSelectedClassName(classOptions[0]);
  }, [classOptions, selectedClassName]);

  useEffect(() => {
    if (!selectedDivision && divisionOptions.length > 0) setSelectedDivision(divisionOptions[0]);
  }, [divisionOptions, selectedDivision]);

  useEffect(() => {
    if (!selectedStudentId && activeStudents.length > 0) setSelectedStudentId(activeStudents[0].id);
    else if (activeStudents.length > 0 && !activeStudents.find(s => s.id === selectedStudentId)) {
        setSelectedStudentId(activeStudents[0].id);
    }
  }, [activeStudents, selectedStudentId]);

  const handleAddNote = () => {
    if (currentNote.trim()) {
      setNotes([...notes, currentNote.trim()]);
      setCurrentNote("");
    }
  };

  const handleRemoveNote = (index: number) => {
    setNotes(notes.filter((_, i) => i !== index));
  };

  const handleAddAttachment = () => {
    if (currentAttachment.trim()) {
      setAttachments([...attachments, currentAttachment.trim()]);
      setCurrentAttachment("");
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleImportGrade = (grade: number) => {
    setScores(prev => ({ ...prev, academic: grade }));
    setShowImportDialog(false);
    toast({ title: "تم الاستيراد", description: `تم تعيين الأداء الأكاديمي إلى ${grade}%` });
  };

  const availableGrades = useMemo(() => {
    if (!selectedStudentId) return [];
    const grades: { source: string; value: number; label: string }[] = [];

    // Check Main Gradebook
    const mainGb = mainGbRes?.mainGradebook;
    if (mainGb?.byGroup) {
        Object.values(mainGb.byGroup).forEach((group: any) => {
            const studentGrades = group.gradesByStudentId?.[selectedStudentId];
            if (studentGrades) {
                if (studentGrades.eval1) grades.push({ source: "الرئيسي - تقويم 1", value: studentGrades.eval1, label: `${group.subject} (تقويم 1)` });
                if (studentGrades.eval2) grades.push({ source: "الرئيسي - تقويم 2", value: studentGrades.eval2, label: `${group.subject} (تقويم 2)` });
                if (studentGrades.eval3) grades.push({ source: "الرئيسي - تقويم 3", value: studentGrades.eval3, label: `${group.subject} (تقويم 3)` });
                if (studentGrades.final) grades.push({ source: "الرئيسي - نهائي", value: studentGrades.final, label: `${group.subject} (نهائي)` });
            }
        });
    }

    // Check Side Gradebook
    const sideGb = sideGbRes?.sideGradebook;
    if (sideGb?.byGroup) {
        Object.values(sideGb.byGroup).forEach((group: any) => {
            const studentGrades = group.gradesByStudentId?.[selectedStudentId];
            if (studentGrades) {
                 // Simplified checks for side gradebook structure
                 const fields = ['t1Eval1', 't1Eval2', 't1Eval3', 't1Final', 't2Eval1', 't2Eval2', 't2Eval3', 't2Final'];
                 fields.forEach(f => {
                     if (studentGrades[f] != null) {
                         grades.push({ source: "الفرعي", value: Number(studentGrades[f]), label: `${group.className} - ${f}` });
                     }
                 });
            }
        });
    }

    return grades;
  }, [selectedStudentId, mainGbRes, sideGbRes]);

  const handleSave = async () => {
    if (!selectedStudentId) return;
    setIsSaving(true);
    try {
      await apiRequest("PUT", "/api/dashboard/performance-records", {
        id: editingRecordId, // If editing, send ID
        className: normalizeText(selectedClassName),
        divisionId: normalizeText(selectedDivision),
        studentId: selectedStudentId,
        evaluationDate,
        academicTerm,
        performanceScores: scores,
        notes,
        attachments,
        archived: false
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/dashboard/performance-records"] });
      toast({ title: "تم الحفظ", description: "تم حفظ سجل الأداء بنجاح.", variant: "success" });
      
      // Reset form if creating new, or exit edit mode
      if (editingRecordId) {
        setEditingRecordId(null);
      } else {
        setNotes([]);
        setAttachments([]);
        setScores({ academic: 80, behavioral: 90, participation: 85 });
      }
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message || "فشل الحفظ", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا السجل؟")) return;
    try {
      await apiRequest("DELETE", `/api/dashboard/performance-records/${id}`);
      await queryClient.invalidateQueries({ queryKey: ["/api/dashboard/performance-records"] });
      toast({ title: "تم الحذف", description: "تم حذف السجل بنجاح." });
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    }
  };

  const handleArchive = async (record: PerformanceRecord) => {
    try {
        await apiRequest("PUT", "/api/dashboard/performance-records", {
            ...record,
            divisionId: record.divisionId, // Ensure mapping matches schema expectations
            archived: true
        });
        await queryClient.invalidateQueries({ queryKey: ["/api/dashboard/performance-records"] });
        toast({ title: "تم الأرشفة", description: "تم نقل السجل للأرشيف." });
    } catch (e: any) {
        toast({ title: "خطأ", description: e.message, variant: "destructive" });
    }
  };

  const handleEdit = (record: PerformanceRecord) => {
    setEditingRecordId(record.id);
    setEvaluationDate(record.evaluationDate);
    setAcademicTerm(record.academicTerm);
    setScores(record.performanceScores);
    setNotes(record.notes);
    setAttachments(record.attachments || []);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingRecordId(null);
    setNotes([]);
    setAttachments([]);
    setScores({ academic: 80, behavioral: 90, participation: 85 });
  };

  if (isRecordsLoading || isPerfLoading) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="mr-2 text-lg">جارٍ تحميل البيانات...</span>
        </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">سجل الأداء والملاحظات</h1>
          <p className="text-muted-foreground">تقييم ومتابعة أداء الطلبة بشكل فردي وشامل</p>
        </div>
        <div className="flex gap-2">
            <Button variant="secondary" asChild>
                <Link href="/dashboard">
                    <ArrowRight className="ml-2 h-4 w-4" /> العودة للوحة التحكم
                </Link>
            </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        {/* Sidebar: Selection */}
        <div className="space-y-4 md:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">اختر الطالب</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>الصف</Label>
                <Select value={selectedClassName} onValueChange={setSelectedClassName}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الصف" />
                  </SelectTrigger>
                  <SelectContent>
                    {classOptions.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>الشعبة</Label>
                <Select value={selectedDivision} onValueChange={setSelectedDivision}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الشعبة" />
                  </SelectTrigger>
                  <SelectContent>
                    {divisionOptions.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>الطالب</Label>
                <ScrollArea className="h-[400px] rounded-md border p-2">
                    {activeStudents.length === 0 ? (
                        <div className="py-4 text-center text-sm text-muted-foreground">لا يوجد طلبة</div>
                    ) : (
                        <div className="space-y-1">
                            {activeStudents.map(student => (
                                <button
                                    key={student.id}
                                    onClick={() => setSelectedStudentId(student.id)}
                                    className={`w-full rounded-md px-2 py-2 text-right text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${selectedStudentId === student.id ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground" : ""}`}
                                >
                                    {student.name}
                                </button>
                            ))}
                        </div>
                    )}
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content: Form and History */}
        <div className="space-y-6 md:col-span-9">
            {/* Evaluation Form */}
            <Card className={`border-2 transition-all ${editingRecordId ? "border-amber-500 shadow-lg" : "border-border"}`}>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>{editingRecordId ? "تعديل تقييم سابق" : "تقييم جديد"}</CardTitle>
                            <CardDescription>
                                {activeStudents.find(s => s.id === selectedStudentId)?.name || "يرجى اختيار طالب"}
                            </CardDescription>
                        </div>
                        {editingRecordId && (
                            <Button variant="ghost" size="sm" onClick={handleCancelEdit} className="text-muted-foreground hover:text-foreground">
                                <X className="ml-2 h-4 w-4" /> إلغاء التعديل
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label>تاريخ التقييم</Label>
                            <Input type="date" value={evaluationDate} onChange={(e) => setEvaluationDate(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>الفترة / الفصل</Label>
                            <Select value={academicTerm} onValueChange={setAcademicTerm}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="الفصل الأول">الفصل الأول</SelectItem>
                                    <SelectItem value="الفصل الثاني">الفصل الثاني</SelectItem>
                                    <SelectItem value="الشهر الأول">الشهر الأول</SelectItem>
                                    <SelectItem value="الشهر الثاني">الشهر الثاني</SelectItem>
                                    <SelectItem value="تقييم عام">تقييم عام</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-6 rounded-lg border p-4">
                        <h3 className="font-semibold">مؤشرات الأداء</h3>
                        
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <Label>الأداء الأكاديمي</Label>
                                    <span className="text-sm font-bold text-primary">{scores.academic}%</span>
                                </div>
                                <Slider 
                                    value={[scores.academic]} 
                                    onValueChange={(val) => setScores({...scores, academic: val[0]})} 
                                    max={100} 
                                    step={1} 
                                    className="cursor-pointer"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <Label>السلوك والمواظبة</Label>
                                    <span className="text-sm font-bold text-primary">{scores.behavioral}%</span>
                                </div>
                                <Slider 
                                    value={[scores.behavioral]} 
                                    onValueChange={(val) => setScores({...scores, behavioral: val[0]})} 
                                    max={100} 
                                    step={1}
                                    className="cursor-pointer"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <Label>المشاركة والتفاعل</Label>
                                    <span className="text-sm font-bold text-primary">{scores.participation}%</span>
                                </div>
                                <Slider 
                                    value={[scores.participation]} 
                                    onValueChange={(val) => setScores({...scores, participation: val[0]})} 
                                    max={100} 
                                    step={1}
                                    className="cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>ملاحظات وتوصيات</Label>
                        <div className="flex gap-2">
                            <Input 
                                value={currentNote} 
                                onChange={(e) => setCurrentNote(e.target.value)} 
                                placeholder="اكتب ملاحظة..." 
                                onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                            />
                            <Button type="button" onClick={handleAddNote} size="icon" variant="secondary">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {notes.map((note, idx) => (
                                <Badge key={idx} variant="outline" className="gap-1 pl-1 pr-2 py-1">
                                    {note}
                                    <button onClick={() => handleRemoveNote(idx)} className="ml-1 rounded-full p-0.5 hover:bg-destructive hover:text-destructive-foreground">
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button onClick={handleSave} disabled={isSaving || !selectedStudentId} className="min-w-[120px]">
                            {isSaving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}
                            {editingRecordId ? "حفظ التعديلات" : "حفظ السجل"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* History Section */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <History className="h-5 w-5 text-primary" />
                    سجل التقييمات السابق
                </h2>

                {studentRecords.length === 0 ? (
                    <Card className="bg-muted/30 border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                            <p>لا توجد سجلات محفوظة لهذا الطالب</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        {studentRecords.map(record => (
                            <Card key={record.id} className="relative overflow-hidden transition-all hover:shadow-md">
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-base">{record.academicTerm}</CardTitle>
                                            <CardDescription>
                                                {format(new Date(record.evaluationDate), "dd MMMM yyyy", { locale: ar })}
                                            </CardDescription>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500" onClick={() => handleEdit(record)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-500" onClick={() => handleArchive(record)}>
                                                <Archive className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDelete(record.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pb-3 text-sm">
                                    <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                                        <div className="bg-primary/10 rounded p-1">
                                            <div className="text-xs text-muted-foreground">أكاديمي</div>
                                            <div className="font-bold text-primary">{record.performanceScores.academic}%</div>
                                        </div>
                                        <div className="bg-primary/10 rounded p-1">
                                            <div className="text-xs text-muted-foreground">سلوك</div>
                                            <div className="font-bold text-primary">{record.performanceScores.behavioral}%</div>
                                        </div>
                                        <div className="bg-primary/10 rounded p-1">
                                            <div className="text-xs text-muted-foreground">مشاركة</div>
                                            <div className="font-bold text-primary">{record.performanceScores.participation}%</div>
                                        </div>
                                    </div>
                                    {record.notes.length > 0 && (
                                        <div className="space-y-1">
                                            <div className="text-xs font-semibold text-muted-foreground">ملاحظات:</div>
                                            <ul className="list-disc list-inside text-xs space-y-0.5">
                                                {record.notes.slice(0, 3).map((note, i) => (
                                                    <li key={i} className="truncate">{note}</li>
                                                ))}
                                                {record.notes.length > 3 && <li>...</li>}
                                            </ul>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Archived Section */}
            {archivedRecords.length > 0 && (
                <div className="space-y-4 pt-4 border-t">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-muted-foreground">
                        <Archive className="h-5 w-5" />
                        الأرشيف
                    </h2>
                     <div className="grid gap-4 md:grid-cols-2 opacity-75 grayscale hover:grayscale-0 transition-all">
                        {archivedRecords.map(record => (
                            <Card key={record.id}>
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-base">{record.academicTerm}</CardTitle>
                                            <CardDescription>
                                                {format(new Date(record.evaluationDate), "dd MMMM yyyy", { locale: ar })}
                                            </CardDescription>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDelete(record.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                     <div className="text-sm text-muted-foreground">
                                        متوسط الأداء: {Math.round((record.performanceScores.academic + record.performanceScores.behavioral + record.performanceScores.participation) / 3)}%
                                     </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
        </div>
      </div>
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>استيراد علامة</DialogTitle>
                <DialogDescription>
                    اختر علامة من سجلات العلامات المحفوظة للطالب
                </DialogDescription>
            </DialogHeader>
            <div className="max-h-[300px] overflow-y-auto space-y-2">
                {availableGrades.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">لا توجد علامات محفوظة لهذا الطالب</div>
                ) : (
                    availableGrades.map((g, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 border rounded hover:bg-accent cursor-pointer" onClick={() => handleImportGrade(g.value)}>
                            <div>
                                <div className="font-semibold">{g.label}</div>
                                <div className="text-xs text-muted-foreground">{g.source}</div>
                            </div>
                            <Badge variant="secondary">{g.value}</Badge>
                        </div>
                    ))
                )}
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
