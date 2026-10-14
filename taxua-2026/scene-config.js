// Story lighting follows itinerary chapters, independently of the device clock.
const JOURNEY_SCENES = {
  opening: {background:'sunrise',label:'Trên biển mây'},
  night: {background:'night',label:'Đêm trên núi'},
  predawn: {background:'bluehour',label:'Trước bình minh'},
  dawn: {background:'jade',label:'Bình minh'},
  morning: {background:'jade',label:'Buổi sáng'},
  noon: {background:'daylight',label:'Giữa ngày'},
  afternoon: {background:'afternoon',label:'Buổi chiều'},
  evening: {background:'afternoon',label:'Chiều muộn'}
};
const JOURNEY_CHAPTERS = {
  road:'night',
  'first-morning':'jade',
  'first-afternoon':'afternoon',
  'second-night':'night',
  'ridge-day':'daylight',
  'second-afternoon':'afternoon',
  'last-night':'night',
  'last-morning':'jade'
};
