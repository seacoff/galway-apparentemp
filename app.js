const query = selector => document.querySelector(selector);
const elements = {
	status: query('#status'), readings: query('#readings'), temperature: query('#temperature'),
	humidity: query('#humidity'), wind: query('#wind'), apparent: query('#apparent'),
	updated: query('#updated'), refresh: query('#refresh')
};

function apparentTemperature(temperature, humidity, windSpeed) {
	const vapourPressure = (humidity / 100) * 6.105 * Math.exp((17.27 * temperature) / (237.7 + temperature));
	return temperature + (0.33 * vapourPressure) - (0.70 * windSpeed) - 4.00;
}

function displayReading(element, value, digits) {
	element.textContent = Number(value).toFixed(digits);
}

async function loadWeather() {
	elements.refresh.disabled = true;
	elements.status.className = 'status loading';
	elements.status.textContent = 'Checking the station...';

	try {
		const response = await fetch('/api/weather', { cache: 'no-store' });
		const data = await response.json();
		if (!response.ok) throw new Error(data.error || 'Unable to load weather data.');

		displayReading(elements.temperature, data.temperature, 1);
		displayReading(elements.humidity, data.humidity, 0);
		displayReading(elements.wind, data.windSpeed, 1);
		displayReading(elements.apparent, apparentTemperature(data.temperature, data.humidity, data.windSpeed), 1);
		elements.updated.textContent = `Updated ${new Date(data.fetchedAt).toLocaleString()}`;
		elements.readings.classList.remove('hidden');
		elements.status.className = 'status success';
		elements.status.textContent = 'Live readings loaded.';
	} catch (error) {
		elements.status.className = 'status error';
		elements.status.textContent = error.message;
		elements.readings.classList.add('hidden');
	} finally {
		elements.refresh.disabled = false;
	}
}

elements.refresh.addEventListener('click', loadWeather);
loadWeather();
setInterval(loadWeather, 10 * 60 * 1000);
