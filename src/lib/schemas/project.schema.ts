import * as z from "zod";

export const projectFormSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  location: z.string().min(1, "Location is required"),
  description: z.string().optional(),
  budget: z.coerce.number().min(0, "Budget cannot be negative").optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  assignedStaff: z.array(z.string()),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;
