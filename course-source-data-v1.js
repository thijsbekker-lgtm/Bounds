/* BOUNDS Courses — verified source layer.
 * Primary source: Leading Courses.
 * Secondary verification: official course website where noted.
 * Content is paraphrased for BOUNDS; source URLs are retained for provenance.
 *
 * Rule: do not show a facility when the source contains a material conflict.
 * Conflicting facilities are kept in sourceConflicts until independently verified.
 */
const COURSE_SOURCE_DATA_V1 = {
  'Crimpenerhout': {
    source: 'Leading Courses',
    sourceUrl: 'https://www.leadingcourses.com/nl/clubs/europa+nederland+zuid-holland/golfbaan-crimpenerhout',
    verifiedWith: 'Officiële website Golfbaan Crimpenerhout',
    verifiedUrl: 'https://www.golfbaancrimpenerhout.nl/',
    lastVerified: '2026-08-21',
    courseFormat: { mainHoles: 9, par3Holes: 0, additionalLayouts: [] },
    description: 'Een waterrijke 9-holesbaan met spannende bunkers, ontworpen door Bruno Steensels. De baan biedt uitdaging voor zowel beginnende als geoefende golfers.',
    facilities: [
      ['range', 'Driving range', 'InRange · aanwezig'],
      ['restaurant', 'Restaurant', 'Aanwezig'],
      ['school', 'Golfschool', 'Aanwezig'],
      ['buggy', 'Buggy', 'Verhuur'],
      ['charge', 'Laadpalen', 'Beschikbaar']
    ],
    sourceConflicts: [
      { facility: 'Clubverhuur', reason: 'Leading Courses toont clubverhuur bij de faciliteiten, maar de FAQ vermeldt dat golfclubs niet verhuurd kunnen worden.' }
    ]
  },
  'De Kroonprins': {
    source: 'Leading Courses',
    sourceUrl: 'https://www.leadingcourses.com/nl/clubs/europa+nederland+utrecht/de-kroonprins-vianen',
    lastVerified: '2026-08-21',
    courseFormat: { mainHoles: 18, par3Holes: 9, additionalLayouts: [] },
    description: 'Een uitdagende 18-holesbaan met een aparte 9-holes par-3 baan. Het ontwerp is ruim en linksachtig van karakter, met brede fairways en strategische speelmogelijkheden.',
    facilities: [
      ['range', 'Driving range', 'Aanwezig'],
      ['restaurant', 'Restaurant', 'Aanwezig'],
      ['school', 'Golfschool', 'Aanwezig'],
      ['buggy', 'Buggy', 'Verhuur'],
      ['charge', 'Laadpalen', 'Beschikbaar']
    ],
    sourceConflicts: [
      { facility: 'Clubverhuur', reason: 'Leading Courses toont clubverhuur bij de faciliteiten, maar de FAQ vermeldt dat golfclubs niet verhuurd kunnen worden.' }
    ]
  },
  'Golfpark Almkreek': {
    source: 'Leading Courses',
    sourceUrl: 'https://www.leadingcourses.com/nl/clubs/europa+nederland+noord-brabant/golfpark-almkreek',
    lastVerified: '2026-08-21',
    courseFormat: { mainHoles: 18, par3Holes: 9, additionalLayouts: ['14-hole par 3/par 4'] },
    description: 'Een golfpark in typisch Hollands polderlandschap met weilanden, sloten en boerderijen. Waterpartijen en hoogteverschillen geven de baan karakter. Het park heeft een 18-holesbaan en daarnaast een 9-holes par-3 en een 14-holes par-3/par-4 baan.',
    facilities: [
      ['range', 'Driving range', 'Deels overdekt en verlicht'],
      ['club', 'Clubverhuur', 'Beschikbaar'],
      ['restaurant', 'Restaurant', 'Aanwezig'],
      ['school', 'Golfschool', 'Aanwezig'],
      ['buggy', 'Buggy', 'Verhuur'],
      ['charge', 'Laadpalen', 'Beschikbaar']
    ]
  },
  'De Pan': {
    source: 'U.G.C. De Pan',
    sourceUrl: 'https://ugc-depan.nl/en/golfcourse/course-details',
    verifiedWith: 'Golf.nl',
    verifiedUrl: 'https://www.golf.nl/banen-en-clubs/waar-kan-ik-golfen/4/de-pan',
    scorecardUrl: 'https://ugc-depan.nl/media/regels/ScoreCardDePan-2021.pdf',
    lastVerified: '2026-08-21',
    courseFormat: {
      mainHoles: 18,
      par3Holes: 0,
      additionalLayouts: ['1e negen', '2e negen']
    },
    description: 'Een natuurrijke heidebaan in Bosch en Duin, ontworpen door Harry S. Colt. De baan kenmerkt zich door gevarieerde holes, hoogteverschillen, bos en heide en een compact ontwerp.',
    nineHoleRatings: {
      men: {
        first: { white: [36.1,131], yellow: [34.9,126], blue: [33.8,122], red: [32.6,114], orange: [32.6,114] },
        second: { white: [35.8,150], yellow: [35.1,137], blue: [34.2,130], red: [33.0,122], orange: [32.5,112] }
      },
      women: {
        first: { yellow: [39.1,153], blue: [37.9,147], red: [36.3,138], orange: [36.1,135] },
        second: { yellow: [38.8,151], blue: [37.4,149], red: [36.3,140], orange: [35.7,130] }
      }
    },
    scorecard: {
      source: 'scorecard supplied in BOUNDS project',
      parFirstNine: 36,
      parSecondNine: 36,
      strokeIndexFirstNine: [15,5,17,3,11,1,9,13,7],
      strokeIndexSecondNine: [6,10,16,2,8,18,4,14,12]
    },
    facilities: [
      ['range', 'Driving range', 'Aanwezig'],
      ['range', 'Chipping green', 'Inclusief bunker'],
      ['putting', 'Putting green', 'Aanwezig'],
      ['shortgame', 'Pitch & putt', '4 oefenholes'],
      ['shop', 'Golfshop', 'Aanwezig'],
      ['restaurant', 'Horeca', 'Aanwezig'],
      ['school', 'Golfschool', 'Aanwezig']
    ],
    sourceConflicts: []
  }
};

window.COURSE_SOURCE_DATA_V1 = COURSE_SOURCE_DATA_V1;
