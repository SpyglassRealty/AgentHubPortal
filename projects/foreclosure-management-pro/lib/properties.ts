import { readDatabase, writeDatabase } from './database';
import { Property, VisitHistory, PropertyWithVisits, DashboardStats } from '@/types';
import { addDays, isWithinInterval, startOfWeek, endOfWeek, format } from 'date-fns';

export class PropertyService {
  static getAllProperties(): Property[] {
    const db = readDatabase();
    return db.properties.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }

  static getActiveProperties(): Property[] {
    const db = readDatabase();
    return db.properties
      .filter(p => !p.archived)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }

  static getArchivedProperties(): Property[] {
    const db = readDatabase();
    return db.properties
      .filter(p => p.archived)
      .sort((a, b) => new Date(b.archived_date || b.updated_at).getTime() - new Date(a.archived_date || a.updated_at).getTime());
  }

  static getPropertyById(id: number): Property | null {
    const db = readDatabase();
    return db.properties.find(p => p.id === id) || null;
  }

  static getPropertyWithVisits(id: number): PropertyWithVisits | null {
    const property = this.getPropertyById(id);
    if (!property) return null;

    const db = readDatabase();
    const visits = db.visit_history.filter(v => v.property_id === id)
      .sort((a, b) => {
        const aDateTime = new Date(`${a.visit_date}T${a.visit_time}`).getTime();
        const bDateTime = new Date(`${b.visit_date}T${b.visit_time}`).getTime();
        return bDateTime - aDateTime; // Most recent first
      });

    return {
      ...property,
      visits,
      ...this.calculateNextVisit(property)
    };
  }

  static updateProperty(id: number, updates: Partial<Property>): boolean {
    const db = readDatabase();
    const propertyIndex = db.properties.findIndex(p => p.id === id);
    
    if (propertyIndex === -1) return false;

    // Update the property
    db.properties[propertyIndex] = {
      ...db.properties[propertyIndex],
      ...updates,
      updated_at: new Date().toISOString()
    };

    writeDatabase(db);
    return true;
  }

  static archiveProperty(id: number, archivedBy: string = 'Unknown User'): boolean {
    const db = readDatabase();
    const propertyIndex = db.properties.findIndex(p => p.id === id);
    
    if (propertyIndex === -1 || db.properties[propertyIndex].archived) return false;

    // Archive the property
    db.properties[propertyIndex] = {
      ...db.properties[propertyIndex],
      archived: true,
      archived_date: new Date().toISOString(),
      archived_by: archivedBy,
      updated_at: new Date().toISOString()
    };

    writeDatabase(db);
    return true;
  }

  static restoreProperty(id: number): boolean {
    const db = readDatabase();
    const propertyIndex = db.properties.findIndex(p => p.id === id);
    
    if (propertyIndex === -1 || !db.properties[propertyIndex].archived) return false;

    // Restore the property
    db.properties[propertyIndex] = {
      ...db.properties[propertyIndex],
      archived: false,
      archived_date: undefined,
      archived_by: undefined,
      updated_at: new Date().toISOString()
    };

    writeDatabase(db);
    return true;
  }

  static addVisit(propertyId: number, visit: Omit<VisitHistory, 'id' | 'property_id' | 'created_at'>): boolean {
    const db = readDatabase();
    
    // Get next ID
    const maxId = Math.max(0, ...db.visit_history.map(v => v.id));
    const newVisit = {
      id: maxId + 1,
      property_id: propertyId,
      ...visit,
      created_at: new Date().toISOString()
    };

    db.visit_history.push(newVisit);

    // Update the property's last_visit_date
    const propertyIndex = db.properties.findIndex(p => p.id === propertyId);
    if (propertyIndex !== -1) {
      db.properties[propertyIndex].last_visit_date = visit.visit_date;
      db.properties[propertyIndex].updated_at = new Date().toISOString();
    }

    writeDatabase(db);
    return true;
  }

  static getPropertiesDueThisWeek(): PropertyWithVisits[] {
    const properties = this.getActiveProperties();
    // Get current calendar week (Monday-Sunday) - not rolling 7 days
    const today = new Date();
    const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday = 1
    const thisWeekEnd = endOfWeek(today, { weekStartsOn: 1 });     // Sunday = 0

    return properties
      .map(property => ({
        ...property,
        visits: [],
        ...this.calculateNextVisit(property)
      }))
      .filter(property => {
        if (!property.next_visit_due) return false;
        const nextVisitDate = new Date(property.next_visit_due);
        return isWithinInterval(nextVisitDate, {
          start: thisWeekStart,
          end: thisWeekEnd
        });
      })
      .sort((a, b) => {
        if (!a.next_visit_due || !b.next_visit_due) return 0;
        return new Date(a.next_visit_due).getTime() - new Date(b.next_visit_due).getTime();
      });
  }

  static getDashboardStats(): DashboardStats {
    const db = readDatabase();
    const properties = db.properties.filter(p => !p.archived); // Only active properties for dashboard

    const propertiesDueThisWeek = this.getPropertiesDueThisWeek();
    const needsVisit = this.getPropertiesNeedingVisit();

    // Count unique clients
    const uniqueClients = new Set(properties.map(p => p.client_name)).size;

    return {
      total_properties: properties.length,
      listed_on_mls: properties.filter(p => p.listed_on_mls).length,
      occupied: properties.filter(p => p.occupied).length,
      needs_visit: needsVisit.length,
      clients: uniqueClients,
      vendors: 4, // Placeholder
      properties_due_this_week: propertiesDueThisWeek
    };
  }

  static getPropertiesNeedingVisit(): PropertyWithVisits[] {
    const properties = this.getActiveProperties();
    const today = new Date();

    return properties
      .map(property => ({
        ...property,
        visits: [],
        ...this.calculateNextVisit(property)
      }))
      .filter(property => {
        if (!property.next_visit_due) return true; // No visit date means needs visit
        const nextVisitDate = new Date(property.next_visit_due);
        return nextVisitDate <= today;
      });
  }

  private static calculateNextVisit(property: Property): { next_visit_due?: string; days_until_visit?: number } {
    if (!property.last_visit_date) {
      return {}; // No last visit date
    }

    const lastVisit = new Date(property.last_visit_date);
    const scheduledays = property.visit_schedule === 'weekly' ? 7 : 14;
    const nextVisitDue = addDays(lastVisit, scheduledays);
    const today = new Date();
    
    const diffTime = nextVisitDue.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return {
      next_visit_due: format(nextVisitDue, 'yyyy-MM-dd'),
      days_until_visit: diffDays
    };
  }

  static getDistinctAssetManagementPlatforms(): string[] {
    const db = readDatabase();
    const platforms = db.properties
      .map(p => p.asset_management_platform)
      .filter(platform => platform && platform.trim() !== '')
      .filter((platform, index, arr) => arr.indexOf(platform) === index) // unique values
      .sort();
    return platforms;
  }
}