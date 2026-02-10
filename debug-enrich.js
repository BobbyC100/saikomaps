require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const apiKey = process.env.GOOGLE_MAPS_API_KEY;
console.log('GOOGLE_MAPS_API_KEY exists:', !!apiKey);
console.log('Key preview:', apiKey ? apiKey.substring(0, 15) + '...' : 'MISSING');

const placeId = 'ChIJOYO2dCO5woARnV2xXAIO7X4';
const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name&key=${apiKey}`;

console.log('URL preview:', url.substring(0, 100) + '...');

fetch(url)
  .then(r => r.json())
  .then(d => {
    console.log('Response:', JSON.stringify(d, null, 2));
  });
