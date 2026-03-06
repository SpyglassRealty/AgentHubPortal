export default function ClientsPage() {
  return (
    <div className="p-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Clients</h1>
        <p className="text-gray-400 mt-1">Manage client information</p>
      </div>
      <div className="mt-8 text-center py-12">
        <div className="text-gray-400">
          <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
          </svg>
          <h3 className="text-lg font-medium">Clients Management</h3>
          <p className="mt-2">Client management features coming soon.</p>
        </div>
      </div>
    </div>
  );
}