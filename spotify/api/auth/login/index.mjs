import serverless from 'serverless-http';
import express from 'express';
import querystring from 'querystring';
import { setEnvironmentVariables } from './setEnvironmentVariables.mjs';

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const scopes = [
  'ugc-image-upload',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'streaming',
  'app-remote-control',
  'user-read-email',
  'user-read-private',
  'playlist-read-collaborative',
  'playlist-modify-public',
  'playlist-read-private',
  'playlist-modify-private',
  'user-library-modify',
  'user-library-read',
  'user-top-read',
  'user-read-playback-position',
  'user-read-recently-played',
  'user-follow-read',
  'user-follow-modify',
];

const generateRandomString = (length) => {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

app.get('/login', async (req, res) => {
  await setEnvironmentVariables();
  const clientId = process.env.CLIENT_ID_V4;
  const redirectUri = `https://${process.env.STAGE == 'dev' ? `${process.env.STAGE}.` : ``}${process.env.SPOTIFY_API}/callback`;
  const state = generateRandomString(16);
  const scope = scopes.join(' ');
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: clientId,
      scope: scope,
      redirect_uri: redirectUri,
      state: state,
    }));
});

export const handler = serverless(app);