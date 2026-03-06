'use client';

import { useEffect, useMemo, useState } from 'react';

type PublicListing = {
  id: number;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  mls_number?: string;
  status: string;
  occupied: boolean;
  professional_photos: boolean;
  qualify_va_financing: boolean;
  listed_on_mls: boolean;
  price?: number;
};

const statusStyles: Record<string, string> = {
  active: 'status-active',
  pending: 'status-pending',
  sold: 'status-occupied',
  removed: 'status-occupied',
};

export default function PublicListingsPage() {
  const [listings, setListings] = useState<PublicListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formattedListings = useMemo(
    () =>
      listings.map((listing) => ({
        ...listing,
        fullAddress: `${listing.city}, ${listing.state} ${listing.zip_code}`,
        priceLabel:
          typeof listing.price === 'number'
            ? new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                maximumFractionDigits: 0,
              }).format(listing.price)
            : 'Not provided',
      })),
    [listings]
  );

  useEffect(() => {
    let isMounted = true;

    const loadListings = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/public-listings');
        if (!response.ok) {
          throw new Error('Unable to load public listings.');
        }
        const data = await response.json();
        if (isMounted) {
          setListings(Array.isArray(data) ? data : []);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Unexpected error.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadListings();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="p-8">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Public Listings</h1>
          <p className="text-gray-300 mt-2">
            Active MLS listings available for public marketing.
          </p>
        </div>
        <div className="text-sm text-gray-400">
          {loading ? 'Loading listings...' : `${formattedListings.length} properties`}
        </div>
      </div>

      <div className="mt-8">
        {loading && (
          <div className="card">
            <p className="text-gray-300">Fetching listings from the MLS feed...</p>
          </div>
        )}

        {!loading && error && (
          <div className="card border border-red-700/60">
            <p className="text-red-300 font-medium">Unable to load listings</p>
            <p className="text-gray-300 mt-2">{error}</p>
          </div>
        )}

        {!loading && !error && formattedListings.length === 0 && (
          <div className="card">
            <p className="text-gray-300">No public listings are available right now.</p>
          </div>
        )}

        {!loading && !error && formattedListings.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {formattedListings.map((listing) => (
              <div key={listing.id} className="property-card">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-white">{listing.address}</h2>
                    <p className="text-sm text-gray-400">{listing.fullAddress}</p>
                  </div>
                  <span className={`status-badge ${statusStyles[listing.status] ?? 'status-pending'}`}>
                    {listing.status}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-gray-300">
                  <div>
                    <p className="text-gray-500">MLS #</p>
                    <p className="text-white">{listing.mls_number || 'Not listed'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Price</p>
                    <p className="text-white">{listing.priceLabel}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Occupancy</p>
                    <p className="text-white">{listing.occupied ? 'Occupied' : 'Vacant'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Photos</p>
                    <p className="text-white">{listing.professional_photos ? 'Professional' : 'Standard'}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {listing.qualify_va_financing && (
                    <span className="status-badge status-active">VA Financing</span>
                  )}
                  {listing.listed_on_mls && (
                    <span className="status-badge status-mls">Listed on MLS</span>
                  )}
                  {listing.occupied && (
                    <span className="status-badge status-occupied">Occupied</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
