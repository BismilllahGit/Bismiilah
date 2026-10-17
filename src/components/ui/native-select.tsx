import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

type NativeSelectProps = React.ComponentProps<"select"> & {
  /** Classes for the wrapper; use these for width/margin. */
  wrapperClassName?: string;
};

function NativeSelect({
  className,
  wrapperClassName,
  children,
  ...props
}: NativeSelectProps) {
  return (
    <div className={cn("relative w-full", wrapperClassName)}>
      <select
        data-slot="native-select"
        className={cn(
          "h-9 w-full appearance-none rounded-md border border-input bg-transparent py-1 pr-9 pl-3 text-sm shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

export { NativeSelect };
