import * as React from "react";
import { cn } from "@/lib/utils";

interface CheckboxCardProps extends React.InputHTMLAttributes<HTMLInputElement> {
  title: string;
  subtitle?: string;
}

const CheckboxCard = React.forwardRef<HTMLInputElement, CheckboxCardProps>(
  ({ className, title, subtitle, ...props }, ref) => {
    return (
      <label
        className={cn(
          "flex items-center space-x-2 p-2 hover:bg-slate-50 rounded cursor-pointer border border-transparent hover:border-slate-200",
          className,
        )}
      >
        <input
          type="checkbox"
          className="rounded border-gray-300 cursor-pointer"
          ref={ref}
          {...props}
        />
        <div className="flex flex-col">
          <span className="text-sm font-medium">{title}</span>
          {subtitle && (
            <span className="text-xs text-muted-foreground">{subtitle}</span>
          )}
        </div>
      </label>
    );
  },
);
CheckboxCard.displayName = "CheckboxCard";

export { CheckboxCard };
