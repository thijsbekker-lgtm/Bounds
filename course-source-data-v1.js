/* BOUNDS Courses — verified source layer.
 * Primary source: Leading Courses.
 * Secondary verification: official course website where noted.
 * Content is paraphrased for BOUNDS; source URLs are retained for provenance.
 */
const COURSE_SOURCE_DATA_V1 = {
  'Crimpenerhout': {
    source: 'Leading Courses',
    sourceUrl: 'https://www.leadingcourses.com/nl/clubs/europa+nederland+zuid-holland/golfbaan-crimpenerhout',
    verifiedWith: 'Officiële website Golfbaan Crimpenerhout',
    verifiedUrl: 'https://www.golfbaancrimpenerhout.nl/',
    description: 'Een waterrijke 9-holesbaan in de Krimpenerwaard, ontworpen door Bruno Steensels. Water en bunkers spelen een belangrijke rol in het ontwerp en vragen om nauwkeurig spel.',
    facilities: [
      ['range', 'Driving range', 'InRange · oefenfaciliteit'],
      ['club', 'Clubverhuur', 'Beschikbaar'],
      ['restaurant', 'Restaurant', 'Aanwezig'],
      ['school', 'Golfschool', 'Aanwezig'],
      ['buggy', 'Buggy', 'Verhuur'],
      ['charge', 'Laadpalen', 'Beschikbaar'],
      ['cart', 'Trolley', 'Verhuur'],
      ['shop', 'Golfshop', 'Aanwezig'],
      ['cart', 'Handicart', 'Beschikbaar']
    ]
  },
  'De Kroonprins': {
    source: 'Leading Courses',
    sourceUrl: 'https://www.leadingcourses.com/nl/clubs/europa+nederland+utrecht/de-kroonprins-vianen',
    description: 'Een 18-holesbaan met een aparte 9-holes par-3 baan. Het ontwerp is ruim en linksachtig van karakter en vraagt om strategisch spel, met water en bunkers als belangrijke uitdagingen.',
    facilities: [
      ['range', 'Driving range', 'Aanwezig'],
      ['club', 'Clubverhuur', 'Beschikbaar'],
      ['restaurant', 'Restaurant', 'Aanwezig'],
      ['school', 'Golfschool', 'Aanwezig'],
      ['buggy', 'Buggy', 'Verhuur'],
      ['charge', 'Laadpalen', 'Beschikbaar']
    ]
  },
  'Golfpark Almkreek': {
    source: 'Leading Courses',
    sourceUrl: 'https://www.leadingcourses.com/nl/clubs/europa+nederland+noord-brabant/golfpark-almkreek',
    description: 'Een golfpark met een 18-holesbaan en aparte korte banen. Het landschap bestaat uit weilanden en sloten, met waterpartijen en hoogteverschillen die het spel karakter geven.',
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
