"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Users,
  HardHat,
  IndianRupee,
  Package,
  Menu,
  FileText,
  Hammer,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GlobalTaskNotification } from "./GlobalTaskNotification";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Projects", href: "/projects", icon: Building2 },
  { name: "Labour", href: "/labour", icon: HardHat },
  { name: "Master Items", href: "/items", icon: Package },
  { name: "Vendors", href: "/vendors", icon: Users },
  { name: "Clients", href: "/clients", icon: Users },
  { name: "Receivables", href: "/invoices", icon: IndianRupee },
  { name: "Extra Work", href: "/extra-work", icon: Hammer },
  { name: "Reports & Analytics", href: "/reports", icon: FileText },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Function to start the 5-second countdown
  const startTimer = React.useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsCollapsed(true);
    }, 5000);
  }, []);

  // Function to pause the countdown
  const stopTimer = React.useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  // Start the timer whenever the sidebar is open
  React.useEffect(() => {
    if (!isCollapsed) {
      startTimer();
    }
    return () => stopTimer(); // Cleanup on unmount
  }, [isCollapsed, startTimer, stopTimer]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 md:flex-row">
      {/* Mobile Nav */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-white px-4 md:hidden">
        <div className="flex items-center gap-4">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-slate-100 text-slate-700 transition-colors">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </SheetTrigger>

            <SheetContent
              side="left"
              className="w-65 p-0 flex flex-col bg-white"
            >
              <div className="flex h-14 items-center border-b px-6">
                <Link
                  href="/"
                  className="flex items-center gap-2 text-lg font-bold"
                  onClick={() => setOpen(false)}
                >
                  <Building2 className="h-6 w-6 shrink-0" />
                  <span>Bismillah App</span>
                </Link>
              </div>
              <ScrollArea className="flex-1">
                <div className="py-4">
                  <nav className="grid gap-1 px-4 text-sm font-medium">
                    {navigation.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all hover:text-primary ${
                          pathname.startsWith(item.href)
                            ? "bg-muted text-primary font-semibold"
                            : "text-muted-foreground"
                        }`}
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        {item.name}
                      </Link>
                    ))}
                  </nav>
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
          <Link
            href="/"
            className="flex items-center gap-2 font-bold md:hidden"
          >
            <span>Bismillah Construction</span>
          </Link>
        </div>
        <GlobalTaskNotification />
      </header>

      {/* Desktop Sidebar */}
      <div
        onMouseEnter={stopTimer}
        onMouseLeave={() => {
          if (!isCollapsed) startTimer();
        }}
        className={`hidden shrink-0 border-r bg-white md:block sticky top-0 h-screen transition-all duration-300 ease-in-out ${
          isCollapsed ? "w-16" : "w-56 lg:w-67.5"
        }`}
      >
        <Button
          variant="outline"
          size="icon"
          className="absolute -right-4 top-20 z-10 h-8 w-8 rounded-full bg-white shadow-sm cursor-pointer"
          onClick={() => {
            setIsCollapsed(!isCollapsed);
            if (isCollapsed) startTimer();
          }}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>

        <div
          className={`flex h-14 items-center border-b lg:h-15 transition-all duration-300 ${
            isCollapsed ? "justify-center px-0" : "justify-between px-4"
          }`}
        >
          <Link
            href="/"
            className={`flex items-center gap-2 font-bold shrink-0 ${
              !isCollapsed ? "pr-2" : ""
            }`}
          >
            <Building2 className="h-6 w-6 shrink-0" />
            {!isCollapsed && (
              <span className="truncate text-sm lg:text-base">
                Bismillah Construction
              </span>
            )}
          </Link>
          {!isCollapsed && <GlobalTaskNotification />}
        </div>
        <ScrollArea className="h-[calc(100vh-60px)]">
          <div
            className={cn(
              "flex-1 overflow-auto py-4",
              !isCollapsed && "min-w-[253px]",
            )}
          >
            <nav className="grid items-start px-2 text-sm font-medium gap-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  title={isCollapsed ? item.name : undefined}
                  onClick={(e) => {
                    if (isCollapsed) {
                      setIsCollapsed(false);
                    }
                  }}
                  className={`flex items-center rounded-lg py-2.5 transition-all hover:text-primary ${
                    pathname.startsWith(item.href)
                      ? "bg-muted text-primary font-semibold"
                      : "text-muted-foreground"
                  } ${isCollapsed ? "justify-center px-0" : "gap-3 px-3"}`}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!isCollapsed && <span>{item.name}</span>}
                </Link>
              ))}
            </nav>
          </div>
        </ScrollArea>
      </div>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-full">{children}</main>
    </div>
  );
}
