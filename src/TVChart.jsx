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
  const fileInputRef = useRef(null);
  const renkoMakerRef = useRef(null)
  const [showRenko, setShowRenko] = useState(false);
  const [renkoData, setRenkoData] = useState(null);
  const [isRenkoActive, setIsRenkoActive] = useState(false);

  const inputStyle = {
              width: "100%",
              marginTop: "6px",
              padding: "8px 10px",
              borderRadius: "6px",
              backgroundColor: "#0000",
              color: "#fff",
              outline: "none",
    };

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

async function requestRenko(value, totalMargin) {
  try {
    const chart = tvWidgetRef.current?.activeChart();
    const symbol = chart?.symbol();

    if (!symbol) {
      toast.error("No chart selected");
      return;
    }

    // 👇 Detect type
    let type = "strategy";
    let name = symbol;

    // You already have this info in symbol search
    const selectedCSV = csvFiles.find(f => f.filename === symbol);
    const selectedJSON = jsonFiles.find(f => f.filename === symbol);
    const selectedPortfolio = portfolios.find(p => p.portfolio === symbol);

    if (selectedCSV || selectedJSON) {
      type = "file";
      name = selectedCSV?.file_id || selectedJSON?.file_id;
    } else if (selectedPortfolio) {
      type = "portfolio";
      name = symbol;
    }

    const params = new URLSearchParams({
      type,
      name,
      brickType: "close",
      method: "percentage",
      value: value,
      margin: totalMargin
    });

    window.open(`${window.location.origin}/renko-chart?${params.toString()}`, "_blank");

    setShowRenko(false);
    toast.success("Opened Renko chart");

  } catch (err) {
    console.error(err);
    toast.error("Failed to open Renko chart");
  }
}


    async function makeRenkoOff() {
    // if (!renkoMakerRef.current) return;

    try {
      
      // set the input config to local storage
      localStorage.removeItem("renkoConfig")
      setIsRenkoActive(false);

      setTimeout(() => {
        if (tvWidgetRef.current?.activeChart) {
          const chart =  tvWidgetRef.current.activeChart();
          
          if (chart) {
            chart.resetData();
            chart.executeActionById("chartResetData");
          }
        }
        
      }, 100);
      window.location.reload()
      
      toast.success("Normal chart generated");
    } catch (err) {
      console.error("Normal request failed:", err);
      toast.error("Failed to generate Normal chart");
      setIsRenkoActive(true);
      // setRenkoData(null);
    }
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
          const err = JSON.parse(xhr.responseText);
          toast.error(err.detail);
          console.log(err.detail)
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

      getBars: async function (symbolInfo, resolution, periodParams, onHistoryCallback, onErrorCallback) {
        try {
          const { from, to, countBack, firstDataRequest } = periodParams; 
          let data;
          let url = "";
          
          if (symbolInfo.type === "CSV" || symbolInfo.type === "JSON") {
              url = `${API_BASE}/file/${encodeURIComponent(symbolInfo.file_id)}/mtm`;
              localStorage.setItem("currentFileID", symbolInfo.file_id);
          } else if (symbolInfo.type === "STRATEGY") {
              // url = `${API_BASE}/strategies/mtm/strategy_name=${symbolInfo.name}`;
              url = `${API_BASE}/strategies/mtm?strategy_name=${encodeURIComponent(symbolInfo.name)}`;
          } else if (symbolInfo.type === "PORTFOLIO") {
              url = `${API_BASE}/portfolio/${encodeURIComponent(symbolInfo.name)}/mtm`;
          }

          const response = await fetch(url);
          if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
          }
            
          data = await response.json();
          
          if (!Array.isArray(data)) {
            onHistoryCallback([], { noData: true });
            return;
          }
          const bars = data
          .map(item => ({
            time: item.time,
            open: parseFloat(item.open),
            high: parseFloat(item.high),
            low: parseFloat(item.low),
            close: parseFloat(item.close),
          }));
          bars.sort((a, b) => a.time - b.time);

          const noData = bars.length === 0;    
          onHistoryCallback(bars, {noData});

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
              // session: "0915-1531",
              session: "24x7",
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
              // session: "0915-1531",
              session: "24x7",
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
              // session: "0000-2400",
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

    const defaultSymbol = csvFiles[0] ? `${csvFiles[0].filename}`
      : strategies[0] ? `${strategies[0].strategy}`
      : jsonFiles[0] ? `${jsonFiles[0].filename}`
      : "DEFAULT";

    chart = new widget({
      container: chartContainerRef.current,
      datafeed,
      symbol: defaultSymbol,
      interval: "1",
      library_path: "/charting_library/",
      theme: "dark",
      autosize: true,
      timezone: "Asia/Kolkata",
      charts_storage_url: API_BASE,  
      client_id: "finsage_user",      // e.g. your website or tenant ID
      user_id: "finsage_Id",          // unique user ID
      enabled_features: ["chart_template_storage"],
      charts_storage_api_version: "1.1",
    });

    tvWidgetRef.current = chart;

    chart.onChartReady(() => {
      const makeRenkoBtn = chart.createButton()
      makeRenkoBtn.setAttribute("title", "Renko");
      makeRenkoBtn.style.cursor = "default";
      makeRenkoBtn.style.fontSize = "14px";
      makeRenkoBtn.style.fontWeight = "600";
      makeRenkoBtn.style.padding = "0 10px";

      makeRenkoBtn.style.background = "#1e222d";
      makeRenkoBtn.style.borderRadius = "6px";
      makeRenkoBtn.style.padding = "4px 12px";
      makeRenkoBtn.style.color = "#00ffcc";

      makeRenkoBtn.innerHTML = 'Renko'

      // const renkoOffBtn = chart.createButton()
      // renkoOffBtn.setAttribute("title", "Renko");
      // renkoOffBtn.style.cursor = "default";
      // renkoOffBtn.style.fontSize = "14px";
      // renkoOffBtn.style.fontWeight = "600";
      // renkoOffBtn.style.padding = "0 10px";
      
      // renkoOffBtn.style.background = "#1e222d";
      // renkoOffBtn.style.borderRadius = "6px";
      // renkoOffBtn.style.padding = "4px 12px";
      // renkoOffBtn.style.color = "#ff0037ff";

      // renkoOffBtn.innerHTML = 'Renko OFF'


      const uploadBtn = chart.createButton()
      uploadBtn.setAttribute("title", "Upload CSV");
      uploadBtn.style.cursor = "default";
      uploadBtn.style.fontSize = "14px";
      uploadBtn.style.fontWeight = "600";
      uploadBtn.style.padding = "0 10px";

      uploadBtn.style.background = "#1e222d";
      uploadBtn.style.borderRadius = "6px";
      uploadBtn.style.padding = "4px 12px";
      uploadBtn.style.color = "#00ffcc";

      uploadBtn.innerHTML = 'Upload CSV'
      
      makeRenkoBtn.addEventListener("click", () => {
        setShowRenko(true)
      });

      uploadBtn.addEventListener("click", () => {
        fileInputRef.current.click();
      })

      // renkoOffBtn.addEventListener("click", async () => {
      //   await makeRenkoOff()
      // })
    }) 



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
              left: 650,
              zIndex: 20,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <select
                value={selectedFileToDelete}
                onChange={(e) => setSelectedFileToDelete(e.target.value)}
                style={{
                  background: "#222",
                  color: "white",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  width: "50%",
                  border: "1px solid #555",
                }}
              >
                <option value="">Select CSV/JSON</option>
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
                  background: "#b02525ff",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </div>
            <input
              type="file"
              accept=".csv, .json, application/json"
              style={{ display: "none" }}
              ref={fileInputRef}
              onChange={handleCSVUpload}
            />
          </div>

          {/* Upload Section */}
          {uploading && (
          <div 
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backdropFilter: "blur(6px)",
            backgroundColor: "rgba(0, 0, 0, 0.3)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 999,
          }}  
          >
         <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 20,
            }}
          >
              <div
                style={{
                  background: "#222",
                  width: "350px",
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
          </div>
          </div>
            )}

          {showRenko && (
            <div 
            style={{
            position: "fixed", 
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "350px",
            height: "400px",

            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 999,
          }}>
            <div
              style={{
                width: "350px",
                backdropFilter: "blur(6px)",
                backgroundColor: "rgba(0, 0, 0, 0.3)",
                padding: "14px 16px",
                borderRadius: "12px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
                color: "#fff",
                fontFamily: "Inter, sans-serif",
              }}
            >
              <h2 style={{ marginBottom: "20px", fontSize: "20px", fontWeight: 600 }}>
                Create Renko
              </h2>

              {/* Brick Type */}
              {/*<div style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "14px", opacity: 0.8 }}>
                  Brick Type
                </label>
                <select
                  id="brickType"
                  defaultValue="ohlc"
                  style={inputStyle}
                >
                  <option value="ohlc" style={{ backgroundColor: "#181717ff", color: "#fff" }}>OHLC</option>
                  <option value="close" style={{ backgroundColor: "#181717ff", color: "#fff" }}>Close</option>
                </select>
              </div>
              */}

              {/* Method */}
              {/*<div style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "14px", opacity: 0.8 }}>
                  Method
                </label>
                <select
                  id="method"
                  defaultValue="atr"
                  style={inputStyle}
                >
                  <option value="percentage" style={{ backgroundColor: "#181717ff", color: "#fff" }}>Percentage</option>
                  <option value="atr" style={{ backgroundColor: "#181717ff", color: "#fff" }}>ATR</option>
                  <option value="traditional" style={{ backgroundColor: "#181717ff", color: "#fff" }}>Traditional</option>
                </select>
              </div>*/}
              
              {/* Value */}
              <div style={{ marginBottom: "24px" }}>
                <label style={{ fontSize: "14px", opacity: 0.8 }}>
                  Brick Percentage Value (%)
                </label>
                <input
                  id="value"
                  type="number"
                  step="0.01"
                  defaultValue="0.5"
                  style={inputStyle}
                />
              </div>

              {/* Margin */}
              <div style={{ marginBottom: "24px" }}>
                <label style={{ fontSize: "14px", opacity: 0.8 }}>
                  Total Margin
                </label>
                <input
                  id="margin"
                  type="number"
                  step="1"
                  defaultValue="0"
                  style={inputStyle}
                />
              </div>

              {/* Buttons */}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <button
                  onClick={() => setShowRenko(false)}
                  style={{
                    background: "transparent",
                    border: "1px solid #555",
                    color: "#ccc",
                    padding: "8px 16px",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>

                <button
                  onClick={async () => {
                    // const brickType = document.getElementById("brickType").value;
                    // const method = document.getElementById("method").value;
                    const value = document.getElementById("value").value;
                    const totalMargin = document.getElementById("margin").value;

                    // await requestRenko("close", "percentage", value);
                    await requestRenko(value, totalMargin)
                  }}
                  style={{
                    background: "#2962ff",
                    border: "none",
                    color: "#fff",
                    padding: "8px 18px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  Generate
                </button>
              </div>
            </div>

            </div>
          )}

          <div ref={chartContainerRef} style={{ width: "100%", height: "100%" }} />
        </div>
      )}
    </>
  );
} 