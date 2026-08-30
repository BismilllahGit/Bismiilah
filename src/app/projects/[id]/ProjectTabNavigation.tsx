"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Package,
  Receipt,
  Hammer,
  FileText,
  ClipboardList,
  CheckSquare,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

export default function ProjectTabNavigation({
  projectId,
}: {
  projectId: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const tabs = [
    {
      name: "Overview",
      href: `/projects/${projectId}`,
      icon: LayoutDashboard,
      exact: true,
    },
    {
      name: "Tasks",
      href: `/projects/${projectId}/tasks`,
      icon: CheckSquare,
      exact: false,
    },
    {
      name: "BOQ Estimate",
      href: `/projects/${projectId}/boq`,
      icon: ClipboardList,
      exact: false,
    },
    {
      name: "Activity",
      href: `/projects/${projectId}/activity`,
      icon: FileText,
      exact: false,
    },
    {
      name: "Daily Labour",
      href: `/projects/${projectId}/daily-labour`,
      icon: Users,
      exact: false,
    },
    {
      name: "Inventory",
      href: `/projects/${projectId}/inventory`,
      icon: Package,
      exact: false,
    },
    {
      name: "Expenses",
      href: `/projects/${projectId}/expenses`,
      icon: Receipt,
      exact: false,
    },
    {
      name: "Extra Work",
      href: `/projects/${projectId}/extra-work`,
      icon: Hammer,
      exact: false,
    },
  ];

  const currentTab =
    tabs.find((tab) =>
      tab.exact ? pathname === tab.href : pathname.startsWith(tab.href),
    ) || tabs[0];

  return (
    <div className="border-b lg:bg-white">
      {/* Mobile & Tablet Dropdown Section Switcher (below lg breakpoint) */}
      <div className="lg:hidden py-3 px-2">
        <Select
          value={currentTab.href}
          onValueChange={(val) => {
            if (val) router.push(val);
          }}
        >
          <SelectTrigger className="w-full bg-white font-medium shadow-sm h-11 text-base">
            <div className="flex items-center gap-2">
              <currentTab.icon className="h-4 w-4 text-primary" />
              <span>{currentTab.name}</span>
            </div>
          </SelectTrigger>
          <SelectContent>
            {tabs.map((tab) => (
              <SelectItem key={tab.href} value={tab.href}>
                <div className="flex items-center gap-2 py-0.5">
                  <tab.icon className="h-4 w-4 text-muted-foreground" />
                  <span>{tab.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Desktop Tab Strip (lg breakpoint and above) */}
      <nav
        className="hidden lg:flex -mb-px justify-around overflow-x-auto px-1"
        aria-label="Tabs"
      >
        {tabs.map((tab) => {
          const isActive = tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={cn(
                isActive
                  ? "border-primary text-primary font-semibold"
                  : "border-transparent text-muted-foreground hover:border-gray-300 hover:text-gray-700 font-medium",
                "group inline-flex items-center border-b-2 py-4 px-1 text-sm whitespace-nowrap",
              )}
            >
              <tab.icon
                className={cn(
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground group-hover:text-gray-500",
                  "-ml-0.5 mr-2 h-4 w-4",
                )}
                aria-hidden="true"
              />
              {tab.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
