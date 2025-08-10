// pages/api/x-posts.js
// Fetches latest posts from X (Twitter) for @realDonaldTrump
// Needs: TWITTER_BEARER in .env.local

const X_API = "https://api.twitter.com/2";

async function getUserId(username, token) {
  const r = await fetch(`${X_API}/users/by/username/${username}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error(`User lookup failed: ${r.status}`);
  const d = await r.json();
  return d?.data?.id;
}

export default async function handler(req, res) {
  try {
    const token = process.env.TWITTER_BEARER || process.env.X_BEARER; // allow either name
    const username = "realDonaldTrump";

    if (!token) {
      return res.status(200).json({
        posts: [
          {
            id: "demo",
            text: "Add TWITTER_BEARER to .env.local to load real posts from X.",
            created_at: new Date().toISOString(),
            url: "https://developer.twitter.com/",
          },
        ],
        username,
        note: "Missing API token",
      });
    }

    const userId = await getUserId(username, token);
    if (!userId) throw new Error("Could not resolve user id");

    const url = new URL(`${X_API}/users/${userId}/tweets`);
    url.searchParams.set("max_results", "5");
    url.searchParams.set("tweet.fields", "created_at,public_metrics,entities");
    url.searchParams.set("exclude", "retweets,replies");

    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Error(`Timeline failed: ${r.status}`);
    const d = await r.json();

    const posts = (d.data || []).map(t => ({
      id: t.id,
      text: t.text,
      created_at: t.created_at,
      url: `https://x.com/${username}/status/${t.id}`,
    }));

    return res.status(200).json({ posts, username });
  } catch (e) {
    return res.status(200).json({
      posts: [
        {
          id: "fallback",
          text: `Couldn't fetch from X: ${e?.message || "Unknown error"}. Showing demo message.`,
          created_at: new Date().toISOString(),
          url: "https://x.com",
        },
      ],
      username: "realDonaldTrump",
    });
  }
}