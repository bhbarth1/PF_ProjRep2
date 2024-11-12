require('dotenv').config();
const { MongoClient } = require('mongodb');
const mysql = require('mysql2/promise');  // Using mysql2/promise for async/await support

//mongo_to_mySQL.js takes the stock data already stored in the mongoDB database by index.js
//and loads it into a structured mySQL database
//database called 'stockData' and the specified 'stocks' table must already be created in mySQL for code to work
//instructions for creating those are stored in the SQL_code.txt file

// MySQL connection details
const MYSQL_HOST = process.env.MYSQL_HOST || 'localhost';
const MYSQL_USER = process.env.MYSQL_USER || 'root';
const MYSQL_PASSWORD = process.env.MY_SQL_PASSWORD || 'INSERT_YOUR_MYSQL_PASSWORD_HERE';
const MYSQL_DATABASE = process.env.MYSQL_DATABASE || 'stockData';

// MongoDB connections
const MONGODB_URI = 'mongodb://localhost:27017';
const DATABASE_NAME = 'stockData';
const COLLECTION_NAME = 'stocks';

// MySQL connection setup
async function createMySQLConnection() {
  const connection = await mysql.createConnection({
    host: MYSQL_HOST,
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    database: MYSQL_DATABASE
  });
  console.log('Connected to MySQL');
  return connection;
}

// MongoDB connection and data retrieval
async function fetchStockByTickerAsArray(ticker) {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const database = client.db(DATABASE_NAME);
    const collection = database.collection(COLLECTION_NAME);

    const stock = await collection.findOne({ symbol: ticker });
    return stock ? [stock] : [];
  } catch (error) {
    console.error(`Error fetching stock ${ticker}:`, error);
    return [];
  } finally {
    await client.close();
  }
}


// Function to insert stock data into MySQL (batch insert for better performance)
async function insertStockDataIntoMySQL(connection, ticker, stockData) {
  const rows = [];

  // Process the stock data into the correct format
  for (let date in stockData) {
    const data = stockData[date];
    const { '1. open': open, '2. high': high, '3. low': low, '4. close': close, '5. volume': volume } = data;

    const formattedDate = new Date(date).toISOString().split('T')[0]; // Convert to 'YYYY-MM-DD' format

    rows.push([ticker, formattedDate, open, high, low, close, volume]);
  }

  //console.log('Rows to be inserted:', rows);  // Log rows to see what will be inserted

  // If there are rows to insert
  if (rows.length > 0) {
    const query = `
      INSERT INTO stocks (symbol, date, open, high, low, close, volume)
      VALUES ?
    `;

    try {
      const [results] = await connection.query(query, [rows]);
      console.log(`Inserted ${results.affectedRows} rows for ${ticker}`);
    } catch (err) {
      console.error('Error inserting data into MySQL:', err);
    }
  } else {
    console.log(`No data to insert for ${ticker}`);
  }
}


// Main function to fetch from MongoDB and insert into MySQL
async function main() {
  const connection = await createMySQLConnection();

  const tickers = [
    'AAPL', 'GOOGL', 'MSFT', 'AMZN', 'FB',
    'TSLA', 'NFLX', 'NVDA', 'BRK.B', 'V',
    'JNJ', 'WMT', 'UNH', 'PG', 'HD',
    'VZ', 'INTC', 'CMCSA', 'PFE', 'ADBE'
  ];

  for (const ticker of tickers) {
    try {
      const array = await fetchStockByTickerAsArray(ticker);
      if (array.length > 0) {
        const stockData = array[0].data;
        console.log(`Inserting data for ${ticker}...`);
        await insertStockDataIntoMySQL(connection, ticker, stockData);
      } else {
        console.log(`No data found for ${ticker}`);
      }
    } catch (error) {
      console.error(`Error fetching data for ${ticker}:`, error);
    }
  }

  // Close the MySQL connection once done
  await connection.end();
}

// Call main function
main();
