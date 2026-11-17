// Weather Dashboard — Fetch API + async/await + Open-Meteo (no API key needed)
const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";

const form = document.getElementById("search-form");
const input = document.getElementById("city-input");
const button = document.getElementById("search-btn");
const statusEl = document.getElementById("status");
const currentEl = document.getElementById("current");
const forecastWrap = document.getElementById("forecast-wrap");
const forecastEl = document.getElementById("forecast");

// WMO weather codes -> [description, emoji]
const WEATHER_CODES = {
  0: ["Clear sky", "☀️"], 1: ["Mainly clear", "🌤️"], 2: ["Partly cloudy", "⛅"],
  3: ["Overcast", "☁️"], 45: ["Fog", "🌫️"], 48: ["Rime fog", "🌫️"],
  51: ["Light drizzle", "🌦️"], 53: ["Drizzle", "🌦️"], 55: ["Heavy drizzle", "🌧️"],
  61: ["Light rain", "🌧️"], 63: ["Rain", "🌧️"], 65: ["Heavy rain", "🌧️"],
  71: ["Light snow", "🌨️"], 73: ["Snow", "❄️"], 75: ["Heavy snow", "❄️"],
  80: ["Rain showers", "🌦️"], 81: ["Rain showers", "🌧️"], 82: ["Violent showers", "⛈️"],
  95: ["Thunderstorm", "⛈️"], 96: ["Thunderstorm with hail", "⛈️"], 99: ["Severe thunderstorm", "⛈️"],
};
const describe = (code) => WEATHER_CODES[code] || ["Unknown", "❓"];

// ---------- Helpers ----------
function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

function setLoading(isLoading) {
  button.disabled = isLoading;
  if (isLoading) setStatus("Loading weather data…");
}

// fetch wrapper with HTTP + network error handling
async function fetchJSON(url) {
  let response;
  try {
    response = await fetch(url);
  } catch (err) {
    throw new Error("Network error. Please check your internet connection.");
  }
  if (!response.ok) {
    throw new Error(`Server error (${response.status}). Please try again later.`);
  }
  return response.json();
}

// ---------- API calls ----------
async function getCoordinates(city) {
  const url = `${GEO_URL}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
  const data = await fetchJSON(url);
  if (!data.results || data.results.length === 0) {
    throw new Error(`City "${city}" not found. Check the spelling and try again.`);
  }
  return data.results[0]; // { name, country, latitude, longitude, admin1 ... }
}

async function getWeather(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
    daily: "weather_code,temperature_2m_max,temperature_2m_min",
    timezone: "auto",
    forecast_days: 5,
  });
  return fetchJSON(`${WEATHER_URL}?${params}`);
}

// ---------- Rendering (parses nested JSON) ----------
function renderCurrent(place, weather) {
  const { current, current_units: units } = weather;
  const [desc, emoji] = describe(current.weather_code);

  document.getElementById("location").textContent =
    [place.name, place.admin1, place.country].filter(Boolean).join(", ");
  document.getElementById("condition").textContent = desc;
  document.getElementById("icon").textContent = emoji;
  document.getElementById("temp").textContent =
    `${Math.round(current.temperature_2m)}${units.temperature_2m}`;
  document.getElementById("feels").textContent =
    `${Math.round(current.apparent_temperature)}${units.apparent_temperature}`;
  document.getElementById("humidity").textContent =
    `${current.relative_humidity_2m}${units.relative_humidity_2m}`;
  document.getElementById("wind").textContent =
    `${current.wind_speed_10m} ${units.wind_speed_10m}`;
  document.getElementById("updated").textContent =
    `Last updated: ${new Date(current.time).toLocaleString()}`;

  currentEl.classList.remove("hidden");
}

function renderForecast(weather) {
  const { time, weather_code, temperature_2m_max, temperature_2m_min } = weather.daily;
  const unit = weather.daily_units.temperature_2m_max;
  forecastEl.innerHTML = "";

  time.forEach((date, i) => {
    const [desc, emoji] = describe(weather_code[i]);
    const day = document.createElement("div");
    day.className = "day";
    day.title = desc;

    const name = document.createElement("div");
    name.className = "name";
    name.textContent = i === 0 ? "Today"
      : new Date(date).toLocaleDateString(undefined, { weekday: "short" });

    const icon = document.createElement("div");
    icon.className = "emoji";
    icon.textContent = emoji;

    const range = document.createElement("div");
    range.className = "range";
    range.innerHTML = `<strong>${Math.round(temperature_2m_max[i])}${unit}</strong> `;
    const lo = document.createElement("span");
    lo.className = "lo";
    lo.textContent = `${Math.round(temperature_2m_min[i])}${unit}`;
    range.appendChild(lo);

    day.append(name, icon, range);
    forecastEl.appendChild(day);
  });

  forecastWrap.classList.remove("hidden");
}

// ---------- Main flow ----------
async function searchCity(city) {
  setLoading(true);
  try {
    const place = await getCoordinates(city);
    const weather = await getWeather(place.latitude, place.longitude);
    renderCurrent(place, weather);
    renderForecast(weather);
    setStatus("");
  } catch (err) {
    currentEl.classList.add("hidden");
    forecastWrap.classList.add("hidden");
    setStatus(err.message, true);
  } finally {
    button.disabled = false;
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const city = input.value.trim();
  if (!city) {
    setStatus("Please enter a city name.", true);
    return;
  }
  searchCity(city);
});

// Load a default city on startup
searchCity("Bhopal");