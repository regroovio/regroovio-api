import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { login } from '../controllers/auth/login/index.mjs';
import { signUp } from '../controllers/auth/signup/index.mjs';
import { verifyEmailCode } from '../controllers/auth/verify-email-code/index.mjs';

const router = express.Router();

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

router.post('/signup', [
    body('email').isEmail(),
    body('password').isLength({ min: 8 })
], handleValidationErrors, async (req, res) => {
    const respose = await signUp(req, res);
    res.status(respose.statusCode).send(respose);
});

router.post('/verify-email-code', [
    body('username'),
    body('confirmationCode').isLength({ min: 6 })
], handleValidationErrors, async (req, res) => {
    const respose = await verifyEmailCode(req, res);
    res.status(respose.statusCode).send(respose);
});

router.get('/resend-email-code', [
], handleValidationErrors, async (req, res) => {
});

router.get('/post-verify-email', [
], handleValidationErrors, async (req, res) => {
});

router.post('/login', [
    body('username'),
    body('password').isLength({ min: 5 })
], handleValidationErrors, async (req, res) => {
    const respose = await login(req, res);
    res.status(respose.statusCode).send(respose);
});

router.get('/request-password-reset', [
    query('email').isEmail(),
], handleValidationErrors, async (req, res) => {
});

router.get('/set-new-password', [
    body('password').isLength({ min: 8 }),
    body('confirmPassword').custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error('Password confirmation does not match password');
        }
        return true;
    })
], handleValidationErrors, async (req, res) => {
});

router.get('/validate-token', [
], handleValidationErrors, async (req, res) => {
});

export default router;
