import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUploadZone } from "@/components/FileUploadZone";
import { ClassSubjectManager } from "@/components/ClassSubjectManager";
import { Save, RefreshCcw, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [teacherName, setTeacherName] = useState("");
  const [directorate, setDirectorate] = useState("");
  const [school, setSchool] = useState("");
  const [town, setTown] = useState("");
  const [isHomeroom, setIsHomeroom] = useState(false);
  const [homeroomClass, setHomeroomClass] = useState("");
  
  // Mock data - will be replaced with actual Excel parsing
  const [classes, setClasses] = useState([
    {
      className: "الصف السابع",
      divisions: [
        { id: "7a", division: "أ", subjects: [{ id: "1", name: "الرياضيات" }] },
        { id: "7b", division: "ب", subjects: [{ id: "2", name: "العلوم" }] }
      ]
    }
  ]);

  const handleSave = () => {
    toast({
      title: "تم الحفظ بنجاح",
      description: "تم حفظ جميع التجهيزات",
    });
  };

  const handleReset = () => {
    if (confirm("هل أنت متأكد من مسح جميع التجهيزات؟")) {
      setFile(null);
      setTeacherName("");
      setDirectorate("");
      setSchool("");
      setTown("");
      setIsHomeroom(false);
      setHomeroomClass("");
      setClasses([]);
      toast({
        title: "تم المسح",
        description: "تم مسح جميع التجهيزات",
      });
    }
  };

  const handlePrintCover = () => {
    toast({
      title: "جاري الطباعة",
      description: "سيتم فتح نافذة الطباعة",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">التجهيزات الأساسية</h1>
        <p className="text-muted-foreground mt-2">
          يرجى كتابة اسم المديرية والمدرسة بالكامل وبشكل صحيح. كما يجب أن تكون أسماء المواد مطابقة تماماً لأسمائها الفعلية.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>رفع ملف الطلبة</CardTitle>
          <CardDescription>قم برفع كشف الطلبة من منصة أجيال</CardDescription>
        </CardHeader>
        <CardContent>
          <FileUploadZone
            onFileSelect={setFile}
            selectedFile={file}
            onClearFile={() => setFile(null)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>معلومات المعلم والمدرسة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="teacher-name">اسم المعلم</Label>
              <Input
                id="teacher-name"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                placeholder="أدخل اسم المعلم"
                data-testid="input-teacher-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="directorate">المديرية</Label>
              <Input
                id="directorate"
                value={directorate}
                onChange={(e) => setDirectorate(e.target.value)}
                placeholder="أدخل اسم المديرية"
                data-testid="input-directorate"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="school">المدرسة</Label>
              <Input
                id="school"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                placeholder="أدخل اسم المدرسة"
                data-testid="input-school"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="town">البلدة</Label>
              <Input
                id="town"
                value={town}
                onChange={(e) => setTown(e.target.value)}
                placeholder="أدخل اسم البلدة"
                data-testid="input-town"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div>
              <Label htmlFor="homeroom-switch" className="text-base font-medium">
                هل أنت مربي صف؟
              </Label>
            </div>
            <Switch
              id="homeroom-switch"
              checked={isHomeroom}
              onCheckedChange={setIsHomeroom}
              data-testid="switch-homeroom"
            />
          </div>

          {isHomeroom && (
            <div className="space-y-2">
              <Label htmlFor="homeroom-class">اختر صفك</Label>
              <Select value={homeroomClass} onValueChange={setHomeroomClass}>
                <SelectTrigger id="homeroom-class" data-testid="select-homeroom-class">
                  <SelectValue placeholder="اختر صفك..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7a">الصف السابع - أ</SelectItem>
                  <SelectItem value="7b">الصف السابع - ب</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>الصفوف والمواد</CardTitle>
        </CardHeader>
        <CardContent>
          <ClassSubjectManager classes={classes} onUpdate={setClasses} />
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button onClick={handleSave} data-testid="button-save">
          <Save className="w-4 h-4 ml-2" />
          حفظ التجهيزات
        </Button>
        <Button variant="outline" onClick={handleReset} data-testid="button-reset">
          <RefreshCcw className="w-4 h-4 ml-2" />
          إعادة تعيين
        </Button>
        <Button variant="secondary" onClick={handlePrintCover} data-testid="button-print-cover">
          <Printer className="w-4 h-4 ml-2" />
          طباعة الغلاف
        </Button>
      </div>
    </div>
  );
}
