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

function decodeEntities(value) {
  return value
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&deg;|&#176;/gi, "°")
    .replace(/&amp;/gi, "&")
    .replace(/&#8451;/gi, "℃");
}

function stripTags(value) {
  return decodeEntities(value.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function currentValueById(html, id) {
  const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const element = new RegExp(`<span\\b[^>]*\\bid=["']${escapedId}["'][^>]*>([\\s\\S]*?)<\\/span>`, "i").exec(html);
  if (!element) return null;
  const text = stripTags(element[1]);
  const match = text.match(/Current\s*:\s*(-?\d+(?:\.\d+)?)/i);
  return match ? Number(match[1]) : null;
}

function sensible(r) {
  return Number.isFinite(r.temperature) && r.temperature >= -60 && r.temperature <= 60 &&
    Number.isFinite(r.humidity) && r.humidity >= 0 && r.humidity <= 100 &&
    Number.isFinite(r.windSpeed) && r.windSpeed >= 0 && r.windSpeed <= 100;
}

async function getWeather() {
  const upstream = await fetch(SOURCE_URL, {
    headers: {
      "user-agent": "Coffey-SharePoint-Weather-Widget/3.0",
      "accept": "text/html,application/xhtml+xml"
    },
    cf: { cacheTtl: 300, cacheEverything: true }
  });

  if (!upstream.ok) return json({ error: `University weather source returned HTTP ${upstream.status}.` }, 502);
  const html = await upstream.text();

  const readings = {
    temperature: currentValueById(html, "txtTemp"),
    windSpeed: currentValueById(html, "txtSpeed"),
    humidity: currentValueById(html, "txtRH")
  };

  if (!sensible(readings)) {
    return json({
      error: "Could not safely extract one or more Current readings from txtTemp, txtSpeed and txtRH.",
      detected: readings,
      markersFound: {
        txtTemp: /id=["']txtTemp["']/i.test(html),
        txtSpeed: /id=["']txtSpeed["']/i.test(html),
        txtRH: /id=["']txtRH["']/i.test(html)
      },
      source: SOURCE_URL
    }, 503);
  }

  return json({ ...readings, parser: "element-id-current-v3", fetchedAt: new Date().toISOString(), source: SOURCE_URL });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/health") return json({ ok: true, parser: "element-id-current-v3" });
    if (url.pathname === "/api/weather") {
      try { return await getWeather(); }
      catch (error) { return json({ error: `Weather retrieval failed: ${error.message}` }, 502); }
    }
    if (url.pathname.startsWith("/api/")) return json({ error: "API route not found." }, 404);
    return env.ASSETS.fetch(request);
  }
};
