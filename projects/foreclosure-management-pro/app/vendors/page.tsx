export default function VendorsPage() {
  return (
    <div className="p-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Vendors</h1>
        <p className="text-gray-400 mt-1">Manage vendor relationships</p>
      </div>
      <div className="mt-8 text-center py-12">
        <div className="text-gray-400">
          <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21.75 6.75a4.5 4.5 0 01-4.884 4.484c-1.076-.091-2.264.071-2.95.904l-7.152 8.684a2.548 2.548 0 11-3.586-3.586l8.684-7.152c.833-.686.995-1.874.904-2.95a4.5 4.5 0 016.336-4.486l-3.276 3.276a3.004 3.004 0 002.25 2.25l3.276-3.276c.256.565.365 1.19.404 1.836z" />
          </svg>
          <h3 className="text-lg font-medium">Vendor Management</h3>
          <p className="mt-2">Vendor management features coming soon.</p>
        </div>
      </div>
    </div>
  );
}