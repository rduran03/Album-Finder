const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const CLIENT_ID = 'b26663ac97714307ba0ec0a5f3cf706f';
const CLIENT_SECRET = '54636f28cdbd4666843475cfa27947bd';

let cachedToken = null;
let tokenExpiry = 0;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
};

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
    },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Failed to get Spotify token');
  }

  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken;
}

async function spotifyFetch(url, token) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || 'Spotify API request failed');
  }

  return data;
}

async function getArtistAlbums(artistName) {
  const token = await getAccessToken();

  const searchData = await spotifyFetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(artistName)}&type=artist&limit=1`,
    token
  );

  const artist = searchData.artists?.items?.[0];
  if (!artist) {
    return { artist: null, albums: [] };
  }

  const artistData = await spotifyFetch(
    `https://api.spotify.com/v1/artists/${artist.id}`,
    token
  );

  const albumsData = await spotifyFetch(
    `https://api.spotify.com/v1/artists/${artist.id}/albums?include_groups=album&limit=10`,
    token
  );

  return {
    artist: {
      name: artistData.name,
      image: artistData.images[0]?.url || null,
      followers: artistData.followers?.total ?? 0,
      genres: artistData.genres ?? [],
    },
    albums: albumsData.items || [],
  };
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function serveStatic(req, res) {
  const filePath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const fullPath = path.join(__dirname, filePath);

  if (!fullPath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(fullPath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const ext = path.extname(fullPath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'text/plain' });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.url.startsWith('/api/albums?')) {
    const artistName = new URL(req.url, `http://localhost:${PORT}`).searchParams.get('artist')?.trim();

    if (!artistName) {
      sendJson(res, 400, { error: 'Missing artist name' });
      return;
    }

    try {
      const result = await getArtistAlbums(artistName);
      sendJson(res, 200, result);
    } catch (error) {
      console.error(error);
      sendJson(res, 500, { error: error.message });
    }
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Album Finder running at http://localhost:${PORT}`);
});
