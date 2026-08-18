"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Worker = { id: string; name: string; type: string };
type AttendanceRecord = {
  projectId: string;
  workerId: string;
  date: string;
  status: "PRESENT" | "HALF_DAY" | "ABSENT";
};

export default function AttendancePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState<Record<string, "PRESENT" | "HALF_DAY" | "ABSENT">>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/workers")
      .then(res => res.json())
      .then(data => {
        setWorkers(data);
        // Default everyone to PRESENT
        const initialMap: Record<string, "PRESENT" | "HALF_DAY" | "ABSENT"> = {};
        data.forEach((w: Worker) => {
          initialMap[w.id] = "PRESENT";
        });
        setAttendance(initialMap);
        setLoading(false);
      });
  }, []);

  const handleStatusChange = (workerId: string, status: "PRESENT" | "HALF_DAY" | "ABSENT") => {
    setAttendance(prev => ({ ...prev, [workerId]: status }));
  };

  const handleSave = async () => {
    setSaving(true);
    const payload: AttendanceRecord[] = workers.map(w => ({
      projectId,
      workerId: w.id,
      date: new Date(date).toISOString(),
      status: attendance[w.id]
    }));

    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert("Attendance saved successfully!");
        router.push(`/projects/${projectId}`);
      } else {
        alert("Failed to save attendance.");
      }
    } catch (e) {
      alert("An error occurred.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <Link href={`/projects/${projectId}`} className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Project
      </Link>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Mark Attendance</CardTitle>
            <CardDescription>
              Record daily attendance for workers on site.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Date:</label>
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-muted-foreground">Loading workers...</div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Worker Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-center">Present</TableHead>
                    <TableHead className="text-center">Half Day</TableHead>
                    <TableHead className="text-center">Absent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workers.map(worker => (
                    <TableRow key={worker.id}>
                      <TableCell className="font-medium">{worker.name}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{worker.type}</TableCell>
                      <TableCell className="text-center">
                        <input 
                          type="radio" 
                          name={`status-${worker.id}`} 
                          checked={attendance[worker.id] === "PRESENT"}
                          onChange={() => handleStatusChange(worker.id, "PRESENT")}
                          className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <input 
                          type="radio" 
                          name={`status-${worker.id}`} 
                          checked={attendance[worker.id] === "HALF_DAY"}
                          onChange={() => handleStatusChange(worker.id, "HALF_DAY")}
                          className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <input 
                          type="radio" 
                          name={`status-${worker.id}`} 
                          checked={attendance[worker.id] === "ABSENT"}
                          onChange={() => handleStatusChange(worker.id, "ABSENT")}
                          className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {workers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                        No active workers found in the directory.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={handleSave} disabled={saving || workers.length === 0} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Attendance"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
