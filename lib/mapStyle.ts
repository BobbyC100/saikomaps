export const saikoMapStyle = [
  { "featureType": "all", "elementType": "labels.text.fill", "stylers": [{ "color": "#6b6b6b" }] },
  { "featureType": "all", "elementType": "labels.text.stroke", "stylers": [{ "color": "#ffffff" }, { "weight": 3 }] },
  { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "visibility": "off" }] },
  { "featureType": "landscape", "elementType": "geometry.fill", "stylers": [{ "color": "#f8f8f8" }] },
  { "featureType": "poi", "stylers": [{ "visibility": "off" }] },
  
  // Highways (visible with khaki tone, no labels)
  { "featureType": "road.highway", "elementType": "geometry.fill", "stylers": [{ "visibility": "on" }, { "color": "#d4c9b0" }] },
  { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "visibility": "on" }, { "color": "#C3B091" }, { "weight": 1.5 }] },
  { "featureType": "road.highway", "elementType": "labels", "stylers": [{ "visibility": "off" }] },
  
  // Arterial roads (visible, lighter tone, no labels)
  { "featureType": "road.arterial", "elementType": "geometry", "stylers": [{ "visibility": "on" }, { "color": "#e0d9c8" }, { "weight": 0.8 }] },
  { "featureType": "road.arterial", "elementType": "labels", "stylers": [{ "visibility": "off" }] },
  
  // Local roads (hidden)
  { "featureType": "road.local", "stylers": [{ "visibility": "off" }] },
  
  { "featureType": "road", "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
  { "featureType": "transit", "stylers": [{ "visibility": "off" }] },
  { "featureType": "water", "elementType": "geometry.fill", "stylers": [{ "color": "#d4e5f7" }] }
];

/** Merchant page map — Field Notes palette v2: warm, muted, parchment tones with refined POI handling */
export const fieldNotesMapStyle = [
  // Global desaturation
  { featureType: 'all', elementType: 'geometry', stylers: [{ saturation: -20 }] },
  
  // Water
  { featureType: 'water', elementType: 'geometry.fill', stylers: [{ color: '#c9d9e0' }] },
  
  // Landscape (parchment)
  { featureType: 'landscape', elementType: 'geometry.fill', stylers: [{ color: '#e8e2d4' }] },
  
  // Highways (visible with Field Notes khaki tones, no labels)
  { featureType: 'road.highway', elementType: 'geometry.fill', stylers: [{ visibility: 'on' }, { color: '#d4c9b0' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ visibility: 'on' }, { color: '#C3B091' }, { weight: 1.5 }] },
  { featureType: 'road.highway', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  
  // Arterial roads (visible, lighter tone, no labels)
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ visibility: 'on' }, { color: '#e0d9c8' }, { weight: 0.8 }] },
  { featureType: 'road.arterial', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  
  // Local roads (completely hidden)
  { featureType: 'road.local', stylers: [{ visibility: 'off' }] },
  
  // Parks (refined sage green with enhanced styling)
  { featureType: 'poi.park', elementType: 'geometry.fill', stylers: [{ color: '#d4e0c8' }, { saturation: -40 }, { lightness: 10 }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#9aab8a' }, { lightness: 10 }] },
  { featureType: 'poi.park', elementType: 'labels.text.stroke', stylers: [{ color: '#f5f0e1' }, { weight: 2 }] },
  { featureType: 'poi.park', elementType: 'labels.icon', stylers: [{ saturation: -60 }, { lightness: 30 }] },
  
  // Medical POIs (hidden)
  { featureType: 'poi.medical', elementType: 'all', stylers: [{ visibility: 'off' }] },
  
  // Sports complexes
  { featureType: 'poi.sports_complex', elementType: 'labels.text.fill', stylers: [{ color: '#a99880' }, { lightness: 20 }] },
  { featureType: 'poi.sports_complex', elementType: 'labels.text.stroke', stylers: [{ color: '#f5f0e1' }, { weight: 2 }] },
  { featureType: 'poi.sports_complex', elementType: 'labels.icon', stylers: [{ saturation: -60 }, { lightness: 30 }] },
  
  // Attractions (icons only, no labels)
  { featureType: 'poi.attraction', elementType: 'labels.text', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.attraction', elementType: 'labels.icon', stylers: [{ saturation: -70 }, { lightness: 40 }] },
  
  // Business POIs (hidden)
  { featureType: 'poi.business', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  
  // Government POIs (hidden)
  { featureType: 'poi.government', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  
  // Schools (hidden)
  { featureType: 'poi.school', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  
  // Places of worship (hidden)
  { featureType: 'poi.place_of_worship', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  
  // Transit stations (icons only, no labels)
  { featureType: 'transit.station', elementType: 'labels.icon', stylers: [{ saturation: -50 }, { lightness: 20 }] },
  { featureType: 'transit.station', elementType: 'labels.text', stylers: [{ visibility: 'off' }] },
  
  // Neighborhood labels (softened with parchment stroke)
  { featureType: 'administrative.neighborhood', elementType: 'labels.text.fill', stylers: [{ color: '#a99880' }] },
  { featureType: 'administrative.neighborhood', elementType: 'labels.text.stroke', stylers: [{ color: '#f5f0e1' }, { weight: 2.5 }] },
  
  // Locality labels
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#6b5d4d' }] },
];
