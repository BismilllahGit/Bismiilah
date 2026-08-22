"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, NotepadText } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
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

import { useActivities } from "@/hooks/use-activities";
import { useCreateActivity } from "@/hooks/use-create-activity";
import {
  activityFormSchema,
  ActivityFormValues,
} from "@/lib/schemas/activity.schema";

export default function SiteActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const [open, setOpen] = useState(false);

  const { activities, isLoading, refetch } = useActivities(projectId);

  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      description: "",
    },
  });

  const { createActivity, isSubmitting, error } = useCreateActivity(
    projectId,
    () => {
      setOpen(false);
      form.reset({
        date: new Date().toISOString().split("T")[0],
        description: "",
      });
      refetch();
    },
  );

  const onSubmit = (data: ActivityFormValues) => {
    createActivity(data);
  };

  // Reset form when modal closes without submitting
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      form.reset({
        date: new Date().toISOString().split("T")[0],
        description: "",
      });
    }
  };

  return (
    <div className="p-2 md:p-4 max-w-7xl mx-auto space-y-6">
      <Link
        href={`/projects/${projectId}`}
        className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Project
      </Link>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
            Site Activity Log
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Record daily updates and progress.
          </p>
        </div>

        <Sheet open={open} onOpenChange={handleOpenChange}>
          <SheetTrigger render={<Button className="flex items-center gap-2" />}>
            <Plus className="h-4 w-4" /> Log Activity
          </SheetTrigger>

          <SheetContent className="sm:max-w-md p-4">
            <SheetHeader className="p-0">
              <SheetTitle>Log Site Activity</SheetTitle>
              <SheetDescription>
                Record daily progress or incidents.
              </SheetDescription>
            </SheetHeader>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4 mt-6"
              >
                {error && (
                  <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                    {error}
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Date *
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
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Description *
                      </FormLabel>
                      <FormControl>
                        <CustomTextarea
                          rows={5}
                          placeholder="e.g. Plastering completed on the second floor..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <SheetFooter className="mt-6">
                  {/* Base UI standard for close triggers */}
                  <SheetClose
                    render={
                      <Button
                        variant="outline"
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => setOpen(false)}
                      />
                    }
                  >
                    Cancel
                  </SheetClose>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save Log"}
                  </Button>
                </SheetFooter>
              </form>
            </Form>
          </SheetContent>
        </Sheet>
      </div>

      <div className="border rounded-md bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-[150px]">Date</TableHead>
              <TableHead>Activity Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={2}
                  className="text-center py-10 text-muted-foreground"
                >
                  Loading activity logs...
                </TableCell>
              </TableRow>
            ) : activities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center py-10">
                  <NotepadText className="h-8 w-8 mx-auto text-muted-foreground mb-3 opacity-20" />
                  <p className="text-muted-foreground">
                    No activities recorded yet.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              activities.map((act) => (
                <TableRow key={act.id} className="hover:bg-slate-50/50">
                  <TableCell className="font-medium align-top">
                    {new Date(act.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="whitespace-pre-wrap">
                    {act.description}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
