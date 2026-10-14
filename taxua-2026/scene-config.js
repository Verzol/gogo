// Story cues follow the itinerary, never the device clock or a saved theme.
// The five photographs stay at full opacity; crossfades only join chapters.
const JOURNEY_SCENES = {
  opening: {background:'B01',label:'Trên biển mây'},
  night: {background:'B03',label:'Đêm trên núi'},
  predawn: {background:'B04',label:'Trước bình minh'},
  dawn: {background:'B01',label:'Bình minh'},
  morning: {background:'B01',label:'Buổi sáng'},
  noon: {background:'B02',label:'Giữa ngày'},
  afternoon: {background:'B05',label:'Buổi chiều'},
  evening: {background:'B05',label:'Chiều muộn'}
};
// Broader reading chapters hold one photograph across related stops. Lighting
// labels and stickers still follow each event's phase independently.
const JOURNEY_CHAPTERS = {
  road:'B03',
  'first-morning':'B01',
  'first-afternoon':'B05',
  'second-night':'B03',
  'ridge-day':'B02',
  'second-afternoon':'B05',
  'last-night':'B04',
  'last-morning':'B01'
};
