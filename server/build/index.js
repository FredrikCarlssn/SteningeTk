"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
// dotenv.config(); // Firebase handles environment variables
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const admin = __importStar(require("firebase-admin"));
const v2_1 = require("firebase-functions/v2");
const bookings_1 = __importDefault(require("./routes/bookings"));
const payments_1 = __importDefault(require("./routes/payments"));
const members_1 = __importDefault(require("./routes/members"));
// Middleware - Allow only the CLIENT_URL origin from Functions config
const app = (0, express_1.default)();
const corsOptions = {
    // Temporarily allow all origins for debugging
    origin: true, // process.env.CLIENT_URL,
    credentials: true, // Allow cookies/auth headers
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
};
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
// Initialize Firebase Admin SDK (should be done once)
admin.initializeApp();
// Database connection - Use Firebase config for MongoDB URI
const mongoUri = process.env.DB_MONGO_URI ||
    process.env.FIREBASE_CONFIG_DB_MONGO_URI;
console.log('MongoDB URI available:', !!mongoUri);
console.log('Environment variables:', Object.keys(process.env).filter(key => key.startsWith('FIREBASE_CONFIG')));
mongoose_1.default.connect(mongoUri || '')
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => {
    console.error('Could not connect to MongoDB:', err);
    console.error('Check if the VPC connector IP range is whitelisted in MongoDB Atlas');
});
// Routes
app.use('/api/bookings', bookings_1.default);
app.use('/api/payments', payments_1.default);
app.use('/api/members', members_1.default);
// Static files and fallback
// 404 Handler
app.use((req, res) => {
    console.log(`404 Not Found: ${req.method} ${req.url}`);
    res.status(404).json({ message: 'Not Found' });
});
// Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Internal Server Error' });
});
// Export the Express app as an HTTPS Cloud Function using v2 syntax
exports.api = v2_1.https.onRequest({
    vpcConnector: 'test1',
    vpcConnectorEgressSettings: 'ALL_TRAFFIC'
}, app);
