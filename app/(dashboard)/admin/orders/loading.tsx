export default function OrdersLoading() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-7 w-36 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-24 bg-gray-200 rounded" />
        </div>
        <div className="h-9 w-32 bg-gray-200 rounded-lg" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="h-10 bg-gray-100 border-b border-gray-200" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 border-b border-gray-100 flex items-center px-4">
            <div className="h-4 w-full bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
