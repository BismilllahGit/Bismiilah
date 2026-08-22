import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { StatCardProps } from "@/types/types";

export const statCardVariants = {
  default: {
    card: "",
    title: "text-muted-foreground",
    value: "text-foreground",
  },
  blue: {
    card: "bg-blue-50 border-blue-200",
    title: "text-blue-800",
    value: "text-blue-600",
  },
  green: {
    card: "bg-green-50 border-green-200",
    title: "text-green-800",
    value: "text-green-600",
  },
  amber: {
    card: "bg-amber-50 border-amber-200",
    title: "text-amber-800",
    value: "text-amber-600",
  },
  red: {
    card: "bg-red-50 border-red-200",
    title: "text-red-800",
    value: "text-red-600",
  },
  slate: {
    card: "bg-slate-100 border-slate-300",
    title: "text-slate-800",
    value: "text-slate-600",
  },
} as const;

export function StatCard({
  title,
  value,
  variant = "default",
  className,
}: StatCardProps) {
  const styles = statCardVariants[variant];
  return (
    <Card className={cn(styles.card, className)}>
      <CardHeader className="pb-2">
        <CardTitle className={cn("text-sm font-medium", styles.title)}>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold", styles.value)}>{value}</div>
      </CardContent>
    </Card>
  );
}
