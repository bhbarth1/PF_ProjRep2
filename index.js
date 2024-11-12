require('dotenv').config();
const axios = require('axios');
const { MongoClient } = require('mongodb');

//index.js fetches stock data frrom AlphaVantage API and loads it into a MongoDB database (used in HW1/HW2)

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY; //create .env file in directory with text from next comment line
//ALPHA_VANTAGE_API_KEY={INSERT_YOUR_KEY}

const MONGODB_URI = 'mongodb://localhost:27017'; // Update with your MongoDB URI
const DATABASE_NAME = 'stockData';
const COLLECTION_NAME = 'stocks';

const tickers = [
  'AAPL', 'GOOGL', 'MSFT', 'AMZN', 'FB',
  'TSLA', 'NFLX', 'NVDA', 'BRK.B', 'V',
  'JNJ', 'WMT', 'UNH', 'PG', 'HD',
  'VZ', 'INTC', 'CMCSA', 'PFE', 'ADBE'
];

async function fetchStockData(ticker) {
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${ticker}&apikey=${ALPHA_VANTAGE_API_KEY}`;
  const response = await axios.get(url);
  return response.data;
}

async function saveToMongoDB(data) {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const database = client.db(DATABASE_NAME);
    const collection = database.collection(COLLECTION_NAME);

    await collection.insertOne(data);
    console.log(`Data for ${data.symbol} saved successfully.`);
  } catch (error) {
    console.error('Error saving to MongoDB:', error);
  } finally {
    await client.close();
  }
}

async function main() {
  for (const ticker of tickers) {
    try {
      const data = await fetchStockData(ticker);
      if (data['Time Series (Daily)']) {
        const stockData = {
          symbol: ticker,
          data: data['Time Series (Daily)'],
        };
        await saveToMongoDB(stockData);
      } else {
        console.error(`No data found for ${ticker}`);
      }
    } catch (error) {
      console.error(`Error fetching data for ${ticker}:`, error);
    }
  }
}

main();
//ONLY GET 25 REQUESTS PER DAY FROM ALPHA VANTAGE
