export default function CreateOrderLoading() {
  return (
    <div className="p-6 max-w-4xl mx-auto animate-pulse">
      <div className="h-7 w-48 bg-gray-200 rounded mb-4" />
      <div className="h-4 w-24 bg-gray-200 rounded mb-8" />

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="h-5 w-36 bg-gray-200 rounded mb-4" />
        <div className="h-10 w-full bg-gray-200 rounded-lg mb-4" />
        <div className="flex justify-end">
          <div className="h-10 w-40 bg-gray-200 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
