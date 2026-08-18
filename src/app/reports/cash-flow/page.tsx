import { redirect } from "next/navigation";

export default function CashFlowPage() {
  redirect("/reports?tab=cash-flow");
}
