# 🚀 Autoparts VIN Processor - Startup Guide

## Quick Setup

Follow these steps to get your application running:

### 1. Run the Setup Script
```bash
# Copy and paste the setup script commands from the first artifact
# This creates the project structure and installs dependencies
```

### 2. Start n8n (Terminal 1)
```bash
n8n start
```
- n8n will start at: `http://localhost:5678`
- Import the workflow JSON from the artifacts
- Activate the workflow

### 3. Start Backend API (Terminal 2)
```bash
cd autoparts-app/backend
npm run dev
```
- Backend API will start at: `http://localhost:8000`
- Database will be created automatically

### 4. Start Frontend (Terminal 3)
```bash
cd autoparts-app/frontend
npm start
```
- Frontend will start at: `http://localhost:3000`
- Browser should open automatically

## Application Structure

```
autoparts-app/
├── backend/           # Node.js API server
│   ├── app.js        # Main server file
│   └── package.json  # Dependencies
├── frontend/         # React web interface
│   ├── src/App.js   # Main React component
│   └── src/App.css  # Styles
├── database/         # SQLite database files
├── uploads/          # Uploaded spreadsheets
└── exports/          # Exported results
```

## Setting Up n8n Workflow

1. **Open n8n**: Go to `http://localhost:5678`
2. **Create New Workflow**: Click "New Workflow"
3. **Import JSON**: 
   - Click the menu (3 dots) → "Import from JSON"
   - Copy the workflow JSON from the artifacts
   - Paste and import
4. **Activate Webhook**: 
   - Click the "Webhook Trigger" node
   - Copy the webhook URL (should be similar to `http://localhost:5678/webhook/process-vin`)
   - Make sure it matches the URL in backend/app.js
5. **Save & Activate**: Save the workflow and toggle it to "Active"

## Testing the Application

### Test Single VIN Processing:
1. Open `http://localhost:3000`
2. Click "Single VIN" tab
3. Enter a test VIN (e.g., `1HGBH41JXMN109186`)
4. Click "Process VIN"

### Test API Directly:
```bash
curl -X POST http://localhost:8000/api/process-vin \
  -H "Content-Type: application/json" \
  -d '{"vin":"1HGBH41JXMN109186"}'
```

### Check Database:
```bash
# View the SQLite database
cd autoparts-app/database
sqlite3 autoparts.db
.tables
SELECT * FROM vin_details;
```

## Troubleshooting

### Common Issues:

**n8n Webhook Not Working:**
- Check if n8n workflow is activated
- Verify webhook URL matches in backend
- Check n8n execution logs

**CORS Errors:**
- Ensure backend is running on port 8000
- Check CORS configuration in app.js

**Database Errors:**
- Check if database directory exists
- Verify SQLite3 is installed properly

**ToyoDIY Scraping Issues:**
- Website structure may have changed
- Check network connectivity
- Review extraction patterns in n8n workflow

### Logs to Check:
- Backend console for API requests
- n8n execution logs for workflow errors
- Browser console for frontend issues

## Next Steps for Development

1. **Test with Real ToyoDIY Data**: Use actual VINs and adjust extraction patterns
2. **Add Spreadsheet Processing**: Implement CSV/Excel parsing
3. **Improve Error Handling**: Add retry mechanisms and better error messages
4. **Add Data Export**: CSV/Excel export functionality
5. **Optimize Performance**: Add caching and rate limiting

## Development URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000/api
- **n8n Interface**: http://localhost:5678
- **API Health Check**: http://localhost:8000/api/health

Your development environment is now ready! 🎉