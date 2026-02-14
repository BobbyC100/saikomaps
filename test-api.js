require('dotenv').config({ path: '.env.local' });
const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY;
console.log('Using key:', apiKey ? apiKey.substring(0, 15) + '...' : 'NOT FOUND');

const url = 'https://maps.googleapis.com/maps/api/place/details/json?place_id=ChIJN1t_tDeuEmsRUsoyG83frY4' + String.fromCharCode(38) + 'fields=name' + String.fromCharCode(38) + 'key=' + apiKey;

fetch(url)
  .then(r => r.json())
  .then(d => console.log(JSON.stringify(d, null, 2)));
