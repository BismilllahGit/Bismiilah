import { Worker } from "@/types/types";
import { useState, useEffect } from "react";

export function useWorkers() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/worker-types")
      .then(async (res) => {
        if (!res.ok) throw new Error(`API returned status: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setWorkers(data.filter((w) => w.isActive));
        }
      })
      .catch((err) => {
        console.error("Failed to fetch workers:", err);
        setWorkers([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  return { workers, isLoading };
}
