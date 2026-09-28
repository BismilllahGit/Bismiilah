"use client";

import { useState } from "react";
import { Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";

type Project = {
  id: string;
  name: string;
  location: string;
  client: { id: string; name: string } | null;
};

export function LinkProjectSheet({
  open,
  setOpen,
  clientId,
  clientName,
  linkedProjectIds,
  onLinked,
}: {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  clientId: string;
  clientName?: string;
  linkedProjectIds: string[];
  onLinked: () => void;
}) {
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [saving, setSaving] = useState(false);

  const availableProjects = allProjects.filter(
    (p) => !linkedProjectIds.includes(p.id),
  );

  const handleLink = async () => {
    if (!selectedProjectId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${selectedProjectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });

      if (res.ok) {
        setSelectedProjectId("");
        setOpen(false);
        onLinked();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to link project");
      }
    } catch {
      alert("An error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          fetch("/api/projects").then((r) => {
            if (r.ok) r.json().then(setAllProjects);
          });
        }
      }}
    >
      <SheetTrigger
        render={
          <Button
            variant="outline"
            className="flex items-center justify-center gap-2 flex-1 sm:flex-initial"
          />
        }
      >
        <Link2 className="h-4 w-4" /> Link Project
      </SheetTrigger>
      <SheetContent className="sm:max-w-md overflow-y-auto p-4">
        <SheetHeader className="p-0">
          <SheetTitle>Link Project</SheetTitle>
          <SheetDescription>
            Connect an existing project to {clientName || "this client"}.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 mt-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Project *</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="">Select Project...</option>
              {availableProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.client ? ` (currently: ${p.client.name})` : ""}
                </option>
              ))}
            </select>
            {availableProjects.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No other projects available to link.
              </p>
            )}
          </div>
        </div>
        <SheetFooter className="mt-6">
          <SheetClose render={<Button variant="outline" type="button" />}>
            Cancel
          </SheetClose>
          <Button
            type="button"
            disabled={!selectedProjectId || saving}
            onClick={handleLink}
          >
            {saving ? "Linking..." : "Link Project"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
