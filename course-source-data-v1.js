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
    description: 'Een golfpark in typisch Hollands polderlandschap met weilanden, sloten en boerderijen. Waterpartijen en hoogteverschillen geven de baan karakter. Het park heeft een 18-holesbaan en daarnaast een 9-holes par-3 en een 14-holes par-3/par-4 baan.',
    facilities: [
      ['range', 'Driving range', 'Deels overdekt en verlicht'],
      ['club', 'Clubverhuur', 'Beschikbaar'],
      ['restaurant', 'Restaurant', 'Aanwezig'],
      ['school', 'Golfschool', 'Aanwezig'],
      ['buggy', 'Buggy', 'Verhuur'],
      ['charge', 'Laadpalen', 'Beschikbaar']
    ]
  }
};

window.COURSE_SOURCE_DATA_V1 = COURSE_SOURCE_DATA_V1;
