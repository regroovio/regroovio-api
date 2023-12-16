import express from 'express';
import authRoutes from './routes/auth.routes.js'
import trackRoutes from './routes/track.routes.js'

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/tracks', trackRoutes);
app.get('/health', (req, res) => res.send({ status: 'ok' }));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
