// pages/index.js
import { useEffect, useMemo, useRef, useState } from "react";

function tagsForArticle(a) {
  const text = `${a.title || ""} ${a.description || ""}`.toLowerCase();
  const tags = [];
  if (/\bcampaign|rally|primary|town hall|stump|door[-\s]?knock|volunteer|ballot\b/.test(text)) tags.push("Campaign");
  if (/\bcourt|hearing|indictment|trial|appeal|judge|ruling|attorney|lawsuit|legal\b/.test(text)) tags.push("Legal/Court");
  if (/\binterview|cnn|fox|msnbc|abc news|nbc|cbs|press|media|broadcast|podcast\b/.test(text)) tags.push("Media");
  if (/\btruth social|tweet|twitter|x\.com|post(ed)?\b/.test(text)) tags.push("Social");
  if (/\bfundrais(er|ing)|donor|donation|pac\b/.test(text)) tags.push("Fundraising");
  if (/\bpolicy|plan|proposal|executive order|agenda|platform\b/.test(text)) tags.push("Policy");
  if (tags.length === 0) tags.push("Other");
  return Array.from(new Set(tags));
}

const ALL_FILTERS = ["Campaign", "Legal/Court", "Media", "Social", "Fundraising", "Policy", "Other"];

export default function Home() {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState([]);
  const [theme, setTheme] = useState("light");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [weekly, setWeekly] = useState([]);
  const [weeklyLoading, setWeeklyLoading] = useState(true);

  const refetching = useRef(false);

  // Theme init
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("tt-theme") : null;
    const next = saved === "dark" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("tt-theme", next);
  };

  // Fetch news (hourly)
  const fetchNews = async () => {
    if (refetching.current) return;
    refetching.current = true;
    setLoading(true);
    try {
      const res = await fetch("/api/trump-news");
      const data = await res.json();
      setUpdates(Array.isArray(data.articles) ? data.articles : []);
      setLastUpdated(new Date());
    } catch {
      setUpdates([]);
    } finally {
      setLoading(false);
      refetching.current = false;
    }
  };

  // Fetch weekly roast (once on load, then every 6h)
  const fetchWeekly = async () => {
    setWeeklyLoading(true);
    try {
      const res = await fetch("/api/weekly-roast");
      const data = await res.json();
      setWeekly(Array.isArray(data.items) ? data.items : []);
    } catch {
      setWeekly([]);
    } finally {
      setWeeklyLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
    fetchWeekly();
    const id = setInterval(fetchNews, 60 * 60 * 1000);
    const id2 = setInterval(fetchWeekly, 6 * 60 * 60 * 1000);
    return () => {
      clearInterval(id);
      clearInterval(id2);
    };
  }, []);

  // Tag + filter
  const tagged = useMemo(() => updates.map(a => ({ ...a, tags: tagsForArticle(a) })), [updates]);
  const filtered = useMemo(() => {
    if (!active.length) return tagged;
    return tagged.filter(a => a.tags.some(t => active.includes(t)));
  }, [tagged, active]);

  const toggleFilter = (name) => {
    setActive(prev => prev.includes(name) ? prev.filter(f => f !== name) : [...prev, name]);
  };

  return (
    <main className="container">
      <div className="header">
        <div>
          <h1 className="h1">🕒 Trump Tracker</h1>
          <p className="sub">Real headlines pulled every hour. Filter by topic. Toggle dark mode.</p>
          <div style={{ fontSize: 12, marginTop: 6, color: "var(--muted)" }}>
            {lastUpdated ? `Last updated: ${lastUpdated.toLocaleString()}` : "Waiting for first update…"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="toggle" onClick={toggleTheme}>
            {theme === "dark" ? "🌞 Light mode" : "🌙 Dark mode"}
          </button>
          <button className="toggle" onClick={fetchNews} disabled={loading}>
            {loading ? "Refreshing…" : "🔄 Refresh now"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="toolbar">
        <span style={{ fontSize: 14, color: "var(--muted)" }}>Filters:</span>
        {ALL_FILTERS.map(f => (
          <button
            key={f}
            className={`btn ${active.includes(f) ? "active" : ""}`}
            onClick={() => toggleFilter(f)}
            aria-pressed={active.includes(f)}
            title={`Toggle ${f}`}
          >
            {f}
          </button>
        ))}
        {active.length > 0 && (
          <button className="btn" onClick={() => setActive([])} title="Clear filters">Clear</button>
        )}
      </div>

      {/* News list */}
      {loading && updates.length === 0 ? (
        <p>Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="warn">
          <strong>No stories match those filters.</strong> Try clearing some filters.
        </div>
      ) : (
        <section>
          {filtered.map((a, i) => (
            <article key={i} className="card">
              <h3>{a.title}</h3>
              {a.description ? <p style={{ margin: "6px 0 10px 0" }}>{a.description}</p> : null}
              <a className="link" href={a.url} target="_blank" rel="noreferrer">Read more →</a>
              <div className="meta">
                {a.source?.name || "Unknown source"} · {a.publishedAt ? new Date(a.publishedAt).toLocaleString() : "Unknown time"}
              </div>
              <div className="chips">
                {a.tags.map((t, idx) => (
                  <span className="chip" key={idx}>{t}</span>
                ))}
              </div>
            </article>
          ))}
        </section>
      )}

      {/* Weekly Roast */}
      <section style={{ marginTop: 28 }}>
        <h2 className="h1" style={{ fontSize: 20, marginBottom: 8 }}>Weekly Roast (last 7 days)</h2>
        {weeklyLoading && weekly.length === 0 ? (
          <p>Loading weekly videos…</p>
        ) : weekly.length === 0 ? (
          <div className="warn">
            <strong>No matching videos found.</strong> Make sure <code>YT_CHANNEL_IDS</code> is set to late-night channels.
          </div>
        ) : (
          weekly.map((v, idx) => (
            <article key={idx} className="card">
              <h3 style={{ marginBottom: 6 }}>{v.title}</h3>
              <div className="meta">
                {v.author ? `${v.author} · ` : ""}{new Date(v.publishedAt).toLocaleString()}
              </div>
              <a className="link" href={v.url} target="_blank" rel="noreferrer">Watch on YouTube →</a>
            </article>
          ))
        )}
      </section>

      <footer style={{ marginTop: 24, fontSize: 12, color: "var(--muted)" }}>
        Tip: Set <code>NEWSAPI_KEY</code> and <code>YT_CHANNEL_IDS</code> in your env (Vercel → Project Settings → Environment Variables).
      </footer>
    </main>
  );
}
