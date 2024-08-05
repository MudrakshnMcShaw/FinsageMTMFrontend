import React, { useEffect } from 'react';
// import './App.css';
import { widget } from './charting_library';

// Function to fetch data from API
async function fetchData(symbol, resolution, from, to) {
  const response = await fetch(`http://localhost:8000/api/chart-data?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}`);
  const data = await response.json();
  return data;
}

// Function to format data for TradingView
function formatDataForTradingView(data) {
  if (!data || data.length === 0) return [];

  return data.map(item => {
    if (!item.time || isNaN(item.time)) {
      console.error('Invalid timestamp:', item.time);
      return null;
    }
    return {
      time: item.time * 1000, // Convert to milliseconds
      high: parseFloat(item.high),
      low: parseFloat(item.low), // Added missing 'low' property
      open: parseFloat(item.open),
      close: parseFloat(item.close),
      volume: parseInt(item.volume, 10)
    };
  }).filter(item => item !== null);
}

const symbols = [
  { symbol: 'client1', full_name: 'Client 1', type: 'client' },
  { symbol: 'client2', full_name: 'Client 2', type: 'client' },
  { symbol: 'client3', full_name: 'Client 3', type: 'client' },
  { symbol: 'client4', full_name: 'Client 4', type: 'client' },
  { symbol: 'client5', full_name: 'Client 5', type: 'client' },
  { symbol: 'algo1', full_name: 'Algo 1', type: 'algo' },
  { symbol: 'algo2', full_name: 'Algo 2', type: 'algo' },
  { symbol: 'algo3', full_name: 'Algo 3', type: 'algo' },
  { symbol: 'algo4', full_name: 'Algo 4', type: 'algo' },
  { symbol: 'algo5', full_name: 'Algo 5', type: 'algo' }
];

const Datafeed = {
  onReady: (callback) => {
    setTimeout(() => callback({
      supports_search: true,
      supports_group_request: false,
      supports_marks: true,
      supports_timescale_marks: true,
      supports_time: true,
      symbols_types: [
        { name: "ClientAlgo", value: "" },
        { name: "Clients", value: "client" },
        { name: "Algos", value: "algo" }
      ],
    }), 0);
  },

  searchSymbols: async (userInput, exchange, symbolType, onResultReadyCallback) => {

    // Filter symbols based on user input and symbol type
    const filteredSymbols = symbols.filter(symbol => {
      const matchesInput = symbol.symbol.toLowerCase().startsWith(userInput.toLowerCase());
      const matchesType = !symbolType || symbol.type === symbolType || symbolType === "";
      return matchesInput && matchesType;
    });

    //lude both client and algo symbols when the type is "ClientAlgo"
    if (symbolType === "") {
      const clientSymbols = symbols.filter(symbol => symbol.type === 'client');
      const algoSymbols = symbols.filter(symbol => symbol.type === 'algo');
      filteredSymbols.push(...clientSymbols, ...algoSymbols);
    } else if (symbolType === 'client') {
      const clientSymbols = symbols.filter(symbol => symbol.type === 'client')
      filteredSymbols.push(...clientSymbols)
    } else if (symbolType === 'algo') {
      const algoSymbols = symbols.filter(symbol => symbol.type === 'algo')
      filteredSymbols.push(...algoSymbols)
    }

    // Format the filtered symbols for TradingView
    const formattedSymbols = filteredSymbols.map(symbol => ({
      symbol: symbol.symbol,
      full_name: symbol.full_name,
      description: symbol.full_name,
      exchange: exchange,
      type: symbol.type
    }));
    // Add selected symbol and other params to search params
    // const searchParams = new URLSearchParams(window.location.search);
    // searchParams.set('selectedSymbol', userInput);

    // window.history.replaceState(null, '', `${window.location.pathname}?${searchParams.toString()}`);
    onResultReadyCallback(formattedSymbols);
  },

  resolveSymbol: (symbolName, onSymbolResolvedCallback, onResolveErrorCallback) => {
    setTimeout(() => {
      onSymbolResolvedCallback({
        name: symbolName,
        ticker: symbolName,
        session: '0915-1530',
        timezone: 'Asia/Kolkata', // Updated timezone
        has_no_volume: false,
        minmov: 1,
        pricescale: 100,
        type: 'stock',
        has_weekly_and_monthly: true,
        has_intraday: true,
        has_daily: true
      });
    }, 0);
  },

  getBars: async (symbolInfo, resolution, periodParams, historyCallback, onErrorCallback) => {
    const { from, to } = periodParams;
    try {
      const data = await fetchData(symbolInfo.ticker, resolution, from, to);
      if (!data || data.length === 0) {
        throw new Error('No data returned from fetchStockData');
      }
      const formattedData = formatDataForTradingView(data);
      console.log(formattedData);
      historyCallback(formattedData, { noData: formattedData.length === 0 });
    } catch (error) {
      console.error('Error fetching bars:', error);
      if (typeof onErrorCallback === 'function') {
        onErrorCallback(error);
      } else {
        historyCallback([], { noData: true });
      }
    }
  },

  subscribeBars: (symbolInfo, resolution, onRealtimeCallback, subscriberUID, onResetCacheNeededCallback) => {
    console.log('Subscribed');
    // Implement real-time updates if needed
  },

  unsubscribeBars: (subscriberUID) => {
    console.log('Unsubscribed');
    // Implement unsubscribe logic if needed
  }
};

const App = () => {
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    const initChart = () => {
      if (!containerRef.current) {
        console.error('Container reference is null');
        return;
      }

      const chart = new widget({
        container_id: 'tv-chart-container',
        container: containerRef.current,
        symbol: 'IBM',
        interval: 'D',
        datafeed: Datafeed,
        library_path: 'charting_library/',
        locale: 'en',
        disabled_features: ['use_localstorage_for_settings'],
        enabled_features: ['study_templates'],
        charts_storage_url: 'https://saveload.tradingview.com',
        charts_storage_api_version: '1.1',
        clientId: 'tradingview.com',
        userId: 'public_user_id',
        style: '1',
        timezone: 'Asia/Kolkata',
        theme: "dark",
        fullscreen: false,
        autosize: true,
        hide_side_toolbar: false,
        allow_symbol_change: true,
        withdateranges: true,
        news: ['headlines'],
        save_image: true,
        details: true,
        hotlist: true,
        calendar: true,
        // header_saveload: true,
      });

      chart.onChartReady(() => {
        console.log('Chart has been initialized');
      });

      return () => {
        chart.remove();
        console.log('Chart removed');
      };
    };

    // Delay initialization to ensure the element exists
    const timeoutId = setTimeout(initChart, 100);

    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <div ref={containerRef} className="TVChartContainer" />
  );
}

export default App;
