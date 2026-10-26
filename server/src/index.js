const path = require('path');

// --- Robust Path Polyfill for Production/VPS Environments ---
// Handles cases where __dirname might be missing (ESM or specific bundlers)
let _dirname;
try {
  _dirname = __dirname;
} catch (e) {
  // Fallback if __dirname is missing (likely ESM or Bundled)
  _dirname = process.cwd(); 
  if (_dirname.endsWith('src')) _dirname = path.join(_dirname, '..');
}

let express;
try {
  express = require('express');
} catch (e) {
  console.error('\n[FATAL ERROR] "express" module not found.');
  console.error('Please run "npm install" on your VPS to install dependencies.');
  console.error('If using cPanel, click "Run JS Install" in the Node.js Setup.\n');
  process.exit(1);
}

const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();
const { connectDB } = require('./config/db');
const socketHandler = require('./socket/handler');

// Connect to Database
connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all for now, lock down in production
    methods: ["GET", "POST"]
  },
  maxHttpBufferSize: 2e6, // 2MB
  perMessageDeflate: true // Compress websocket payloads
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use('/uploads', express.static(path.resolve(_dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/devices', require('./routes/devices'));


// Routes
if (process.env.NODE_ENV === 'production') {
  // Explicit base path for production files to avoid PathError on VPS
  const distPath = path.resolve(_dirname, '../client/dist');
  
  app.use(express.static(distPath));
  
  // Vue SPA fallback with absolute path safety
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads') && !req.path.startsWith('/socket.io')) {
      const indexPath = path.join(distPath, 'index.html');
      return res.sendFile(indexPath);
    }
    next();
  });
} else {
  // Development fallback
  app.get('/', (req, res) => {
    res.send('AG PWA Server Running');
  });
}

// Socket.io
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  socketHandler(io, socket);
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  console.log(`\n[SERVER] Received ${signal}, starting graceful shutdown...`);
  if (typeof socketHandler.flushAllSnapshots === 'function') {
      await socketHandler.flushAllSnapshots();
  }
  server.close(() => {
      console.log('[SERVER] HTTP server closed.');
      process.exit(0);
  });
  
  // Force exit after 5 seconds just in case
  setTimeout(() => process.exit(1), 5000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
