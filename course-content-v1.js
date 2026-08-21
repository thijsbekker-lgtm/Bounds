/* BOUNDS Courses V1.1 — compatibility layer. Course detail content is sourced from COURSE_SOURCE_DATA_V1. */
function getCourseContentV1(courseName){
  return window.COURSE_SOURCE_DATA_V1?.[courseName] || null;
}
window.COURSE_CONTENT_V1 = window.COURSE_SOURCE_DATA_V1 || {};
window.getCourseContentV1 = getCourseContentV1;
