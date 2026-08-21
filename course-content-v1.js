/* BOUNDS Courses V1.1 — content-only enrichment layer. Keeps auth, scorecard and course selection logic untouched. */
const COURSE_CONTENT_V1 = {
  'De Kroonprins': {
    description: 'Een afwisselende golfbaan waar de hoofdbaan en de par-3 baan ieder hun eigen karakter hebben. Kies de layout die je speelt en bekijk daarna de bijbehorende tee-configuratie.',
    facilities: [
      ['flag','Golfbaan','Hoofdbaan + Par 3'],
      ['range','Driving range','Oefenen voor je ronde'],
      ['cart','Trolley','Beschikbaar'],
      ['shop','Golfshop','Proshop'],
    ],
  },
  'Crimpenerhout': {
    description: 'Een waterrijke golfbaan met bunkers, ontworpen door Bruno Steensels. De baan vraagt om nauwkeurig spel en een goede keuze vanaf de tee.',
    facilities: [
      ['flag','Golfbaan','Hoofdbaan + Par 3'],
      ['water','Water','Waterrijk karakter'],
      ['bunker','Bunkers','Strategisch in de baan'],
      ['range','Driving range','Oefenfaciliteit'],
      ['cart','Trolley / handicart','Beschikbaar'],
      ['shop','Golfshop','Proshop'],
    ],
  },
};

function getCourseContentV1(courseName){
  return COURSE_CONTENT_V1[courseName] || null;
}

window.COURSE_CONTENT_V1 = COURSE_CONTENT_V1;
window.getCourseContentV1 = getCourseContentV1;
