import { useState } from "react";
import { ActivityFormValues } from "@/lib/schemas/activity.schema";

export function useCreateActivity(projectId: string, onSuccess?: () => void) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const createActivity = async (data: ActivityFormValues) => {
    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/projects/${projectId}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to log activity");
      }

      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return { createActivity, isSubmitting, error };
}
