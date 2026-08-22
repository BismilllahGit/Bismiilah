import * as z from "zod";

export const activityFormSchema = z.object({
  date: z.string().min(1, "Date is required"),
  description: z.string().min(1, "Description is required"),
});

export type ActivityFormValues = z.infer<typeof activityFormSchema>;
