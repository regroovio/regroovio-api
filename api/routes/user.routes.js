import express from 'express';
import loadEnvironmentVariables from '../helpers/environment.js';

const router = express.Router();

router.post('/add/genre', async (req, res) => {
    await loadEnvironmentVariables();
});

router.get('/get/genre', async (req, res) => {
    await loadEnvironmentVariables();
});


export default router;
