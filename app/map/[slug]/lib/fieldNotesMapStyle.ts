/** 
 * Field Notes map style - Hydrology-inspired aesthetic with cool gray-blue roads
 * Used for both cover/header map and expanded map view
 */
export const fieldNotesMapStyle: google.maps.MapTypeStyle[] = [
  // Global desaturation for soft, muted look
  { featureType: 'all', elementType: 'geometry', stylers: [{ saturation: -25 }] },
  
  // Water - soft blue-grey (prominent like in hydro theme)
  { featureType: 'water', elementType: 'geometry.fill', stylers: [{ color: '#c9d9e0' }] },
  
  // Landscape - parchment/cream tone
  { featureType: 'landscape', elementType: 'geometry.fill', stylers: [{ color: '#e8e2d4' }] },
  
  // Highways - cool gray-blue strokes (thinner)
  { featureType: 'road.highway', elementType: 'geometry.fill', stylers: [{ visibility: 'on' }, { color: '#b8c5cc' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ visibility: 'on' }, { color: '#9aabb5' }, { weight: 1.0 }] },
  { featureType: 'road.highway', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  
  // Arterials - lighter cool gray-blue (thinner)
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ visibility: 'on' }, { color: '#c4ced3' }, { weight: 0.5 }] },
  { featureType: 'road.arterial', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  
  // Local roads - completely hidden
  { featureType: 'road.local', stylers: [{ visibility: 'off' }] },
  
  // Parks - barely-there muted sage (very desaturated)
  { featureType: 'poi.park', elementType: 'geometry.fill', stylers: [{ color: '#e2e5dc' }, { saturation: -60 }] },
  { featureType: 'poi.park', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  
  // Hide all other POIs
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.medical', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.government', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.school', stylers: [{ visibility: 'off' }] },
  
  // Transit - hidden
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  
  // Administrative labels - very subtle
  { featureType: 'administrative.neighborhood', elementType: 'labels.text.fill', stylers: [{ color: '#a99880' }] },
  { featureType: 'administrative.neighborhood', elementType: 'labels.text.stroke', stylers: [{ color: '#f5f0e1' }, { weight: 2.5 }] },
  { featureType: 'administrative.locality', elementType: 'labels', stylers: [{ visibility: 'off' }] },
];
