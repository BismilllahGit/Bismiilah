"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function Table({ className, ...props }: React.ComponentProps<"table">) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  const checkScroll = React.useCallback(() => {
    const el = containerRef.current;
    if (el) {
      // Check if horizontal content exceeds container width by more than 2px
      const hasOverflow = el.scrollWidth - (el.scrollLeft + el.clientWidth) > 2;
      setCanScrollRight(hasOverflow);
    }
  }, []);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    checkScroll();
    const resizeObserver = new ResizeObserver(() => checkScroll());
    resizeObserver.observe(el);

    // Observe changes inside table content (e.g. data fetched asynchronously or rows added)
    const mutationObserver = new MutationObserver(() => checkScroll());
    mutationObserver.observe(el, { childList: true, subtree: true });
    window.addEventListener("resize", checkScroll);

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll]);

  return (
    <div className="relative w-full">
      <div
        ref={containerRef}
        onScroll={checkScroll}
        data-slot="table-container"
        className="w-full overflow-x-auto touch-pan-x smooth-scroll"
      >
        <table
          data-slot="table"
          className={cn("w-full caption-bottom text-sm max-sm:text-sm max-sm:leading-relaxed", className)}
          {...props}
        />
      </div>
      {/* Scroll Affordance: subtle gradient shadow on right edge when horizontal content exists off-screen */}
      <div
        data-slot="scroll-affordance-right"
        className={cn(
          "pointer-events-none absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-slate-900/20 via-slate-900/5 to-transparent transition-opacity duration-300 z-20 rounded-r-md",
          canScrollRight ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted group",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-10 px-3 py-2 text-left align-middle font-semibold whitespace-nowrap text-foreground max-sm:px-3 max-sm:py-3 max-sm:text-sm [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "px-3 py-2 align-middle whitespace-nowrap max-sm:px-3 max-sm:py-3 max-sm:text-sm [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
