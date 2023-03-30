import axios from 'axios';
import serverless from 'serverless-http';
import express from 'express';
import querystring from 'querystring';

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const clientId = process.env.CLIENT_ID_V2;
const clientSecret = process.env.CLIENT_SECRET_V2;
const redirectUri = `${process.env.AUTH_LAMBDA}/callback`;

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
      const { access_token, refresh_token } = response.data;
      res.send({ access_token, refresh_token });
    } catch (error) {
      res.status(500).send({ error: error.message });
    }
  }
});

export const handler = serverless(app);