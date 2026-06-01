import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { RegisterForm } from "./RegisterForm";

export default async function RegisterPage() {
  const session = await auth();
  if (session) redirect("/");

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create your account</h1>
          <p className="text-gray-600 mt-2">Join CYLOXA and start shopping</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <RegisterForm />
        </div>
      </div>
    </div>
  );
}
