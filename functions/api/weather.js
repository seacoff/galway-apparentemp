const SOURCE = 'https://weather.universityofgalway.ie/';
const LIVE_DATA = `${SOURCE}getLiveData.php`;

function parseLiveData(payload) {
	const fields = payload.trim().split(',').map(field => field.trim());
	const readings = {
		sourceTime: fields[0],
		temperature: Number(fields[2]),
		windSpeed: Number(fields[4]),
		humidity: Number(fields[6])
	};
	if (!readings.sourceTime || ![readings.temperature, readings.windSpeed, readings.humidity].every(Number.isFinite)) {
		throw new Error('The University weather endpoint returned an incomplete reading.');
	}
	return readings;
}

export async function onRequestGet() {
	try {
		const response = await fetch(`${LIVE_DATA}?currentMinutes=${new Date().getMinutes()}`, {
			headers: { 'User-Agent': 'Galway-Weather-Widget/1.0' }
		});
		if (!response.ok) throw new Error(`Source returned HTTP ${response.status}`);

		const { sourceTime, temperature, windSpeed, humidity } = parseLiveData(await response.text());

		return Response.json(
			{ temperature, humidity, windSpeed, fetchedAt: new Date().toISOString(), source: SOURCE, sourceTime },
			{ headers: { 'Cache-Control': 'public, max-age=300' } }
		);
	} catch (error) {
		return Response.json({ error: `Unable to retrieve University of Galway weather data: ${error.message}` }, { status: 502 });
	}
}
