import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  subtitle,
  action,
  layout = "row",
  wrapperClassName,
  titleAs: Title = "h1",
  titleClassName,
  subtitleClassName = "text-sm text-muted-foreground mt-1",
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  layout?: "row" | "stacked" | "plain";
  wrapperClassName?: string;
  titleAs?: "h1" | "h2";
  titleClassName?: string;
  subtitleClassName?: string;
}) {
  const defaultWrapperClassName =
    layout === "stacked"
      ? "flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      : "flex justify-between items-center";

  const heading = (
    <div>
      <Title
        className={cn("text-3xl font-bold tracking-tight", titleClassName)}
      >
        {title}
      </Title>
      {subtitle && <p className={subtitleClassName}>{subtitle}</p>}
    </div>
  );

  if (layout === "plain") {
    return heading;
  }

  return (
    <div className={wrapperClassName ?? defaultWrapperClassName}>
      {heading}
      {action}
    </div>
  );
}
