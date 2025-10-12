import { Loader2 } from "lucide-react";

interface LoadingOverlayProps {
  message?: string;
}

export function LoadingOverlay({ message = "جاري المعالجة..." }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50" data-testid="loading-overlay">
      <div className="bg-card border border-card-border rounded-lg p-8 shadow-2xl">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <p className="text-lg font-medium text-foreground">{message}</p>
        </div>
      </div>
    </div>
  );
}
