import axios from 'axios';
import serverless from 'serverless-http';
import express from 'express';
import querystring from 'querystring';

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const clientId = process.env.CLIENT_ID_V2;
const clientSecret = process.env.CLIENT_SECRET_V2;
const redirectUri = `https://${process.env.STAGE}.${process.env.SPOTIFY_API}/callback`;

app.get('/callback', async (req, res) => {
  const code = req.query.code || null;
  const state = req.query.state || null;
  if (state === null) {
    res.redirect('/#' + querystring.stringify({ error: 'state_mismatch' }));
  } else {
    try {
      const response = await axios.post('https://accounts.spotify.com/api/token', querystring.stringify({
        code: code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
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
  }
});

export const handler = serverless(app);