// backend/app.js
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, '../uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage: storage });

// Initialize SQLite database
const db = new sqlite3.Database('../database/autoparts.db');

// Create tables if they don't exist
db.serialize(() => {
  // VIN Details table
  db.run(`
    CREATE TABLE IF NOT EXISTS vin_details (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vin TEXT UNIQUE NOT NULL,
      market TEXT,
      year TEXT,
      make TEXT,
      model TEXT,
      frame TEXT,
      vehicle_characteristics TEXT,
      search_results TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Parts Details table
  db.run(`
    CREATE TABLE IF NOT EXISTS parts_details (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vin TEXT NOT NULL,
      part_code TEXT,
      part_description TEXT,
      part_details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vin) REFERENCES vin_details (vin)
    )
  `);
});

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Autoparts API is running' });
});

// Process single VIN
app.post('/api/process-vin', async (req, res) => {
  try {
    const { vin } = req.body;
    
    if (!vin) {
      return res.status(400).json({ error: 'VIN is required' });
    }

    console.log(`Processing VIN: ${vin}`);

    // Trigger n8n workflow
    const n8nResponse = await axios.post('http://localhost:5678/webhook/vin-lookup', {
      vin: vin
    });

    const results = n8nResponse.data;

    // Store VIN details in database
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT OR REPLACE INTO vin_details 
        (vin, market, year, make, model, frame, vehicle_characteristics, search_results)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        vin,
        results.market || '',
        results.year || '',
        results.make || '',
        results.model || '',
        results.frame || '',
        results.vehicle_characteristics || '',
        results.search_results || ''
      ], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });

    // Store parts details
    if (results.parts && Array.isArray(results.parts)) {
      for (const part of results.parts) {
        await new Promise((resolve, reject) => {
          db.run(`
            INSERT INTO parts_details (vin, part_code, part_description, part_details)
            VALUES (?, ?, ?, ?)
          `, [vin, part.code, part.description, JSON.stringify(part.details)], function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          });
        });
      }
    }

    res.json({
      success: true,
      vin: vin,
      data: results
    });

  } catch (error) {
    console.error('Error processing VIN:', error.message);
    res.status(500).json({ 
      error: 'Failed to process VIN', 
      details: error.message 
    });
  }
});

// Process spreadsheet with multiple VINs
app.post('/api/process-spreadsheet', upload.single('spreadsheet'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Spreadsheet file is required' });
    }

    console.log(`Processing spreadsheet: ${req.file.filename}`);

    // TODO: Parse spreadsheet and extract VINs
    // For now, return success message
    res.json({
      success: true,
      message: 'Spreadsheet processing will be implemented next',
      filename: req.file.filename
    });

  } catch (error) {
    console.error('Error processing spreadsheet:', error.message);
    res.status(500).json({ 
      error: 'Failed to process spreadsheet', 
      details: error.message 
    });
  }
});

// Get all processed VINs
app.get('/api/vins', (req, res) => {
  db.all(`
    SELECT v.*, p.part_code, p.part_description, p.part_details
    FROM vin_details v
    LEFT JOIN parts_details p ON v.vin = p.vin
    ORDER BY v.created_at DESC
  `, (err, rows) => {
    if (err) {
      res.status(500).json({ error: 'Database error' });
    } else {
      res.json(rows);
    }
  });
});

// Get specific VIN details
app.get('/api/vins/:vin', (req, res) => {
  const { vin } = req.params;
  
  db.get(`
    SELECT * FROM vin_details WHERE vin = ?
  `, [vin], (err, vinRow) => {
    if (err) {
      res.status(500).json({ error: 'Database error' });
    } else if (!vinRow) {
      res.status(404).json({ error: 'VIN not found' });
    } else {
      // Get parts for this VIN
      db.all(`
        SELECT * FROM parts_details WHERE vin = ?
      `, [vin], (err, partsRows) => {
        if (err) {
          res.status(500).json({ error: 'Database error' });
        } else {
          res.json({
            ...vinRow,
            parts: partsRows
          });
        }
      });
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Autoparts API server running on http://localhost:${PORT}`);
  console.log(`📊 Database: SQLite (../database/autoparts.db)`);
  console.log(`📁 Uploads: ../uploads/`);
  console.log(`🔗 n8n webhook: http://localhost:5678/webhook/vin-lookup`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed.');
    }
    process.exit(0);
  });
});