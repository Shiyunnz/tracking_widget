/******************************************************************************
 * Constants and Configurations
 *****************************************************************************/

// NOTE: This script uses the Cache script (https://github.com/yaylinda/scriptable/blob/main/Cache.js)
// Make sure to add the Cache script in Scriptable as well!

// Cache keys and default location
const CACHE_KEY_LAST_UPDATED = 'last_updated';
const CACHE_KEY_LOCATION = 'location';
const CACHE_KEY_WEATHER = 'weather'; // moved up to avoid TDZ when fetchData() runs early
const DEFAULT_LOCATION = { latitude: 0, longitude: 0 };
 
// Font name and size
const FONT_NAME = 'Menlo';
const FONT_SIZE = 10;

// Colors
const COLORS = {
  bg0: '#29323c',
  bg1: '#1c1c1c',
  personalCalendar: '#5BD2F0',
  workCalendar: '#9D90FF',
  weather: '#FDFD97',
  location: '#FEB144',
  deviceStats: '#7AE7B9',
};

// TODO: PLEASE SET THESE VALUES
const NAME = 'TODO';
const TEMP_UNIT = 'imperial'; //set to metric for Celsius or to imperial for Fahrenheit
const WEATHER_API_KEY = 'TODO'; // https://home.openweathermap.org/api_keys (account needed)
const WORK_CALENDAR_NAME = '学习';
const PERSONAL_CALENDAR_NAME = '个人';

// Whether or not to use a background image for the widget (if false, use gradient color)
const USE_BACKGROUND_IMAGE = false;

/******************************************************************************
 * Initial Setups
 *****************************************************************************/

/**
 * Convenience function to add days to a Date.
 * 
 * @param {*} days The number of days to add
 */ 
Date.prototype.addDays = function(days) {
  var date = new Date(this.valueOf());
  date.setDate(date.getDate() + days);
  return date;
};

// Create folder to store data
let files = FileManager.local();
const iCloudUsed = files.isFileStoredIniCloud(module.filename);
files = iCloudUsed ? FileManager.iCloud() : files;
const widgetFolder = "terminalWidget";
const offlinePath = files.joinPath(files.documentsDirectory(), widgetFolder);
if (!files.fileExists(offlinePath)) files.createDirectory(offlinePath);

// NOTE: This script was written by evandcoleman: https://github.com/evandcoleman/scriptable

class Cache {
  constructor(name) {
    this.fm = FileManager.iCloud();
    this.cachePath = this.fm.joinPath(this.fm.documentsDirectory(), name);

    if (!this.fm.fileExists(this.cachePath)) {
      this.fm.createDirectory(this.cachePath);
    }
  }
  async read(key, expirationMinutes) {
    try {
      const path = this.fm.joinPath(this.cachePath, key);
      await this.fm.downloadFileFromiCloud(path);
      const createdAt = this.fm.creationDate(path);

      if (expirationMinutes) {
        if ((new Date()) - createdAt > (expirationMinutes * 60000)) {
          this.fm.remove(path);
          return null;
        }
      }

      const value = this.fm.readString(path);

      try {
        return JSON.parse(value);
      } catch (error) {
        return value;
      }
    } catch (error) {
      return null;
    }
  }
  write(key, value) {
    const path = this.fm.joinPath(this.cachePath, key.replace('/', '-'));
    console.log(`Caching to ${path}...`);

    if (typeof value === 'string' || value instanceof String) {
      this.fm.writeString(path, value);
    } else {
      this.fm.writeString(path, JSON.stringify(value));
    }
  }
}

// module.exports = Cache;
// Import and setup Cache
// const Cache = importModule('Cache');
const cache = new Cache('terminalWidget');

// Fetch data and create widget
const data = await fetchData();
const widget = createWidget(data);

// Set background image of widget, if flag is true
if (USE_BACKGROUND_IMAGE) {
  // Determine if our image exists and when it was saved.
  const path = files.joinPath(offlinePath, 'terminal-widget-background');
  const exists = files.fileExists(path);

  // If it exists and we're running in the widget, use photo from cache
  if (exists && config.runsInWidget) {
    widget.backgroundImage = files.readImage(path);

  // If it's missing when running in the widget, use a gradient black/dark-gray background.
  } else if (!exists && config.runsInWidget) {
    const bgColor = new LinearGradient();
    bgColor.colors = [new Color("#29323c"), new Color("#1c1c1c")];
    bgColor.locations = [0.0, 1.0];
    widget.backgroundGradient = bgColor;

  // But if we're running in app, prompt the user for the image.
  } else if (config.runsInApp){
    const img = await Photos.fromLibrary();
    widget.backgroundImage = img;
    files.writeImage(path, img);
  }
}

if (config.runsInApp) {  
  widget.presentMedium();
}

Script.setWidget(widget);
Script.complete();

/******************************************************************************
 * Main Functions (Widget and Data-Fetching)
 *****************************************************************************/

/**
 * Main widget function.
 * 
 * @param {} data The data for the widget to display
 */
function createWidget(data) {
  console.log(`Creating widget with data: ${JSON.stringify(data)}`);

  const widget = new ListWidget();
  if  (!USE_BACKGROUND_IMAGE) {
  const bgColor = new LinearGradient();
  bgColor.colors = [new Color(COLORS.bg0), new Color(COLORS.bg1)];
  bgColor.locations = [0.0, 1.0];
  widget.backgroundGradient = bgColor;
  }
  widget.setPadding(10, 15, 15, 10);

  const stack = widget.addStack();
  stack.layoutVertically();
  stack.spacing = 4;
  stack.size = new Size(320, 0);

  // Line 0 - Last Login
  const timeFormatter = new DateFormatter();
  timeFormatter.locale = "en";
  timeFormatter.useNoDateStyle();
  timeFormatter.useShortTimeStyle();

  const lastLoginLine = stack.addText(`Last login: ${timeFormatter.string(new Date())} on ttys001`);
  lastLoginLine.textColor = Color.white();
  lastLoginLine.textOpacity = 0.7;
  lastLoginLine.font = new Font(FONT_NAME, FONT_SIZE);

  // Line 1 - Input
  const inputLine = stack.addText(`iPhone:~ ${NAME}$ info`);
  inputLine.textColor = Color.white();
  inputLine.font = new Font(FONT_NAME, FONT_SIZE);

  // Line 2 - Next Personal Calendar Event
  const nextPersonalCalendarEventLine = stack.addText(`🗓 | ${getCalendarEventTitle(data.nextPersonalEvent, false)}`);
  nextPersonalCalendarEventLine.textColor = new Color(COLORS.personalCalendar);
  nextPersonalCalendarEventLine.font = new Font(FONT_NAME, FONT_SIZE);

  // Line 3 - Next Work Calendar Event
  const nextWorkCalendarEventLine = stack.addText(`🗓 | ${getCalendarEventTitle(data.nextWorkEvent, true)}`);
  nextWorkCalendarEventLine.textColor = new Color(COLORS.workCalendar);
  nextWorkCalendarEventLine.font = new Font(FONT_NAME, FONT_SIZE);

  // Line 4 - Weather
  const weatherLine = stack.addText(`${data.weather.icon} | ${data.weather.temperature}° (${data.weather.high}°-${data.weather.low}°), ${data.weather.description}, feels like ${data.weather.feelsLike}°`);
  weatherLine.textColor = new Color(COLORS.weather);
  weatherLine.font = new Font(FONT_NAME, FONT_SIZE);
  
  // Line 5 - Location
  const locationLine = stack.addText(`📍 | ${data.weather.location}`);
  locationLine.textColor = new Color(COLORS.location);
  locationLine.font = new Font(FONT_NAME, FONT_SIZE);

  // Line 6 - Placeholder for sunrise/sunset (added after weather enhancement)
  const sunriseSunsetLine = stack.addText(`🌅 | Sunrise ${data.weather?.sunriseStr || '--:--'} / Sunset ${data.weather?.sunsetStr || '--:--'}`);
  sunriseSunsetLine.textColor = new Color(COLORS.weather);
  sunriseSunsetLine.font = new Font(FONT_NAME, FONT_SIZE);

  // Line 7 - Various Device Stats
  const deviceStatsLine = stack.addText(`📊 | ⚡︎ ${data.device.battery}%, ☀ ${data.device.brightness}%`);
  deviceStatsLine.textColor = new Color(COLORS.deviceStats);
  deviceStatsLine.font = new Font(FONT_NAME, FONT_SIZE);

  return widget;
}

/**
 * Fetch pieces of data for the widget.
 */
async function fetchData() {
  // Get the weather data
  const weather = await fetchWeather();

  // Get next work/personal calendar events
  const nextWorkEvent = await fetchNextCalendarEvent(WORK_CALENDAR_NAME);
  const nextPersonalEvent = await fetchNextCalendarEvent(PERSONAL_CALENDAR_NAME);

  // Get last data update time (and set)
  const lastUpdated = await getLastUpdated();
  cache.write(CACHE_KEY_LAST_UPDATED, new Date().getTime());

  return {
    weather,
    nextWorkEvent,
    nextPersonalEvent,
    device: {
      battery: Math.round(Device.batteryLevel() * 100),
      brightness: Math.round(Device.screenBrightness() * 100),
    },
    lastUpdated,
  };
}

/******************************************************************************
 * Helper Functions
 *****************************************************************************/

//-------------------------------------
// Weather Helper Functions
//-------------------------------------

/**
 * Fetch the weather data from Open Weather Map
 */

async function fetchWeather() {
  let location = await cache.read(CACHE_KEY_LOCATION);
  if (!location) {
    try {
      Location.setAccuracyToThreeKilometers();
      location = await Location.current();
      cache.write(CACHE_KEY_LOCATION, location);
    } catch(error) {
      location = await cache.read(CACHE_KEY_LOCATION);
    }
  }
  if (!location) location = DEFAULT_LOCATION;

  const address = await Location.reverseGeocode(location.latitude, location.longitude).catch(()=>[{postalAddress:{city:'Unknown',state:''}}]);
  const cityState = `${address[0].postalAddress.city}${address[0].postalAddress.state ? ', ' + address[0].postalAddress.state : ''}`;

  let primaryResult = null;
  if (WEATHER_API_KEY && WEATHER_API_KEY !== 'TODO') {
    primaryResult = await fetchWeatherOpenWeather(location, cityState);
  } else {
    console.log('[Weather] OpenWeather API key not set, skipping primary provider');
  }

  let finalResult = primaryResult;
  if (!finalResult || finalResult.icon === '❓' || finalResult.temperature === '?') {
    console.log('[Weather] Trying Open-Meteo fallback');
    const fallback = await fetchWeatherOpenMeteo(location, cityState);
    if (fallback) finalResult = fallback;
  }

  if (!finalResult) {
    const cached = await cache.read(CACHE_KEY_WEATHER, 30);
    if (cached) {
      console.log('[Weather] Using cached weather');
      return cached;
    }
    finalResult = {
      location: cityState,
      icon: '❓',
      description: 'No data',
      temperature: '?',
      wind: '?',
      high: '?',
      low: '?',
      feelsLike: '?',
      sunriseStr: '--:--',
      sunsetStr: '--:--'
    };
  }

  cache.write(CACHE_KEY_WEATHER, finalResult);
  return finalResult;
}

function formatTimeHM(ts) {
  if (!ts) return '--:--';
  const d = new Date(ts * 1000);
  const f = new DateFormatter();
  f.useNoDateStyle();
  f.useShortTimeStyle();
  return f.string(d);
}

async function fetchWeatherOpenWeather(location, cityState) {
  try {
    const url = `https://api.openweathermap.org/data/2.5/onecall?lat=${location.latitude}&lon=${location.longitude}&exclude=minutely,hourly,alerts&units=${TEMP_UNIT}&lang=en&appid=${WEATHER_API_KEY}`;
    const data = await fetchJson(url);
    if (!data || data.cod && data.cod !== 200) return null;
    if (!data.current || !data.current.weather || !data.daily) return null;
    const cur = data.current;
    const today = data.daily[0];
    const currentTime = Math.floor(Date.now() / 1000);
    const sunrise = cur.sunrise || today?.sunrise;
    const sunset = cur.sunset || today?.sunset;
    const isNight = sunrise && sunset ? (currentTime >= sunset || currentTime <= sunrise) : false;
    return {
      location: cityState,
      icon: getWeatherEmoji(cur.weather[0].id, isNight),
      description: cur.weather[0].main || 'Weather',
      temperature: typeof cur.temp === 'number' ? Math.round(cur.temp) : '?',
      wind: typeof cur.wind_speed === 'number' ? Math.round(cur.wind_speed) : '?',
      high: today?.temp?.max ? Math.round(today.temp.max) : '?',
      low: today?.temp?.min ? Math.round(today.temp.min) : '?',
      feelsLike: typeof cur.feels_like === 'number' ? Math.round(cur.feels_like) : '?',
      sunriseStr: formatTimeHM(sunrise),
      sunsetStr: formatTimeHM(sunset)
    };
  } catch(e) {
    console.log('[Weather] OpenWeather failed: ' + e);
    return null;
  }
}

async function fetchWeatherOpenMeteo(location, cityState) {
  try {
    const tempUnitParam = (TEMP_UNIT === 'imperial') ? 'fahrenheit' : 'celsius';
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,apparent_temperature,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset,weather_code&timezone=auto&temperature_unit=${tempUnitParam}`;
    const data = await fetchJson(url);
    if (!data) return null;
    const current = data.current || {};
    const daily = data.daily || {};
    const high = daily.temperature_2m_max ? Math.round(daily.temperature_2m_max[0]) : '?';
    const low = daily.temperature_2m_min ? Math.round(daily.temperature_2m_min[0]) : '?';
    const sunrise = daily.sunrise ? Math.floor(new Date(daily.sunrise[0]).getTime()/1000) : null;
    const sunset = daily.sunset ? Math.floor(new Date(daily.sunset[0]).getTime()/1000) : null;
    const isNight = sunrise && sunset ? (Date.now()/1000 >= sunset || Date.now()/1000 <= sunrise) : false;
    return {
      location: cityState,
      icon: isNight ? '🌙' : '☀️',
      description: 'Weather',
      temperature: typeof current.temperature_2m === 'number' ? Math.round(current.temperature_2m) : '?',
      wind: typeof current.wind_speed_10m === 'number' ? Math.round(current.wind_speed_10m) : '?',
      high,
      low,
      feelsLike: typeof current.apparent_temperature === 'number' ? Math.round(current.apparent_temperature) : '?',
      sunriseStr: formatTimeHM(sunrise),
      sunsetStr: formatTimeHM(sunset)
    };
  } catch(e) {
    console.log('[Weather] Open-Meteo failed: ' + e);
    return null;
  }
}

/**
 * Given a weather code from Open Weather Map, determine the best emoji to show.
 * 
 * @param {*} code Weather code from Open Weather Map
 * @param {*} isNight Is `true` if it is after sunset and before sunrise
 */
function getWeatherEmoji(code, isNight) {
  if (code >= 200 && code < 300 || code == 960 || code == 961) {
    return "⛈"
  } else if ((code >= 300 && code < 600) || code == 701) {
    return "🌧"
  } else if (code >= 600 && code < 700) {
    return "❄️"
  } else if (code == 711) {
    return "🔥" 
  } else if (code == 800) {
    return isNight ? "🌕" : "☀️" 
  } else if (code == 801) {
    return isNight ? "☁️" : "🌤"  
  } else if (code == 802) {
    return isNight ? "☁️" : "⛅️"  
  } else if (code == 803) {
    return isNight ? "☁️" : "🌥" 
  } else if (code == 804) {
    return "☁️"  
  } else if (code == 900 || code == 962 || code == 781) {
    return "🌪" 
  } else if (code >= 700 && code < 800) {
    return "🌫" 
  } else if (code == 903) {
    return "🥶"  
  } else if (code == 904) {
    return "🥵" 
  } else if (code == 905 || code == 957) {
    return "💨" 
  } else if (code == 906 || code == 958 || code == 959) {
    return "🧊" 
  } else {
    return "❓" 
  }
}

//-------------------------------------
// Calendar Helper Functions
//-------------------------------------

/**
 * Fetch the next "accepted" calendar event from the given calendar
 * 
 * @param {*} calendarName The calendar to get events from
 */
async function fetchNextCalendarEvent(calendarName) {
  if (!calendarName || calendarName === 'TODO') {
    console.log(`[Calendar] Skip fetch: calendarName not set (value='${calendarName}')`);
    return null;
  }
  let calendar;
  try {
    calendar = await Calendar.forEventsByTitle(calendarName);
  } catch(e) {
    console.log(`[Calendar] Cannot find calendar '${calendarName}': ${e}`);
    return null;
  }
  if (!calendar) {
    console.log(`[Calendar] Calendar not found: ${calendarName}`);
    return null;
  }
  let events = [];
  let tomorrow = [];
  try {
    events = await CalendarEvent.today([calendar]);
    tomorrow = await CalendarEvent.tomorrow([calendar]);
  } catch(e) {
    console.log(`[Calendar] Event fetch failed for '${calendarName}': ${e}`);
    return null;
  }

  console.log(`Got ${events.length} events for ${calendarName}`);
  console.log(`Got ${tomorrow.length} events for ${calendarName} tomorrow`);

  const upcomingEvents = events
    .concat(tomorrow)
    .filter(e => (new Date(e.endDate)).getTime() >= (new Date()).getTime())
    .filter(e => e.attendees && e.attendees.some(a => a.isCurrentUser && a.status === 'accepted'));

  return upcomingEvents ? upcomingEvents[0] : null;
}

/**
 * Given a calendar event, return the display text with title and time.
 * 
 * @param {*} calendarEvent The calendar event
 * @param {*} isWorkEvent Is this a work event?
 */
function getCalendarEventTitle(calendarEvent, isWorkEvent) {
  if (!calendarEvent) {
    return `No upcoming ${isWorkEvent ? 'work ' : ''}events`;
  }

  const timeFormatter = new DateFormatter();
  timeFormatter.locale = 'en';
  timeFormatter.useNoDateStyle();
  timeFormatter.useShortTimeStyle();

  const eventTime = new Date(calendarEvent.startDate);

  return `[${timeFormatter.string(eventTime)}] ${calendarEvent.title}`;
}

// Period feature removed.

//-------------------------------------
// Misc. Helper Functions
//-------------------------------------

/**
 * Make a REST request and return the response
 * 
 * @param {*} url URL to make the request to
 * @param {*} headers Headers for the request
 */
async function fetchJson(url, headers) {
  try {
    console.log(`Fetching url: ${url}`);
    const req = new Request(url);
    req.headers = headers;
    const resp = await req.loadJSON();
    return resp;
  } catch (error) {
    console.error(`Error fetching from url: ${url}, error: ${JSON.stringify(error)}`);
  }
}

/**
 * Get the last updated timestamp from the Cache.
 */
async function getLastUpdated() {
  let cachedLastUpdated = await cache.read(CACHE_KEY_LAST_UPDATED);

  if (!cachedLastUpdated) {
    cachedLastUpdated = new Date().getTime();
    cache.write(CACHE_KEY_LAST_UPDATED, cachedLastUpdated);
  }

  return cachedLastUpdated;
}