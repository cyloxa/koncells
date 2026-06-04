export default function NewProductLoading() {
  return (
    <div className="p-6 max-w-4xl mx-auto animate-pulse">
      <div className="h-7 w-48 bg-gray-200 rounded mb-6" />
      
      <div className="space-y-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="h-5 w-32 bg-gray-200 rounded mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((j) => (
                <div key={j}>
                  <div className="h-3 w-20 bg-gray-200 rounded mb-1" />
                  <div className="h-10 w-full bg-gray-200 rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
