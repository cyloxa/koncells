"use client";

export default function NewProductError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Something went wrong
        </h2>
        <p className="text-gray-500 mb-6">
          {error.message || "Failed to load the product form. Please try again."}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:opacity-90 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
