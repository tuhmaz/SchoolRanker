import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

interface Subject {
  id: string;
  name: string;
}

interface Division {
  id: string;
  division: string;
  subjects: Subject[];
}

interface ClassGroup {
  className: string;
  divisions: Division[];
}

interface ClassSubjectManagerProps {
  classes: ClassGroup[];
  onUpdate: (classes: ClassGroup[]) => void;
}

export function ClassSubjectManager({ classes, onUpdate }: ClassSubjectManagerProps) {
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
          <CardHeader className="py-3">
            <CardTitle className="text-lg">الصف: {classGroup.className}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {classGroup.divisions.map((division, divIdx) => (
              <div key={division.id} className="space-y-3">
                <h6 className="font-semibold text-foreground">الشعبة: {division.division}</h6>
                <div className="space-y-2">
                  {division.subjects.map((subject, subjectIdx) => (
                    <div key={subject.id} className="flex gap-2">
                      <Input
                        value={subject.name}
                        onChange={(e) => handleSubjectChange(classIdx, divIdx, subjectIdx, e.target.value)}
                        placeholder="أدخل اسم المادة"
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
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddSubject(classIdx, divIdx)}
                    data-testid={`button-add-subject-${classIdx}-${divIdx}`}
                  >
                    <Plus className="w-4 h-4 ml-1" />
                    إضافة مادة أخرى
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
