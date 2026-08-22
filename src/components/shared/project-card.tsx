import Link from "next/link";
import { MapPin, Calendar } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProjectCardProps } from "@/types/types";
import { getTaskStatusCounts } from "@/lib/utils";

export function ProjectCard({ project }: ProjectCardProps) {
  const { overdueCount, todayCount } = getTaskStatusCounts(
    project.projectTasks,
  );

  return (
    <Card className="flex flex-col hover:shadow-md transition-shadow h-full">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl font-bold line-clamp-1">
            {project.name}
          </CardTitle>
          <Badge
            variant={
              project.status === "ACTIVE"
                ? "default"
                : project.status === "COMPLETED"
                  ? "secondary"
                  : "outline"
            }
          >
            {project.status}
          </Badge>
        </div>

        {/* 
          This container is always rendered with a min-height. 
          This reserves space for the badges, keeping the location text below 
          perfectly aligned across all cards in the grid.
        */}
        <div className="flex flex-wrap gap-2 mt-3 min-h-[28px]">
          {overdueCount > 0 && (
            <Badge
              variant="destructive"
              className="bg-red-100 text-red-800 border-red-300 hover:bg-red-200"
            >
              ⚠️ {overdueCount} task{overdueCount > 1 ? "s" : ""} overdue
            </Badge>
          )}
          {todayCount > 0 && (
            <Badge
              variant="destructive"
              className="bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200"
            >
              📅 {todayCount} task{todayCount > 1 ? "s" : ""} due today
            </Badge>
          )}
        </div>

        <CardDescription className="flex items-center gap-1 mt-3">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="line-clamp-1">{project.location}</span>
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 pb-3">
        {/* min-h ensures the section takes up 2 lines of space even if empty */}
        <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
          {project.notes || "No description provided."}
        </p>

        <div className="mt-4 flex items-center text-xs text-muted-foreground gap-1">
          <Calendar className="h-3 w-3 shrink-0" />
          <span>
            Started:{" "}
            {project.startDate
              ? new Date(project.startDate).toLocaleDateString()
              : "Not set"}
          </span>
        </div>
      </CardContent>

      <CardFooter className="pt-2 mt-auto">
        <Link href={`/projects/${project.id}`} className="w-full">
          <Button variant="outline" className="w-full">
            View Details
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
