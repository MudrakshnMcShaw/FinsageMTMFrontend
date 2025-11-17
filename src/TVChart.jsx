import React, { useEffect, useRef, useState } from "react";
import { widget } from "./charting_library";

const API_BASE = "http://91.203.134.194:8000/api";

// Fetch all strategies
async function fetchStrategies() {
  const res = await fetch(`${API_BASE}/strategies`);
  
  if (!res.ok) return [];
  return await res.json();
}

// Fetch list of CSV files for a strategy
async function fetchCsvFiles() {
  const res = await fetch(`${API_BASE}/file`)
  
  if (!res.ok) return [];
  return await res.json();
}


// Fetch OHLC from backend
async function fetchMTM(strategyName) {
  const url = `${API_BASE}/strategies/${encodeURIComponent(strategyName)}/mtm`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch MTM");

  return await res.json();
}

// Fetch OHLC for CSV file
 async function fetchCsvData(fileId) {
    console.log(`File ID SENT TO BACK: ${fileId}`)
    const url = `${API_BASE}/file/${encodeURIComponent(fileId)}/mtm`;

    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch CSV data");

    return await res.json();
 } 



export default function TVChart() {
  const chartContainerRef = useRef(null);
  const [strategies, setStrategies] = useState([]);
  const [files, setCsvFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

   async function handleCSVUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  setUploading(true);
  setUploadProgress(0);

  const formData = new FormData();
  formData.append("file", file);

  const xhr = new XMLHttpRequest();
  xhr.open("POST", `${API_BASE}/file/upload`, true);   // <-- your backend upload route

  // track upload progress
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

        // Response MUST contain new file ID
        const newFile = response.data; 
        // example response:
        // { filename: "...", file_id: "...", total_rows: 12345 }

        // Update file list so searchSymbols can see it
        setCsvFiles(prev => [...prev, newFile]);

        // Auto-load into TradingView
        chartRef.current?.chart().setSymbol(newFile.filename);

      } else {
        alert("Upload failed");
      }
    }
  };

  xhr.send(formData);
}


//   const [searchTab, setSearchTab] = useState<'all' | 'strategies' | 'csv'>('all');

  useEffect(() => {
    // Load strategies list at start
    fetchStrategies().then((data) => setStrategies(data));
    fetchCsvFiles().then((data) => setCsvFiles(data));
  }, []);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // / Wait for BOTH strategies AND files
    if (strategies.length === 0 || files.length === 0) return;
    
    let chart;

    // TradingView Datafeed
    const datafeed = {
      onReady: (cb) => {
        setTimeout(() => {
            cb({
            supports_search: true,
            supports_group_request: false,
            supports_marks: false,
            supports_timescale_marks: false,
            });
        }, 0);
        },


      // Search Strategies
    //   searchSymbols: (userInput, exchange, type, onResultReady) => {
    //     const filtered = strategies
    //       .filter((s) =>
    //         s.strategy.toLowerCase().includes(userInput.toLowerCase())
    //       )
    //       .map((s) => ({
    //         symbol: s.strategy,
    //         full_name: s.strategy,
    //         description: `${s.segment}`,
    //         type: `${s.type}`,
    //         exchange: "Custom",       // REQUIRED
    //         }));


    //     onResultReady(filtered);
    //   },

    searchSymbols: (userInput, exchange, symbolType, onResultReady) => {
  const strategyResults = strategies
    .filter(s => s.strategy.toLowerCase().includes(userInput.toLowerCase()))
    .map(s => ({
      symbol: s.strategy,           // raw name
      full_name: s.strategy,
      description: s.segment,
      type: "strategy",
      exchange: "Custom",
    }));

  const csvResults = files
    .filter(f => f.filename.toLowerCase().includes(userInput.toLowerCase()))
    .map(f => ({
      symbol: f.filename,           // raw filename (ends with .csv)
      full_name: f.filename,
      description: "CSV File",
      type: "csv",
      exchange: "Custom",
      file_id: f.file_id,           // pass file_id
    }));

  onResultReady([...strategyResults, ...csvResults]);
},


      // Resolve selected symbol
    // resolveSymbol: (symbolName, onResolve, onError) => {
    // const symbolInfo = {
    //     name: symbolName,
    //     full_name: symbolName,
    //     ticker: symbolName,
    //     description: symbolName,
    //     type: "strategy",
    //     session: "0915-1530",
    //     exchange: "Custom",
    //     listed_exchange: "Custom",
    //     timezone: "Asia/Kolkata",
    //     format: "price",
    //     minmov: 1,
    //     pricescale: 1,
    //     has_intraday: true,
    //     has_no_volume: true,
    // };
    // setTimeout(() => onResolve(symbolInfo), 0);
    // // onResolve(symbolInfo);
    // },

    resolveSymbol: (symbolName, onResolve, onError) => {
        const isCsv = symbolName.endsWith(".csv");
        let type = isCsv ? "csv" : "strategy";
        let fileId = null;

        if (isCsv) {
            const file = files.find(f => f.filename === symbolName);
            if (!file) {
            return setTimeout(() => onError("CSV file not found"), 0);
            }
            fileId = file.file_id;
        }

        const symbolInfo = {
            name: symbolName,
            full_name: symbolName,
            ticker: symbolName,
            description: symbolName,
            type,
            file_id: fileId,
            session: "0915-1530",
            exchange: "Custom",
            listed_exchange: "Custom",
            timezone: "Asia/Kolkata",
            format: "price",
            minmov: 1,
            pricescale: 1,
            has_intraday: true,
            has_no_volume: true,
        };

        setTimeout(() => onResolve(symbolInfo), 0);
        },

      // Fetch OHLC bars
    //   getBars: async (symbolInfo, resolution, periodParams, onHistory, onErr) => {
    //     try {
    //       const raw = await fetchMTM(symbolInfo.name);

    //       const bars = raw.map((item) => ({
    //         time: item.time * 1000,
    //         open: item.open,
    //         high: item.high,
    //         low: item.low,
    //         close: item.close,
    //       }));

    //       onHistory(bars, { noData: bars.length === 0 });
    //     } catch (e) {
    //       console.error("Error fetching bars:", e);
    //       onErr(e);
    //     }
    //   },
    getBars: async (symbolInfo, resolution, periodParams, onHistory, onErr) => {
    try {
        console.log("getBars →", symbolInfo); // Debug

        let data = [];

        if (symbolInfo.type === "csv") {
        if (!symbolInfo.file_id) {
            return onErr("Missing file_id for CSV");
        }
        data = await fetchCsvData(symbolInfo.file_id);
        } else {
        data = await fetchMTM(symbolInfo.name);
        }

        const bars = data.map(item => ({
        time: item.time * 1000,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        }));

        onHistory(bars, { noData: bars.length === 0 });
    } catch (e) {
        console.error("getBars error:", e);
        onErr(e.message || "Failed to load data");
    }
    },

      subscribeBars: () => {},
      unsubscribeBars: () => {},
    };

    // Set default symbol safely
  const defaultSymbol = strategies[0]
    ? `${strategies[0].strategy}`
    : `${files[0].filename}`;

     chart = new widget({
      container: chartContainerRef.current,
      datafeed,
      symbol: defaultSymbol, // default symbol
      interval: "15",
      library_path: "/charting_library/",
      theme: "dark",
      autosize: true,
      timezone: "Asia/Kolkata"
    });

    return () => chart.remove();
  }, [strategies, files]);

  // return <div ref={chartContainerRef} style={{ width: "100%", height: "100%" }} />;
  return (
  <div style={{ position: "relative", width: "100%", height: "100%" }}>
    {/* Upload UI */}
    <div
      style={{
        position: "absolute",
        top: 10,
        right: 350,
        zIndex: 20
      }}
    >
      <label
        style={{
          background: "#444",
          padding: "6px 12px",
          borderRadius: "6px",
          color: "white",
          cursor: "pointer",
          marginRight: "10px"
        }}
      >
        Upload CSV
        <input
          type="file"
          accept=".csv"
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
            borderRadius: "8px"
          }}
        >
          <div
            style={{
              width: `${uploadProgress}%`,
              height: "100%",
              background: "#4caf50",
              transition: "width 0.2s",
              borderRadius: "8px"
            }}
          />
        </div>
      )}
    </div>


    {/* TradingView Chart */}
    <div
      ref={chartContainerRef}
      style={{ width: "100%", height: "100%" }}
    />
  </div>
);

}
