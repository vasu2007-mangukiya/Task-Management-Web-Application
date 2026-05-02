const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const path = require('path');

const app = express();

// ─── CORS: Allow requests from Live Server (5500), localhost (3000), and same-origin ───
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5500',
        'http://127.0.0.1:5500'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// ─── Body Parser: MUST be before routes ───
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Static Files ───
app.use(express.static(path.join(__dirname, 'public')));

// ─── MongoDB Connection ───
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => {
        console.error('❌ MongoDB connection error:', err.message);
        process.exit(1);
    });

// ─── Routes ───
app.use('/api/auth',  require('./routes/authRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));

// ─── Health Check (for testing) ───
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running', port: PORT });
});

// ─── Catch-all: serve frontend SPA ───
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Global Error Handler ───
app.use((err, req, res, next) => {
    console.error('Server Error:', err.message);
    res.status(500).json({ msg: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📋 API base: http://localhost:${PORT}/api`);
});
