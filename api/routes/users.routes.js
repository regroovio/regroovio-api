import express from 'express';
import { body, validationResult } from 'express-validator';
import { getGenres } from '../controllers/auth/get-user-genres/index.mjs';
import { addGenres } from '../controllers/auth/add-user-genres/index.mjs';

const router = express.Router();

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

router.post('/add-genres', [
    body('user_id'),
    body('genres'),
], handleValidationErrors, async (req, res) => {
    const respose = await addGenres(req, res);
    res.status(respose.statusCode).send(respose);
});

router.get('/get-genres', [
    body('user_id'),
], handleValidationErrors, async (req, res) => {
    const respose = await getGenres(req, res);
    res.status(respose.statusCode).send(respose);
});

export default router;
