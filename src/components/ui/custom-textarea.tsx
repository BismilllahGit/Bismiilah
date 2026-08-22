import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const CustomTextarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
CustomTextarea.displayName = "CustomTextarea";

export { CustomTextarea };
