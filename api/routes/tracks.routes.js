import express from 'express';

import { getNewReleases } from '../controllers/tracks/new-releases/index.mjs';
import { getRandomTracks } from '../controllers/tracks/random-tracks/index.mjs';
import { getRandomImages } from '../controllers/tracks/random-images/index.mjs';

const router = express.Router();

router.get('/new-releases', async (req, res) => {
    const tracks = await getNewReleases(req, res);
    return res.send(tracks);
});

router.get('/random-images', async (req, res) => {
    const images = await getRandomImages(req, res);
    return res.send(images);
});

router.get('/random-tracks', async (req, res) => {
    const tracks = await getRandomTracks(req, res);
    return res.send(tracks);
});

export default router;
