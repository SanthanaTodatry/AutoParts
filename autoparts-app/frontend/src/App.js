// frontend/src/App.js
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

  // Load all processed VINs on component mount
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
      console.log('VIN processed:', response.data);
      
      // Clear the input field after processing
      setVin('');
      await fetchAllVins(); // Refresh the list
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

  const processSpreadsheet = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    setProcessing(true);
    const formData = new FormData();
    formData.append('spreadsheet', selectedFile);

    try {
      const response = await axios.post(`${API_BASE_URL}/process-spreadsheet`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setResults(response.data);
      setSelectedFile(null);
      await fetchAllVins();
    } catch (error) {
      console.error('Error processing spreadsheet:', error);
      setResults({
        success: false,
        error: error.response?.data?.error || 'Failed to process spreadsheet'
      });
    } finally {
      setProcessing(false);
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
        {/* Tab Navigation */}
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
            Bulk Upload
          </button>
          <button 
            className={activeTab === 'results' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('results')}
          >
            View Results
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

        {/* Bulk Upload Tab */}
        {activeTab === 'bulk' && (
          <div className="tab-content">
            <h2>Bulk Process from Spreadsheet</h2>
            <form onSubmit={processSpreadsheet} className="upload-form">
              <div className="form-group">
                <label htmlFor="spreadsheet">Select Spreadsheet:</label>
                <input
                  type="file"
                  id="spreadsheet"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  disabled={processing}
                />
                <small>Supported formats: .xlsx, .xls, .csv</small>
              </div>
              <button type="submit" disabled={processing || !selectedFile}>
                {processing ? 'Processing...' : 'Process Spreadsheet'}
              </button>
            </form>
          </div>
        )}

        {/* Results Tab */}
        {activeTab === 'results' && (
          <div className="tab-content">
            <h2>All Processed VINs</h2>
            {allVins.length > 0 ? (
              <div className="results-table-container">
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
                    </tr>
                  </thead>
                  <tbody>
                    {formatVinData(allVins).map((vinData, index) => (
                      <tr key={index}>
                        <td>{vinData.vin}</td>
                        <td>{vinData.market}</td>
                        <td>{vinData.year}</td>
                        <td>{vinData.make}</td>
                        <td>{vinData.model}</td>
                        <td>{vinData.frame}</td>
                        <td>{vinData.parts.length}</td>
                        <td>{new Date(vinData.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No VINs processed yet.</p>
            )}
          </div>
        )}

        {/* Processing Results */}
        
        {results && (
          <div className={`results ${results.success ? 'success' : 'error'}`}>
            <h3>{results.success ? 'Success!' : 'Error'}</h3>
            {results.success ? (
              <div>
                <p>VIN <strong>{results.vin}</strong> processed successfully!</p>
                {results.data && (

                  <div className="result-details">
                    <h3>Vehicle Information</h3>
                    <table className="vehicle-table">
                      <thead>
                        <tr>
                          <th>Market</th>
                          <th>Year</th>
                          <th>Make</th>
                          <th>Model</th>
                          <th>Frame</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>{results.data.Vehicle.market}</td>
                          <td>{results.data.Vehicle.year}</td>
                          <td>{results.data.Vehicle.make}</td>
                          <td>{results.data.Vehicle.model}</td>
                          <td>{results.data.Vehicle.frame}</td>
                        </tr>
                      </tbody>
                    </table>

                    <h3>Brake Parts</h3>
                    {results.data["Brake Parts"].map((groupItem, groupIndex) => (
                      <div key={groupIndex} className="parts-group">
                        <h4>Group: {groupItem.group}</h4>
                        <table className="parts-table">
                          <thead>
                            <tr>
                              <th>Part Number</th>
                              <th>Description</th>
                              <th>Quantity</th>
                              <th>Price</th>
                            </tr>
                          </thead>
                          <tbody>
                            {groupItem.parts.map((part, partIndex) => (
                              <tr key={partIndex}>
                                <td>{part.part_number}</td>
                                <td>{part.description}</td>
                                <td>{part.quantity}</td>
                                <td>{part.price}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                  
                )}
              </div>
            ) : (
              <p>{results.error}</p>
            )}
          </div>
        )}
      </main>

      <footer className="App-footer">
        <p>Autoparts VIN Processor - Development Version</p>
      </footer>
    </div>
  );
}

export default App;