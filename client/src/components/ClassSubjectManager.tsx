import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Plus, X, Users } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [expandedClasses, setExpandedClasses] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setExpandedClasses((previous) => {
      const next: Record<string, boolean> = {};
      classes.forEach((group, index) => {
        next[group.className] = previous[group.className] ?? index === 0;
      });
      return next;
    });
  }, [classes]);

  const toggleClassSection = (className: string) => {
    setExpandedClasses((previous) => ({
      ...previous,
      [className]: !previous[className],
    }));
  };

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
      {classes.map((classGroup, classIdx) => {
        const totalStudents = classGroup.divisions.reduce(
          (sum, division) => sum + getStudentCount(classGroup.className, division.division),
          0,
        );
        const isExpanded = expandedClasses[classGroup.className] ?? false;

        return (
          <Card key={classGroup.className} className="border-border/60 shadow-sm">
            <CardHeader className="py-3">
              <button
                type="button"
                onClick={() => toggleClassSection(classGroup.className)}
                className="flex w-full items-center justify-between gap-3 text-right"
              >
                <div>
                  <CardTitle className="text-lg">الصف: {classGroup.className}</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">{classGroup.divisions.length} شعبة · {totalStudents} طالب/ة</p>
                </div>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    isExpanded ? "-rotate-180" : "rotate-0",
                  )}
                />
              </button>
            </CardHeader>
            {isExpanded ? (
              <CardContent className="space-y-4">
                <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
                  أضف المواد بلغة واضحة ومطابقة لما يستخدم في الدفاتر الرسمية لضمان ظهورها بشكل صحيح في التقارير.
                </div>
                {classGroup.divisions.map((division, divIdx) => {
                  const studentCount = getStudentCount(classGroup.className, division.division);
                  return (
                    <div
                      key={division.id}
                      className="space-y-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-foreground">الشعبة: {division.division}</div>
                        <Badge variant="outline" className="gap-1">
                          <Users className="h-3 w-3" />
                          {studentCount} طالب/ة
                        </Badge>
                      </div>

                      <div className="space-y-3">
                        {division.subjects.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-border/60 bg-background px-4 py-3 text-sm text-muted-foreground">
                            لا توجد مواد مضافة بعد. اضغط زر "إضافة مادة" للبدء.
                          </div>
                        ) : (
                          division.subjects.map((subject, subjectIdx) => (
                            <div
                              key={subject.id}
                              className="flex flex-col gap-2 rounded-lg border border-border/60 bg-background px-3 py-2 sm:flex-row sm:items-center"
                            >
                              <Input
                                value={subject.name}
                                onChange={(e) => handleSubjectChange(classIdx, divIdx, subjectIdx, e.target.value)}
                                placeholder="أدخل اسم المادة (مثال: اللغة العربية)"
                                data-testid={`input-subject-${classIdx}-${divIdx}-${subjectIdx}`}
                                className="flex-1"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveSubject(classIdx, divIdx, subjectIdx)}
                                data-testid={`button-remove-subject-${classIdx}-${divIdx}-${subjectIdx}`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))
                        )}
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleAddSubject(classIdx, divIdx)}
                          data-testid={`button-add-subject-${classIdx}-${divIdx}`}
                          className="gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          إضافة مادة
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}
