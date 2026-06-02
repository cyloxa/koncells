import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CustomersClient } from "./CustomersClient";
import { getCustomers } from "@/actions/customer.actions";

export default async function AdminCustomersPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const customers = await getCustomers();

  return (
    <div className="p-6">
      <CustomersClient initialCustomers={customers} />
    </div>
  );
}
