import express from 'express';
import { body, validationResult } from 'express-validator';
import { login } from '../controllers/auth/login/index.mjs';
import { signUp } from '../controllers/auth/signup/index.mjs';
import { verifyEmailCode } from '../controllers/auth/verify-email-code/index.mjs';
import { resendConfirmationCode } from '../controllers/auth/resend-email-code/index.mjs';
import { requestPasswordReset } from '../controllers/auth/request-password-reset/index.mjs';
import { validateToken } from '../controllers/auth/validate-token/index.mjs';

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
    body('username'),
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

router.post('/resend-email-code', [
    body('email').isEmail(),
], handleValidationErrors, async (req, res) => {
    const respose = await resendConfirmationCode(req, res);
    res.status(respose.statusCode).send(respose);
});

router.post('/login', [
    body('email').isEmail(),
    body('password').isLength({ min: 5 })
], handleValidationErrors, async (req, res) => {
    const respose = await login(req, res);
    res.status(respose.statusCode).send(respose);
});

router.post('/request-password-reset', [
    body('email').isEmail(),
], handleValidationErrors, async (req, res) => {
    const respose = await requestPasswordReset(req, res);
    res.status(respose.statusCode).send(respose);
});

router.post('/set-new-password', [
    body('username'),
    body('password').isLength({ min: 8 }),
    body('code').isLength({ min: 6 }),
], handleValidationErrors, async (req, res) => {
    const respose = await setNewPassword(req, res);
    res.status(respose.statusCode).send(respose);
});

router.post('/validate-token', [
    body('token'),
], handleValidationErrors, async (req, res) => {
    const respose = await validateToken(req, res);
    res.status(respose.statusCode).send(respose);
});
export default router;
