import fs from 'fs';
import path from 'path';

// Use /tmp directory on Vercel serverless, local data directory otherwise
const dbPath = process.env.VERCEL 
  ? path.join('/tmp', 'db.json')
  : path.join(process.cwd(), 'data', 'db.json');

export interface DatabaseSchema {
  properties: any[];
  visit_history: any[];
  clients: any[];
  property_photos: any[];
  property_documents: any[];
}

// Initialize database with empty structure if it doesn't exist
export const initDatabase = () => {
  if (process.env.VERCEL) {
    // On Vercel, if /tmp/db.json doesn't exist, initialize with sample data
    if (!fs.existsSync(dbPath)) {
      const sampleData = getSampleData();
      fs.writeFileSync(dbPath, JSON.stringify(sampleData, null, 2));
    }
    
    // Create upload directories in /tmp for Vercel
    // NOTE: /tmp on Vercel is ephemeral and has 512MB limit. For production, use Vercel Blob or external storage.
    const uploadsDir = path.join('/tmp', 'uploads');
    const propertiesDir = path.join(uploadsDir, 'properties');
    const documentsDir = path.join(uploadsDir, 'documents');
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    if (!fs.existsSync(propertiesDir)) {
      fs.mkdirSync(propertiesDir, { recursive: true });
    }
    if (!fs.existsSync(documentsDir)) {
      fs.mkdirSync(documentsDir, { recursive: true });
    }
  } else {
    const dataDir = path.join(process.cwd(), 'data');
    
    // Create data directory if it doesn't exist
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Create database file if it doesn't exist
    if (!fs.existsSync(dbPath)) {
      const initialData: DatabaseSchema = {
        properties: [],
        visit_history: [],
        clients: [],
        property_photos: [],
        property_documents: []
      };
      fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2));
      insertSampleData();
    }
    
    // Create upload directories for local development
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const propertiesDir = path.join(uploadsDir, 'properties');
    const documentsDir = path.join(uploadsDir, 'documents');
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    if (!fs.existsSync(propertiesDir)) {
      fs.mkdirSync(propertiesDir, { recursive: true });
    }
    if (!fs.existsSync(documentsDir)) {
      fs.mkdirSync(documentsDir, { recursive: true });
    }
  }
};

// Read database - returns sample data if file doesn't exist
export const readDatabase = (): DatabaseSchema => {
  // Initialize database if it doesn't exist
  if (!fs.existsSync(dbPath)) {
    initDatabase();
  }
  
  try {
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath, 'utf-8');
      const parsed = JSON.parse(data);
      // Ensure all required tables exist
      return {
        properties: parsed.properties || [],
        visit_history: parsed.visit_history || [],
        clients: parsed.clients || [],
        property_photos: parsed.property_photos || [],
        property_documents: parsed.property_documents || []
      };
    }
  } catch (error) {
    console.error('Error reading database:', error);
  }
  
  // Return sample data as fallback
  return getSampleData();
};

// Write database - use /tmp directory on Vercel
export const writeDatabase = (data: DatabaseSchema): void => {
  try {
    if (process.env.VERCEL) {
      // On Vercel, write to /tmp directory
      fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    } else {
      // Local environment - create directory if needed
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('Error writing database:', error);
  }
};

// Get sample data for serverless environments
const getSampleData = (): DatabaseSchema => {
  return {
    properties: [
      {
        id: 1,
        address: '1234 South Lamar Blvd',
        city: 'Austin',
        state: 'TX',
        zip_code: '78704',
        client_name: 'Austin Bank & Trust',
        mls_number: 'ATX001234',
        asset_management_platform: 'Fannie Mae',
        status: 'active',
        last_visit_date: '2024-01-20',
        visit_schedule: 'bi-weekly',
        last_open_house: '2024-01-15',
        last_broker_caravan: '2024-01-08',
        date_added: '2024-02-24',
        occupied: false,
        winterized: true,
        sign_in_yard: true,
        listed_on_mls: true,
        supra_box_on_door: true,
        combo_lock_box: false,
        combo_lock_box_code: '',
        professional_photos: true,
        qualify_va_financing: true,
        archived: false,
        archived_date: null,
        archived_by: null,
        notes: 'Prime South Austin, needs minor repairs',
        created_at: '2024-02-24T00:00:00.000Z',
        updated_at: '2024-02-24T00:00:00.000Z'
      },
      {
        id: 2,
        address: '5678 East 6th Street',
        city: 'Austin',
        state: 'TX',
        zip_code: '78702',
        client_name: 'Texas Federal Credit Union',
        mls_number: 'ATX005678',
        asset_management_platform: 'Freddie Mac',
        status: 'active',
        last_visit_date: '2024-02-01',
        visit_schedule: 'weekly',
        last_open_house: '2024-01-25',
        last_broker_caravan: '2024-01-18',
        date_added: '2024-02-24',
        occupied: true,
        winterized: false,
        sign_in_yard: true,
        listed_on_mls: true,
        supra_box_on_door: false,
        combo_lock_box: true,
        combo_lock_box_code: '1234',
        professional_photos: true,
        qualify_va_financing: false,
        archived: false,
        archived_date: null,
        archived_by: null,
        notes: 'East Austin location, tenant occupied',
        created_at: '2024-02-24T00:00:00.000Z',
        updated_at: '2024-02-24T00:00:00.000Z'
      }
    ],
    visit_history: [
      {
        id: 1,
        property_id: 1,
        visit_date: '2024-01-20T14:30:00.000Z',
        visitor: 'Inspector John',
        visit_type: 'Regular inspection',
        occupancy_status: 'Vacant',
        condition_notes: 'Good condition',
        photos_taken: 5,
        issues_noted: 'None',
        next_visit_due: '2024-02-03',
        created_at: '2024-01-20T14:30:00.000Z'
      }
    ],
    clients: [],
    property_photos: [],
    property_documents: []
  };
};

const insertSampleData = () => {
  const db = readDatabase();
  
  // Sample properties with realistic visit schedules
  const properties = [
    {
      id: 1,
      address: '1234 South Lamar Blvd',
      city: 'Austin',
      state: 'TX',
      zip_code: '78704',
      client_name: 'Austin Bank & Trust',
      mls_number: 'ATX001234',
      asset_management_platform: 'Fannie Mae',
      status: 'active',
      last_visit_date: '2024-01-20',
      visit_schedule: 'bi-weekly',
      last_open_house: '2024-01-15',
      last_broker_caravan: '2024-01-08',
      date_added: '2024-02-24',
      occupied: false,
      winterized: true,
      sign_in_yard: true,
      listed_on_mls: true,
      supra_box_on_door: true,
      combo_lock_box: false,
      combo_lock_box_code: '',
      professional_photos: true,
      qualify_va_financing: true,
      archived: false,
      archived_date: null,
      archived_by: null,
      notes: 'Prime South Austin, needs minor repairs',
      created_at: '2024-02-24T00:00:00.000Z',
      updated_at: '2024-02-24T00:00:00.000Z'
    },
    {
      id: 2,
      address: '5678 East 6th Street',
      city: 'Austin',
      state: 'TX',
      zip_code: '78702',
      client_name: 'Texas Federal Credit Union',
      mls_number: 'ATX005678',
      asset_management_platform: 'Freddie Mac',
      status: 'active',
      last_visit_date: '2024-01-25',
      visit_schedule: 'weekly',
      last_open_house: null,
      last_broker_caravan: null,
      date_added: '2024-02-24',
      occupied: true,
      winterized: false,
      sign_in_yard: true,
      listed_on_mls: true,
      supra_box_on_door: false,
      combo_lock_box: false,
      combo_lock_box_code: '',
      professional_photos: false,
      qualify_va_financing: false,
      archived: false,
      archived_date: null,
      archived_by: null,
      notes: 'Currently occupied',
      created_at: '2024-02-24T00:00:00.000Z',
      updated_at: '2024-02-24T00:00:00.000Z'
    },
    {
      id: 3,
      address: '9012 North Loop Blvd',
      city: 'Austin',
      state: 'TX',
      zip_code: '78756',
      client_name: 'Austin Bank & Trust',
      mls_number: null,
      asset_management_platform: 'Bank of America REO',
      status: 'active',
      last_visit_date: '2024-01-18',
      visit_schedule: 'bi-weekly',
      last_open_house: null,
      last_broker_caravan: null,
      date_added: '2024-02-24',
      occupied: false,
      winterized: true,
      sign_in_yard: false,
      listed_on_mls: false,
      supra_box_on_door: true,
      combo_lock_box: false,
      combo_lock_box_code: '',
      professional_photos: false,
      qualify_va_financing: true,
      archived: false,
      archived_date: null,
      archived_by: null,
      notes: '',
      created_at: '2024-02-24T00:00:00.000Z',
      updated_at: '2024-02-24T00:00:00.000Z'
    },
    {
      id: 4,
      address: '3456 West Anderson Lane',
      city: 'Austin',
      state: 'TX',
      zip_code: '78757',
      client_name: 'Capital City Investments',
      mls_number: 'ATX003456',
      asset_management_platform: 'Wells Fargo REO',
      status: 'active',
      last_visit_date: '2024-01-22',
      visit_schedule: 'weekly',
      last_open_house: null,
      last_broker_caravan: null,
      date_added: '2024-02-24',
      occupied: false,
      winterized: true,
      sign_in_yard: true,
      listed_on_mls: true,
      supra_box_on_door: false,
      combo_lock_box: false,
      combo_lock_box_code: '',
      professional_photos: true,
      qualify_va_financing: false,
      archived: false,
      archived_date: null,
      archived_by: null,
      notes: '',
      created_at: '2024-02-24T00:00:00.000Z',
      updated_at: '2024-02-24T00:00:00.000Z'
    },
    {
      id: 5,
      address: '7890 South Congress Ave',
      city: 'Austin',
      state: 'TX',
      zip_code: '78745',
      client_name: 'Texas Federal Credit Union',
      mls_number: 'ATX007890',
      asset_management_platform: 'JPMorgan Chase REO',
      status: 'pending',
      last_visit_date: '2024-01-19',
      visit_schedule: 'weekly',
      last_open_house: null,
      last_broker_caravan: null,
      date_added: '2024-02-24',
      occupied: false,
      winterized: false,
      sign_in_yard: true,
      listed_on_mls: true,
      supra_box_on_door: false,
      combo_lock_box: false,
      combo_lock_box_code: '',
      professional_photos: false,
      qualify_va_financing: true,
      archived: false,
      archived_date: null,
      archived_by: null,
      notes: '',
      created_at: '2024-02-24T00:00:00.000Z',
      updated_at: '2024-02-24T00:00:00.000Z'
    },
    {
      id: 6,
      address: '2468 Guadalupe Street',
      city: 'Austin',
      state: 'TX',
      zip_code: '78705',
      client_name: 'Austin Bank & Trust',
      mls_number: null,
      asset_management_platform: 'Fannie Mae',
      status: 'active',
      last_visit_date: '2024-01-26',
      visit_schedule: 'bi-weekly',
      last_open_house: null,
      last_broker_caravan: null,
      date_added: '2024-02-24',
      occupied: true,
      winterized: true,
      sign_in_yard: false,
      listed_on_mls: false,
      supra_box_on_door: false,
      combo_lock_box: false,
      combo_lock_box_code: '',
      professional_photos: false,
      qualify_va_financing: false,
      archived: false,
      archived_date: null,
      archived_by: null,
      notes: '',
      created_at: '2024-02-24T00:00:00.000Z',
      updated_at: '2024-02-24T00:00:00.000Z'
    },
    {
      id: 7,
      address: '1357 Barton Springs Rd',
      city: 'Austin',
      state: 'TX',
      zip_code: '78704',
      client_name: 'Texas Federal Credit Union',
      mls_number: 'ATX001357',
      asset_management_platform: 'Freddie Mac',
      status: 'active',
      last_visit_date: '2024-01-21',
      visit_schedule: 'bi-weekly',
      last_open_house: null,
      last_broker_caravan: null,
      date_added: '2024-02-24',
      occupied: false,
      winterized: true,
      sign_in_yard: true,
      listed_on_mls: true,
      supra_box_on_door: true,
      combo_lock_box: false,
      combo_lock_box_code: '',
      professional_photos: true,
      qualify_va_financing: true,
      archived: false,
      archived_date: null,
      archived_by: null,
      notes: '',
      created_at: '2024-02-24T00:00:00.000Z',
      updated_at: '2024-02-24T00:00:00.000Z'
    },
    {
      id: 8,
      address: '8024 Burnet Road',
      city: 'Austin',
      state: 'TX',
      zip_code: '78757',
      client_name: 'Capital City Investments',
      mls_number: 'ATX008024',
      asset_management_platform: 'HUD Homes',
      status: 'active',
      last_visit_date: '2024-01-24',
      visit_schedule: 'weekly',
      last_open_house: null,
      last_broker_caravan: null,
      date_added: '2024-02-24',
      occupied: true,
      winterized: false,
      sign_in_yard: true,
      listed_on_mls: true,
      supra_box_on_door: false,
      combo_lock_box: false,
      combo_lock_box_code: '',
      professional_photos: true,
      qualify_va_financing: false,
      archived: false,
      archived_date: null,
      archived_by: null,
      notes: '',
      created_at: '2024-02-24T00:00:00.000Z',
      updated_at: '2024-02-24T00:00:00.000Z'
    },
    {
      id: 9,
      address: '4680 Airport Blvd',
      city: 'Austin',
      state: 'TX',
      zip_code: '78751',
      client_name: 'Austin Bank & Trust',
      mls_number: null,
      asset_management_platform: 'Citibank REO',
      status: 'active',
      last_visit_date: '2024-01-17',
      visit_schedule: 'bi-weekly',
      last_open_house: null,
      last_broker_caravan: null,
      date_added: '2024-02-24',
      occupied: false,
      winterized: true,
      sign_in_yard: false,
      listed_on_mls: false,
      supra_box_on_door: true,
      combo_lock_box: false,
      combo_lock_box_code: '',
      professional_photos: false,
      qualify_va_financing: true,
      archived: false,
      archived_date: null,
      archived_by: null,
      notes: '',
      created_at: '2024-02-24T00:00:00.000Z',
      updated_at: '2024-02-24T00:00:00.000Z'
    },
    {
      id: 10,
      address: '1122 Oltorf Street',
      city: 'Austin',
      state: 'TX',
      zip_code: '78704',
      client_name: 'Texas Federal Credit Union',
      mls_number: 'ATX001122',
      asset_management_platform: 'PNC Bank REO',
      status: 'active',
      last_visit_date: '2024-01-23',
      visit_schedule: 'weekly',
      last_open_house: null,
      last_broker_caravan: null,
      date_added: '2024-02-24',
      occupied: false,
      winterized: true,
      sign_in_yard: true,
      listed_on_mls: true,
      supra_box_on_door: false,
      combo_lock_box: false,
      combo_lock_box_code: '',
      professional_photos: true,
      qualify_va_financing: false,
      archived: false,
      archived_date: null,
      archived_by: null,
      notes: '',
      created_at: '2024-02-24T00:00:00.000Z',
      updated_at: '2024-02-24T00:00:00.000Z'
    }
  ];

  // Add sample visit history for first property
  const visitHistory = [
    {
      id: 1,
      property_id: 1,
      visit_date: '2024-01-20',
      visit_time: '14:30:00',
      visit_type: 'Regular inspection',
      occupancy_status: 'Vacant',
      condition_notes: 'Good condition',
      issues: 'Minor paint touch-ups',
      action_required: 'Schedule painter',
      next_visit_date: '2024-02-20',
      created_by: 'Dustin Raye',
      created_at: '2024-01-20T14:30:00.000Z'
    }
  ];

  db.properties = properties;
  db.visit_history = visitHistory;
  
  writeDatabase(db);
};

export default { readDatabase, writeDatabase };