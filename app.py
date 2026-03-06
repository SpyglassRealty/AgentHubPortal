#!/usr/bin/env python3
"""
Austin Neighborhoods Map Viewer
Simple Flask application to display neighborhood boundaries on a map
"""
import json
import sqlite3
from flask import Flask, render_template, jsonify

app = Flask(__name__)

def get_db_connection():
    """Get database connection"""
    conn = sqlite3.connect('austin_neighborhoods.db')
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/')
def index():
    """Main page with map"""
    return render_template('index.html')

@app.route('/api/neighborhoods')
def api_neighborhoods():
    """API endpoint to get all neighborhoods as GeoJSON"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
    SELECT 
        planning_area_name, combined_npa, neighborhood_planning_status,
        neighborhood_number, gis_id, objectid, date_zoning_approved,
        neighborhood_sub_district, ordinance_number, infill_option_codes,
        subdistrict_number, combined, shape_area, shape_length, geometry_json
    FROM neighborhoods
    """)
    
    rows = cursor.fetchall()
    conn.close()
    
    # Build GeoJSON FeatureCollection
    features = []
    for row in rows:
        geometry = json.loads(row['geometry_json'])
        
        properties = {
            'planning_area_name': row['planning_area_name'],
            'combined_npa': row['combined_npa'],
            'neighborhood_planning_status': row['neighborhood_planning_status'],
            'neighborhood_number': row['neighborhood_number'],
            'gis_id': row['gis_id'],
            'objectid': row['objectid'],
            'date_zoning_approved': row['date_zoning_approved'],
            'neighborhood_sub_district': row['neighborhood_sub_district'],
            'ordinance_number': row['ordinance_number'],
            'infill_option_codes': row['infill_option_codes'],
            'subdistrict_number': row['subdistrict_number'],
            'combined': row['combined'],
            'shape_area': row['shape_area'],
            'shape_length': row['shape_length']
        }
        
        feature = {
            'type': 'Feature',
            'geometry': geometry,
            'properties': properties
        }
        features.append(feature)
    
    geojson = {
        'type': 'FeatureCollection',
        'features': features
    }
    
    return jsonify(geojson)

@app.route('/api/neighborhoods/<name>')
def api_neighborhood_detail(name):
    """API endpoint to get specific neighborhood details"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
    SELECT * FROM neighborhoods 
    WHERE planning_area_name = ?
    """, (name,))
    
    row = cursor.fetchone()
    conn.close()
    
    if row:
        geometry = json.loads(row['geometry_json'])
        
        feature = {
            'type': 'Feature',
            'geometry': geometry,
            'properties': {
                'planning_area_name': row['planning_area_name'],
                'combined_npa': row['combined_npa'],
                'neighborhood_planning_status': row['neighborhood_planning_status'],
                'neighborhood_number': row['neighborhood_number'],
                'gis_id': row['gis_id'],
                'objectid': row['objectid'],
                'date_zoning_approved': row['date_zoning_approved'],
                'neighborhood_sub_district': row['neighborhood_sub_district'],
                'ordinance_number': row['ordinance_number'],
                'infill_option_codes': row['infill_option_codes'],
                'subdistrict_number': row['subdistrict_number'],
                'combined': row['combined'],
                'shape_area': row['shape_area'],
                'shape_length': row['shape_length']
            }
        }
        return jsonify(feature)
    else:
        return jsonify({'error': 'Neighborhood not found'}), 404

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=9000)