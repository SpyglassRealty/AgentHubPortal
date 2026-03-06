export interface Property {
  id: number;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  client_name: string;
  mls_number?: string;
  asset_management_platform?: string;
  status: 'active' | 'pending' | 'sold' | 'removed' | 'pre-marketing';
  archived: boolean;
  archived_date?: string;
  archived_by?: string;
  last_visit_date?: string;
  visit_schedule: 'weekly' | 'bi-weekly';
  last_open_house?: string;
  last_broker_caravan?: string;
  date_added: string;
  occupied: boolean;
  winterized: boolean;
  sign_in_yard: boolean;
  listed_on_mls: boolean;
  supra_box_on_door: boolean;
  combo_lock_box: boolean;
  combo_lock_box_code?: string;
  professional_photos: boolean;
  qualify_va_financing: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface VisitHistory {
  id: number;
  property_id: number;
  visit_date: string;
  visit_time: string;
  visit_type: string;
  occupancy_status?: string;
  condition_notes?: string;
  issues?: string;
  action_required?: string;
  next_visit_date?: string;
  created_by?: string;
  created_at: string;
}

export interface PropertyWithVisits extends Property {
  visits: VisitHistory[];
  next_visit_due?: string;
  days_until_visit?: number;
}

export interface DashboardStats {
  total_properties: number;
  listed_on_mls: number;
  occupied: number;
  needs_visit: number;
  clients: number;
  vendors: number;
  properties_due_this_week: PropertyWithVisits[];
}

export interface Client {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  created_at: string;
}

export interface PropertyPhoto {
  id: number;
  property_id: number;
  filename: string;
  original_name: string;
  upload_date: string;
  uploaded_by?: string;
  week_of: string; // ISO date string for the Monday of that week
  file_size: number;
  mime_type: string;
  created_at: string;
}

export interface PropertyDocument {
  id: number;
  property_id: number;
  filename: string;
  original_name: string;
  upload_date: string;
  uploaded_by?: string;
  file_size: number;
  mime_type: string;
  document_type?: string; // category like 'contract', 'inspection', 'disclosure', etc.
  created_at: string;
}