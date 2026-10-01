const q = (selector) => document.querySelector(selector);
const el = { status:q('#status'), readings:q('#readings'), t:q('#temperature'), rh:q('#humidity'), ws:q('#wind'), at:q('#apparent'), updated:q('#updated'), refresh:q('#refresh'), detail:q('#detail') };

function apparentTemperature(Ta, rh, ws) {
  const e = (rh / 100) * 6.105 * Math.exp((17.27 * Ta) / (237.7 + Ta));
  return { e, at: Ta + (0.33 * e) - (0.70 * ws) - 4.00 };
}

async function readJsonSafely(response) {
  const text = await response.text();
  if (!text.trim()) throw new Error(`The API returned an empty response (HTTP ${response.status}).`);
  try { return JSON.parse(text); }
  catch { throw new Error(`The API returned non-JSON content (HTTP ${response.status}): ${text.slice(0, 160)}`); }
}

async function loadWeather() {
  el.refresh.disabled = true;
  el.status.className = 'status';
  el.status.textContent = 'Loading live readings...';
  el.detail.classList.add('hidden');
  try {
    const response = await fetch('/api/weather', { cache: 'no-store' });
    const data = await readJsonSafely(response);
    if (!response.ok) throw new Error(data.error || `Weather API failed (HTTP ${response.status}).`);

    const { temperature, humidity, windSpeed } = data;
    if (![temperature, humidity, windSpeed].every(Number.isFinite)) throw new Error('The API response is missing a numeric weather reading.');
    const result = apparentTemperature(temperature, humidity, windSpeed);

    el.t.textContent = temperature.toFixed(1);
    el.rh.textContent = humidity.toFixed(0);
    el.ws.textContent = windSpeed.toFixed(1);
    el.at.textContent = result.at.toFixed(1);
    el.updated.textContent = `Updated ${new Date(data.fetchedAt).toLocaleString()}`;
    el.detail.textContent = `Water vapour pressure: ${result.e.toFixed(2)} hPa. Wind speed is used in metres per second.`;
    el.readings.classList.remove('hidden');
    el.detail.classList.remove('hidden');
    el.status.textContent = 'Live readings loaded.';
  } catch (error) {
    el.status.className = 'status error';
    el.status.textContent = error.message;
    el.readings.classList.add('hidden');
  } finally { el.refresh.disabled = false; }
}

el.refresh.addEventListener('click', loadWeather);
loadWeather();
setInterval(loadWeather, 10 * 60 * 1000);
