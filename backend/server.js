
const express = require('express');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

// Home route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to StockMate API'
  });
});

// Health check route
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    project: 'StockMate'
  });
});

// Sample inventory route
app.get('/inventory', (req, res) => {
  res.json([
    { id: 1, name: 'Rice', quantity: 10 },
    { id: 2, name: 'Sugar', quantity: 5 }
  ]);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`StockMate API running on port ${PORT}`);
});
