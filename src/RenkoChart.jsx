import React, { useEffect, useRef, useState } from "react";
import { widget } from "./charting_library";
import { useSearchParams } from "react-router-dom";

const API_BASE = "http://91.203.134.194:8000/api";

export default function RenkoChart() {
  const chartContainerRef = useRef(null);
  const [searchParams] = useSearchParams();
  const [showSettings, setShowSettings] = useState(false);
  const pendingValueRef = useRef(null);
  const pendingMarginRef = useRef(null)

  const [config, setConfig] = useState({
    name: searchParams.get("name"),
    type: searchParams.get("type"),
    brickType: searchParams.get("brickType") || "close",
    method: searchParams.get("method") || "percentage",
    value: searchParams.get("value") || "0.5",
    margin: searchParams.get("margin")
  });

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const { name, type, brickType, method, value, margin } = config;

    const datafeed = {
      onReady: (cb) => {
        cb({
          supported_resolutions: ["1S", "5S", "10S", "1", "5", "15", "30", "60", "240", "D"],
        });
      },

      resolveSymbol: (symbolName, onResolve) => {
        onResolve({
          name: symbolName,
          full_name: symbolName,
          type: "RENKO",
          session: "24x7",
          timezone: "Asia/Kolkata",
          has_intraday: true,
          pricescale: 100,
          minmov: 1,
          has_seconds: true,
          supported_resolutions: ["1S", "5S", "10S", "1", "5", "15", "30", "60", "240", "D"],
        });
      },

      getBars: async (symbolInfo, resolution, periodParams, onHistoryCallback) => {
        if (!periodParams.firstDataRequest) {
          onHistoryCallback([], { noData: true });
          return;
        }
        try {
          const url = `${API_BASE}/get-renko?` + new URLSearchParams({
            brick_type: brickType,
            method: method,
            value: value,
            type: type,
            name: name,
            margin: margin
          });

          const res = await fetch(url);
          if (!res.ok) throw new Error("Renko fetch failed");

          const data = await res.json();

          if (!Array.isArray(data)) {
            onHistoryCallback([], { noData: true });
            return;
          }

          const bars = data
            .map(item => ({
              time: Number(item.time),
              open: Number(item.open),
              high: Number(item.high),
              low: Number(item.low),
              close: Number(item.close),
            }))
            .filter(b =>
              !isNaN(b.time) &&
              !isNaN(b.open) &&
              !isNaN(b.high) &&
              !isNaN(b.low) &&
              !isNaN(b.close)
            )
            .sort((a, b) => a.time - b.time);

          onHistoryCallback(bars, { noData: bars.length === 0 });
        } catch (err) {
          console.error(err);
          onHistoryCallback([], { noData: true });
        }
      },

      subscribeBars: () => {},
      unsubscribeBars: () => {},
    };

    const chart = new widget({
      container: chartContainerRef.current,
      datafeed,
      symbol: name,
      interval: "1S",
      library_path: "/charting_library/",
      theme: "dark",
      autosize: true,
      enabled_features: ["seconds_resolution"],
    });

    chart.onChartReady(() => {
      const renkoBtn = chart.createButton();
      renkoBtn.innerHTML = method === "percentage" ? `Renko (${value}%)` : `Renko (${value})`;
      renkoBtn.setAttribute("title", "Change Renko settings");
      renkoBtn.style.cursor = "pointer";
      renkoBtn.style.fontSize = "14px";
      renkoBtn.style.fontWeight = "600";
      renkoBtn.style.background = "#1e222d";
      renkoBtn.style.borderRadius = "6px";
      renkoBtn.style.padding = "4px 12px";
      renkoBtn.style.color = "#00ffcc";

      renkoBtn.addEventListener("click", () => {
        pendingValueRef.current = value;
        pendingMarginRef.current = margin;
        setShowSettings(true);
      });
    });

    return () => chart.remove();
  }, [config]);

  function applySettings() {
    const newValue = pendingValueRef.current;
    const newMargin  = pendingMarginRef.current
    if (!newValue || !newMargin || isNaN(Number(newMargin)) || Number(newMargin) <= 0 || isNaN(Number(newValue)) || Number(newValue) <= 0) return;
    setShowSettings(false);
    setConfig(prev => ({ ...prev, value: newValue, margin: newMargin }));
  }

  const inputStyle = {
    width: "100%",
    marginTop: "6px",
    padding: "8px 10px",
    borderRadius: "6px",
    backgroundColor: "transparent",
    border: "1px solid #444",
    color: "#fff",
    outline: "none",
    fontSize: "14px",
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh" }}>
      <div ref={chartContainerRef} style={{ width: "100%", height: "100vh" }} />

      {showSettings && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 999,
          }}
        >
          <div
            style={{
              width: "320px",
              backdropFilter: "blur(6px)",
              backgroundColor: "rgba(0,0,0,0.75)",
              padding: "20px",
              borderRadius: "12px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
              color: "#fff",
              fontFamily: "Inter, sans-serif",
            }}
          >
            <h2 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 600 }}>
              Renko Settings
            </h2>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontSize: "13px", opacity: 0.8 }}>
                Brick Percentage Value (%)
              </label>
              <input
                type="number"
                step="0.01"
                defaultValue={config.value}
                autoFocus
                style={inputStyle}
                onChange={(e) => { pendingValueRef.current = e.target.value; }}
                onKeyDown={(e) => { if (e.key === "Enter") applySettings(); }}
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontSize: "13px", opacity: 0.8 }}>
                Total Margin
              </label>
              <input
                type="number"
                step="1"
                defaultValue={config.margin}
                style={inputStyle}
                onChange={(e) => { pendingMarginRef.current = e.target.value; }}
                onKeyDown={(e) => { if (e.key === "Enter") applySettings(); }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
              <button
                onClick={() => setShowSettings(false)}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "1px solid #555",
                  color: "#ccc",
                  padding: "8px 0",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                Cancel
              </button>
              <button
                onClick={applySettings}
                style={{
                  flex: 1,
                  background: "#2962ff",
                  border: "none",
                  color: "#fff",
                  padding: "8px 0",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: 500,
                  fontSize: "14px",
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
