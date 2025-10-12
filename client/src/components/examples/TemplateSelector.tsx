import { TemplateSelector } from '../TemplateSelector';
import { useState } from 'react';

export default function TemplateSelectorExample() {
  const [selected, setSelected] = useState("template1");

  const templates = [
    { id: "template1", name: "النموذج الأول", description: "نموذج كلاسيكي بسيط", preview: "fa-file-alt" },
    { id: "template2", name: "النموذج الثاني", description: "نموذج مفصل مع ملاحظات", preview: "fa-file-invoice" },
    { id: "template3", name: "النموذج الثالث", description: "نموذج مختصر للطباعة", preview: "fa-file-contract" }
  ];

  return (
    <div className="p-6">
      <TemplateSelector
        templates={templates}
        selectedTemplateId={selected}
        onSelect={(id) => {
          setSelected(id);
          console.log('Template selected:', id);
        }}
      />
    </div>
  );
}
