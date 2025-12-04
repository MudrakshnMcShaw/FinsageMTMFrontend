import React, { useEffect, useRef, useState } from "react";
import { widget } from "./charting_library";
import { toast } from "sonner";
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const API_BASE = "http://91.203.134.194:8000/api";

export default function TVChart() {
  const chartContainerRef = useRef(null);
  const [strategies, setStrategies] = useState([]);
  const [portfolios, setPortfolios] = useState([]);
  const [csvFiles, setCsvFiles] = useState([]);
  const [jsonFiles, setJsonFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState(null);
  const [selectedFileToDelete, setSelectedFileToDelete] = useState("");
  const [rerender, setRerender] = useState(false);
  const tvWidgetRef = useRef(null);

  async function fetchStrategies() {
    try {
      const res = await fetch(`${API_BASE}/strategies`);
      if (!res.ok) {
        let msg = "Backend is down!";
        try {
          const data = await res.json();
          if (data.detail) msg = data.detail;
        } catch {}
        setErrorMessage(msg);
        return [];
      }
      return await res.json();
    } catch (err) {
      setErrorMessage("Cannot reach server!");
      return [];
    }
  }

  async function fetchPortfolios() {
    try {
      const res = await fetch(`${API_BASE}/portfolio`);
      if (!res.ok) {
        let msg = "Backend is down!";
        try {
          const data = await res.json();
          if (data.detail) msg = data.detail;
        } catch {}
        setErrorMessage(msg);
        return [];
      }
      return await res.json();
    } catch (err) {
      setErrorMessage("Cannot reach server!");
      return [];
    }
  }

  async function fetchCsvFiles() {
    try {
      const res = await fetch(`${API_BASE}/file`);
      if (!res.ok) {
        let msg = "Backend is down!";
        try {
          const data = await res.json();
          if (data.detail) msg = data.detail;
        } catch {}
        setErrorMessage(msg);
        return [];
      }
      return await res.json();
    } catch (err) {
      setErrorMessage("Cannot reach server!");
      return [];
    }
  }

  async function fetchJsonFiles() {
    try {
      const res = await fetch(`${API_BASE}/json-file`);
      if (!res.ok) {
        let msg = "Backend is down!";
        try {
          const data = await res.json();
          if (data.detail) msg = data.detail;
        } catch {}
        setErrorMessage(msg);
        return [];
      }
      return await res.json();
    } catch (err) {
      setErrorMessage("Cannot reach server!");
      return [];
    }
  }

  async function fetchStrategyMTM(strategyName) {
    const url = `${API_BASE}/strategies/${encodeURIComponent(strategyName)}/mtm`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch MTM");
    return await res.json();
  }

  async function fetchPortfolioMTM(portfolioName) {
    const url = `${API_BASE}/portfolio/${encodeURIComponent(portfolioName)}/mtm`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch MTM");
    return await res.json();
  }

  async function fetchFileData(fileId) {
    const url = `${API_BASE}/file/${encodeURIComponent(fileId)}/mtm`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch file data");
    return await res.json();
  }



  async function handleCSVUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/file/upload`, true);

    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable) {
        const percent = Math.round((evt.loaded / evt.total) * 100);
        setUploadProgress(percent);
      }
    };

    xhr.onreadystatechange = async function () {
      if (xhr.readyState === 4) {
        setUploading(false);

        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          toast.success("File uploaded successfully");

          // ✅ FIX: Backend returns file object directly, not wrapped in 'data'
          const newFile = {
            file_id: response.file_id,
            filename: response.filename,
            file_type: response.file_type,
          };

          // Add to appropriate array based on file_type
          if (response.file_type === "json") {
            setJsonFiles(prev => [...prev, newFile]);
          } else {
            setCsvFiles(prev => [...prev, newFile]);
          }

          // Auto-load into TradingView
          setTimeout(() => {
            tvWidgetRef.current?.chart().setSymbol(newFile.filename);
          }, 10);

          setRerender((prev) => !prev);
        } else {
          toast.error("Upload failed");
        }
      }
    };

    xhr.send(formData);
  }

  async function deleteFile(fileId) {
    try {
      const res = await fetch(`${API_BASE}/file/${fileId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        toast.error("Failed to delete file");
        return;
      }

      if (res.status === 200) {
        toast.success("File deleted successfully!");
        setRerender((prev) => !prev);
      }

      // Remove from both arrays
      setCsvFiles(prev => prev.filter(f => f.file_id !== fileId));
      setJsonFiles(prev => prev.filter(f => f.file_id !== fileId));
      setSelectedFileToDelete("");

      // Reset chart if deleted file was selected
      if (chartContainerRef.current) {
        const chart = chartContainerRef.current.chart?.();
        chart?.setSymbol(strategies[0]?.strategy || "");
      }
    } catch (err) {
      console.log(err);
    }
  }

  useEffect(() => {
    fetchStrategies().then((data) => setStrategies(data));
    fetchPortfolios().then((data) => setPortfolios(data));
    fetchCsvFiles().then((data) => setCsvFiles(data));
    fetchJsonFiles().then((data) => setJsonFiles(data));
  }, [rerender]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    if (strategies.length === 0 && csvFiles.length === 0 && jsonFiles.length === 0) return;

    let chart;

    const datafeed = {
      onReady: (cb) => {
        setTimeout(() => {
          cb({
            supports_search: true,
            supported_resolutions: ["1", "5", "15", "30", "60", "240", "D"],
            supports_group_request: true,
            supports_marks: false,
            supports_timescale_marks: false,
            symbols_types: [
              { name: "STRATEGY", value: "STRATEGY" },
              { name: "PORTFOLIO", value: "PORTFOLIO" },
              { name: "CSV", value: "CSV" },
              { name: "JSON", value: "JSON" },
            ],
          });
        }, 0);
      },

      searchSymbols: (userInput, exchange, symbolType, onResultReady) => {
        const query = userInput.toLowerCase();
        let results = [];

        // === STRATEGIES ===
        if (!symbolType || symbolType === "STRATEGY") {
          const r = strategies
            .filter(s => s.strategy.toLowerCase().includes(query))
            .map(s => ({
              symbol: s.strategy,
              full_name: s.strategy,
              description: s.segment,
              type: "STRATEGY",
              exchange: "Custom",
              group: "Strategies",
            }));
          results.push(...r);
        }

        // === PORTFOLIOS ===
        if (!symbolType || symbolType === "PORTFOLIO") {
          const r = portfolios
            .filter(p => p.portfolio.toLowerCase().includes(query))
            .map(p => ({
              symbol: p.portfolio,
              full_name: p.portfolio,
              description: "Portfolio",
              type: "PORTFOLIO",
              exchange: "Custom",
              group: "Portfolios",
            }));
          results.push(...r);
        }

        // === CSV FILES ===
        if (!symbolType || symbolType === "CSV") {
          const r = csvFiles
            .filter(f => f.filename.toLowerCase().includes(query))
            .map(f => ({
              symbol: f.filename,
              full_name: f.filename,
              description: "CSV Upload",
              type: "CSV",
              exchange: "Custom",
              file_id: f.file_id,
              group: "CSV Files",
            }));
          results.push(...r);
        }

        // === JSON FILES ===
        if (!symbolType || symbolType === "JSON") {
          const r = jsonFiles
            .filter(f => f.filename.toLowerCase().includes(query))
            .map(f => ({
              symbol: f.filename,
              full_name: f.filename,
              description: "JSON Upload",
              type: "JSON",
              exchange: "Custom",
              file_id: f.file_id,
              group: "JSON Files",
            }));
          results.push(...r);
        }

        onResultReady(results);
      },


      // getBars: async (symbolInfo, resolution, periodParams, onHistory, onErr) => {
      //   try {
      //     let data = [];

      //     // ✅ FIX: Use symbolInfo.type to determine data source
      //     if (symbolInfo.type === "CSV" || symbolInfo.type === "JSON") {
      //       data = await fetchFileData(symbolInfo.file_id);
      //     } else if (symbolInfo.type === "STRATEGY") {
      //       data = await fetchStrategyMTM(symbolInfo.name);
      //     } else if (symbolInfo.type === "PORTFOLIO") {
      //       data = await fetchPortfolioMTM(symbolInfo.name);
      //     }

      //     const bars = data.map(d => ({
      //       time: d.time,
      //       open: d.open,
      //       high: d.high,
      //       low: d.low,
      //       close: d.close,
      //     }));

      //     bars.sort((a, b) => a.time - b.time);
          

      //     onHistory(bars, { noData: bars.length === 0 });
      //   } catch (err) {
      //     onErr(err.message);
      //   }
      // },  
  
      getBars: async function (symbolInfo, resolution, periodParams, onHistoryCallback, onErrorCallback) {
        try {
          const { from, to, firstDataRequest } = periodParams;

          // Build URL with from/to in seconds (TradingView gives seconds)
          let url = "";
          if (symbolInfo.type === "CSV" || symbolInfo.type === "JSON") {
            url = `${API_BASE}/file/${encodeURIComponent(symbolInfo.file_id)}/mtm?from=${from}&to=${to}`;
          } else if (symbolInfo.type === "STRATEGY") {
            url = `${API_BASE}/strategies/${encodeURIComponent(symbolInfo.name)}/mtm`;
          } else if (symbolInfo.type === "PORTFOLIO") {
            url = `${API_BASE}/portfolio/${encodeURIComponent(symbolInfo.name)}/mtm`;
          }

          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const data = await response.json();

          if (!Array.isArray(data)) {
            onHistoryCallback([], { noData: true });
            return;
          }

          const bars = data.map(item => ({
            time: item.time,      
            open: parseFloat(item.open),
            high: parseFloat(item.high),
            low: parseFloat(item.low),
            close: parseFloat(item.close),
          }));

          // Important: sort just in case
          // bars.sort((a, b) => a.time - b.time);

          // Tell TradingView if there's more data on the left (older)
          const noData = bars.length === 0;

          // onHistoryCallback(bars, {noData: bars.length === 0});
          onHistoryCallback(bars, {
            noData: noData,
            nextTime: undefined // Signals no more data to fetch
          });

        } catch (error) {
          console.error("Error loading bars:", error);
          onErrorCallback(error.message || "Failed to load data");
        }
      },
            
      resolveSymbol: (symbolName, onResolve, onError) => {
        setTimeout(() => {
          // CSV files
          const csvFile = csvFiles.find(f => f.filename === symbolName);
          if (csvFile) {
            return onResolve({
              name: symbolName,
              full_name: symbolName,
              type: "CSV",
              file_id: csvFile.file_id,
              session: "0915-1531",
              timezone: "Asia/Kolkata",
              listed_exchange: "Custom",
              exchange: "Custom",
              has_intraday: true,
              visible_plots_set: "ohlc",
              pricescale: 100,
              minmov: 1,
              data_status: "streaming", // Tell TV to accept data updates
              supported_resolutions: ["1", "5", "15", "30", "60", "240", "D"],
            });
          }

          // JSON files
          const jsonFile = jsonFiles.find(f => f.filename === symbolName);
          if (jsonFile) {
            return onResolve({
              name: symbolName,
              full_name: symbolName,
              type: "JSON",
              file_id: jsonFile.file_id,
              session: "0915-1531",
              timezone: "Asia/Kolkata",
              listed_exchange: "Custom",
              exchange: "Custom",
              has_intraday: true,
              visible_plots_set: "ohlc",
              pricescale: 100,
              minmov: 1,
              data_status: "streaming",
              supported_resolutions: ["1", "5", "15", "30", "60", "240", "D"],
            });
          }

          // STRATEGY
          const strategy = strategies.find(s => s.strategy === symbolName);
          if (strategy) {
            return onResolve({
              name: symbolName,
              full_name: symbolName,
              type: "STRATEGY",
              session: "0915-1531",
              timezone: "Asia/Kolkata",
              listed_exchange: "Custom",
              exchange: "Custom",
              has_intraday: true,
              visible_plots_set: "ohlc",
              pricescale: 100,
              minmov: 1,
              data_status: "streaming",
              supported_resolutions: ["1", "5", "15", "30", "60", "240", "D"],
            });
          }

          // PORTFOLIO
          const portfolio = portfolios.find(p => p.portfolio === symbolName);
          if (portfolio) {
            return onResolve({
              name: symbolName,
              full_name: symbolName,
              type: "PORTFOLIO",
              session: "0915-1531",
              timezone: "Asia/Kolkata",
              listed_exchange: "Custom",
              exchange: "Custom",
              has_intraday: true,
              visible_plots_set: "ohlc",
              pricescale: 100,
              minmov: 1,
              data_status: "streaming",
              supported_resolutions: ["1", "5", "15", "30", "60", "240", "D"],
            });
          }

          return onError("Symbol not found");
        }, 0);
      },

      subscribeBars: () => {},
      unsubscribeBars: () => {},
    };

    const defaultSymbol = strategies[0]
      ? `${strategies[0].strategy}`
      : csvFiles[0]
      ? `${csvFiles[0].filename}`
      : jsonFiles[0]
      ? `${jsonFiles[0].filename}`
      : "DEFAULT";

    chart = new widget({
      container: chartContainerRef.current,
      datafeed,
      symbol: defaultSymbol,
      interval: "15",
      library_path: "/charting_library/",
      theme: "dark",
      autosize: true,
      timezone: "Asia/Kolkata"
    });

    tvWidgetRef.current = chart;

    return () => chart.remove();
  }, [strategies, csvFiles, jsonFiles, portfolios]);

  return (
    <>
      {errorMessage ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#131722",
            color: "#ffffff",
            zIndex: 50,
            backdropFilter: "blur(4px)",
            userSelect: "none",
          }}
        >
          <div
            style={{
              textAlign: "center",
              maxWidth: "620px",
              padding: "24px 28px",
              borderRadius: "12px",
              backdropFilter: "blur(8px)",
            }}
          >
            <ExclamationTriangleIcon
              style={{
                color: "#ffcc00",
                width: "168px",
                height: "168px",
                marginBottom: "4px",
              }}
            />
            <h3
              style={{
                margin: "0",
                fontSize: "40px",
                lineHeight: "1.4",
                color: "#ffffff",
                fontWeight: 600,
              }}
            >
              {errorMessage}
            </h3>
          </div>
        </div>
      ) : (
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
          {/* Delete File Section */}
          <div
            style={{
              position: "absolute",
              top: 6,
              left: 450,
              zIndex: 20,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <select
                value={selectedFileToDelete}
                onChange={(e) => setSelectedFileToDelete(e.target.value)}
                style={{
                  background: "#222",
                  color: "white",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "1px solid #555",
                }}
              >
                <option value="">Select CSV / JSON to delete</option>
                {/* CSV Files */}
                {csvFiles.length > 0 && (
                  <optgroup label="CSV Files">
                    {csvFiles.map((file) => (
                      <option key={file.file_id} value={file.file_id}>
                        {file.filename}
                      </option>
                    ))}
                  </optgroup>
                )}
                {/* JSON Files */}
                {jsonFiles.length > 0 && (
                  <optgroup label="JSON Files">
                    {jsonFiles.map((file) => (
                      <option key={file.file_id} value={file.file_id}>
                        {file.filename}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>

              <button
                onClick={() => {
                  if (!selectedFileToDelete) {
                    toast.error("Please select a file");
                    return;
                  }
                  deleteFile(selectedFileToDelete);
                }}
                style={{
                  background: "#922727ff",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </div>
          </div>

          {/* Upload Section */}
          <div
            style={{
              position: "absolute",
              top: 10,
              right: 250,
              zIndex: 20,
            }}
          >
            <label
              style={{
                background: "#444",
                padding: "6px 12px",
                borderRadius: "6px",
                color: "white",
                cursor: "pointer",
                marginRight: "10px",
              }}
            >
              Upload CSV / JSON
              <input
                type="file"
                accept=".csv, .json, application/json"
                style={{ display: "none" }}
                onChange={handleCSVUpload}
              />
            </label>

            {uploading && (
              <div
                style={{
                  background: "#222",
                  width: "150px",
                  height: "8px",
                  borderRadius: "8px",
                }}
              >
                <div
                  style={{
                    width: `${uploadProgress}%`,
                    height: "100%",
                    background: "#4caf50",
                    transition: "width 0.2s",
                    borderRadius: "8px",
                  }}
                />
              </div>
            )}
          </div>

          <div ref={chartContainerRef} style={{ width: "100%", height: "100%" }} />
        </div>
      )}
    </>
  );
}