import { Loader2 } from "lucide-react";

export default function CreatePurchaseOrderLoading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand mx-auto" />
        <p className="mt-2 text-sm text-gray-500">Loading form...</p>
      </div>
    </div>
  );
}
