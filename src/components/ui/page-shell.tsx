export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">{children}</div>
  );
}
