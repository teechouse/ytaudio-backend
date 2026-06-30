const express = require('express');
const cors = require('cors');
const ytdl = require('@distube/ytdl-core');
const NodeCache = require('node-cache');

const app = express();
app.use(cors());
app.use(express.json());

// Cache resolved audio URLs for 4 hours (YouTube signed URLs expire ~6h)
const cache = new NodeCache({ stdTTL: 4 * 60 * 60 });

const PORT = process.env.PORT || 3000;

function extractVideoId(url) {
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /m\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function extractPlaylistId(url) {
  const m = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

// ── GET /resolve?url=<youtube_url> ──────────────────────────────────────────
// Returns { videoId, title, thumbnail, duration, audioUrl, expiresAt }
app.get('/resolve', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Missing url parameter' });

    const videoId = extractVideoId(url);
    if (!videoId) return res.status(400).json({ error: 'Invalid YouTube URL' });

    const cacheKey = `video:${videoId}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const info = await ytdl.getInfo(videoId);

    // Pick the best audio-only format
    const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
    if (audioFormats.length === 0) {
      return res.status(404).json({ error: 'No audio stream found for this video' });
    }

    // Sort by audio bitrate, pick highest quality under reasonable size
    audioFormats.sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0));
    const best = audioFormats[0];

    const result = {
      videoId,
      title: info.videoDetails.title,
      author: info.videoDetails.author?.name || '',
      thumbnail: info.videoDetails.thumbnails?.[0]?.url || '',
      duration: parseInt(info.videoDetails.lengthSeconds, 10) || 0,
      audioUrl: best.url,
      mimeType: best.mimeType,
      resolvedAt: Date.now(),
    };

    cache.set(cacheKey, result);
    res.json(result);
  } catch (err) {
    console.error('Resolve error:', err.message);
    res.status(500).json({ error: 'Failed to resolve video', detail: err.message });
  }
});

// ── GET /playlist?url=<playlist_url> ────────────────────────────────────────
// Returns { playlistId, title, items: [{ videoId, title, thumbnail }] }
app.get('/playlist', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Missing url parameter' });

    const playlistId = extractPlaylistId(url);
    if (!playlistId) return res.status(400).json({ error: 'Invalid playlist URL' });

    const cacheKey = `playlist:${playlistId}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    // Use ytpl-style scraping via ytdl's internal playlist support
    const ytpl = require('@distube/ytpl');
    const playlist = await ytpl(playlistId, { limit: 100 });

    const result = {
      playlistId,
      title: playlist.title,
      items: playlist.items.map((item) => ({
        videoId: item.id,
        title: item.title,
        thumbnail: item.thumbnails?.[0]?.url || item.bestThumbnail?.url || '',
        duration: item.durationSec || 0,
      })),
    };

    cache.set(cacheKey, result, 30 * 60); // playlists cached 30 min
    res.json(result);
  } catch (err) {
    console.error('Playlist error:', err.message);
    res.status(500).json({ error: 'Failed to resolve playlist', detail: err.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`YT Audio backend running on port ${PORT}`);
});
