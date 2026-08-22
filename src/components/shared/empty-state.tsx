import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyStateProps } from "@/types/types";

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-lg bg-slate-50">
      <Icon className="h-12 w-12 text-muted-foreground mb-4" />
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-muted-foreground mt-2 mb-6">{description}</p>
      <Link href={actionHref}>
        <Button>{actionLabel}</Button>
      </Link>
    </div>
  );
}
