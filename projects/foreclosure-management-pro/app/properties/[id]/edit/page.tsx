'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { Property } from '@/types';
import AutocompleteInput from '@/components/AutocompleteInput';

interface Props {
  params: Promise<{ id: string }>;
}

export default function EditPropertyPage({ params }: Props) {
  const router = useRouter();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [platformSuggestions, setPlatformSuggestions] = useState<string[]>([]);
  const [propertyId, setPropertyId] = useState<string>('');
  const [formData, setFormData] = useState({
    address: '',
    city: '',
    state: '',
    zip_code: '',
    client_name: '',
    mls_number: '',
    asset_management_platform: '',
    status: 'active' as Property['status'],
    last_visit_date: '',
    visit_schedule: 'bi-weekly' as 'weekly' | 'bi-weekly',
    last_open_house: '',
    last_broker_caravan: '',
    occupied: false,
    winterized: false,
    sign_in_yard: false,
    listed_on_mls: false,
    supra_box_on_door: false,
    combo_lock_box: false,
    combo_lock_box_code: '',
    professional_photos: false,
    qualify_va_financing: false,
    notes: '',
  });

  useEffect(() => {
    const initializeData = async () => {
      const { id } = await params;
      setPropertyId(id);
      fetchProperty(id);
      fetchPlatformSuggestions();
    };
    initializeData();
  }, []);

  const fetchProperty = async (id?: string) => {
    const currentId = id || propertyId;
    if (!currentId) return;
    
    try {
      const response = await fetch(`/api/properties/${currentId}`);
      if (response.ok) {
        const data = await response.json();
        setProperty(data);
        setFormData({
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          zip_code: data.zip_code || '',
          client_name: data.client_name || '',
          mls_number: data.mls_number || '',
          asset_management_platform: data.asset_management_platform || '',
          status: data.status || 'active',
          last_visit_date: data.last_visit_date || '',
          visit_schedule: data.visit_schedule || 'bi-weekly',
          last_open_house: data.last_open_house || '',
          last_broker_caravan: data.last_broker_caravan || '',
          occupied: data.occupied || false,
          winterized: data.winterized || false,
          sign_in_yard: data.sign_in_yard || false,
          listed_on_mls: data.listed_on_mls || false,
          supra_box_on_door: data.supra_box_on_door || false,
          combo_lock_box: data.combo_lock_box || false,
          combo_lock_box_code: data.combo_lock_box_code || '',
          professional_photos: data.professional_photos || false,
          qualify_va_financing: data.qualify_va_financing || false,
          notes: data.notes || '',
        });
      }
    } catch (error) {
      console.error('Error fetching property:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlatformSuggestions = async () => {
    try {
      const response = await fetch('/api/platforms');
      if (response.ok) {
        const platforms = await response.json();
        setPlatformSuggestions(platforms);
      }
    } catch (error) {
      console.error('Error fetching platform suggestions:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const target = e.target as HTMLInputElement;
      setFormData(prev => ({
        ...prev,
        [name]: target.checked,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(`/api/properties/${propertyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        router.push(`/properties/${propertyId}`);
      } else {
        alert('Error updating property');
      }
    } catch (error) {
      console.error('Error updating property:', error);
      alert('Error updating property');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="p-8">
        <div className="text-white">Property not found</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center mb-8">
        <Link href={`/properties/${propertyId}`} className="mr-4 text-gray-400 hover:text-white">
          <ArrowLeftIcon className="h-6 w-6" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Edit Property</h1>
          <p className="text-gray-400">{property.address}</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="max-w-4xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Basic Information */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-6">Basic Information</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Address *
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="form-input w-full"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className="form-input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    State *
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    className="form-input w-full"
                    maxLength={2}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    ZIP Code *
                  </label>
                  <input
                    type="text"
                    name="zip_code"
                    value={formData.zip_code}
                    onChange={handleInputChange}
                    className="form-input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="form-select w-full"
                  >
                    <option value="pre-marketing">Pre-Marketing</option>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="sold">Sold</option>
                    <option value="removed">Removed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Client Name *
                </label>
                <input
                  type="text"
                  name="client_name"
                  value={formData.client_name}
                  onChange={handleInputChange}
                  className="form-input w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  MLS Number
                </label>
                <input
                  type="text"
                  name="mls_number"
                  value={formData.mls_number}
                  onChange={handleInputChange}
                  className="form-input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Asset Management Platform
                </label>
                <AutocompleteInput
                  name="asset_management_platform"
                  value={formData.asset_management_platform}
                  onChange={(value) => setFormData(prev => ({ ...prev, asset_management_platform: value }))}
                  suggestions={platformSuggestions}
                  placeholder="Enter or select platform (e.g., Fannie Mae, Freddie Mac)"
                  className="w-full"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Start typing to see suggestions from previously entered platforms
                </p>
              </div>
            </div>
          </div>

          {/* Visit Tracking - NEW SECTION */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-6">📅 Visit Tracking</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Last Property Visit
                </label>
                <input
                  type="date"
                  name="last_visit_date"
                  value={formData.last_visit_date}
                  onChange={handleInputChange}
                  className="form-input w-full"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Date when the property was last visited for inspection
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Visit Schedule
                </label>
                <select
                  name="visit_schedule"
                  value={formData.visit_schedule}
                  onChange={handleInputChange}
                  className="form-select w-full"
                >
                  <option value="bi-weekly">Bi-weekly (every 14 days)</option>
                  <option value="weekly">Weekly (every 7 days)</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  How often this property should be visited
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Last Open House
                </label>
                <input
                  type="date"
                  name="last_open_house"
                  value={formData.last_open_house}
                  onChange={handleInputChange}
                  className="form-input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Last Broker Caravan
                </label>
                <input
                  type="date"
                  name="last_broker_caravan"
                  value={formData.last_broker_caravan}
                  onChange={handleInputChange}
                  className="form-input w-full"
                />
              </div>
            </div>
          </div>

          {/* Property Features */}
          <div className="card lg:col-span-2">
            <h3 className="text-lg font-semibold text-white mb-6">Property Features</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[
                { key: 'occupied', label: 'Occupied' },
                { key: 'winterized', label: 'Winterized' },
                { key: 'sign_in_yard', label: 'Sign in Yard' },
                { key: 'listed_on_mls', label: 'Listed on MLS' },
                { key: 'supra_box_on_door', label: 'Supra Box on Door' },
                { key: 'professional_photos', label: 'Professional Photos' },
                { key: 'qualify_va_financing', label: '✅ Qualify for VA Financing' },
              ].map((feature) => (
                <div key={feature.key} className="flex items-center">
                  <input
                    type="checkbox"
                    id={feature.key}
                    name={feature.key}
                    checked={formData[feature.key as keyof typeof formData] as boolean}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-spyglass-orange bg-spyglass-charcoal border-gray-600 rounded focus:ring-spyglass-orange focus:ring-2"
                  />
                  <label htmlFor={feature.key} className="ml-2 text-sm text-gray-300">
                    {feature.label}
                  </label>
                </div>
              ))}
              
              {/* Combo Lock Box with conditional code input */}
              <div className="col-span-2">
                <div className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    id="combo_lock_box"
                    name="combo_lock_box"
                    checked={formData.combo_lock_box}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-spyglass-orange bg-spyglass-charcoal border-gray-600 rounded focus:ring-spyglass-orange focus:ring-2"
                  />
                  <label htmlFor="combo_lock_box" className="ml-2 text-sm text-gray-300">
                    Combo Lock Box
                  </label>
                </div>
                
                {formData.combo_lock_box && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Combo Code
                    </label>
                    <input
                      type="text"
                      name="combo_lock_box_code"
                      value={formData.combo_lock_box_code}
                      onChange={handleInputChange}
                      className="form-input w-full"
                      placeholder="Enter combo code"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="card lg:col-span-2">
            <h3 className="text-lg font-semibold text-white mb-6">Notes</h3>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={4}
              className="form-input w-full"
              placeholder="Property notes, outstanding repairs, etc..."
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4 mt-8">
          <Link href={`/properties/${propertyId}`} className="btn-secondary">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}