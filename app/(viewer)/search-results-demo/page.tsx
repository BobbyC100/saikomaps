'use client';

import {
  BentoGrid,
  PlaceCard1x1,
  PlaceCard1x2,
  PlaceCard2x1,
  PlaceCard2x2,
  SpotlightCard2x2,
  SpotlightCard2x1,
  QuietCard1x1,
  QuietCard2x1,
  PlaceCardData,
  SpotlightCardData,
  QuietCardData,
} from '@/components/search-results';

// Sample data for demo
const samplePlaces: PlaceCardData[] = [
  {
    slug: 'guisados',
    name: 'Guisados',
    category: 'Tacos',
    neighborhood: 'Echo Park',
    price: '$',
    photoUrl: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400&h=600&fit=crop',
    isOpen: true,
    closesAt: '9pm',
    signals: [{ type: 'latimes101', label: 'LA Times 101' }],
    coverageQuote: 'Braised meats in handmade tortillas — the cochinita pibil is transcendent.',
    distanceMiles: 0.3,
    menuSignalsStatus: 'ok', // Badge Ship v1: Menu analyzed
  },
  {
    slug: 'burritos-la-palma',
    name: 'Burritos La Palma',
    category: 'Tacos',
    neighborhood: 'Echo Park',
    price: '$',
    photoUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&h=600&fit=crop',
    isOpen: true,
    closesAt: '10pm',
    signals: [{ type: 'eater38', label: 'Eater 38' }],
    coverageQuote: 'Flour tortillas made to order — pillowy, warm, perfect.',
    distanceMiles: 0.4,
    menuSignalsStatus: 'ok', // Badge Ship v1: Menu analyzed
    winelistSignalsStatus: 'ok', // Badge Ship v1: Wine program
  },
  {
    slug: 'taco-zone',
    name: 'Taco Zone',
    category: 'Tacos',
    neighborhood: 'Echo Park',
    price: '$',
    photoUrl: 'https://images.unsplash.com/photo-1624300629298-e9de39c13be5?w=400&h=600&fit=crop',
    isOpen: true,
    closesAt: '3am',
    signals: [{ type: 'infatuation', label: 'Infatuation' }],
    coverageQuote: 'The only place open at 2am worth eating at.',
    distanceMiles: 0.8,
    menuSignalsStatus: 'ok', // Badge Ship v1: Late night spot with menu
  },
  {
    slug: 'cacao-mexicatessen',
    name: 'Cacao Mexicatessen',
    category: 'Oaxacan',
    neighborhood: 'Eagle Rock',
    price: '$$',
    cuisine: 'Mexican',
    photoUrl: 'https://images.unsplash.com/photo-1599974579688-8dbdd335c77f?w=400&h=600&fit=crop',
    isOpen: true,
    closesAt: '9pm',
    signals: [{ type: 'michelin', label: 'Michelin' }],
    coverageQuote: 'Mole that tastes like it took three days.',
    distanceMiles: 1.2,
    winelistSignalsStatus: 'ok', // Badge Ship v1: Wine program only
  },
  {
    slug: 'trencher',
    name: 'Trencher',
    category: 'Mexican',
    neighborhood: 'Echo Park',
    price: '$$',
    photoUrl: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=500&h=400&fit=crop',
    isOpen: true,
    closesAt: '10pm',
    coverageQuote: 'The aguachile is a revelation.',
    distanceMiles: 0.6,
    menuSignalsStatus: 'ok',
    winelistSignalsStatus: 'ok',
  },
  {
    slug: 'tacos-delta',
    name: 'Tacos Delta',
    category: 'Tacos',
    neighborhood: 'Silver Lake',
    price: '$',
    photoUrl: 'https://images.unsplash.com/photo-1570461226513-bf93d57e2144?w=500&h=400&fit=crop',
    isOpen: false,
    opensAt: '11am',
    coverageQuote: 'No-frills, just quality.',
    distanceMiles: 0.9,
    winelistSignalsStatus: 'ok',
  },
  {
    slug: 'carnitas-el-momo',
    name: 'Carnitas El Momo',
    category: 'Tacos',
    neighborhood: 'Boyle Heights',
    price: '$',
    photoUrl: 'https://images.unsplash.com/photo-1562059390-a761a084768e?w=500&h=400&fit=crop',
    isOpen: true,
    closesAt: '8pm',
    coverageQuote: 'Carnitas worth the drive.',
    distanceMiles: 2.1,
    menuSignalsStatus: 'ok',
  },
  {
    slug: 'el-flamin-taco',
    name: "El Flamin' Taco",
    category: 'Tacos',
    neighborhood: 'Echo Park',
    price: '$',
    photoUrl: 'https://images.unsplash.com/photo-1604467794349-0b74285de7e7?w=300&h=300&fit=crop',
    isOpen: true,
  },
  {
    slug: 'el-compadre',
    name: 'El Compadre',
    category: 'Mexican',
    neighborhood: 'Echo Park',
    price: '$$',
    photoUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=600&fit=crop',
    isOpen: true,
    closesAt: '11pm',
    coverageQuote: 'Flaming margaritas, old school LA vibes.',
    distanceMiles: 1.5,
    menuSignalsStatus: 'ok',
    winelistSignalsStatus: 'ok',
  },
  {
    slug: 'tacos-tu-madre',
    name: 'Tacos Tu Madre',
    category: 'Tacos',
    neighborhood: 'Echo Park',
    price: '$$',
    photoUrl: 'https://images.unsplash.com/photo-1629385701021-fcd568a743e8?w=400&h=600&fit=crop',
    isOpen: true,
    closesAt: '10pm',
    coverageQuote: 'Birria everything. Life-changing consommé.',
    distanceMiles: 1.8,
    winelistSignalsStatus: 'ok',
  },
];

// Spotlight card data
const spotlightData: SpotlightCardData = {
  href: '/map/staff-picks',
  label: 'Staff Pick',
  headline: 'Bestia',
  subhead: "Downtown's most coveted table. Italian that lives up to the hype.",
  photoUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop',
};

// Quiet card data
const quietTip: QuietCardData = {
  type: 'tip',
  content: 'Tuesday — shorter waits',
  label: 'Tip',
  icon: 'info',
};

const quietStat: QuietCardData = {
  type: 'stat',
  content: 'Added this week',
  number: '47',
};

export default function BentoGridDemoPage() {
  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap"
        rel="stylesheet"
      />

      <div
        style={{
          minHeight: '100vh',
          background: '#F5F0E1',
          padding: '40px 20px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Header */}
        <div style={{ maxWidth: 900, margin: '0 auto 40px', textAlign: 'center' }}>
          <h1
            style={{
              fontFamily: '"Libre Baskerville", Georgia, serif',
              fontSize: 28,
              fontStyle: 'italic',
              color: '#36454F',
              marginBottom: 12,
            }}
          >
            4-Column Bento Grid Demo
          </h1>
          <p
            style={{
              fontSize: 12,
              color: '#8B7355',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            Search Mode — Priority Zone Layout
          </p>
          <p
            style={{
              fontSize: 13,
              color: '#6B7F59',
              lineHeight: 1.6,
              maxWidth: 600,
              margin: '0 auto',
            }}
          >
            Four equal-weight 1×2 Place cards in the priority zone (first 2 rows). 
            Distributed visual weight signals "multiple strong matches" — not editorial curation.
          </p>
        </div>

        {/* Bento Grid */}
        <BentoGrid mode="search">
          {/* Priority Zone: Four 1×2 cards (equal weight) */}
          <PlaceCard1x2 place={samplePlaces[0]} />
          <PlaceCard1x2 place={samplePlaces[1]} />
          <PlaceCard1x2 place={samplePlaces[2]} />
          <PlaceCard1x2 place={samplePlaces[3]} />

          {/* Row 3: Two 2×1 cards */}
          <PlaceCard2x1 place={samplePlaces[4]} />
          <PlaceCard2x1 place={samplePlaces[5]} />

          {/* Row 4: One 2×1, one 1×1 Place, one 1×1 Quiet */}
          <PlaceCard2x1 place={samplePlaces[6]} />
          <PlaceCard1x1 place={samplePlaces[7]} />
          <QuietCard1x1 quiet={quietTip} />

          {/* Row 5-6: Spotlight + two 1×2 Place cards */}
          <SpotlightCard2x2 spotlight={spotlightData} />
          <PlaceCard1x2 place={samplePlaces[8]} />
          <PlaceCard1x2 place={samplePlaces[9]} />

          {/* Row 7: Two 2×1 cards OR one 2×1 Place + one 2×1 Quiet */}
          <PlaceCard2x1 place={samplePlaces[4]} />
          <QuietCard2x1 quiet={quietStat} />
        </BentoGrid>

        {/* Info callout */}
        <div
          style={{
            maxWidth: 900,
            margin: '40px auto 0',
            padding: 20,
            background: 'rgba(74, 124, 89, 0.08)',
            borderRadius: 8,
            borderLeft: '3px solid #4A7C59',
          }}
        >
          <h3
            style={{
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '2px',
              color: '#4A7C59',
              marginBottom: 12,
            }}
          >
            Priority Zone Definition
          </h3>
          <p
            style={{
              fontFamily: '"Libre Baskerville", Georgia, serif',
              fontStyle: 'italic',
              fontSize: 14,
              color: '#36454F',
              lineHeight: 1.6,
              marginBottom: 12,
            }}
          >
            "The Priority Zone is the trust calibration zone — the first screen where users decide 
            whether they're looking at results or an editorial layout."
          </p>
          <p
            style={{
              fontSize: 12,
              color: '#6B7F59',
              lineHeight: 1.7,
            }}
          >
            Visual weight must be distributed across multiple Place cards in this zone. No single tile 
            should carry most of the semantic load. The user's subconscious question — "Is this results 
            or curation?" — must resolve to "results" within ~500ms.
          </p>
        </div>

        {/* Responsive info */}
        <div
          style={{
            maxWidth: 900,
            margin: '20px auto 0',
            padding: 16,
            background: '#2a2a2a',
            borderRadius: 8,
            border: '1px solid #333',
          }}
        >
          <h4
            style={{
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '2px',
              color: '#89B4C4',
              marginBottom: 12,
            }}
          >
            Responsive Breakpoints
          </h4>
          <ul
            style={{
              listStyle: 'none',
              fontSize: 12,
              color: '#888',
              lineHeight: 1.8,
              paddingLeft: 0,
            }}
          >
            <li style={{ marginBottom: 4 }}>
              <strong style={{ color: '#aaa' }}>Desktop (&gt;900px):</strong> 4 columns
            </li>
            <li style={{ marginBottom: 4 }}>
              <strong style={{ color: '#aaa' }}>Tablet (641-900px):</strong> 2 columns
            </li>
            <li>
              <strong style={{ color: '#aaa' }}>Mobile (≤640px):</strong> 1 column (2×1 cards flip to vertical)
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}
