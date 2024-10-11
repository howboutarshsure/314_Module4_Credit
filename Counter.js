const mongoose = require('mongoose');

// Create a schema for the counter
const counterSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    sequence_value: { type: Number, default: 0 }
});

// Create a model for the counter
const Counter = mongoose.model('Counter', counterSchema);

module.exports = Counter;
