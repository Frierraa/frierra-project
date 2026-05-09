import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/adminAuth";
import { AdminDashboard } from "@/components/AdminDashboard";

export default async function ControlPage() {
  const user = await getAdminUser();
  if (!user) redirect("/control/login");
  return <AdminDashboard user={user} />;
}

