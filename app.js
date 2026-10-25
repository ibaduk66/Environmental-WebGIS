const locations = [
  { name: "Blue Area", city: "Islamabad", latitude: 33.7116, longitude: 73.0614 },
  { name: "F-9 Park", city: "Islamabad", latitude: 33.7016, longitude: 72.9754 },
  { name: "I-8 Markaz", city: "Islamabad", latitude: 33.6688, longitude: 73.0745 },
  { name: "Saddar", city: "Rawalpindi", latitude: 33.5973, longitude: 73.0479 },
  { name: "Raja Bazaar", city: "Rawalpindi", latitude: 33.6007, longitude: 73.0614 },
  { name: "Bahria Town Phase 4", city: "Rawalpindi", latitude: 33.5528, longitude: 73.1235 }
];

const weatherApi = "https://api.open-meteo.com/v1/forecast";
const weatherFields = [
  "temperature_2m",
  "relative_humidity_2m",
  "apparent_temperature",
  "is_day",
  "precipitation",
  "weather_code",
  "cloud_cover",
  "wind_speed_10m",
  "wind_direction_10m"
];

const weatherDescriptions = {
  0: { label: "Clear sky", group: "clear", icon: "☀️" },
  1: { label: "Mainly clear", group: "clear", icon: "🌤️" },
  2: { label: "Partly cloudy", group: "cloudy", icon: "⛅" },
  3: { label: "Overcast", group: "cloudy", icon: "☁️" },
  45: { label: "Fog", group: "fog", icon: "🌫️" },
  48: { label: "Depositing rime fog", group: "fog", icon: "🌫️" },
  51: { label: "Light drizzle", group: "rain", icon: "🌦️" },
  53: { label: "Moderate drizzle", group: "rain", icon: "🌦️" },
  55: { label: "Dense drizzle", group: "rain", icon: "🌧️" },
  56: { label: "Light freezing drizzle", group: "rain", icon: "🌧️" },
  57: { label: "Dense freezing drizzle", group: "rain", icon: "🌧️" },
  61: { label: "Slight rain", group: "rain", icon: "🌦️" },
  63: { label: "Moderate rain", group: "rain", icon: "🌧️" },
  65: { label: "Heavy rain", group: "rain", icon: "🌧️" },
  66: { label: "Light freezing rain", group: "rain", icon: "🌧️" },
  67: { label: "Heavy freezing rain", group: "rain", icon: "🌧️" },
  71: { label: "Slight snowfall", group: "snow", icon: "🌨️" },
  73: { label: "Moderate snowfall", group: "snow", icon: "❄️" },
  75: { label: "Heavy snowfall", group: "snow", icon: "❄️" },
  77: { label: "Snow grains", group: "snow", icon: "❄️" },
  80: { label: "Slight rain showers", group: "showers", icon: "🌦️" },
  81: { label: "Moderate rain showers", group: "showers", icon: "🌧️" },
  82: { label: "Violent rain showers", group: "showers", icon: "🌧️" },
  85: { label: "Slight snow showers", group: "snow", icon: "🌨️" },
  86: { label: "Heavy snow showers", group: "snow", icon: "❄️" },
  95: { label: "Thunderstorm", group: "thunderstorm", icon: "⛈️" },
  96: { label: "Thunderstorm with slight hail", group: "thunderstorm", icon: "⛈️" },
  99: { label: "Thunderstorm with heavy hail", group: "thunderstorm", icon: "⛈️" }
};

const map = L.map("map").setView([33.6844, 73.0479], 11);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

const markersLayer = L.layerGroup().addTo(map);
const searchInput = document.querySelector("#search");
const citySelect = document.querySelector("#city-filter");
const conditionSelect = document.querySelector("#condition-filter");
const placeList = document.querySelector("#place-list");
const resultCount = document.querySelector("#result-count");
const statusMessage = document.querySelector("#status");
const refreshButton = document.querySelector("#refresh");
let weatherLocations = [];

function weatherFor(code) {
  return weatherDescriptions[code] || { label: "Unknown conditions", group: "unknown", icon: "🌡️" };
}

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-PK", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Karachi"
  }).format(date);
}

function popupContent(location) {
  const condition = weatherFor(location.weather.weather_code);
  const details = [
    ["Condition", `${condition.icon} ${condition.label}`],
    ["Temperature", `${location.weather.temperature_2m} °C`],
    ["Feels like", `${location.weather.apparent_temperature} °C`],
    ["Humidity", `${location.weather.relative_humidity_2m}%`],
    ["Wind", `${location.weather.wind_speed_10m} km/h`],
    ["Precipitation", `${location.weather.precipitation} mm`],
    ["Updated", formatTime(location.time)]
  ];
  const rows = details.map(([label, value]) =>
    `<div class="popup-row"><span>${label}</span><strong>${value}</strong></div>`
  ).join("");
  return `<h3 class="popup-title">${location.name}</h3><p class="popup-detail">${location.city}</p>${rows}`;
}

function getFilteredLocations() {
  const query = searchInput.value.trim().toLocaleLowerCase();
  const city = citySelect.value;
  const condition = conditionSelect.value;
  return weatherLocations.filter((location) => {
    const matchesSearch = `${location.name} ${location.city}`.toLocaleLowerCase().includes(query);
    const matchesCity = city === "all" || location.city === city;
    const matchesCondition = condition === "all" || weatherFor(location.weather.weather_code).group === condition;
    return matchesSearch && matchesCity && matchesCondition;
  });
}

function renderLocations() {
  const filtered = getFilteredLocations();
  markersLayer.clearLayers();
  placeList.replaceChildren();
  resultCount.textContent = `${filtered.length} ${filtered.length === 1 ? "location" : "locations"}`;

  for (const location of filtered) {
    const condition = weatherFor(location.weather.weather_code);
    const icon = L.divIcon({
      className: "weather-marker",
      html: `<span>${Math.round(location.weather.temperature_2m)}°</span>`,
      iconSize: [54, 34],
      iconAnchor: [27, 17]
    });
    const marker = L.marker([location.latitude, location.longitude], { icon })
      .bindPopup(popupContent(location))
      .addTo(markersLayer);

    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "place-button";
    const heading = document.createElement("span");
    heading.className = "place-name";
    heading.textContent = `${condition.icon} ${location.name}`;
    const details = document.createElement("span");
    details.className = "place-type";
    details.textContent = `${location.city} · ${condition.label}`;
    const temperature = document.createElement("span");
    temperature.className = "weather-temperature";
    temperature.textContent = `${location.weather.temperature_2m} °C`;
    button.append(heading, details, temperature);
    button.addEventListener("click", () => {
      map.flyTo([location.latitude, location.longitude], 13);
      marker.openPopup();
    });
    item.append(button);
    placeList.append(item);
  }

  if (filtered.length) {
    statusMessage.textContent = `Weather updated ${formatTime(weatherLocations[0].time)} (Pakistan time).`;
  } else {
    statusMessage.textContent = weatherLocations.length
      ? "No locations match your search and filters."
      : "Weather data has not loaded yet.";
  }
}

function validateWeatherResponse(data) {
  if (!Array.isArray(data) || data.length !== locations.length) {
    throw new Error("The weather service returned an unexpected number of locations.");
  }
  for (const item of data) {
    if (!item.current || typeof item.current.temperature_2m !== "number" ||
        typeof item.current.weather_code !== "number") {
      throw new Error("The weather service returned incomplete current conditions.");
    }
  }
}

async function loadWeather() {
  refreshButton.disabled = true;
  refreshButton.textContent = "Loading…";
  statusMessage.textContent = "Loading current weather…";
  statusMessage.classList.remove("error");
  resultCount.textContent = "Loading…";

  const parameters = new URLSearchParams({
    latitude: locations.map((location) => location.latitude).join(","),
    longitude: locations.map((location) => location.longitude).join(","),
    current: weatherFields.join(","),
    timezone: "Asia/Karachi"
  });

  try {
    const response = await fetch(`${weatherApi}?${parameters}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(20000)
    });
    if (!response.ok) {
      throw new Error(`The Open-Meteo API responded with HTTP ${response.status}.`);
    }
    const data = await response.json();
    validateWeatherResponse(data);

    weatherLocations = locations.map((location, index) => ({
      ...location,
      weather: data[index].current,
      time: data[index].current.time
    }));
    renderLocations();
  } catch (error) {
    statusMessage.textContent = `Could not load current weather. ${error.message} Check your connection and retry.`;
    statusMessage.classList.add("error");
    resultCount.textContent = "Data unavailable";
    placeList.replaceChildren();
    markersLayer.clearLayers();
  } finally {
    refreshButton.disabled = false;
    refreshButton.textContent = "Refresh weather";
  }
}

searchInput.addEventListener("input", renderLocations);
citySelect.addEventListener("change", renderLocations);
conditionSelect.addEventListener("change", renderLocations);
refreshButton.addEventListener("click", loadWeather);
loadWeather();
