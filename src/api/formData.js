export const formatData = (data) => {
  
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
};
