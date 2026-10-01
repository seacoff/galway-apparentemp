const SOURCE_URL = "https://weather.universityofgalway.ie/";

const json = (body, status = 200, extraHeaders = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": status === 200 ? "public, max-age=300" : "no-store",
      ...extraHeaders,
    },
  });

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

function valueAfterLabel(text, labels, units = []) {
  for (const label of labels) {
    const index = text.search(label);
    if (index < 0) continue;
    const excerpt = text.slice(index, index + 320);
    const numericMatches = [...excerpt.matchAll(/-?\d+(?:\.\d+)?/g)];
    for (const match of numericMatches) {
      const position = match.index ?? 0;
      const tail = excerpt.slice(position + match[0].length, position + match[0].length + 20);
      if (!units.length || units.some((unit) => unit.test(tail))) return Number(match[0]);
    }
    if (numericMatches.length) return Number(numericMatches[0][0]);
  }
  return null;
}

async function getWeather() {
  const upstream = await fetch(SOURCE_URL, {
    headers: {
      "user-agent": "Coffey-SharePoint-Weather-Widget/1.0",
      "accept": "text/html,application/xhtml+xml",
    },
    cf: { cacheTtl: 300, cacheEverything: true },
  });

  if (!upstream.ok) {
    return json({ error: `University weather source returned HTTP ${upstream.status}.` }, 502);
  }

  const html = await upstream.text();
  if (!html.trim()) return json({ error: "University weather source returned an empty page." }, 502);

  const text = htmlToText(html);
  const temperature = valueAfterLabel(
    text,
    [/dry[- ]?bulb temperature/i, /air temperature/i, /temperature/i],
    [/°?\s*c/i]
  );
  const humidity = valueAfterLabel(text, [/relative humidity/i, /humidity/i], [/%/]);
  const windSpeed = valueAfterLabel(
    text,
    [/wind speed/i, /wind velocity/i],
    [/m\s*\/\s*s/i, /mps/i]
  );

  if (![temperature, humidity, windSpeed].every(Number.isFinite)) {
    return json(
      {
        error: "The University weather page is not currently exposing all three required numeric readings.",
        detected: { temperature, humidity, windSpeed },
        source: SOURCE_URL,
      },
      503
    );
  }

  return json({
    temperature,
    humidity,
    windSpeed,
    fetchedAt: new Date().toISOString(),
    source: SOURCE_URL,
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return json({ ok: true, service: "galway-apparentemp-worker" });
    }

    if (url.pathname === "/api/weather") {
      try {
        return await getWeather();
      } catch (error) {
        return json({ error: `Weather retrieval failed: ${error.message}` }, 502);
      }
    }

    if (url.pathname.startsWith("/api/")) {
      return json({ error: "API route not found." }, 404);
    }

    return env.ASSETS.fetch(request);
  },
};
