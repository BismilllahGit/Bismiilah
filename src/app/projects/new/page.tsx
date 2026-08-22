"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { CustomInput } from "@/components/ui/custom-input";
import { CustomTextarea } from "@/components/ui/custom-textarea";

import { useWorkers } from "@/hooks/use-workers";
import { useCreateProject } from "@/hooks/use-create-project";
import {
  projectFormSchema,
  ProjectFormValues,
} from "@/lib/schemas/project.schema";
import { CheckboxCard } from "@/components/ui/checkbox-card";

export default function NewProjectPage() {
  const { workers, isLoading: isLoadingWorkers } = useWorkers();
  const { createProject, isSubmitting, error } = useCreateProject();

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      location: "",
      description: "",
      budget: undefined,
      startDate: "",
      endDate: "",
      assignedStaff: [],
    },
  });

  const onSubmit = (data: ProjectFormValues) => {
    createProject(data);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
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

        <Form {...form}>
          <CardContent>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              id="project-form"
              className="space-y-4"
            >
              {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Project Name *
                      </FormLabel>
                      <FormControl>
                        <CustomInput
                          placeholder="e.g. Anna Nagar Site"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Location *
                      </FormLabel>
                      <FormControl>
                        <CustomInput placeholder="e.g. Kochi, KL" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Description
                    </FormLabel>
                    <FormControl>
                      <CustomTextarea
                        placeholder="Brief details about the project..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Estimated Budget (₹)
                      </FormLabel>
                      <FormControl>
                        <CustomInput
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Start Date
                      </FormLabel>
                      <FormControl>
                        <CustomInput type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Expected End Date
                      </FormLabel>
                      <FormControl>
                        <CustomInput type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="assignedStaff"
                render={() => (
                  <div className="pt-4 border-t space-y-2">
                    <div>
                      <FormLabel className="text-sm font-medium">
                        Assign Staff (Initial)
                      </FormLabel>
                      <p className="text-xs text-muted-foreground mb-2 mt-1">
                        Select workers to assign to this site immediately. You
                        can always change this later.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-50 overflow-y-auto p-2 border rounded-md">
                      {isLoadingWorkers ? (
                        <span className="text-sm text-muted-foreground p-2">
                          Loading workers...
                        </span>
                      ) : (
                        workers.map((worker) => (
                          <FormField
                            key={worker.id}
                            control={form.control}
                            name="assignedStaff"
                            render={({ field }) => (
                              <CheckboxCard
                                title={worker.name}
                                subtitle={worker.type}
                                checked={field.value?.includes(worker.id)}
                                onChange={(e) => {
                                  return e.target.checked
                                    ? field.onChange([
                                        ...(field.value || []),
                                        worker.id,
                                      ])
                                    : field.onChange(
                                        field.value?.filter(
                                          (value) => value !== worker.id,
                                        ),
                                      );
                                }}
                              />
                            )}
                          />
                        ))
                      )}
                    </div>
                    <FormMessage />
                  </div>
                )}
              />
            </form>
          </CardContent>
        </Form>

        <CardFooter className="flex justify-end gap-2">
          <Link href="/projects">
            <Button variant="outline" type="button" disabled={isSubmitting}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" form="project-form" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Create Project"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
