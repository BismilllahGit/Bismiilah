"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useApiResource, useApiMutation } from "@/hooks/useApiResource";
import { PageShell } from "@/components/ui/page-shell";

// Shape returned by GET /api/worker-types (see route.ts's mapped `result`).
interface WorkerTypeOption {
  id: string;
  name: string;
  workerType: string;
  defaultRate: number;
  paymentCycle: string;
  isCustom: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function NewProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [clientMode, setClientMode] = useState<"EXISTING" | "NEW">("NEW");
  const { data: rawClients } =
    useApiResource<{ id: string; name: string }[]>("/api/clients");
  const clients = Array.isArray(rawClients) ? rawClients : [];
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const { data: rawWorkers } =
    useApiResource<WorkerTypeOption[]>("/api/worker-types");
  const workers = Array.isArray(rawWorkers)
    ? rawWorkers.filter((w) => w.isActive)
    : [];
  const createProject = useApiMutation<Record<string, unknown>, unknown>(
    "POST",
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const payload = {
      name: formData.get("name"),
      location: formData.get("location"),
      description: formData.get("description"),
      budget: formData.get("budget")
        ? Number(formData.get("budget"))
        : undefined,
      startDate: formData.get("startDate") || undefined,
      endDate: formData.get("endDate") || undefined,
      assignedStaff: selectedWorkers,
      ...(clientMode === "EXISTING"
        ? { clientId: formData.get("clientId") }
        : {
            newClient: {
              name: formData.get("newClientName"),
              phone: formData.get("newClientPhone") || undefined,
              address: formData.get("newClientAddress") || undefined,
            },
          }),
    };

    try {
      await createProject.mutate("/api/projects", payload);

      router.push("/projects");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
      setLoading(false);
    }
  };

  return (
    <PageShell>
      <Link
        href="/projects"
        className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Projects
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Create New Project</CardTitle>
          <CardDescription>
            Enter the details for the new construction site.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" id="project-form">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="name">
                  Project Name *
                </label>
                <input
                  id="name"
                  name="name"
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="e.g. Anna Nagar Site"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="location">
                  Location *
                </label>
                <input
                  id="location"
                  name="location"
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="e.g. Chennai, TN"
                />
              </div>
            </div>

            <div className="space-y-3 rounded-md border p-3">
              <label className="text-sm font-medium">Client *</label>
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={clientMode === "NEW"}
                    onChange={() => setClientMode("NEW")}
                  />
                  New client
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={clientMode === "EXISTING"}
                    onChange={() => setClientMode("EXISTING")}
                  />
                  Existing client
                </label>
              </div>
              {clientMode === "EXISTING" ? (
                <select
                  name="clientId"
                  required
                  defaultValue=""
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">-- Choose a client --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    name="newClientName"
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Client name *"
                  />
                  <input
                    name="newClientPhone"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Phone"
                  />
                  <input
                    name="newClientAddress"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Address"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="description">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Brief details about the project..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="budget">
                  Estimated Budget (₹)
                </label>
                <input
                  id="budget"
                  name="budget"
                  type="number"
                  min="0"
                  max="9999999999.99"
                  step="0.01"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="startDate">
                  Start Date
                </label>
                <input
                  id="startDate"
                  name="startDate"
                  type="date"
                  className="relative flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="endDate">
                  Expected End Date
                </label>
                <input
                  id="endDate"
                  name="endDate"
                  type="date"
                  className="relative flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                />
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t">
              <label className="text-sm font-medium">
                Assign Staff (Initial)
              </label>
              <p className="text-xs text-muted-foreground mb-2">
                Select workers to assign to this site immediately. You can
                always change this later.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-50 overflow-y-auto p-2 border rounded-md">
                {workers.map((w) => (
                  <label
                    key={w.id}
                    className="flex items-center space-x-2 p-2 hover:bg-slate-50 rounded cursor-pointer border border-transparent hover:border-slate-200"
                  >
                    <input
                      type="checkbox"
                      checked={selectedWorkers.includes(w.id)}
                      onChange={(e) => {
                        if (e.target.checked)
                          setSelectedWorkers((prev) => [...prev, w.id]);
                        else
                          setSelectedWorkers((prev) =>
                            prev.filter((id) => id !== w.id),
                          );
                      }}
                      className="rounded border-gray-300"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{w.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {/* Pre-existing bug: the worker-types API response has
                            no `type` field (only `workerType`/`paymentCycle`),
                            so this has always rendered blank. Preserved as-is
                            per the no-behavior-change constraint. */}
                        {(w as WorkerTypeOption & { type?: string }).type}
                      </span>
                    </div>
                  </label>
                ))}
                {workers.length === 0 && (
                  <span className="text-sm text-muted-foreground">
                    Loading workers...
                  </span>
                )}
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Link href="/projects">
            <Button variant="outline" type="button" disabled={loading}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" form="project-form" disabled={loading}>
            {loading ? "Saving..." : "Create Project"}
          </Button>
        </CardFooter>
      </Card>
    </PageShell>
  );
}
