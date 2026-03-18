import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Save,
  X,
  GripVertical
} from "lucide-react";

interface SpyglassSnippet {
  id: number;
  name: string;
  slug: string;
  pageTitle: string | null;
  metaDescription: string | null;
  filters: {
    type?: 'sale' | 'lease';
    propertyTypes?: string[];
    subTypes?: string[];
    cities?: string[];
    minPrice?: number;
    maxPrice?: number;
    minBeds?: number;
    maxBeds?: number;
    minBaths?: number;
    maxBaths?: number;
    sqftMin?: number;
    sqftMax?: number;
    yearBuiltMin?: number;
    yearBuiltMax?: number;
    zipCodes?: string[];
    neighborhood?: string;
    subdivision?: string;
    schoolDistrict?: string;
    timeSincePublished?: string;
    features?: string[];
    sort?: string;
    filterOrder?: string[];
  };
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface SnippetForm {
  name: string;
  slug: string;
  pageTitle: string;
  metaDescription: string;
  type: 'sale' | 'lease';
  propertyTypes: string[];
  subTypes: string[];
  cities: string;
  minPrice: string;
  maxPrice: string;
  minBeds: string;
  maxBeds: string;
  minBaths: string;
  maxBaths: string;
  sqftMin: string;
  sqftMax: string;
  yearBuiltMin: string;
  yearBuiltMax: string;
  zipCodes: string;
  neighborhood: string;
  subdivision: string;
  schoolDistrict: string;
  timeSincePublished: string;
  features: string[];
  sort: string;
  status: 'draft' | 'published';
  filterOrder: string[];
}

const initialForm: SnippetForm = {
  name: '',
  slug: '',
  pageTitle: '',
  metaDescription: '',
  type: 'sale',
  propertyTypes: [],
  subTypes: [],
  cities: '',
  minPrice: '',
  maxPrice: '',
  minBeds: '',
  maxBeds: '',
  minBaths: '',
  maxBaths: '',
  sqftMin: '',
  sqftMax: '',
  yearBuiltMin: '',
  yearBuiltMax: '',
  zipCodes: '',
  neighborhood: '',
  subdivision: '',
  schoolDistrict: '',
  timeSincePublished: '',
  features: [],
  sort: 'price-high-low',
  status: 'draft',
  filterOrder: []
};

const propertyTypeOptions = ['Residential', 'Condo', 'Townhouse', 'Commercial', 'Land', 'Multi-Family'];
const priceOptions = [
  '', '100000', '200000', '300000', '400000', '500000', '600000', '700000', '800000', '900000',
  '1000000', '1100000', '1200000', '1300000', '1400000', '1500000', '1600000', '1700000', '1800000', '1900000', '2000000+'
];
const bedOptions = ['', '1', '2', '3', '4', '5+'];
const bathOptions = ['', '1', '2', '3', '4+'];
const timeOptions = ['', '1', '7', '14', '30'];
const featureOptions = ['Pool', 'Garage', 'Fireplace', 'Waterfront', 'New Construction', 'Reduced Price'];
const sortOptions = [
  { value: 'price-high-low', label: 'Price High-Low' },
  { value: 'price-low-high', label: 'Price Low-High' },
  { value: 'newest', label: 'Newest' },
  { value: 'largest', label: 'Largest' }
];

const allFilterFields = [
  'type', 'propertyTypes', 'subTypes', 'cities', 'minPrice', 'maxPrice', 
  'minBeds', 'maxBeds', 'minBaths', 'maxBaths', 'sqftMin', 'sqftMax',
  'yearBuiltMin', 'yearBuiltMax', 'zipCodes', 'neighborhood', 'subdivision',
  'schoolDistrict', 'timeSincePublished', 'features', 'sort'
];

const filterFieldLabels: Record<string, string> = {
  type: 'Type (Sale/Lease)',
  propertyTypes: 'Property Types',
  subTypes: 'Sub Types',
  cities: 'Cities',
  minPrice: 'Min Price',
  maxPrice: 'Max Price',
  minBeds: 'Min Beds',
  maxBeds: 'Max Beds',
  minBaths: 'Min Baths',
  maxBaths: 'Max Baths',
  sqftMin: 'Min Sq Ft',
  sqftMax: 'Max Sq Ft',
  yearBuiltMin: 'Year Built Min',
  yearBuiltMax: 'Year Built Max',
  zipCodes: 'Zip Codes',
  neighborhood: 'Neighborhood',
  subdivision: 'Subdivision',
  schoolDistrict: 'School District',
  timeSincePublished: 'Time Since Published',
  features: 'Features',
  sort: 'Sort',
};

export default function SpyglassSnippets() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<SnippetForm>(initialForm);
  const [searchTerm, setSearchTerm] = useState('');
  const draggedIndex = useRef<number | null>(null);
  const dragOverIndex = useRef<number | null>(null);

  const queryClient = useQueryClient();

  // Fetch snippets
  const { data: snippets = [], isLoading } = useQuery({
    queryKey: ['spyglass-snippets'],
    queryFn: async () => {
      const response = await fetch('/api/admin/spyglass-snippets');
      if (!response.ok) throw new Error('Failed to fetch snippets');
      return response.json() as SpyglassSnippet[];
    }
  });

  // Create/update snippet
  const saveMutation = useMutation({
    mutationFn: async (data: SnippetForm) => {
      const filters = {
        type: data.type,
        propertyTypes: data.propertyTypes.filter(Boolean),
        subTypes: data.subTypes.filter(Boolean),
        cities: data.cities ? data.cities.split(',').map(s => s.trim()).filter(Boolean) : [],
        ...(data.minPrice && { minPrice: parseInt(data.minPrice) }),
        ...(data.maxPrice && { maxPrice: parseInt(data.maxPrice) }),
        ...(data.minBeds && { minBeds: parseInt(data.minBeds) }),
        ...(data.maxBeds && { maxBeds: parseInt(data.maxBeds) }),
        ...(data.minBaths && { minBaths: parseInt(data.minBaths) }),
        ...(data.maxBaths && { maxBaths: parseInt(data.maxBaths) }),
        ...(data.sqftMin && { sqftMin: parseInt(data.sqftMin) }),
        ...(data.sqftMax && { sqftMax: parseInt(data.sqftMax) }),
        ...(data.yearBuiltMin && { yearBuiltMin: parseInt(data.yearBuiltMin) }),
        ...(data.yearBuiltMax && { yearBuiltMax: parseInt(data.yearBuiltMax) }),
        zipCodes: data.zipCodes ? data.zipCodes.split(',').map(s => s.trim()).filter(Boolean) : [],
        ...(data.neighborhood && { neighborhood: data.neighborhood }),
        ...(data.subdivision && { subdivision: data.subdivision }),
        ...(data.schoolDistrict && { schoolDistrict: data.schoolDistrict }),
        ...(data.timeSincePublished && { timeSincePublished: data.timeSincePublished }),
        features: data.features.filter(Boolean),
        sort: data.sort,
        filterOrder: data.filterOrder.filter((f: string) => f).length ? data.filterOrder.filter((f: string) => f) : allFilterFields
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
        const response = await fetch(`/api/admin/spyglass-snippets/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error('Failed to update snippet');
        return response.json();
      } else {
        const response = await fetch('/api/admin/spyglass-snippets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error('Failed to create snippet');
        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spyglass-snippets'] });
      resetForm();
    }
  });

  // Delete snippet
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/spyglass-snippets/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete snippet');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spyglass-snippets'] });
    }
  });

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (snippet: SpyglassSnippet) => {
    setForm({
      name: snippet.name,
      slug: snippet.slug,
      pageTitle: snippet.pageTitle || '',
      metaDescription: snippet.metaDescription || '',
      type: snippet.filters.type || 'sale',
      propertyTypes: snippet.filters.propertyTypes || [],
      subTypes: snippet.filters.subTypes || [],
      cities: (snippet.filters.cities || []).join(', '),
      minPrice: snippet.filters.minPrice?.toString() || '',
      maxPrice: snippet.filters.maxPrice?.toString() || '',
      minBeds: snippet.filters.minBeds?.toString() || '',
      maxBeds: snippet.filters.maxBeds?.toString() || '',
      minBaths: snippet.filters.minBaths?.toString() || '',
      maxBaths: snippet.filters.maxBaths?.toString() || '',
      sqftMin: snippet.filters.sqftMin?.toString() || '',
      sqftMax: snippet.filters.sqftMax?.toString() || '',
      yearBuiltMin: snippet.filters.yearBuiltMin?.toString() || '',
      yearBuiltMax: snippet.filters.yearBuiltMax?.toString() || '',
      zipCodes: (snippet.filters.zipCodes || []).join(', '),
      neighborhood: snippet.filters.neighborhood || '',
      subdivision: snippet.filters.subdivision || '',
      schoolDistrict: snippet.filters.schoolDistrict || '',
      timeSincePublished: snippet.filters.timeSincePublished || '',
      features: snippet.filters.features || [],
      sort: snippet.filters.sort || 'price-high-low',
      status: snippet.status as 'draft' | 'published',
      filterOrder: snippet.filters.filterOrder || allFilterFields
    });
    setEditingId(snippet.id);
    setShowForm(true);
  };

  const generateSlug = (name: string) => {
    if (!name) return '';
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

  const handlePropertyTypeChange = (type: string) => {
    setForm(prev => ({
      ...prev,
      propertyTypes: prev.propertyTypes.includes(type)
        ? prev.propertyTypes.filter(t => t !== type)
        : [...prev.propertyTypes, type]
    }));
  };

  const handleFeatureChange = (feature: string) => {
    setForm(prev => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature]
    }));
  };

  const addSubType = (subType: string) => {
    if (subType.trim() && !form.subTypes.includes(subType.trim())) {
      setForm(prev => ({
        ...prev,
        subTypes: [...prev.subTypes, subType.trim()]
      }));
    }
  };

  const removeSubType = (index: number) => {
    setForm(prev => ({
      ...prev,
      subTypes: prev.subTypes.filter((_, i) => i !== index)
    }));
  };

  const handleDragStart = (fieldKey: string) => {
    const currentOrder = form.filterOrder.filter(f => f).length ? form.filterOrder.filter(f => f) : allFilterFields;
    draggedIndex.current = currentOrder.indexOf(fieldKey);
  };

  const handleDragOver = (e: React.DragEvent, fieldKey: string) => {
    e.preventDefault(); // ← required or drop won't fire
    const currentOrder = form.filterOrder.filter(f => f).length ? form.filterOrder.filter(f => f) : allFilterFields;
    dragOverIndex.current = currentOrder.indexOf(fieldKey);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); // ← required
    if (draggedIndex.current !== null && dragOverIndex.current !== null && draggedIndex.current !== dragOverIndex.current) {
      const currentOrder = form.filterOrder.filter(f => f).length ? form.filterOrder.filter(f => f) : allFilterFields;
      const newOrder = [...currentOrder];
      const moved = newOrder.splice(draggedIndex.current, 1)[0];
      newOrder.splice(dragOverIndex.current, 0, moved);
      setForm(prev => ({ ...prev, filterOrder: newOrder }));
    }
    draggedIndex.current = null;
    dragOverIndex.current = null;
  };

  const filteredSnippets = snippets.filter(snippet =>
    snippet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    snippet.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Dynamic field components for drag reordering
  const fieldComponents: Record<string, JSX.Element> = {
    type: (
      <div key="type" draggable onDragStart={() => handleDragStart('type')} onDragOver={(e) => handleDragOver(e, 'type')} onDrop={handleDrop} className="mb-4 cursor-move">
        <div className="flex items-center gap-2 mb-1">
          <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <label className="block text-sm font-medium text-gray-700">Type</label>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setForm(prev => ({ ...prev, type: 'sale' }))}
            className={`px-4 py-2 rounded ${form.type === 'sale' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            Sale
          </button>
          <button
            type="button"
            onClick={() => setForm(prev => ({ ...prev, type: 'lease' }))}
            className={`px-4 py-2 rounded ${form.type === 'lease' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            Lease
          </button>
        </div>
      </div>
    ),

    propertyTypes: (
      <div key="propertyTypes" draggable onDragStart={() => handleDragStart('propertyTypes')} onDragOver={(e) => handleDragOver(e, 'propertyTypes')} onDrop={handleDrop} className="mb-4 cursor-move">
        <div className="flex items-center gap-2 mb-1">
          <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <label className="block text-sm font-medium text-gray-700">Property Types</label>
        </div>
        <div className="flex flex-wrap gap-2">
          {propertyTypeOptions.map(type => (
            <button
              key={type}
              type="button"
              onClick={() => handlePropertyTypeChange(type)}
              className={`px-3 py-1 text-sm rounded ${
                form.propertyTypes.includes(type) 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>
    ),

    subTypes: (
      <div key="subTypes" draggable onDragStart={() => handleDragStart('subTypes')} onDragOver={(e) => handleDragOver(e, 'subTypes')} onDrop={handleDrop} className="mb-4 cursor-move">
        <div className="flex items-center gap-2 mb-1">
          <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <label className="block text-sm font-medium text-gray-700">Sub Types</label>
        </div>
        <div className="flex flex-wrap gap-2 mb-2">
          {form.subTypes.map((subType, index) => (
            <span
              key={index}
              className="bg-gray-100 text-gray-700 px-2 py-1 text-sm rounded flex items-center gap-1"
            >
              {subType}
              <button
                type="button"
                onClick={() => removeSubType(index)}
                className="text-gray-500 hover:text-red-600"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <input
          type="text"
          placeholder="Add sub type and press Enter"
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addSubType(e.currentTarget.value);
              e.currentTarget.value = '';
            }
          }}
          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    ),

    cities: (
      <div key="cities" draggable onDragStart={() => handleDragStart('cities')} onDragOver={(e) => handleDragOver(e, 'cities')} onDrop={handleDrop} className="mb-4 cursor-move">
        <div className="flex items-center gap-2 mb-1">
          <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <label className="block text-sm font-medium text-gray-700">Cities</label>
        </div>
        <input
          type="text"
          placeholder="Austin, Cedar Park, Round Rock"
          value={form.cities}
          onChange={(e) => setForm(prev => ({ ...prev, cities: e.target.value }))}
          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    ),

    minPrice: (
      <div key="minPrice" draggable onDragStart={() => handleDragStart('minPrice')} onDragOver={(e) => handleDragOver(e, 'minPrice')} onDrop={handleDrop} className="mb-4 cursor-move">
        <div className="flex items-center gap-2 mb-1">
          <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <label className="block text-sm font-medium text-gray-700">Price Range</label>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Min Price</label>
            <select
              value={form.minPrice}
              onChange={(e) => setForm(prev => ({ ...prev, minPrice: e.target.value }))}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Any</option>
              {priceOptions.slice(1).map(price => (
                <option key={price} value={price}>
                  ${price === '2000000+' ? '2,000,000+' : new Intl.NumberFormat().format(parseInt(price))}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Max Price</label>
            <select
              value={form.maxPrice}
              onChange={(e) => setForm(prev => ({ ...prev, maxPrice: e.target.value }))}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Any</option>
              {priceOptions.slice(1).map(price => (
                <option key={price} value={price}>
                  ${price === '2000000+' ? '2,000,000+' : new Intl.NumberFormat().format(parseInt(price))}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    ),

    minBeds: (
      <div key="minBeds" draggable onDragStart={() => handleDragStart('minBeds')} onDragOver={(e) => handleDragOver(e, 'minBeds')} onDrop={handleDrop} className="mb-4 cursor-move">
        <div className="flex items-center gap-2 mb-1">
          <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <label className="block text-sm font-medium text-gray-700">Beds/Baths</label>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Bedrooms</label>
            <div className="flex gap-1">
              {bedOptions.map(beds => (
                <button
                  key={beds}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, minBeds: beds }))}
                  className={`px-3 py-1 text-sm rounded flex-1 ${
                    form.minBeds === beds 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {beds || 'Any'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Bathrooms</label>
            <div className="flex gap-1">
              {bathOptions.map(baths => (
                <button
                  key={baths}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, minBaths: baths }))}
                  className={`px-3 py-1 text-sm rounded flex-1 ${
                    form.minBaths === baths 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {baths || 'Any'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),

    sqftMin: (
      <div key="sqftMin" draggable onDragStart={() => handleDragStart('sqftMin')} onDragOver={(e) => handleDragOver(e, 'sqftMin')} onDrop={handleDrop} className="mb-4 cursor-move">
        <div className="flex items-center gap-2 mb-1">
          <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <label className="block text-sm font-medium text-gray-700">Sq Ft Range</label>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Min Sq Ft</label>
            <input
              type="number"
              value={form.sqftMin}
              onChange={(e) => setForm(prev => ({ ...prev, sqftMin: e.target.value }))}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Max Sq Ft</label>
            <input
              type="number"
              value={form.sqftMax}
              onChange={(e) => setForm(prev => ({ ...prev, sqftMax: e.target.value }))}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    ),

    yearBuiltMin: (
      <div key="yearBuiltMin" draggable onDragStart={() => handleDragStart('yearBuiltMin')} onDragOver={(e) => handleDragOver(e, 'yearBuiltMin')} onDrop={handleDrop} className="mb-4 cursor-move">
        <div className="flex items-center gap-2 mb-1">
          <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <label className="block text-sm font-medium text-gray-700">Year Built Range</label>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Year Built Min</label>
            <input
              type="number"
              value={form.yearBuiltMin}
              onChange={(e) => setForm(prev => ({ ...prev, yearBuiltMin: e.target.value }))}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Year Built Max</label>
            <input
              type="number"
              value={form.yearBuiltMax}
              onChange={(e) => setForm(prev => ({ ...prev, yearBuiltMax: e.target.value }))}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    ),

    zipCodes: (
      <div key="zipCodes" draggable onDragStart={() => handleDragStart('zipCodes')} onDragOver={(e) => handleDragOver(e, 'zipCodes')} onDrop={handleDrop} className="mb-4 cursor-move">
        <div className="flex items-center gap-2 mb-1">
          <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <label className="block text-sm font-medium text-gray-700">Location Fields</label>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Zip Codes</label>
            <input
              type="text"
              placeholder="78701, 78702, 78703"
              value={form.zipCodes}
              onChange={(e) => setForm(prev => ({ ...prev, zipCodes: e.target.value }))}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Neighborhood</label>
            <input
              type="text"
              value={form.neighborhood}
              onChange={(e) => setForm(prev => ({ ...prev, neighborhood: e.target.value }))}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Subdivision</label>
            <input
              type="text"
              value={form.subdivision}
              onChange={(e) => setForm(prev => ({ ...prev, subdivision: e.target.value }))}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">School District</label>
            <input
              type="text"
              value={form.schoolDistrict}
              onChange={(e) => setForm(prev => ({ ...prev, schoolDistrict: e.target.value }))}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    ),

    timeSincePublished: (
      <div key="timeSincePublished" draggable onDragStart={() => handleDragStart('timeSincePublished')} onDragOver={(e) => handleDragOver(e, 'timeSincePublished')} onDrop={handleDrop} className="mb-4 cursor-move">
        <div className="flex items-center gap-2 mb-1">
          <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <label className="block text-sm font-medium text-gray-700">Time Since Published</label>
        </div>
        <select
          value={form.timeSincePublished}
          onChange={(e) => setForm(prev => ({ ...prev, timeSincePublished: e.target.value }))}
          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Any</option>
          {timeOptions.slice(1).map(time => (
            <option key={time} value={time}>
              {time} day{time !== '1' ? 's' : ''}
            </option>
          ))}
        </select>
      </div>
    ),

    features: (
      <div key="features" draggable onDragStart={() => handleDragStart('features')} onDragOver={(e) => handleDragOver(e, 'features')} onDrop={handleDrop} className="mb-4 cursor-move">
        <div className="flex items-center gap-2 mb-1">
          <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <label className="block text-sm font-medium text-gray-700">Features</label>
        </div>
        <div className="flex flex-wrap gap-2">
          {featureOptions.map(feature => (
            <button
              key={feature}
              type="button"
              onClick={() => handleFeatureChange(feature)}
              className={`px-3 py-1 text-sm rounded ${
                form.features.includes(feature) 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {feature}
            </button>
          ))}
        </div>
      </div>
    ),

    sort: (
      <div key="sort" draggable onDragStart={() => handleDragStart('sort')} onDragOver={(e) => handleDragOver(e, 'sort')} onDrop={handleDrop} className="mb-4 cursor-move">
        <div className="flex items-center gap-2 mb-1">
          <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <label className="block text-sm font-medium text-gray-700">Sort</label>
        </div>
        <select
          value={form.sort}
          onChange={(e) => setForm(prev => ({ ...prev, sort: e.target.value }))}
          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {sortOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    ),

    // Individual field components for remaining allFilterFields entries
    maxPrice: (
      <div key="maxPrice" className="hidden">
        {/* maxPrice is handled within minPrice (Price Range) component */}
      </div>
    ),

    maxBeds: (
      <div key="maxBeds" className="hidden">
        {/* maxBeds is handled within minBeds (Beds/Baths) component */}
      </div>
    ),

    minBaths: (
      <div key="minBaths" className="hidden">
        {/* minBaths is handled within minBeds (Beds/Baths) component */}
      </div>
    ),

    maxBaths: (
      <div key="maxBaths" className="hidden">
        {/* maxBaths is handled within minBeds (Beds/Baths) component */}
      </div>
    ),

    sqftMax: (
      <div key="sqftMax" className="hidden">
        {/* sqftMax is handled within sqftMin (Sq Ft Range) component */}
      </div>
    ),

    yearBuiltMax: (
      <div key="yearBuiltMax" className="hidden">
        {/* yearBuiltMax is handled within yearBuiltMin (Year Built Range) component */}
      </div>
    ),

    neighborhood: (
      <div key="neighborhood" className="hidden">
        {/* neighborhood is handled within zipCodes (Location Fields) component */}
      </div>
    ),

    subdivision: (
      <div key="subdivision" className="hidden">
        {/* subdivision is handled within zipCodes (Location Fields) component */}
      </div>
    ),

    schoolDistrict: (
      <div key="schoolDistrict" className="hidden">
        {/* schoolDistrict is handled within zipCodes (Location Fields) component */}
      </div>
    )
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading snippets...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Spyglass Snippets</h1>
          <p className="text-gray-600">Manage saved search templates with advanced filtering</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          New Snippet
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
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">
                  {editingId ? 'Edit' : 'Create'} Spyglass Snippet
                </h2>
                <button
                  onClick={resetForm}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium">Slug*</label>
                    {form.slug && (
                      <a
                        href={`https://spyglass-idx.vercel.app/idx/${form.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:text-blue-700 underline flex items-center gap-1"
                      >
                        View on site ↗
                      </a>
                    )}
                  </div>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => setForm(prev => ({ ...prev, slug: e.target.value }))}
                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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

              <div>
                <label className="block text-sm font-medium mb-1">Meta Description</label>
                <textarea
                  value={form.metaDescription}
                  onChange={(e) => setForm(prev => ({ ...prev, metaDescription: e.target.value }))}
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              {/* Filters Section */}
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">Search Filters</h3>
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, filterOrder: allFilterFields }))}
                    className="text-xs text-blue-500 hover:text-blue-700 underline"
                  >
                    Reset to default order
                  </button>
                </div>
                
                {/* Dynamic field rendering based on filterOrder */}
                {(form.filterOrder.filter(f => f).length ? form.filterOrder.filter(f => f) : allFilterFields).map(fieldKey => (
                  <div key={fieldKey}>
                    {fieldComponents[fieldKey]}
                  </div>
                ))}


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

      {/* Snippets List */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Spyglass Snippets ({filteredSnippets.length})</h2>
        </div>
        
        {filteredSnippets.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchTerm ? 'No snippets match your search term.' : 'No snippets yet. Create your first one!'}
          </div>
        ) : (
          <div className="divide-y">
            {filteredSnippets.map((snippet) => (
              <div key={snippet.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium">{snippet.name}</h3>
                      <div className="flex items-center gap-2">
                        {snippet.status === 'published' ? (
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
                    <p className="text-gray-600 text-sm mt-1">/{snippet.slug}</p>
                    {snippet.pageTitle && (
                      <p className="text-gray-500 text-xs mt-1">{snippet.pageTitle}</p>
                    )}
                    <div className="text-xs text-gray-400 mt-2">
                      Created {new Date(snippet.createdAt).toLocaleDateString()}
                      {snippet.updatedAt !== snippet.createdAt && (
                        <> • Updated {new Date(snippet.updatedAt).toLocaleDateString()}</>
                      )}
                    </div>
                    {snippet.status === 'published' && (
                      <div className="mt-2">
                        <a
                          href={`https://spyglass-idx.vercel.app/idx/${snippet.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          View on site →
                        </a>
                      </div>
                    )}
                    {snippet.status === 'published' && (
                      <div className="mt-1">
                        <a
                          href={`https://missioncontrol-tjfm.onrender.com/admin/communities/${snippet.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-gray-500 hover:text-gray-700"
                        >
                          Edit community →
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(snippet)}
                      className="p-1 text-gray-500 hover:text-blue-600"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete "${snippet.name}"?`)) {
                          deleteMutation.mutate(snippet.id);
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