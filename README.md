# AutoParts# Method Relationship Diagram: Frontend ↔ Backend

## 🖥️ Frontend (App.js) → 🔧 Backend (app.js)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (App.js)                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  📱 USER INTERACTIONS                                                  │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐     │
│  │ processSingleVin│    │ processBulkVins │    │ fetchAllVins    │     │
│  │     (form)      │    │     (form)      │    │   (useEffect)   │     │
│  └─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘     │
│            │                      │                      │             │
│            │                      │                      │             │
│  📡 API CALLS (axios)             │                      │             │
│            │                      │                      │             │
│            ▼                      ▼                      ▼             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐     │
│  │POST /process-vin│    │POST /process-   │    │GET /vins        │     │
│  │                 │    │     bulk        │    │                 │     │
│  └─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘     │
│            │                      │                      │             │
│                                                                         │
│  🎨 UI HELPERS                                                          │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐     │
│  │ renderVINResults│    │ formatVinData   │    │ exportResults   │     │
│  │   (display)     │    │   (transform)   │    │  (download)     │     │
│  └─────────────────┘    └─────────────────┘    └─────────┬───────┘     │
│                                                           │             │
│                                                           ▼             │
│                                                 ┌─────────────────┐     │
│                                                 │GET /export-     │     │
│                                                 │    results      │     │
│                                                 └─────────────────┘     │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            BACKEND (app.js)                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  🌐 API ENDPOINTS                                                       │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐     │
│  │POST /process-vin│    │POST /process-   │    │GET /vins        │     │
│  │                 │    │     bulk        │    │                 │     │
│  └─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘     │
│            │                      │                      │             │
│            ▼                      ▼                      ▼             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐     │
│  │processSingleVIN │    │ File parsing +  │    │ Database query  │     │
│  │   Workflow      │    │ Batch processing│    │ (db.all)        │     │
│  └─────────┬───────┘    └─────────┬───────┘    └─────────────────┘     │
│            │                      │                                    │
│            ▼                      │                                    │
│  ┌─────────────────┐              │                                    │
│  │   storeVIN      │◄─────────────┘                                    │
│  │   Results       │                                                   │
│  └─────────┬───────┘                                                   │
│            │                                                           │
│            ▼                                                           │
│  💾 DATABASE OPERATIONS                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐     │
│  │INSERT vin_      │    │INSERT parts_    │    │SELECT queries   │     │
│  │     details     │    │     details     │    │                 │     │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘     │
│                                                                         │
│  🔧 HELPER FUNCTIONS                                                    │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐     │
│  │   isValidVIN    │    │extractVINsFrom  │    │parseExcelFile   │     │
│  │   (validate)    │    │     Text        │    │parseCSVFile     │     │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘     │
│                                                                         │
│  🌊 N8N WORKFLOW                                                        │
│  ┌─────────────────┐                                                   │
│  │processSingleVIN │────────────────────────────┐                      │
│  │   Workflow      │                            │                      │
│  └─────────────────┘                            ▼                      │
│                                       ┌─────────────────┐               │
│                                       │POST webhook to  │               │
│                                       │n8n: /vin-lookup │               │
│                                       └─────────────────┘               │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              N8N WORKFLOW                              │
├─────────────────────────────────────────────────────────────────────────┤
│  🔄 SCRAPING PROCESS                                                    │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐     │
│  │Establish Session│    │Query VIN        │    │Extract Vehicle  │     │
│  │   (toyodiy.com) │────│(toyodiy.com)    │────│   Info          │     │
│  └─────────────────┘    └─────────────────┘    └─────────┬───────┘     │
│                                                           │             │
│                                                           ▼             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐     │
│  │Navigate to Model│    │Find Powertrain  │    │Extract Brake    │     │
│  │     Page        │────│   Chassis       │────│   Parts         │     │
│  └─────────────────┘    └─────────────────┘    └─────────┬───────┘     │
│                                                           │             │
│                                                           ▼             │
│                                                 ┌─────────────────┐     │
│                                                 │Return JSON:     │     │
│                                                 │{Vehicle: {...}, │     │
│                                                 │ BrakeParts:[...]}│     │
│                                                 └─────────────────┘     │
└─────────────────────────────────────────────────────────────────────────┘

## 📊 Call Flow Summary:

### Single VIN Processing:
1. **User** clicks "Process VIN" → `processSingleVin()`
2. **Frontend** → `POST /api/process-vin` → **Backend**
3. **Backend** → `processSingleVINWorkflow()` → **N8N Workflow**
4. **N8N** scrapes ToyoDIY → Returns JSON data
5. **Backend** → `storeVINResults()` → **Database**
6. **Backend** returns results → **Frontend** → `renderVINResults()`

### Bulk Processing:
1. **User** uploads file/pastes VINs → `processBulkVins()`
2. **Frontend** → `POST /api/process-bulk` → **Backend**
3. **Backend** → File parsing (`parseExcelFile/parseCSVFile/extractVINsFromText`)
4. **Backend** → Loop: `processSingleVINWorkflow()` for each VIN
5. **Backend** → `storeVINResults()` for each successful VIN
6. **Backend** returns batch summary → **Frontend**

### Data Display:
1. **Component Mount** → `useEffect()` → `fetchAllVins()`
2. **Frontend** → `GET /api/vins` → **Backend** → **Database**
3. **Backend** returns all data → **Frontend** → `formatVinData()` → Display

## 🔄 Key Relationships:

- **Frontend** only makes HTTP calls, never directly accesses database or N8N
- **Backend** orchestrates everything: file parsing, N8N calls, database operations
- **N8N Workflow** is stateless - just receives VIN, returns scraped data
- **Database** operations are centralized in backend helper functions
- **Rate limiting** (2-second delays) happens in backend bulk processing loop