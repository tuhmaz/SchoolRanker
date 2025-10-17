import { Upload, FileSpreadsheet, X } from "lucide-react";
import { useState, useCallback, useRef, useId } from "react";
import { Button } from "@/components/ui/button";

interface FileUploadZoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number;
  selectedFile?: File | null;
  onClearFile?: () => void;
  disabled?: boolean;
  onError?: (message: string) => void;
}

export function FileUploadZone({ 
  onFileSelect, 
  accept = ".xlsx,.xls", 
  maxSize = 10 * 1024 * 1024,
  selectedFile,
  onClearFile,
  disabled = false,
  onError
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const inputId = useId();

  const emitError = useCallback((message: string) => {
    if (onError) {
      onError(message);
    } else {
      window.alert(message);
    }
  }, [onError]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (disabled || selectedFile) return;
    setIsDragging(true);
  }, [disabled, selectedFile]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || selectedFile) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.size <= maxSize) {
        onFileSelect(file);
      } else {
        emitError(`حجم الملف كبير جداً. الحد الأقصى ${maxSize / (1024 * 1024)} ميجابايت`);
      }
    }
  }, [disabled, emitError, maxSize, onFileSelect, selectedFile]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || selectedFile) {
      if (e.target) e.target.value = "";
      return;
    }
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.size <= maxSize) {
        onFileSelect(file);
      } else {
        emitError(`حجم الملف كبير جداً. الحد الأقصى ${maxSize / (1024 * 1024)} ميجابايت`);
      }
    }
    if (e.target) e.target.value = "";
  }, [disabled, emitError, maxSize, onFileSelect, selectedFile]);

  if (selectedFile) {
    return (
      <div className="border-2 border-primary/20 bg-primary/5 rounded-lg p-6" data-testid="file-upload-selected">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground" data-testid="file-name">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {(selectedFile.size / 1024).toFixed(2)} KB
              </p>
            </div>
          </div>
          {onClearFile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClearFile}
              data-testid="button-clear-file"
            >
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
        disabled
          ? "border-border/50 bg-muted/30 cursor-not-allowed opacity-70"
          : isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-accent/50"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => {
        if (disabled) return;
        inputRef.current?.click();
      }}
      data-testid="file-upload-zone"
      aria-disabled={disabled}
    >
      <input
        id={inputId}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        data-testid="file-input"
        ref={inputRef}
        disabled={disabled}
      />
      <div className="flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Upload className="w-8 h-8 text-primary" />
        </div>
        <div>
          <p className="text-lg font-medium text-foreground">اسحب ملف الإكسل وأفلته هنا</p>
          <p className="text-sm text-muted-foreground mt-1">أو انقر للاختيار من جهازك</p>
        </div>
        <p className="text-xs text-muted-foreground">
          الصيغ المدعومة: .xlsx, .xls (الحد الأقصى {maxSize / (1024 * 1024)} ميجابايت)
        </p>
      </div>
    </div>
  );
}
