require('dotenv').config({ path: '.env.local' });
const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY;

const placeId = 'ChIJOYO2dCO5woARnV2xXAIO7X4';
const url = 'https://maps.googleapis.com/maps/api/place/details/json?place_id=' + placeId + String.fromCharCode(38) + 'fields=name' + String.fromCharCode(38) + 'key=' + apiKey;

console.log('Testing Place ID:', placeId);
fetch(url)
  .then(r => r.json())
  .then(d => console.log(JSON.stringify(d, null, 2)));
