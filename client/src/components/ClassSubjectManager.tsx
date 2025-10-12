import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Users } from "lucide-react";

interface Subject {
  id: string;
  name: string;
}

interface Division {
  id: string;
  division: string;
  subjects: Subject[];
  studentCount?: number;
}

interface ClassGroup {
  className: string;
  divisions: Division[];
}

interface ClassSubjectManagerProps {
  classes: ClassGroup[];
  onUpdate: (classes: ClassGroup[]) => void;
  students?: any[];
}

export function ClassSubjectManager({ classes, onUpdate, students = [] }: ClassSubjectManagerProps) {
  const handleAddSubject = (classIdx: number, divIdx: number) => {
    const newClasses = [...classes];
    newClasses[classIdx].divisions[divIdx].subjects.push({
      id: `subject-${Date.now()}`,
      name: ""
    });
    onUpdate(newClasses);
  };

  const handleRemoveSubject = (classIdx: number, divIdx: number, subjectIdx: number) => {
    const newClasses = [...classes];
    newClasses[classIdx].divisions[divIdx].subjects.splice(subjectIdx, 1);
    onUpdate(newClasses);
  };

  const handleSubjectChange = (classIdx: number, divIdx: number, subjectIdx: number, value: string) => {
    const newClasses = [...classes];
    newClasses[classIdx].divisions[divIdx].subjects[subjectIdx].name = value;
    onUpdate(newClasses);
  };

  const getStudentCount = (className: string, division: string) => {
    return students.filter(s => s.class === className && s.division === division).length;
  };

  if (classes.length === 0) {
    return (
      <div className="bg-accent/50 border border-accent-foreground/10 rounded-lg p-6" data-testid="no-classes-message">
        <div className="flex items-center gap-3">
          <i className="fas fa-info-circle text-xl text-primary"></i>
          <p className="text-foreground">لم يتم استخلاص أي صفوف بعد. يرجى رفع ملف الطلبة في الأعلى.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="class-subject-manager">
      {classes.map((classGroup, classIdx) => (
        <Card key={classIdx}>
          <CardHeader className="py-3 bg-accent/30">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-lg">الصف: {classGroup.className}</CardTitle>
              <Badge variant="secondary" className="gap-1">
                <Users className="w-3 h-3" />
                {classGroup.divisions.reduce((sum, div) => 
                  sum + getStudentCount(classGroup.className, div.division), 0
                )} طالب/ة
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {classGroup.divisions.map((division, divIdx) => {
              const studentCount = getStudentCount(classGroup.className, division.division);
              return (
                <div key={division.id} className="space-y-3 p-3 bg-card/50 border border-border/50 rounded-lg">
                  <div className="flex items-center justify-between gap-2">
                    <h6 className="font-semibold text-foreground">
                      الشعبة: {division.division}
                    </h6>
                    <Badge variant="outline" className="gap-1">
                      <Users className="w-3 h-3" />
                      {studentCount} طالب/ة
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    {division.subjects.length === 0 ? (
                      <div className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-md">
                        لا توجد مواد مضافة بعد. اضغط "إضافة مادة" لبدء الإضافة.
                      </div>
                    ) : (
                      division.subjects.map((subject, subjectIdx) => (
                        <div key={subject.id} className="flex gap-2">
                          <Input
                            value={subject.name}
                            onChange={(e) => handleSubjectChange(classIdx, divIdx, subjectIdx, e.target.value)}
                            placeholder="أدخل اسم المادة (مثال: اللغة العربية)"
                            data-testid={`input-subject-${classIdx}-${divIdx}-${subjectIdx}`}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveSubject(classIdx, divIdx, subjectIdx)}
                            data-testid={`button-remove-subject-${classIdx}-${divIdx}-${subjectIdx}`}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddSubject(classIdx, divIdx)}
                      data-testid={`button-add-subject-${classIdx}-${divIdx}`}
                    >
                      <Plus className="w-4 h-4 ml-1" />
                      إضافة مادة
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
