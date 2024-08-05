import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
dotenv.config();

const port = process.env.PORT || 8000;

// Helper function to check if a date is a weekend
const isWeekend = (date) => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

// Helper function to check if the time is within market hours
const isMarketHour = (date) => {
  const hour = date.getHours();
  const minutes = date.getMinutes();
  return (hour > 9 || (hour === 9 && minutes >= 15)) && (hour < 15 || (hour === 15 && minutes <= 30));
};

// Generate mock financial data
const generateMockData = (symbol, interval, startDate, endDate) => {
  const data = [];
  let currentDate = new Date(startDate);
  const end = new Date(endDate);
  let basePrice = 100; // Starting base price for the first data point

  while (currentDate <= end) {
    // Skip weekends
    if (isWeekend(currentDate)) {
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }

    // Skip times outside market hours
    if (!isMarketHour(currentDate)) {
      currentDate.setMinutes(currentDate.getMinutes() + 1);
      continue;
    }

    const open = (basePrice + Math.random() * 10 - 5).toFixed(2);
    const close = (parseFloat(open) + Math.random() * 10 - 5).toFixed(2);
    const high = Math.max(open, close, (Math.random() * 10 + parseFloat(close)).toFixed(2));
    const low = Math.min(open, close, (parseFloat(close) - Math.random() * 10).toFixed(2));

    data.push({
      time: Math.floor(currentDate.getTime() / 1000), // Unix timestamp in seconds
      open: parseFloat(open),
      high: parseFloat(high),
      low: parseFloat(low),
      close: parseFloat(close),
      volume: Math.floor(Math.random() * 1000),
    });

    basePrice = parseFloat(close); // Set the base price for the next iteration

    // Increment time based on the interval
    switch (interval) {
      case '1S':
        currentDate.setSeconds(currentDate.getSeconds() + 1);
        break;
      case '1MIN':
        currentDate.setMinutes(currentDate.getMinutes() + 1);
        break;
      case '1H':
        currentDate.setHours(currentDate.getHours() + 1);
        break;
      case '1D':
        currentDate.setDate(currentDate.getDate() + 1);
        break;
      case '1W':
        currentDate.setDate(currentDate.getDate() + 7);
        break;
      case '1M':
        currentDate.setMonth(currentDate.getMonth() + 1);
        break;
      default:
        currentDate.setDate(currentDate.getDate() + 1);
    }
  }
  return data;
};

// Example endpoint for TradingView advanced chart data
app.get('/api/chart-data', (req, res) => {
  const symbol = req.query.symbol || 'AAPL';
  const interval = req.query.interval || '1D';
  const endDate = req.query.endDate || new Date().toISOString().split('T')[0];
  const startDate = req.query.startDate || '1970-01-01';

  // Validate date format YYYY-MM-DD
  const isValidDate = (dateStr) => /^\d{4}-\d{2}-\d{2}$/.test(dateStr);

  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
  }

  const chartData = generateMockData(symbol, interval, startDate, endDate);

  res.json(chartData);
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
