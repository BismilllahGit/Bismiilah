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
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GlobalTaskNotification } from "./GlobalTaskNotification";

const navigation = [
  { name: 'Projects', href: '/projects', icon: Building2 },
  { name: 'Labour', href: '/labour', icon: HardHat },
  { name: 'Master Items', href: '/items', icon: Package },
  { name: 'Vendors', href: '/vendors', icon: Users },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Receivables', href: '/invoices', icon: IndianRupee },
  { name: 'Extra Work', href: '/extra-work', icon: Hammer },
  { name: 'Reports & Analytics', href: '/reports', icon: FileText },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 md:flex-row">
      {/* Mobile Nav */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-white px-4 md:hidden">
        <div className="flex items-center gap-4">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" />}>
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </SheetTrigger>
          <SheetContent side="left" className="w-[240px] sm:w-[300px]">
            <nav className="grid gap-2 text-lg font-medium">
              <Link href="/" className="flex items-center gap-2 text-lg font-bold pb-4 border-b" onClick={() => setOpen(false)}>
                <Building2 className="h-6 w-6" />
                <span>Bismillah App</span>
              </Link>
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:text-primary ${
                    pathname.startsWith(item.href) ? "bg-muted text-primary font-semibold" : "text-muted-foreground"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
        <Link href="/" className="flex items-center gap-2 font-bold md:hidden">
          <span>Bismillah Construction</span>
        </Link>
        </div>
        <GlobalTaskNotification />
      </header>

      {/* Desktop Sidebar */}
      <div className="hidden border-r bg-white md:block md:w-64 lg:w-72 sticky top-0 h-screen">
        <div className="flex h-14 items-center justify-between border-b px-4 lg:h-[60px] lg:px-6">
          <Link href="/" className="flex items-center gap-2 font-bold shrink-0 pr-2">
            <Building2 className="h-6 w-6 shrink-0" />
            <span className="truncate">Bismillah Construction</span>
          </Link>
          <GlobalTaskNotification />
        </div>
        <ScrollArea className="h-[calc(100vh-60px)]">
          <div className="flex-1 overflow-auto py-2">
            <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary ${
                    pathname.startsWith(item.href) ? "bg-muted text-primary font-semibold" : "text-muted-foreground"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        </ScrollArea>
      </div>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-full">
        {children}
      </main>
    </div>
  );
}
