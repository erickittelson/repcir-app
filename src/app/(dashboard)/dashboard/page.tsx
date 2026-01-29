import { redirect } from "next/navigation";

// Redirect old /dashboard route to the mobile home feed
export default function DashboardPage() {
  redirect("/");
}
