"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const stripe_1 = __importDefault(require("stripe"));
// Use STRIPE_SECRET_KEY from environment variables
const secretKey = process.env.STRIPE_SECRET_KEY;
const stripe = new stripe_1.default(secretKey || 'sk_test_placeholder', {
    apiVersion: '2025-01-27.acacia',
});
exports.default = stripe;
