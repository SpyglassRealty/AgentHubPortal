export default function ActivityPage() {
  return (
    <div className="p-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Activity Log</h1>
        <p className="text-gray-400 mt-1">Track system activity and changes</p>
      </div>
      <div className="mt-8 text-center py-12">
        <div className="text-gray-400">
          <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium">Activity Tracking</h3>
          <p className="mt-2">Activity log features coming soon.</p>
        </div>
      </div>
    </div>
  );
}