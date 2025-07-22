const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const csv = require('csv-parser');
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
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage: storage });

// Initialize SQLite database
const dbPath = path.join(__dirname, '../database/autoparts.db');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

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

  // Batch Jobs table for tracking bulk processing
  db.run(`
    CREATE TABLE IF NOT EXISTS batch_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT UNIQUE NOT NULL,
      total_vins INTEGER,
      processed_vins INTEGER,
      successful_vins INTEGER,
      failed_vins INTEGER,
      status TEXT DEFAULT 'running',
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME
    )
  `);
});

// Helper Functions

// Validate VIN format (17 characters, alphanumeric, no I, O, Q)
function isValidVIN(vin) {
  if (!vin || typeof vin !== 'string') return false;
  const cleanVin = vin.trim().toUpperCase();
  if (cleanVin.length !== 17) return false;
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(cleanVin)) return false;
  return true;
}

// Extract VINs from text content
function extractVINsFromText(text) {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line);
  const vins = [];
  
  // Check if first line might be a header
  let startIndex = 0;
  if (lines.length > 0) {
    const firstLine = lines[0].toLowerCase();
    if (firstLine.includes('vin') || firstLine.includes('vehicle') || firstLine.includes('identification')) {
      startIndex = 1;
    }
  }
  
  // Extract VINs from remaining lines
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    // Split by common delimiters and find VIN-like strings
    const parts = line.split(/[,\t;|]/).map(part => part.trim());
    
    for (const part of parts) {
      if (isValidVIN(part)) {
        vins.push(part.toUpperCase());
      }
    }
  }
  
  return [...new Set(vins)]; // Remove duplicates
}

// Parse Excel file and extract VINs
function parseExcelFile(filePath) {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    const vins = [];
    let startRow = 0;
    
    // Check if first row is header
    if (data.length > 0 && data[0].some(cell => 
      typeof cell === 'string' && cell.toLowerCase().includes('vin')
    )) {
      startRow = 1;
    }
    
    // Extract VINs from all rows
    for (let i = startRow; i < data.length; i++) {
      const row = data[i];
      if (row && Array.isArray(row)) {
        for (const cell of row) {
          if (cell && isValidVIN(String(cell))) {
            vins.push(String(cell).toUpperCase());
          }
        }
      }
    }
    
    return [...new Set(vins)];
  } catch (error) {
    console.error('Error parsing Excel file:', error);
    throw new Error('Failed to parse Excel file');
  }
}

// Parse CSV file and extract VINs
function parseCSVFile(filePath) {
  return new Promise((resolve, reject) => {
    const vins = [];
    let isFirstRow = true;
    let hasHeader = false;
    
    fs.createReadStream(filePath)
      .pipe(csv({ headers: false }))
      .on('data', (row) => {
        if (isFirstRow) {
          // Check if first row is header
          const rowValues = Object.values(row);
          if (rowValues.some(cell => 
            typeof cell === 'string' && cell.toLowerCase().includes('vin')
          )) {
            hasHeader = true;
            isFirstRow = false;
            return;
          }
          isFirstRow = false;
        }
        
        // Extract VINs from row
        const rowValues = Object.values(row);
        for (const value of rowValues) {
          if (value && isValidVIN(String(value))) {
            vins.push(String(value).toUpperCase());
          }
        }
      })
      .on('end', () => {
        resolve([...new Set(vins)]);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

// Process single VIN through n8n workflow
async function processSingleVINWorkflow(vin) {
  try {
    console.log(`Processing VIN: ${vin}`);
    
    const n8nResponse = await axios.post('http://localhost:5678/webhook/vin-lookup', {
      vin: vin
    }, {
      timeout: 60000 // 60 second timeout
    });

    return {
      success: true,
      vin: vin,
      data: n8nResponse.data
    };
  } catch (error) {
    console.error(`Error processing VIN ${vin}:`, error.message);
    return {
      success: false,
      vin: vin,
      error: error.response?.data?.error || error.message
    };
  }
}

// Store VIN results in database
async function storeVINResults(vin, results) {
  if (!results.success) return;
  
  try {
    const data = results.data;
    
    // Store VIN details
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT OR REPLACE INTO vin_details 
        (vin, market, year, make, model, frame, vehicle_characteristics, search_results)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        vin,
        data.market || '',
        data.year || '',
        data.make || '',
        data.model || '',
        data.frame || '',
        data.vehicle_characteristics || '',
        data.search_results || ''
      ], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });

    // Store parts details
    if (data.parts && Array.isArray(data.parts)) {
      for (const part of data.parts) {
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
  } catch (error) {
    console.error(`Error storing results for VIN ${vin}:`, error);
  }
}

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

    if (!isValidVIN(vin)) {
      return res.status(400).json({ error: 'Invalid VIN format' });
    }

    const cleanVin = vin.trim().toUpperCase();
    const results = await processSingleVINWorkflow(cleanVin);
    
    if (results.success) {
      await storeVINResults(cleanVin, results);
    }

    res.json(results);

  } catch (error) {
    console.error('Error processing VIN:', error.message);
    res.status(500).json({ 
      error: 'Failed to process VIN', 
      details: error.message 
    });
  }
});

// Process bulk VINs
app.post('/api/process-bulk', upload.single('file'), async (req, res) => {
  try {
    let vins = [];
    
    if (req.file) {
      // Process uploaded file
      const filePath = req.file.path;
      const fileExt = path.extname(req.file.originalname).toLowerCase();
      
      if (fileExt === '.xlsx' || fileExt === '.xls') {
        vins = parseExcelFile(filePath);
      } else if (fileExt === '.csv') {
        vins = await parseCSVFile(filePath);
      } else if (fileExt === '.txt') {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        vins = extractVINsFromText(fileContent);
      } else {
        // Try to read as text file anyway
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        vins = extractVINsFromText(fileContent);
      }
      
      // Clean up uploaded file
      fs.unlinkSync(filePath);
    } else if (req.body.vins) {
      // Process pasted VINs
      vins = extractVINsFromText(req.body.vins);
    } else {
      return res.status(400).json({ error: 'No VINs provided' });
    }

    if (vins.length === 0) {
      return res.status(400).json({ error: 'No valid VINs found' });
    }

    console.log(`Starting batch processing of ${vins.length} VINs`);

    const results = {
      total: vins.length,
      successful: 0,
      failed: 0,
      processed: []
    };

    // Process VINs sequentially with delay to avoid rate limiting
    for (let i = 0; i < vins.length; i++) {
      const vin = vins[i];
      
      try {
        const result = await processSingleVINWorkflow(vin);
        
        if (result.success) {
          await storeVINResults(vin, result);
          results.successful++;
        } else {
          results.failed++;
        }
        
        results.processed.push({
          vin: vin,
          success: result.success,
          error: result.error || null
        });

        console.log(`Processed ${i + 1}/${vins.length}: ${vin} - ${result.success ? 'Success' : 'Failed'}`);
        
        // Add delay between requests (2 seconds) to avoid overwhelming the server
        if (i < vins.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error(`Error processing VIN ${vin}:`, error);
        results.failed++;
        results.processed.push({
          vin: vin,
          success: false,
          error: error.message
        });
      }
    }

    console.log(`Batch processing completed: ${results.successful} successful, ${results.failed} failed`);

    res.json({
      success: true,
      message: `Batch processing completed. ${results.successful} VINs processed successfully, ${results.failed} failed.`,
      summary: {
        total: results.total,
        successful: results.successful,
        failed: results.failed
      },
      details: results.processed
    });

  } catch (error) {
    console.error('Error processing bulk VINs:', error.message);
    res.status(500).json({ 
      error: 'Failed to process bulk VINs', 
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
      console.error('Database error:', err);
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
  `, [vin.toUpperCase()], (err, vinRow) => {
    if (err) {
      res.status(500).json({ error: 'Database error' });
    } else if (!vinRow) {
      res.status(404).json({ error: 'VIN not found' });
    } else {
      // Get parts for this VIN
      db.all(`
        SELECT * FROM parts_details WHERE vin = ?
      `, [vin.toUpperCase()], (err, partsRows) => {
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

// Export results to CSV
app.get('/api/export-results', (req, res) => {
  db.all(`
    SELECT 
      v.vin,
      v.market,
      v.year,
      v.make,
      v.model,
      v.frame,
      v.vehicle_characteristics,
      v.created_at,
      GROUP_CONCAT(p.part_code || ': ' || p.part_description, '; ') as parts
    FROM vin_details v
    LEFT JOIN parts_details p ON v.vin = p.vin
    GROUP BY v.vin
    ORDER BY v.created_at DESC
  `, (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      res.status(500).json({ error: 'Database error' });
    } else {
      // Generate CSV content
      const headers = ['VIN', 'Market', 'Year', 'Make', 'Model', 'Frame', 'Vehicle Characteristics', 'Parts Found', 'Processed Date'];
      const csvData = [headers];
      
      rows.forEach(row => {
        csvData.push([
          row.vin,
          row.market || '',
          row.year || '',
          row.make || '',
          row.model || '',
          row.frame || '',
          row.vehicle_characteristics || '',
          row.parts || '',
          new Date(row.created_at).toLocaleDateString()
        ]);
      });
      
      // Convert to CSV string
      const csvString = csvData.map(row => 
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="autoparts-results-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvString);
    }
  });
});

// Delete VIN records
app.delete('/api/vins/:vin', (req, res) => {
  const { vin } = req.params;
  
  db.serialize(() => {
    db.run('DELETE FROM parts_details WHERE vin = ?', [vin.toUpperCase()]);
    db.run('DELETE FROM vin_details WHERE vin = ?', [vin.toUpperCase()], function(err) {
      if (err) {
        res.status(500).json({ error: 'Database error' });
      } else if (this.changes === 0) {
        res.status(404).json({ error: 'VIN not found' });
      } else {
        res.json({ success: true, message: 'VIN deleted successfully' });
      }
    });
  });
});

// Clear all data
app.delete('/api/clear-all', (req, res) => {
  db.serialize(() => {
    db.run('DELETE FROM parts_details', (err) => {
      if (err) {
        console.error('Error clearing parts_details:', err);
        return res.status(500).json({ error: 'Database error' });
      }
    });
    
    db.run('DELETE FROM vin_details', (err) => {
      if (err) {
        console.error('Error clearing vin_details:', err);
        return res.status(500).json({ error: 'Database error' });
      }
    });
    
    db.run('DELETE FROM batch_jobs', function(err) {
      if (err) {
        console.error('Error clearing batch_jobs:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      res.json({ success: true, message: 'All data cleared successfully' });
    });
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Autoparts API server running on http://localhost:${PORT}`);
  console.log(`📊 Database: SQLite (${dbPath})`);
  console.log(`📁 Uploads: ${path.join(__dirname, '../uploads')}`);
  console.log(`🔗 n8n webhook: http://localhost:5678/webhook/vin-lookup`);
  console.log(`\n✅ Enhanced Features:`);
  console.log(`   • Batch processing with rate limiting`);
  console.log(`   • File upload support (Excel, CSV, Text)`);
  console.log(`   • Header auto-detection`);
  console.log(`   • VIN validation`);
  console.log(`   • CSV export functionality`);
  console.log(`   • Progress tracking`);
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