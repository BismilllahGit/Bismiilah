import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  message,
  description,
  variant = "card",
  compact = false,
  messageClassName,
}: {
  icon: LucideIcon;
  message: React.ReactNode;
  description?: React.ReactNode;
  variant?: "card" | "cell";
  compact?: boolean;
  messageClassName?: string;
}) {
  return (
    <>
      <Icon
        className={cn(
          "mx-auto text-muted-foreground mb-3",
          compact ? "h-8 w-8 opacity-20" : "h-10 w-10 opacity-30",
        )}
      />
      <p
        className={
          messageClassName ??
          cn(
            "text-muted-foreground font-medium",
            variant === "card" && "text-sm",
          )
        }
      >
        {message}
      </p>
      {description ? (
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      ) : null}
    </>
  );
}
