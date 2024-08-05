import fetchStockData from './api/stockData';
import { formatData } from './api/formData';

const Datafeed = {
  onReady: (callback) => {
    setTimeout(() => callback({
      supports_search: true,
      supports_group_request: false,
      supports_marks: false,
      supports_timescale_marks: false,
      supports_time: true,
    }), 0);
  },

  resolveSymbol: (symbolName, onSymbolResolvedCallback, onResolveErrorCallback) => {
    if (!symbolName || typeof symbolName !== 'string') {
      onResolveErrorCallback('Invalid symbol name');
      return;
    }

    setTimeout(() => {
      onSymbolResolvedCallback({
        name: symbolName,
        ticker: symbolName,
        session: '0915-1530',
        timezone: 'Asia/Kolkata',
        has_no_volume: false,
        minmov: 1,
        pricescale: 100,
        type: 'stock',
        has_weekly_and_monthly: true,
        has_intraday: true,
        has_daily: true,
      });
    }, 0);
  },

  getBars: async (symbolInfo, resolution, periodParams, historyCallback, onErrorCallback) => {
    const { from, to } = periodParams;
    
    // Validate `from` and `to` values
    if (isNaN(from) || isNaN(to) || from <= 0 || to <= 0) {
      const errorMessage = 'Invalid from or to parameters. They should be positive numbers.';
      console.error(errorMessage);
      if (typeof onErrorCallback === 'function') {
        onErrorCallback(new Error(errorMessage));
      }
      return;
    }

    try {
      const data = await fetchStockData(symbolInfo.ticker, resolution, from, to);

      if (!data || data.length === 0) {
        throw new Error('No data returned from fetchStockData');
      }

      const formattedData = formatData(data);
      setTimeout(() => { historyCallback(formattedData); }, 0);
    } catch (error) {
      console.error('Error fetching bars:', error);
      if (typeof onErrorCallback === 'function') {
        onErrorCallback(error);
      } else {
        historyCallback([], {
          noData: true
        }); // Return an empty array if there's an error and no onErrorCallback
      }
    }
  },

  subscribeBars: (symbolInfo, resolution, onRealtimeCallback, subscriberUID, onResetCacheNeededCallback) => {
    console.log('subscribeBars called with:', { symbolInfo, resolution, subscriberUID });
  },

  unsubscribeBars: (subscriberUID) => {
    console.log('unsubscribeBars called with:', subscriberUID);
  }
};

export default Datafeed;
