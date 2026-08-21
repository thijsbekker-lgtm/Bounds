/* BOUNDS Courses V1.1 — content-only enrichment layer. Keeps auth, scorecard and course selection logic untouched. */
const COURSE_CONTENT_V1 = {
  'De Kroonprins': {
    description: 'Een afwisselende golfbaan waar de hoofdbaan en de par-3 baan ieder hun eigen karakter hebben. Kies de layout die je speelt en bekijk daarna de bijbehorende tee-configuratie.',
    facilities: [
      ['⛳','Golfbaan','Hoofdbaan + Par 3'],
      ['🏌','Driving range','Oefenen voor je ronde'],
      ['🛒','Trolley','Beschikbaar'],
      ['🛍','Golfshop','Proshop'],
    ],
  },
  'Crimpenerhout': {
    description: 'Een waterrijke golfbaan met bunkers, ontworpen door Bruno Steensels. De baan vraagt om nauwkeurig spel en een goede keuze vanaf de tee.',
    facilities: [
      ['⛳','Golfbaan','Hoofdbaan + Par 3'],
      ['🌊','Water','Waterrijk karakter'],
      ['🏖','Bunkers','Strategisch in de baan'],
      ['🏌','Driving range','Oefenfaciliteit'],
      ['🛒','Trolley / handicart','Beschikbaar'],
      ['🛍','Golfshop','Proshop'],
    ],
  },
};

function getCourseContentV1(courseName){
  return COURSE_CONTENT_V1[courseName] || null;
}

window.COURSE_CONTENT_V1 = COURSE_CONTENT_V1;
window.getCourseContentV1 = getCourseContentV1;
