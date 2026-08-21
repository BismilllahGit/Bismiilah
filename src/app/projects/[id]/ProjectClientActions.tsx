"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";

export function EditProjectDrawer({ project }: { project: any }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: project.name || "",
    location: project.location || "",
    status: project.status || "ACTIVE",
    startDate: project.startDate
      ? new Date(project.startDate).toISOString().split("T")[0]
      : "",
    endDate: project.endDate
      ? new Date(project.endDate).toISOString().split("T")[0]
      : "",
    agreedValue: project.agreedValue ? project.agreedValue.toString() : "",
    notes: project.notes || "",
  });

  const handleSave = async () => {
    setIsSaving(true);

    // Construct payload explicitly mapping to the expected backend types (strings)
    const payload: any = {
      name: formData.name,
      location: formData.location,
      status: formData.status,
      agreedValue: formData.agreedValue, // Sent as string to satisfy backend
      notes: formData.notes,
    };

    // Safely parse dates to ISO strings, but omit them entirely if left empty
    // to prevent the "Expected string, received null" error.
    if (formData.startDate) {
      payload.startDate = new Date(formData.startDate).toISOString();
    }
    if (formData.endDate) {
      payload.endDate = new Date(formData.endDate).toISOString();
    }

    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsOpen(false);
        router.refresh();
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error("Server error details:", errorData);
        alert(`Failed to update project. Check console for details.`);
      }
    } catch (e) {
      console.error(e);
      alert("Error saving.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {/* 
        FIX: Render the button standalone instead of wrapping it in a <SheetTrigger>. 
        This completely eliminates the "<button> inside <button>" hydration crash. 
      */}
      <Button
        variant="outline"
        className="flex items-center gap-2"
        onClick={() => setIsOpen(true)}
      >
        <Edit className="h-4 w-4" /> Edit Project
      </Button>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto p-4">
          <SheetHeader className="p-0">
            <SheetTitle>Edit Project</SheetTitle>
          </SheetHeader>
          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Project Name</label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Location</label>
              <Input
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Expected End Date</label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={formData.status}
                onValueChange={(v) => {
                  if (v) setFormData({ ...formData, status: v });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                  <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                  <SelectItem value="CLOSED">CLOSED</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Budget (Agreed Value) ₹
              </label>
              <Input
                type="number"
                value={formData.agreedValue}
                onChange={(e) =>
                  setFormData({ ...formData, agreedValue: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[100px]"
              />
            </div>
            <Button
              className="w-full mt-4"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
