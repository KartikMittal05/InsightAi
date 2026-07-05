import axios from "axios";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Upload() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [schemaInfo, setSchemaInfo] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [serverConnected, setServerConnected] = useState(null);
  const navigate = useNavigate();

  // Check backend connection on component mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await axios.get(`${API_URL}/health`, { timeout: 5000 });
        console.log("✓ Backend connection OK:", response.data);
        setServerConnected(true);
        
        // Fetch schema info
        const schemaResponse = await axios.get(`${API_URL}/schema/info`);
        setSchemaInfo(schemaResponse.data);
      } catch (err) {
        console.warn("⚠ Cannot reach backend at", API_URL, err.message);
        setServerConnected(false);
      }
    };

    checkConnection();
    // Check connection every 10 seconds
    const interval = setInterval(checkConnection, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setError(null);
    setSuccess(false);
    setValidationResult(null);
  };

  const validateSchema = async () => {
    if (!file) {
      setError("Please select a file first");
      return;
    }

    setValidating(true);
    setError(null);
    setValidationResult(null);
    const form = new FormData();
    form.append("file", file);

    try {
      console.log(`Validating schema for file: ${file.name}`);
      
      const response = await axios.post(`${API_URL}/schema/validate`, form, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 30000,
      });
      
      setValidationResult(response.data);
      console.log("✓ Schema validation passed:", response.data);
    } catch (err) {
      const errorData = err.response?.data;
      setValidationResult(errorData);
      if (errorData?.error === 'SCHEMA_VALIDATION_FAILED' || !errorData?.valid) {
        setError(null); // Don't set error, let validation result show
      } else {
        setError(err.response?.data?.error || "Schema validation failed");
      }
    } finally {
      setValidating(false);
    }
  };

  const uploadFile = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setSuccess(false);
    const form = new FormData();
    form.append("file", file);

    try {
      console.log(`Uploading file: ${file.name} (${file.size} bytes) to ${API_URL}/upload`);
      
      const response = await axios.post(`${API_URL}/upload`, form, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 300000, // 5 minute timeout for large files
      });
      
      setSuccess(true);
      console.log("✓ Upload successful:", response.data);
      
      // Show optimization message if dataset was sampled
      if (response.data.optimized) {
        console.log(`Large dataset optimized: ${response.data.processed_rows} of ${response.data.rows} rows processed for faster analysis`);
      }
      
      // Show dataset type detected
      if (response.data.dataset_type) {
        console.log(`Dataset type detected: ${response.data.dataset_type.name}`);
      }
      
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (err) {
      console.error("Upload error:", err);
      console.error("Error details:", {
        message: err.message,
        code: err.code,
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        url: err.config?.url
      });
      
      const errorData = err.response?.data;
      let errorMsg = err.message || "Upload failed. Please try again.";
      
      // Handle specific error types
      if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
        errorMsg = `Network Error: Cannot connect to server at ${API_URL}\n\nMake sure the backend is running on port 5000.`;
      } else if (err.code === 'ECONNABORTED') {
        errorMsg = `Upload Timeout: The request took too long. Try uploading a smaller file or checking your connection.`;
      } else if (err.response?.status === 413) {
        errorMsg = `File Too Large: Maximum file size is 500MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`;
      } else if (err.response?.status === 415) {
        errorMsg = `Invalid File Type: Only CSV, XLSX, and JSON files are supported.`;
      } else if (err.response?.status === 400 || err.response?.status === 422) {
        if (errorData?.error === 'SCHEMA_VALIDATION_FAILED') {
          // Schema validation error - show as validation result
          setValidationResult(errorData);
          errorMsg = null;
        } else if (errorData?.error) {
          errorMsg = errorData.error;
          // If it's a missing columns error, add helpful info
          if (errorData.available_columns) {
            errorMsg += "\n\nYour file has these columns: " + errorData.available_columns.join(", ");
          }
          if (errorData.suggestion) {
            errorMsg += "\n\n" + errorData.suggestion;
          }
          if (errorData.note) {
            errorMsg += "\n\nNote: " + errorData.note;
          }
        }
      } else if (err.response?.status >= 500) {
        errorMsg = `Server Error (${err.response.status}): ${errorData?.error || 'An internal server error occurred. Check the backend logs.'}`
      }
      
      setError(errorMsg);
    }
    setLoading(false);
  };

  const browse = () => document.getElementById("file-input")?.click();

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute w-96 h-96 bg-gradient-to-br from-indigo-400/20 to-purple-500/20 rounded-full blur-3xl top-0 left-0 animate-pulse" style={{animationDuration: '5s'}} />
        <div className="absolute w-80 h-80 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl bottom-0 right-0 animate-pulse" style={{animationDuration: '6s', animationDelay: '1s'}} />
      </div>
      <div className="max-w-6xl w-full grid md:grid-cols-2 gap-10 items-center relative z-10">
        <div className="space-y-5 animate-rise">
          <div className="pill bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200/50 w-fit hover:shadow-md hover:scale-105">🔒 Secure ingestion</div>
          <h1 className="text-5xl font-bold leading-tight">
            <span className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
              Drop your data,
            </span>
            <span className="block mt-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              get instant intelligence.
            </span>
          </h1>
          <p className="text-slate-600 text-lg leading-relaxed">
            Upload CSV, Excel, or JSON. We clean, segment, and surface insights in under a minute. SOC2-friendly flow with
            encrypted transit and no persistence by default.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            {["CSV, XLSX, JSON", "< 50MB accepted", "PII-safe by design", "RFM + affinity ready"].map((tag, idx) => (
              <div key={tag} className="pill bg-white/80 border border-slate-200 text-slate-700 shadow-sm hover:shadow-md hover:scale-105" style={{animationDelay: `${idx * 50}ms`}}>{tag}</div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-slate-500">
            <div className="pill bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border border-emerald-200/50 hover:shadow-md">✔ Auto data validation</div>
            <div className="pill bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 border border-amber-200/50 hover:shadow-md">⚠ Error guidance if schema mismatches</div>
            {serverConnected !== null && (
              <div className={`pill border-2 ${serverConnected ? 'bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border-emerald-300' : 'bg-gradient-to-r from-red-50 to-orange-50 text-red-700 border-red-300'} hover:shadow-md`}>
                {serverConnected ? '✅ Backend Ready' : '⚠️ Backend Offline'}
              </div>
            )}
          </div>
          <div className="flex gap-4 pt-2">
            <button
              onClick={browse}
              className="px-7 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-105 transition-all duration-300"
            >
              Choose a file
            </button>
            <Link
              to="/dashboard"
              className="px-7 py-4 glass text-slate-800 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 border border-slate-200/50"
            >
              View demo dashboard
            </Link>
          </div>
        </div>

        <div className="glass rounded-3xl p-8 border border-slate-200/50 shadow-2xl shadow-blue-500/10 animate-rise" style={{ animationDelay: "120ms" }}>
          <div
            className="border-3 border-dashed border-blue-300 rounded-2xl p-10 text-center hover:border-blue-500 hover:bg-gradient-to-br hover:from-blue-50/50 hover:to-indigo-50/50 transition-all duration-300 cursor-pointer bg-white/80 group"
            onDragOver={(e) => e.preventDefault()}
            onClick={browse}
          >
            <div className="text-6xl mb-5 transform group-hover:scale-110 transition-transform duration-300">⬆️</div>
            <h3 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-blue-900 bg-clip-text text-transparent mb-3">Drop your file here</h3>
            <p className="text-slate-600 mb-4 text-lg">or click to browse</p>
            <p className="text-sm text-slate-500">Accepted: .csv, .xlsx, .json • Max 50MB</p>
            <input
              id="file-input"
              type="file"
              accept=".csv,.xlsx,.json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {file && (
            <div className="mt-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/50 rounded-xl flex items-center justify-between shadow-sm animate-rise">
              <div>
                <p className="text-sm text-slate-600 font-medium">Selected file</p>
                <p className="font-bold text-slate-900 text-lg">{file.name}</p>
              </div>
              <span className="pill bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border border-emerald-200/50 shadow-sm">✔ Ready</span>
            </div>
          )}

          {validationResult && (
            <div className={`mt-6 p-5 rounded-xl animate-rise shadow-sm border ${
              validationResult.valid 
                ? 'bg-green-50 border-green-200 text-green-700' 
                : 'bg-amber-50 border-amber-200 text-amber-700'
            }`}>
              <div className="flex items-start gap-3 mb-3">
                <span className="text-2xl flex-shrink-0">{validationResult.valid ? '✅' : '⚠️'}</span>
                <div>
                  <p className="font-bold text-lg">
                    {validationResult.valid ? 'Schema Valid' : 'Schema Validation Failed'}
                  </p>
                  <p className="text-sm mt-1">{validationResult.message}</p>
                </div>
              </div>
              
              {validationResult.valid && (
                <>
                  <div className="mt-4 pt-4 border-t border-green-200 space-y-2 text-sm">
                    <p><strong>✓ Required Columns Found:</strong></p>
                    <div className="grid grid-cols-2 gap-2 ml-2">
                      {Object.entries(validationResult.found_columns || {}).map(([col, source]) => (
                        <div key={col} className="flex items-center gap-2">
                          <span>✔</span>
                          <span><strong>{col}</strong>: {source}</span>
                        </div>
                      ))}
                    </div>
                    {validationResult.extra_columns_count > 0 && (
                      <p className="mt-3 text-green-600"><strong>💡 Bonus:</strong> {validationResult.extra_columns_count} extra column(s) detected for enhanced insights!</p>
                    )}
                  </div>
                </>
              )}
              
              {!validationResult.valid && (
                <>
                  <div className="mt-4 pt-4 border-t border-amber-200 space-y-2 text-sm">
                    <p><strong>❌ Missing Required Columns:</strong></p>
                    <div className="ml-2 space-y-2">
                      {(validationResult.missing_columns || []).map((item, idx) => (
                        <div key={idx} className="bg-white/60 p-2 rounded border border-amber-100">
                          <p><strong>{item.column}</strong></p>
                          <p className="text-xs mt-1">Try renaming to: {item.aliases?.join(', ') || 'N/A'}</p>
                        </div>
                      ))}
                    </div>
                    {validationResult.suggestions && validationResult.suggestions.length > 0 && (
                      <>
                        <p className="mt-4 font-semibold">💡 Suggestions:</p>
                        <ul className="list-disc list-inside ml-2 space-y-1">
                          {validationResult.suggestions.map((suggestion, idx) => (
                            <li key={idx} className="text-xs">{suggestion}</li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {error && (
            <div className="mt-6 p-5 bg-red-50 border border-red-200 rounded-xl text-red-700 animate-rise max-h-48 overflow-y-auto shadow-sm">
              <div className="flex items-start gap-3 mb-3">
                <span className="text-2xl flex-shrink-0">❌</span>
                <p className="font-bold text-lg">Upload Error</p>
              </div>
              <p className="text-sm whitespace-pre-wrap leading-relaxed font-medium">{error}</p>
              <div className="mt-4 pt-4 border-t border-red-200 text-xs text-red-600">
                <p><strong>💡 Troubleshooting:</strong></p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Ensure backend is running on port 5000</li>
                  <li>Check your file is valid CSV, XLSX, or JSON</li>
                  <li>File should be under 500MB</li>
                  <li>Required columns: customer_id, and either date+amount or Recency+Frequency+Monetary</li>
                </ul>
              </div>
            </div>
          )}

          {success && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 animate-rise">
              <p className="font-semibold">✅ Upload Successful!</p>
              <p className="text-sm mt-1">Redirecting to dashboard...</p>
            </div>
          )}
          
          {loading && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 animate-rise">
              <p className="font-semibold mb-3">🔄 Processing your data...</p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="animate-spin">⚙️</div>
                  <span>Reading and validating file</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="animate-pulse">📊</div>
                  <span>Analyzing customer patterns</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="animate-bounce">✨</div>
                  <span>Preparing insights</span>
                </div>
              </div>
              <div className="mt-3 h-2 bg-blue-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 animate-progress"></div>
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button
              onClick={validateSchema}
              disabled={!file || validating || loading || !serverConnected}
              title="Validate dataset schema before uploading"
              className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-md"
            >
              {validating ? "🔍 Validating..." : "🔍 Validate First"}
            </button>
            
            <button
              onClick={uploadFile}
              disabled={!file || loading || !serverConnected}
              title={!serverConnected ? "Backend server is not responding. Make sure it's running on port 5000." : ""}
              className="flex-1 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-xl hover:shadow-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg"
            >
              {loading ? "⏳ Processing..." : !serverConnected && serverConnected !== null ? "⚠️ Server Offline" : "📤 Upload & Analyze"}
            </button>
          </div>

          <div className="mt-5 p-4 bg-slate-50 rounded-xl text-xs text-slate-600 space-y-2 leading-relaxed border border-slate-200/50">
            <p>🔍 <strong>Validate First:</strong> Click "Validate First" to check if your dataset has the required columns before uploading.</p>
            <p>🔒 We stream your file, validate columns, and auto-map fields. No data is stored unless you opt in.</p>
            <p>💡 <strong>Required Columns:</strong> Every dataset must have customer_id. Additional columns required depend on your data type (transaction or RFM).</p>
          </div>
        </div>
      </div>
    </div>
  );
}
