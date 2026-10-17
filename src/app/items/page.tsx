import { redirect } from "next/navigation";

// Master Items now lives under Settings; keep the old URL working.
export default function ItemsRedirectPage() {
  redirect("/settings/items");
}
