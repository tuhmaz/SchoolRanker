interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export function Logo({ className = '', size = 'md', showText = true }: LogoProps) {
  const sizes = {
    sm: { width: 32, height: 32, textSize: 'text-sm' },
    md: { width: 48, height: 48, textSize: 'text-base' },
    lg: { width: 64, height: 64, textSize: 'text-lg' },
    xl: { width: 96, height: 96, textSize: 'text-2xl' },
  };

  const { width, height, textSize } = sizes[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src="/logo.svg"
        alt="خدمتك - نظام إدارة سجلات الطلبة"
        width={width}
        height={height}
        className="object-contain"
      />

      {showText && (
        <div className={`font-bold ${textSize}`}>
          <div className="text-primary">خدمتك</div>
          {size !== 'sm' && (
            <div className="text-xs text-muted-foreground font-normal">
              نظام إدارة السجلات
            </div>
          )}
        </div>
      )}
    </div>
  );
}
