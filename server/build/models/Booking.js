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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Booking = exports.SlotSchema = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const const_1 = require("../const");
exports.SlotSchema = new mongoose_1.Schema({
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    courtNumber: { type: Number, required: true, enum: [1, 2] },
    available: { type: Boolean, required: true, default: true },
});
const bookingSchema = new mongoose_1.Schema({
    date: { type: Date, required: true },
    slots: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Slot',
            required: true
        }],
    user: {
        name: { type: String, required: false },
        email: { type: String, required: false },
        phone: { type: String, required: false },
    },
    payment: {
        method: { type: String, required: false },
        amount: {
            type: Number,
            required: true,
            default: function () {
                return const_1.HOURLY_PRICE_IN_SEK * this.slots.length;
            }
        },
        status: {
            type: String,
            required: true,
            enum: ['pending', 'completed', 'failed', 'cancelled', 'refunded']
        },
        paymentId: { type: String, required: false },
    },
    createdAt: { type: Date, default: Date.now },
    cancellationToken: {
        type: String,
        required: true,
        unique: true
    },
});
bookingSchema.virtual('id').get(function () {
    return this._id.toHexString();
});
bookingSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (doc, ret) {
        delete ret._id;
    }
});
exports.Booking = mongoose_1.default.model('Booking', bookingSchema);
