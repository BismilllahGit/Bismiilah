import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function LoadingBlock({
  className,
  iconClassName,
}: {
  className?: string;
  iconClassName?: string;
}) {
  return (
    <div className={cn("p-8 flex justify-center", className)}>
      <Loader2
        className={cn("animate-spin h-8 w-8 text-slate-400", iconClassName)}
      />
    </div>
  );
}
