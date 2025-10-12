import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

interface Template {
  id: string;
  name: string;
  description: string;
  preview: string;
}

interface TemplateSelectorProps {
  templates: Template[];
  selectedTemplateId: string;
  onSelect: (templateId: string) => void;
}

export function TemplateSelector({ templates, selectedTemplateId, onSelect }: TemplateSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="template-selector">
      {templates.map((template) => (
        <Card
          key={template.id}
          className={`cursor-pointer transition-all hover-elevate ${
            selectedTemplateId === template.id ? "border-primary border-2" : ""
          }`}
          onClick={() => onSelect(template.id)}
          data-testid={`template-${template.id}`}
        >
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{template.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                </div>
                {selectedTemplateId === template.id && (
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
              </div>
              <div className="bg-muted rounded-md p-3 min-h-[100px] flex items-center justify-center">
                <i className={`fas ${template.preview} text-4xl text-muted-foreground`}></i>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
