"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function TrashedProjectActions({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const router = useRouter();
  const [isRestoring, setIsRestoring] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/restore`, {
        method: "POST",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error("Server error details:", errorData);
        alert("Failed to restore project.");
        return;
      }
      router.refresh();
    } finally {
      setIsRestoring(false);
    }
  };

  const handlePermanentDelete = async () => {
    const res = await fetch(`/api/projects/${projectId}?permanent=1`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error("Server error details:", errorData);
      alert("Failed to delete project permanently.");
      return;
    }
    router.refresh();
  };

  return (
    <div className="flex w-full gap-2">
      <Button
        variant="outline"
        className="flex-1 flex items-center gap-2"
        onClick={handleRestore}
        disabled={isRestoring}
      >
        <RotateCcw className="h-4 w-4" />
        {isRestoring ? "Restoring..." : "Restore"}
      </Button>
      <Button
        variant="destructive"
        className="flex-1 flex items-center gap-2"
        onClick={() => setConfirmOpen(true)}
        disabled={isRestoring}
      >
        <Trash2 className="h-4 w-4" /> Delete Forever
      </Button>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Permanently delete "${projectName}"?`}
        description="This permanently deletes the project and everything scoped to it — tasks, expenses, invoices, BOQs, inventory records, and the activity log. This cannot be undone."
        confirmLabel="Delete Forever"
        destructive
        onConfirm={handlePermanentDelete}
      />
    </div>
  );
}
