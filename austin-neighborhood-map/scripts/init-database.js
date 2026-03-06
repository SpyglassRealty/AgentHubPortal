const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Create database
const dbPath = path.join(__dirname, '../data/neighborhoods.db');
const db = new sqlite3.Database(dbPath);

// Create tables
const createTables = `
  CREATE TABLE IF NOT EXISTS neighborhoods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    source TEXT NOT NULL,
    description TEXT,
    boundaries_description TEXT,
    polygon_geojson TEXT,
    mls_areas TEXT,
    zip_codes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS polygon_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    neighborhood_id INTEGER,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    point_order INTEGER NOT NULL,
    source TEXT,
    FOREIGN KEY (neighborhood_id) REFERENCES neighborhoods (id)
  );
`;

db.exec(createTables, (err) => {
  if (err) {
    console.error('Error creating tables:', err);
    return;
  }
  
  // Load initial data
  const rawData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/neighborhoods-raw.json'), 'utf8'));
  
  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO neighborhoods 
    (name, source, description, boundaries_description, mls_areas, zip_codes) 
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  rawData.forEach(neighborhood => {
    insertStmt.run(
      neighborhood.name,
      neighborhood.source,
      neighborhood.description,
      neighborhood.boundaries,
      JSON.stringify(neighborhood.mlsAreas),
      JSON.stringify(neighborhood.zipCodes)
    );
  });
  
  insertStmt.finalize();
  console.log(`Initialized database with ${rawData.length} neighborhoods`);
  db.close();
});