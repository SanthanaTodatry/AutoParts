import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE_URL = 'http://localhost:8000/api';

function App() {
  const [activeTab, setActiveTab] = useState('single');
  const [vin, setVin] = useState('');
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [allVins, setAllVins] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [pastedVins, setPastedVins] = useState('');
  const [bulkInputMethod, setBulkInputMethod] = useState('file');
  const [batchProgress, setBatchProgress] = useState(null);

  useEffect(() => {
    fetchAllVins();
  }, []);

  const fetchAllVins = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/vins`);
      setAllVins(response.data);
    } catch (error) {
      console.error('Error fetching VINs:', error);
    }
  };

  const processSingleVin = async (e) => {
    e.preventDefault();
    if (!vin.trim()) return;

    setProcessing(true);
    setResults(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/process-vin`, {
        vin: vin.trim()
      });

      setResults(response.data);
      setVin('');
      await fetchAllVins();
    } catch (error) {
      console.error('Error processing VIN:', error);
      setResults({
        success: false,
        error: error.response?.data?.error || 'Failed to process VIN'
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleFileSelect = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const processBulkVins = async (e) => {
    e.preventDefault();
    
    if (bulkInputMethod === 'file' && !selectedFile) {
      alert('Please select a file');
      return;
    }
    
    if (bulkInputMethod === 'paste' && !pastedVins.trim()) {
      alert('Please paste some VINs');
      return;
    }

    setProcessing(true);
    setResults(null);
    setBatchProgress({ current: 0, total: 0, processed: [], errors: [] });

    try {
      let response;
      
      if (bulkInputMethod === 'file') {
        const formData = new FormData();
        formData.append('file', selectedFile);
        response = await axios.post(`${API_BASE_URL}/process-bulk`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        response = await axios.post(`${API_BASE_URL}/process-bulk`, {
          vins: pastedVins
        });
      }

      setResults(response.data);
      setSelectedFile(null);
      setPastedVins('');
      await fetchAllVins();
    } catch (error) {
      console.error('Error processing bulk VINs:', error);
      setResults({
        success: false,
        error: error.response?.data?.error || 'Failed to process VINs'
      });
    } finally {
      setProcessing(false);
      setBatchProgress(null);
    }
  };

  const exportResults = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/export-results`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `autoparts-results-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting results:', error);
    }
  };

  const formatVinData = (vins) => {
    const grouped = {};
    vins.forEach(row => {
      if (!grouped[row.vin]) {
        grouped[row.vin] = {
          vin: row.vin,
          market: row.market,
          year: row.year,
          make: row.make,
          model: row.model,
          frame: row.frame,
          vehicle_characteristics: row.vehicle_characteristics,
          search_results: row.search_results,
          created_at: row.created_at,
          parts: []
        };
      }
      if (row.part_code) {
        grouped[row.vin].parts.push({
          code: row.part_code,
          description: row.part_description,
          details: row.part_details
        });
      }
    });
    return Object.values(grouped);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🚗 Autoparts VIN Processor</h1>
        <p>Extract vehicle and parts information from VIN numbers</p>
      </header>

      <main className="App-main">
        <div className="tab-navigation">
          <button 
            className={activeTab === 'single' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('single')}
          >
            Single VIN
          </button>
          <button 
            className={activeTab === 'bulk' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('bulk')}
          >
            Bulk Process
          </button>
          <button 
            className={activeTab === 'results' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('results')}
          >
            View Results ({allVins.length > 0 ? formatVinData(allVins).length : 0})
          </button>
        </div>

        {/* Single VIN Tab */}
        {activeTab === 'single' && (
          <div className="tab-content">
            <h2>Process Single VIN</h2>
            <form onSubmit={processSingleVin} className="vin-form">
              <div className="form-group">
                <label htmlFor="vin">Enter VIN:</label>
                <input
                  type="text"
                  id="vin"
                  value={vin}
                  onChange={(e) => setVin(e.target.value)}
                  placeholder="e.g. 1HGBH41JXMN109186"
                  maxLength="17"
                  disabled={processing}
                />
              </div>
              <button type="submit" disabled={processing || !vin.trim()}>
                {processing ? 'Processing...' : 'Process VIN'}
              </button>
            </form>
          </div>
        )}

        {/* Bulk Process Tab */}
        {activeTab === 'bulk' && (
          <div className="tab-content">
            <h2>Bulk Process VINs</h2>
            
            {/* Input Method Selection */}
            <div className="input-method-selector">
              <label>
                <input
                  type="radio"
                  value="file"
                  checked={bulkInputMethod === 'file'}
                  onChange={(e) => setBulkInputMethod(e.target.value)}
                  disabled={processing}
                />
                Upload File (Excel, CSV, Text)
              </label>
              <label>
                <input
                  type="radio"
                  value="paste"
                  checked={bulkInputMethod === 'paste'}
                  onChange={(e) => setBulkInputMethod(e.target.value)}
                  disabled={processing}
                />
                Paste VINs
              </label>
            </div>

            <form onSubmit={processBulkVins} className="bulk-form">
              {bulkInputMethod === 'file' ? (
                <div className="form-group">
                  <label htmlFor="file">Select File:</label>
                  <input
                    type="file"
                    id="file"
                    accept=".xlsx,.xls,.csv,.txt"
                    onChange={handleFileSelect}
                    disabled={processing}
                  />
                  <small>Supported: Excel (.xlsx, .xls), CSV (.csv), Text (.txt)</small>
                  <small>File may contain headers - they will be auto-detected</small>
                </div>
              ) : (
                <div className="form-group">
                  <label htmlFor="pastedVins">Paste VINs (one per line):</label>
                  <textarea
                    id="pastedVins"
                    value={pastedVins}
                    onChange={(e) => setPastedVins(e.target.value)}
                    placeholder="1HGBH41JXMN109186&#10;2HGBH41JXMN109187&#10;3HGBH41JXMN109188"
                    rows="8"
                    disabled={processing}
                  />
                  <small>Enter one VIN per line</small>
                </div>
              )}

              <button type="submit" disabled={processing || (bulkInputMethod === 'file' ? !selectedFile : !pastedVins.trim())}>
                {processing ? 'Processing Batch...' : 'Start Batch Processing'}
              </button>
            </form>

            {/* Batch Progress */}
            {batchProgress && (
              <div className="batch-progress">
                <h3>Processing Progress</h3>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${batchProgress.total > 0 ? (batchProgress.current / batchProgress.total) * 100 : 0}%` }}
                  ></div>
                </div>
                <p>{batchProgress.current} of {batchProgress.total} VINs processed</p>
                
                {batchProgress.processed.length > 0 && (
                  <div className="progress-details">
                    <h4>Recently Processed:</h4>
                    <ul>
                      {batchProgress.processed.slice(-5).map((item, index) => (
                        <li key={index} className={item.success ? 'success' : 'error'}>
                          {item.vin}: {item.success ? 'Success' : item.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Results Tab */}
        {activeTab === 'results' && (
          <div className="tab-content">
            <div className="results-header">
              <h2>All Processed VINs</h2>
              {allVins.length > 0 && (
                <button onClick={exportResults} className="export-button">
                  📊 Export to CSV
                </button>
              )}
            </div>
            
            {allVins.length > 0 ? (
              <div className="results-table-container">
                <div className="results-summary">
                  <p>Total VINs: {formatVinData(allVins).length}</p>
                </div>
                
                <table className="results-table">
                  <thead>
                    <tr>
                      <th>VIN</th>
                      <th>Market</th>
                      <th>Year</th>
                      <th>Make</th>
                      <th>Model</th>
                      <th>Frame</th>
                      <th>Parts Found</th>
                      <th>Processed</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formatVinData(allVins).map((vinData, index) => (
                      <tr key={index}>
                        <td className="vin-cell">{vinData.vin}</td>
                        <td>{vinData.market}</td>
                        <td>{vinData.year}</td>
                        <td>{vinData.make}</td>
                        <td>{vinData.model}</td>
                        <td>{vinData.frame}</td>
                        <td>
                          <span className="parts-count">
                            {vinData.parts.length} parts
                          </span>
                        </td>
                        <td>{new Date(vinData.created_at).toLocaleDateString()}</td>
                        <td>
                          <button 
                            className="view-details-btn"
                            onClick={() => {
                              setResults({
                                success: true,
                                vin: vinData.vin,
                                data: vinData
                              });
                              setActiveTab('single');
                            }}
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="no-results">
                <p>No VINs processed yet.</p>
                <p>Use the "Single VIN" or "Bulk Process" tabs to get started.</p>
              </div>
            )}
          </div>
        )}

        {/* Processing Results Display */}
        {results && (
          <div className={`results-display ${results.success ? 'success' : 'error'}`}>
            <h3>{results.success ? '✅ Success!' : '❌ Error'}</h3>
            
            {results.success ? (
              <div className="success-content">
                {results.data ? (
                  <div className="vin-details">
                    <h4>VIN: {results.vin}</h4>
                    
                    {/* Vehicle Information */}
                    <div className="vehicle-info">
                      <h5>Vehicle Information:</h5>
                      <div className="info-grid">
                        <div><strong>Market:</strong> {results.data.market}</div>
                        <div><strong>Year:</strong> {results.data.year}</div>
                        <div><strong>Make:</strong> {results.data.make}</div>
                        <div><strong>Model:</strong> {results.data.model}</div>
                        <div><strong>Frame:</strong> {results.data.frame}</div>
                      </div>
                    </div>

                    {/* Parts Information */}
                    {results.data.parts && results.data.parts.length > 0 && (
                      <div className="parts-info">
                        <h5>Brake Parts Found:</h5>
                        <div className="parts-list">
                          {results.data.parts.map((part, index) => (
                            <div key={index} className="part-item">
                              <strong>Part {part.code}:</strong> {part.description}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="batch-results">
                    <p>{results.message}</p>
                    {results.summary && (
                      <div className="batch-summary">
                        <p>✅ Successful: {results.summary.successful}</p>
                        <p>❌ Failed: {results.summary.failed}</p>
                        <p>📊 Total: {results.summary.total}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="error-content">
                <p>{results.error}</p>
              </div>
            )}
            
            <button 
              className="close-results" 
              onClick={() => setResults(null)}
            >
              Close
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;