import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProjectFormValues } from "@/lib/schemas/project.schema";

export function useCreateProject() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const createProject = async (data: ProjectFormValues) => {
    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data), // Data is already perfectly formatted by Zod
      });

      if (!res.ok) {
        const responseData = await res.json();
        throw new Error(responseData.error || "Failed to create project");
      }

      router.push("/projects");
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred.");
      }
      setIsSubmitting(false);
    }
  };

  return { createProject, isSubmitting, error };
}
