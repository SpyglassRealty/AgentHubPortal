import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Save,
  X
} from "lucide-react";

interface IdxSavedSearch {
  id: number;
  name: string;
  slug: string;
  pageTitle: string | null;
  metaDescription: string | null;
  filters: {
    propertyTypes?: string[];
    cities?: string[];
    minPrice?: number;
    maxPrice?: number;
    minBeds?: number;
    maxBeds?: number;
    minBaths?: number;
    maxBaths?: number;
    type?: 'sale' | 'lease';
    features?: string[];
    sort?: string;
  };
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface SearchForm {
  name: string;
  slug: string;
  pageTitle: string;
  metaDescription: string;
  propertyTypes: string[];
  cities: string[];
  minPrice: string;
  maxPrice: string;
  minBeds: string;
  maxBeds: string;
  minBaths: string;
  maxBaths: string;
  type: 'sale' | 'lease';
  features: string[];
  sort: string;
  status: 'draft' | 'published';
}

const initialForm: SearchForm = {
  name: '',
  slug: '',
  pageTitle: '',
  metaDescription: '',
  propertyTypes: [],
  cities: [],
  minPrice: '',
  maxPrice: '',
  minBeds: '',
  maxBeds: '',
  minBaths: '',
  maxBaths: '',
  type: 'sale',
  features: [],
  sort: 'price-desc',
  status: 'draft'
};

export default function IdxSavedSearches() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<SearchForm>(initialForm);
  const [searchTerm, setSearchTerm] = useState('');

  const queryClient = useQueryClient();

  // Fetch saved searches
  const { data: searches = [], isLoading } = useQuery({
    queryKey: ['idx-saved-searches'],
    queryFn: async () => {
      const response = await fetch('/api/admin/idx-saved-searches');
      if (!response.ok) throw new Error('Failed to fetch saved searches');
      return response.json() as IdxSavedSearch[];
    }
  });

  // Create/update search
  const saveMutation = useMutation({
    mutationFn: async (data: SearchForm) => {
      const filters = {
        propertyTypes: data.propertyTypes.filter(Boolean),
        cities: data.cities.filter(Boolean),
        ...(data.minPrice && { minPrice: parseInt(data.minPrice) }),
        ...(data.maxPrice && { maxPrice: parseInt(data.maxPrice) }),
        ...(data.minBeds && { minBeds: parseInt(data.minBeds) }),
        ...(data.maxBeds && { maxBeds: parseInt(data.maxBeds) }),
        ...(data.minBaths && { minBaths: parseInt(data.minBaths) }),
        ...(data.maxBaths && { maxBaths: parseInt(data.maxBaths) }),
        type: data.type,
        features: data.features.filter(Boolean),
        sort: data.sort
      };

      const payload = {
        name: data.name,
        slug: data.slug,
        pageTitle: data.pageTitle || null,
        metaDescription: data.metaDescription || null,
        filters,
        status: data.status
      };

      if (editingId) {
        const response = await fetch(`/api/admin/idx-saved-searches/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error('Failed to update search');
        return response.json();
      } else {
        const response = await fetch('/api/admin/idx-saved-searches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error('Failed to create search');
        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['idx-saved-searches'] });
      resetForm();
    }
  });

  // Delete search
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/idx-saved-searches/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete search');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['idx-saved-searches'] });
    }
  });

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (search: IdxSavedSearch) => {
    setForm({
      name: search.name,
      slug: search.slug,
      pageTitle: search.pageTitle || '',
      metaDescription: search.metaDescription || '',
      propertyTypes: search.filters.propertyTypes || [],
      cities: search.filters.cities || [],
      minPrice: search.filters.minPrice?.toString() || '',
      maxPrice: search.filters.maxPrice?.toString() || '',
      minBeds: search.filters.minBeds?.toString() || '',
      maxBeds: search.filters.maxBeds?.toString() || '',
      minBaths: search.filters.minBaths?.toString() || '',
      maxBaths: search.filters.maxBaths?.toString() || '',
      type: search.filters.type || 'sale',
      features: search.filters.features || [],
      sort: search.filters.sort || 'price-desc',
      status: search.status as 'draft' | 'published'
    });
    setEditingId(search.id);
    setShowForm(true);
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleNameChange = (name: string) => {
    setForm(prev => ({
      ...prev,
      name,
      slug: editingId ? prev.slug : generateSlug(name)
    }));
  };

  const filteredSearches = searches.filter(search =>
    search.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    search.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading saved searches...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">IDX Saved Searches</h1>
          <p className="text-gray-600">Manage saved search templates for the IDX site</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          New Search
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name or slug..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">
                  {editingId ? 'Edit' : 'Create'} Saved Search
                </h2>
                <button
                  onClick={resetForm}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name*</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Slug*</label>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => setForm(prev => ({ ...prev, slug: e.target.value }))}
                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Page Title</label>
                <input
                  type="text"
                  value={form.pageTitle}
                  onChange={(e) => setForm(prev => ({ ...prev, pageTitle: e.target.value }))}
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Meta Description</label>
                <textarea
                  value={form.metaDescription}
                  onChange={(e) => setForm(prev => ({ ...prev, metaDescription: e.target.value }))}
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              {/* Filters */}
              <div className="border-t pt-4">
                <h3 className="font-medium mb-3">Search Filters</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Property Types</label>
                    <input
                      type="text"
                      placeholder="Single Family, Condo, Townhouse"
                      value={form.propertyTypes.join(', ')}
                      onChange={(e) => setForm(prev => ({ 
                        ...prev, 
                        propertyTypes: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                      }))}
                      className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Cities</label>
                    <input
                      type="text"
                      placeholder="Austin, Cedar Park, Round Rock"
                      value={form.cities.join(', ')}
                      onChange={(e) => setForm(prev => ({ 
                        ...prev, 
                        cities: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                      }))}
                      className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Min Price</label>
                    <input
                      type="number"
                      value={form.minPrice}
                      onChange={(e) => setForm(prev => ({ ...prev, minPrice: e.target.value }))}
                      className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Max Price</label>
                    <input
                      type="number"
                      value={form.maxPrice}
                      onChange={(e) => setForm(prev => ({ ...prev, maxPrice: e.target.value }))}
                      className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Min Beds</label>
                    <input
                      type="number"
                      value={form.minBeds}
                      onChange={(e) => setForm(prev => ({ ...prev, minBeds: e.target.value }))}
                      className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Min Baths</label>
                    <input
                      type="number"
                      value={form.minBaths}
                      onChange={(e) => setForm(prev => ({ ...prev, minBaths: e.target.value }))}
                      className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Type</label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm(prev => ({ ...prev, type: e.target.value as 'sale' | 'lease' }))}
                      className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="sale">For Sale</option>
                      <option value="lease">For Lease</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Sort By</label>
                    <select
                      value={form.sort}
                      onChange={(e) => setForm(prev => ({ ...prev, sort: e.target.value }))}
                      className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="price-desc">Price (High to Low)</option>
                      <option value="price-asc">Price (Low to High)</option>
                      <option value="newest">Newest First</option>
                      <option value="beds-desc">Most Bedrooms</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Status</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value as 'draft' | 'published' }))}
                      className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={resetForm}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => saveMutation.mutate(form)}
                disabled={saveMutation.isPending || !form.name || !form.slug}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saveMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Searches List */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Saved Searches ({filteredSearches.length})</h2>
        </div>
        
        {filteredSearches.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchTerm ? 'No searches match your search term.' : 'No saved searches yet. Create your first one!'}
          </div>
        ) : (
          <div className="divide-y">
            {filteredSearches.map((search) => (
              <div key={search.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium">{search.name}</h3>
                      <div className="flex items-center gap-2">
                        {search.status === 'published' ? (
                          <div className="flex items-center gap-1 text-green-600 text-sm">
                            <Eye className="w-3 h-3" />
                            Published
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-gray-500 text-sm">
                            <EyeOff className="w-3 h-3" />
                            Draft
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm mt-1">/{search.slug}</p>
                    {search.pageTitle && (
                      <p className="text-gray-500 text-xs mt-1">{search.pageTitle}</p>
                    )}
                    <div className="text-xs text-gray-400 mt-2">
                      Created {new Date(search.createdAt).toLocaleDateString()}
                      {search.updatedAt !== search.createdAt && (
                        <> • Updated {new Date(search.updatedAt).toLocaleDateString()}</>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(search)}
                      className="p-1 text-gray-500 hover:text-blue-600"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete "${search.name}"?`)) {
                          deleteMutation.mutate(search.id);
                        }
                      }}
                      className="p-1 text-gray-500 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}