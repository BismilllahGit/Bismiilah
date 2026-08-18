import { redirect } from "next/navigation";

export default function SaturdayViewPage() {
  redirect("/reports?tab=saturday-view");
}
