import axios from "axios";

const fetchStockData = async (ticker, resolution, from, to) => {
  const API_URL = 'http://localhost:8000/api/chart-data';

  try {
    const response = await axios.get(API_URL, {
      params: {
        symbol: ticker,
        resolution: resolution,
        from: from,
        to: to
      }
    });

    if (response.data && Array.isArray(response.data)) {
      return response.data.map(item => ({
        time: item.time,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume
      }));
    } else {
      throw new Error('Invalid data format');
    }
  } catch (error) {
    console.error('Error fetching stock data:', error);
    throw error;
  }
};

export default fetchStockData;
