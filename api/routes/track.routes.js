import express from 'express';
import loadEnvironmentVariables from '../helpers/environment.js';

const router = express.Router();

router.get('new-releases', async (req, res) => {
    await loadEnvironmentVariables();
});

router.get('random-images', async (req, res) => {
    await loadEnvironmentVariables();
});

router.get('random-tracks', async (req, res) => {
    await loadEnvironmentVariables();
});

export default router;
