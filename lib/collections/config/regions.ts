import type { RegionDefinition } from '@/lib/collections/types'

export const LOCKED_REGION_COUNT = 13
export const LOCKED_CITY_NAME = 'Los Angeles'

export const REGION_DEFINITIONS: RegionDefinition[] = [
  {
    key: 'central-la',
    label: 'Central LA',
    neighborhoods: ['Downtown Los Angeles', 'Koreatown', 'Westlake', 'Chinatown'],
  },
  {
    key: 'eastside',
    label: 'Eastside',
    neighborhoods: ['Silver Lake', 'Echo Park', 'Los Feliz', 'Atwater Village'],
  },
  {
    key: 'northeast-la',
    label: 'Northeast LA',
    neighborhoods: ['Highland Park', 'Eagle Rock', 'Glassell Park', 'Lincoln Heights'],
  },
  {
    key: 'westside',
    label: 'Westside',
    neighborhoods: ['Santa Monica', 'Venice', 'Mar Vista', 'Brentwood'],
  },
  {
    key: 'mid-city',
    label: 'Mid-City',
    neighborhoods: ['Mid-City', 'Fairfax', 'Pico-Robertson', 'West Adams'],
  },
  {
    key: 'hollywood',
    label: 'Hollywood',
    neighborhoods: ['Hollywood', 'East Hollywood', 'West Hollywood', 'Melrose'],
  },
  {
    key: 'south-la',
    label: 'South LA',
    neighborhoods: ['Leimert Park', 'South Los Angeles', 'Jefferson Park', 'View Park'],
  },
  {
    key: 'south-bay',
    label: 'South Bay',
    neighborhoods: ['Manhattan Beach', 'Hermosa Beach', 'Redondo Beach', 'El Segundo'],
  },
  {
    key: 'san-gabriel-valley',
    label: 'San Gabriel Valley',
    neighborhoods: ['San Gabriel', 'Alhambra', 'Monterey Park', 'Pasadena'],
  },
  {
    key: 'san-fernando-valley',
    label: 'San Fernando Valley',
    neighborhoods: ['Sherman Oaks', 'Studio City', 'Encino', 'North Hollywood'],
  },
  {
    key: 'gateway-cities',
    label: 'Gateway Cities',
    neighborhoods: ['Compton', 'Inglewood', 'Gardena', 'Pico Rivera'],
  },
  {
    key: 'harbor',
    label: 'Harbor',
    neighborhoods: ['San Pedro', 'Wilmington', 'Long Beach', 'Carson'],
  },
  {
    key: 'foothills',
    label: 'Foothills',
    neighborhoods: ['Altadena', 'South Arroyo', 'La Canada Flintridge', 'Montrose'],
  },
]

if (REGION_DEFINITIONS.length !== LOCKED_REGION_COUNT) {
  throw new Error(
    `Expected ${LOCKED_REGION_COUNT} region definitions, found ${REGION_DEFINITIONS.length}`
  )
}
