// pages/api/weekly-roast.js
// Pulls recent videos from YouTube channel RSS feeds and filters for Trump mentions
// Set env var YT_CHANNEL_IDS to a comma-separated list of YouTube channel IDs.
// Example:
// YT_CHANNEL_IDS=UCMtFAi84ehTSYSE9XoHefig,UCVTyTA7-g9nopHeHbeuvpRA,UCa6vGFO9ty8v5KZJXQxdhaw,UCwWhs_6x42TyRM4Wstoq8HA

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_MS = 7 * DAY_MS;
const KEYWORDS = /\btrump|donald\s+trump|ex-president|president\s+trump\b/i;

function parseEntries(xml) {
  // very lightweight parser for YouTube Atom XML
  const entries = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let m;
  while ((m = entryRegex.exec(xml)) !== null) {
    const block = m[1];

    const get = (tag, attr) => {
      if (attr) {
        const r = new RegExp(`<${tag}[^>]*${attr}="([^"]+)"[^>]*>`, "i");
        const mm = r.exec(block);
        return mm ? mm[1] : null;
      }
      const r = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
      const mm = r.exec(block);
      return mm ? mm[1] : null;
    };

    const title = (get("title") || "").replace(/\s+/g, " ").trim();
    const link = get("link", "href");
    const published = get("published");
    const author = (block.match(/<name>([\s\S]*?)<\/name>/i) || [null, ""])[1];

    if (title && link && published) {
      entries.push({ title, url: link, publishedAt: published, author });
    }
  }
  return entries;
}

export default async function handler(req, res) {
  try {
    const idsRaw = process.env.YT_CHANNEL_IDS;
    if (!idsRaw) {
      return res.status(200).json({
        note: "Set YT_CHANNEL_IDS to real channel IDs (comma-separated). Returning demo items.",
        items: [
          {
            title: "Demo: Late-night monologue jokes about Trump",
            url: "https://www.youtube.com/results?search_query=trump+monologue",
            publishedAt: new Date().toISOString(),
            author: "Demo Channel",
          },
        ],
      });
    }

    const ids = idsRaw.split(",").map(s => s.trim()).filter(Boolean);
    const since = Date.now() - WINDOW_MS;
    const results = [];

    for (const id of ids) {
      const rss = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(id)}`;
      try {
        const r = await fetch(rss, { next: { revalidate: 3600 } }); // let Vercel cache hourly
        if (!r.ok) throw new Error(`RSS ${r.status}`);
        const xml = await r.text();
        const entries = parseEntries(xml);

        for (const e of entries) {
          const t = +new Date(e.publishedAt);
          if (Number.isFinite(t) && t >= since) {
            if (KEYWORDS.test(e.title)) {
              results.push(e);
            }
          }
        }
      } catch (err) {
        // skip channel on error but continue others
      }
    }

    // sort newest first, limit to 12
    results.sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));
    return res.status(200).json({ items: results.slice(0, 12) });
  } catch (e) {
    return res.status(200).json({
      note: `Error: ${String(e?.message || e)} (showing demo)`,
      items: [
        {
          title: "Demo: Late-night monologue jokes about Trump",
          url: "https://www.youtube.com/results?search_query=trump+monologue",
          publishedAt: new Date().toISOString(),
          author: "Demo Channel",
        },
      ],
    });
  }
}
