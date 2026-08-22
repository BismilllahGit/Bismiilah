import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import { MainWrapperProps } from "@/types/types";

export default function MainWrapper({
  title,
  subTitle,
  btnTitle,
  btnLink,
  icon: Icon = PlusCircle,
  action,
  className,
  children,
}: MainWrapperProps) {
  const headerAction =
    action ??
    (btnTitle && btnLink ? (
      <Button render={<Link href={btnLink} />}>
        <Icon data-icon="inline-start" />
        {btnTitle}
      </Button>
    ) : null);

  return (
    <div className={cn("p-4 md:p-8 max-w-7xl mx-auto space-y-6", className)}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {subTitle && <p className="text-muted-foreground mt-1">{subTitle}</p>}
        </div>
        {headerAction}
      </div>
      {children}
    </div>
  );
}
