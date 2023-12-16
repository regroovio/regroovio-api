import express from 'express';
import loadEnvironmentVariables from '../helpers/environment.js';

const router = express.Router();


router.get('/login', async (req, res) => {
    await loadEnvironmentVariables();
});

router.get('/post-verify-email', async (req, res) => {
    await loadEnvironmentVariables();
});

router.get('/request-password-reset', async (req, res) => {
    await loadEnvironmentVariables();
});

router.get('/resend-email-code', async (req, res) => {
    await loadEnvironmentVariables();
});

router.get('/set-new-password', async (req, res) => {
    await loadEnvironmentVariables();
});

router.get('/signup', async (req, res) => {
    await loadEnvironmentVariables();
});

router.get('/validate-token', async (req, res) => {
    await loadEnvironmentVariables();
});

router.get('/verify-email-code', async (req, res) => {
    await loadEnvironmentVariables();
});

export default router;
