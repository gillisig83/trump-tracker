export default async function handler(req, res) {
  try {
    const apiKey = process.env.NEWSAPI_KEY;
    if (!apiKey) {
      return res.status(200).json({
        articles: [{
          title: "Add NEWSAPI_KEY in .env.local",
          description: "Showing demo data. Get a key at https://newsapi.org/",
          url: "https://newsapi.org/",
          source: { name: "Demo" },
          publishedAt: new Date().toISOString(),
        }]
      });
    }

    const url = `https://newsapi.org/v2/everything?q=donald+trump&sortBy=publishedAt&pageSize=5&language=en&apiKey=${apiKey}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Upstream error ${r.status}`);
    const data = await r.json();

    return res.status(200).json(data);
  } catch (e) {
    return res.status(200).json({
      articles: [{
        title: "Couldn’t reach NewsAPI (demo data)",
        description: String(e?.message || "Unknown error"),
        url: "http://localhost:3000",
        source: { name: "Local" },
        publishedAt: new Date().toISOString(),
      }]
    });
  }
}
