import { ClassSubjectManager } from '../ClassSubjectManager';
import { useState } from 'react';

export default function ClassSubjectManagerExample() {
  const [classes, setClasses] = useState([
    {
      className: "الصف السابع",
      divisions: [
        {
          id: "7a",
          division: "أ",
          subjects: [
            { id: "1", name: "الرياضيات" },
            { id: "2", name: "العلوم" }
          ]
        },
        {
          id: "7b",
          division: "ب",
          subjects: [
            { id: "3", name: "اللغة العربية" }
          ]
        }
      ]
    }
  ]);

  return (
    <div className="p-6">
      <ClassSubjectManager classes={classes} onUpdate={setClasses} />
    </div>
  );
}
