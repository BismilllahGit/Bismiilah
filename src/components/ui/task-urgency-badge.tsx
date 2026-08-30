import { Badge } from "@/components/ui/badge";

export function TaskUrgencyBadge({
  kind,
  count,
}: {
  kind: "overdue" | "dueToday";
  count: number;
}) {
  if (count <= 0) return null;

  if (kind === "overdue") {
    return (
      <Badge
        variant="destructive"
        className="bg-red-100 text-red-800 border-red-300 hover:bg-red-200"
      >
        ⚠️ {count} task{count > 1 ? "s" : ""} overdue
      </Badge>
    );
  }

  return (
    <Badge
      variant="destructive"
      className="bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200"
    >
      📅 {count} task{count > 1 ? "s" : ""} due today
    </Badge>
  );
}
