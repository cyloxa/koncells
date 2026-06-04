export default function OrderDetailLoading() {
  return (
    <div className="p-6 animate-pulse">
      {/* Back link skeleton */}
      <div className="h-4 w-24 bg-gray-200 rounded mb-6" />

      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-7 w-48 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-64 bg-gray-200 rounded" />
        </div>
        <div className="h-8 w-32 bg-gray-200 rounded-lg" />
      </div>

      <div className="space-y-6">
        {/* Customer Details skeleton */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="h-5 w-36 bg-gray-200 rounded mb-4" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <div className="h-3 w-12 bg-gray-200 rounded mb-1" />
                <div className="h-4 w-32 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Finance Summary skeleton */}
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-4">
          <div className="flex items-center gap-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i}>
                <div className="h-3 w-20 bg-gray-200 rounded mb-1" />
                <div className="h-6 w-28 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Products table skeleton */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="h-10 bg-gray-100 border-b border-gray-200" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 border-b border-gray-100 flex items-center px-4">
              <div className="h-4 w-full bg-gray-200 rounded" />
            </div>
          ))}
        </div>

        {/* Notes skeleton */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="h-5 w-28 bg-gray-200 rounded mb-3" />
          <div className="h-20 bg-gray-200 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
