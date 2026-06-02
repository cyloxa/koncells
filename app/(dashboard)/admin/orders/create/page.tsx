import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import CreateOrderClient from "./CreateOrderClient";

export default async function CreateOrderPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  return <CreateOrderClient />;
}
