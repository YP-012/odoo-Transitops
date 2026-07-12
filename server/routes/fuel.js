const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const authenticateToken = require('../middleware/auth');
const Joi = require('joi');
const validateRequest = require('../middleware/validate');

const fuelSchema = Joi.object({
    // Frontend (TripDispatcher) sends: trip_id, liters, cost, odometer_reading, date
    // Server schema uses vehicle_id — we look it up from trip_id
    trip_id: Joi.number().integer().optional(),
    vehicle_id: Joi.number().integer().optional(),
    liters: Joi.number().precision(2).min(0.1).required(),
    cost: Joi.number().precision(2).min(0).required(),
    odometer_reading: Joi.number().integer().optional(),
    date: Joi.date().iso().required()
}).or('trip_id', 'vehicle_id'); // at least one must be provided

router.post('/', authenticateToken, validateRequest(fuelSchema), async (req, res) => {
    try {
        let { vehicle_id, trip_id, liters, cost, date, odometer_reading } = req.body;

        // If trip_id provided, resolve vehicle_id from the trip
        if (trip_id && !vehicle_id) {
            const tripResult = await pool.query('SELECT vehicle_id FROM trips WHERE id = $1', [trip_id]);
            if (tripResult.rows.length === 0) {
                return res.status(404).json({ error: 'Trip not found' });
            }
            vehicle_id = tripResult.rows[0].vehicle_id;
        }

        const result = await pool.query(
            `INSERT INTO fuel_logs (vehicle_id, liters, cost, date) 
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [vehicle_id, liters, cost, date]
        );

        // Optionally update vehicle odometer if provided
        if (odometer_reading && vehicle_id) {
            await pool.query(
                'UPDATE vehicles SET odometer = $1 WHERE id = $2 AND odometer < $1',
                [odometer_reading, vehicle_id]
            );
        }

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/', authenticateToken, async (req, res) => {
    try {
        const { vehicle_id } = req.query;
        let query = `SELECT f.*, v.name as vehicle_name 
                     FROM fuel_logs f 
                     JOIN vehicles v ON f.vehicle_id = v.id 
                     WHERE 1=1`;
        const params = [];

        if (vehicle_id) {
            params.push(vehicle_id);
            query += ` AND f.vehicle_id = $${params.length}`;
        }

        query += ' ORDER BY f.date DESC';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
