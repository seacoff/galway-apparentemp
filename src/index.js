const SOURCE_URL = "https://weather.universityofgalway.ie/";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": status === 200 ? "public, max-age=300" : "no-store"
    }
  });
}

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&deg;|&#176;/gi, "°")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function getSection(html, startLabel, endLabel) {
  const lower = html.toLowerCase();
  const start = lower.indexOf(startLabel.toLowerCase());
  if (start === -1) return null;
  const searchFrom = start + startLabel.length;
  let end = lower.indexOf(endLabel.toLowerCase(), searchFrom);
  if (end === -1) end = Math.min(html.length, start + 15000);
  return htmlToText(html.slice(start, end));
}

function getCurrentValue(html, startLabel, endLabel) {
  const section = getSection(html, startLabel, endLabel);
  if (!section) return null;
  const match = section.match(/Current\s*:\s*(-?\d+(?:\.\d+)?)/i);
  return match ? Number(match[1]) : null;
}

function readingsAreSensible({ temperature, humidity, windSpeed }) {
  return Number.isFinite(temperature) && temperature >= -60 && temperature <= 60 &&
    Number.isFinite(humidity) && humidity >= 0 && humidity <= 100 &&
    Number.isFinite(windSpeed) && windSpeed >= 0 && windSpeed <= 100;
}

async function getWeather() {
  const upstream = await fetch(SOURCE_URL, {
    headers: {
      "user-agent": "Coffey-SharePoint-Weather-Widget/2.0",
      "accept": "text/html,application/xhtml+xml"
    },
    cf: { cacheTtl: 300, cacheEverything: true }
  });

  if (!upstream.ok) return json({ error: `University weather source returned HTTP ${upstream.status}.` }, 502);
  const html = await upstream.text();

  const readings = {
    temperature: getCurrentValue(html, "Dry-bulb temperature", "Wind speed"),
    windSpeed: getCurrentValue(html, "Wind speed", "Wind direction"),
    humidity: getCurrentValue(html, "Relative humidity", "Barometric pressure")
  };

  if (!readingsAreSensible(readings)) {
    return json({
      error: "The current weather readings could not be extracted safely. Incorrect values have been rejected.",
      detected: readings,
      source: SOURCE_URL
    }, 503);
  }

  return json({ ...readings, fetchedAt: new Date().toISOString(), source: SOURCE_URL });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/health") return json({ ok: true, parser: "Current readings v2" });
    if (url.pathname === "/api/weather") {
      try { return await getWeather(); }
      catch (error) { return json({ error: `Weather retrieval failed: ${error.message}` }, 502); }
    }
    if (url.pathname.startsWith("/api/")) return json({ error: "API route not found." }, 404);
    return env.ASSETS.fetch(request);
  }
};
