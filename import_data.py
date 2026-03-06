#!/usr/bin/env python3
"""
Import Austin neighborhoods GeoJSON data into SQLite database
"""
import json
import sqlite3
from datetime import datetime

def create_database():
    """Create SQLite database and table for neighborhoods"""
    conn = sqlite3.connect('austin_neighborhoods.db')
    cursor = conn.cursor()
    
    # Create neighborhoods table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS neighborhoods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        planning_area_name TEXT NOT NULL,
        combined_npa TEXT,
        neighborhood_planning_status TEXT,
        neighborhood_number REAL,
        gis_id REAL,
        objectid INTEGER,
        date_zoning_approved TEXT,
        neighborhood_sub_district TEXT,
        ordinance_number TEXT,
        infill_option_codes TEXT,
        subdistrict_number REAL,
        combined TEXT,
        internet_address TEXT,
        shape_area REAL,
        shape_length REAL,
        geometry_json TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    
    # Create indexes
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_planning_area_name ON neighborhoods(planning_area_name);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_combined_npa ON neighborhoods(combined_npa);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_neighborhood_status ON neighborhoods(neighborhood_planning_status);")
    
    conn.commit()
    return conn

def import_geojson_data(conn, geojson_file):
    """Import GeoJSON data into the database"""
    cursor = conn.cursor()
    
    with open(geojson_file, 'r') as f:
        data = json.load(f)
    
    for feature in data['features']:
        properties = feature['properties']
        geometry = feature['geometry']
        
        # Handle date parsing
        date_approved = None
        if properties.get('date_zoning_approved'):
            try:
                # Parse ISO date format
                date_str = properties['date_zoning_approved']
                if 'T' in date_str:
                    date_approved = date_str.split('T')[0]
                else:
                    date_approved = date_str
            except:
                date_approved = None
        
        cursor.execute("""
        INSERT INTO neighborhoods (
            planning_area_name, combined_npa, neighborhood_planning_status,
            neighborhood_number, gis_id, objectid, date_zoning_approved,
            neighborhood_sub_district, ordinance_number, infill_option_codes,
            subdistrict_number, combined, internet_address,
            shape_area, shape_length, geometry_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            properties.get('planning_area_name'),
            properties.get('combined_npa'),
            properties.get('neighborhood_planning_status'),
            properties.get('neighborhood_number'),
            properties.get('gis_id'),
            properties.get('objectid'),
            date_approved,
            properties.get('neighborhood_sub_district'),
            properties.get('ordinance_number'),
            properties.get('infill_option_codes'),
            properties.get('subdistrict_number'),
            properties.get('combined'),
            properties.get('internet_address'),
            properties.get('shape__area'),
            properties.get('shape__length'),
            json.dumps(geometry)
        ))
    
    conn.commit()
    
    # Print summary
    cursor.execute("SELECT COUNT(*) FROM neighborhoods")
    count = cursor.fetchone()[0]
    print(f"Successfully imported {count} neighborhoods into the database")
    
    # Show sample data
    cursor.execute("SELECT planning_area_name, neighborhood_planning_status FROM neighborhoods LIMIT 5")
    print("\nSample neighborhoods:")
    for row in cursor.fetchall():
        print(f"- {row[0]}: {row[1]}")

if __name__ == "__main__":
    print("Creating database and importing Austin neighborhoods data...")
    conn = create_database()
    import_geojson_data(conn, 'austin_neighborhoods.geojson')
    conn.close()
    print("Import complete!")