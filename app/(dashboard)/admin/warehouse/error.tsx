"use client";

export default function WarehouseError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="text-red-500 text-5xl mb-4">!</div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h2>
        <p className="text-sm text-gray-500 mb-4">
          {error.message || "Failed to load warehouse shipments."}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:opacity-90 transition-all"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
