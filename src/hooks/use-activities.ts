import { useState, useEffect, useCallback } from "react";

export type Activity = {
  id: string;
  date: string;
  description: string;
};

export function useActivities(projectId: string) {
  const [activities, setActivities] = useState<Activity[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  const [trigger, setTrigger] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/activity`);
        if (res.ok && isMounted) {
          setActivities(await res.json());
        }
      } catch (err) {
        console.error("Failed to fetch activities:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [projectId, trigger]);

  const refetch = useCallback(() => {
    setIsLoading(true);
    setTrigger((prev) => prev + 1);
  }, []);

  return { activities, isLoading, refetch };
}
