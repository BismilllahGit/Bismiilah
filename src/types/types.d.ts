import { statCardVariants } from "@/components/shared/stat-card";

export interface MainWrapperProps {
  title: string;
  subTitle?: string;
  btnTitle?: string;
  btnLink?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
  children?: ReactNode;
}

export interface StatCardProps {
  title: string;
  value: React.ReactNode;
  variant?: keyof typeof statCardVariants;
  className?: string;
}

type ProjectWithTasks = {
  id: string;
  name: string;
  status: "ACTIVE" | "COMPLETED" | "CLOSED" | string;
  location: string;
  notes?: string | null;
  startDate?: string | Date | null;
  projectTasks: { targetDate: string | Date }[];
};

export interface ProjectCardProps {
  project: ProjectWithTasks;
}

export type TaskStatusCounts = {
  overdueCount: number;
  todayCount: number;
};

export interface TaskWithTarget {
  targetDate: string | Date;
}

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
}
