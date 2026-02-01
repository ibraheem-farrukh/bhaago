require('dotenv').config();
const express = require('express');
const connectDB = require('./db');
const authRoutes = require('./routes/auth');
const routesRoutes = require('./routes/routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

const cors = require('cors');
const corsOptions = {origin: 'http://localhost:5173'};

app.use(cors(corsOptions));
app.use(express.json()); 

app.get('/', (req, res) => {
    res.send('Bhaago API is running...');
});

// Auth routes
app.use('/api/auth', authRoutes);

// Routes (saved routes)
app.use('/api/routes', routesRoutes);

// legacy/save-route (kept for backward compatibility)
app.post('/api/save-route', (req, res) => {
    console.log("Data received from client:", req.body);
    
    res.json({ message: 'Data received successfully', receivedData: req.body });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});