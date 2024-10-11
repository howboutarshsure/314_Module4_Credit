const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const weather = require('weather-js');
const Counter = require('./Counter'); // Import the Counter model

const app = express();
app.use(bodyParser.json()); // Middleware to parse JSON requests

// MongoDB connection string
const uri = 'mongodb+srv://arshsure:rfQ9tRtN9EwkxbIs@weather.zt4s9.mongodb.net/weather_db?retryWrites=true&w=majority';

// Connect to MongoDB
mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB Atlas');
}).catch(err => {
    console.error('Failed to connect to MongoDB:', err.message);
});

// MongoDB schema and model for temperature readings with auto-incrementing IDs
const TemperatureSchema = new mongoose.Schema({
    _id: Number, // Auto-incrementing ID
    value: Number,
    timestamp: { type: Date, default: Date.now }
});

const Temperature = mongoose.model('Temperature', TemperatureSchema);

// Global variable to track the latest temperature
let latestTemperature = null;

// Function to get the next sequence value for the temperature ID
async function getNextSequenceValue(sequenceName) {
    const counter = await Counter.findByIdAndUpdate(
        { _id: sequenceName },
        { $inc: { sequence_value: 1 } },
        { new: true, upsert: true } // Create the counter if it doesn't exist
    );
    return counter.sequence_value;
}

// Create a new temperature reading (CREATE)
app.post('/api/temperature', async (req, res) => {
    const { value } = req.body;
    if (!value) {
        return res.status(400).send('Temperature value is required');
    }

    try {
        const newId = await getNextSequenceValue('temperature_id');
        const newTemperature = new Temperature({ _id: newId, value });
        await newTemperature.save();

        // Update the latest temperature
        latestTemperature = value;

        res.status(201).send(newTemperature);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// Get the latest temperature (READ)
app.get('/api/temperature/latest', (req, res) => {
    if (latestTemperature === null) {
        return res.status(404).send('No temperature data available');
    }
    res.send({ latestTemperature });
});

// Update a temperature reading (UPDATE)
app.put('/api/temperature/:id', async (req, res) => {
    const { value } = req.body;
    const { id } = req.params;

    if (!value) {
        return res.status(400).send('Temperature value is required');
    }

    try {
        const updatedTemperature = await Temperature.findByIdAndUpdate(id, { value }, { new: true });

        // Update the latest temperature if this is the most recent one
        latestTemperature = value;

        res.send(updatedTemperature);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// Delete a temperature reading (DELETE)
app.delete('/api/temperature/:id', async (req, res) => {
    const { id } = req.params;

    try {
        await Temperature.findByIdAndDelete(id);
        res.send({ message: 'Temperature record deleted' });
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// Get weather for a specific location using weather-js
app.get('/api/weather/:location', (req, res) => {
    const { location } = req.params;

    weather.find({ search: location, degreeType: 'C' }, function (err, result) {
        if (err) {
            return res.status(500).send(err.message);
        }

        if (result && result.length > 0) {
            res.send(result[0]);
        } else {
            res.status(404).send('Location not found');
        }
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
