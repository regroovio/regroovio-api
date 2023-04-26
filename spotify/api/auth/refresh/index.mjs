import axios from 'axios';
import serverless from 'serverless-http';
import express from 'express';
import querystring from 'querystring';
import { setEnvironmentVariables } from './setEnvironmentVariables.mjs';

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/refresh', async (req, res) => {
  await setEnvironmentVariables();
  const clientId = process.env.CLIENT_ID_V4;
  const clientSecret = process.env.CLIENT_SECRET_V4;
  const old_refresh_token = req.query.refresh_token
  try {
    const response = await axios.post('https://accounts.spotify.com/api/token', querystring.stringify({
      grant_type: 'refresh_token',
      refresh_token: old_refresh_token,
    }), {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    console.log(response.data);
    const { access_token, refresh_token, expires_in } = response.data;
    const expiration_timestamp = new Date().getTime() + (expires_in * 1000);
    res.send({ access_token, refresh_token, expiration_timestamp });

  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

export const handler = serverless(app);