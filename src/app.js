const hubs = Array.isArray(window.FOCUS_HUBS) ? window.FOCUS_HUBS : [];
const PIN_KEY = "find_my_hub_saved_pins";

const $ = (id) => document.getElementById(id);

const searchInput = $("searchInput");
const clearBtn = $("clearBtn");
const results = $("results");
const stats = $("stats");

let savedPins = JSON.parse(localStorage.getItem(PIN_KEY) || "{}");

const normalize = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

function scoreHub(hub, query) {
  const q = normalize(query);
  if (!q) return 1;

  const hubNum = String(hub.hubNumber).trim();
  const olt = normalize(hub.olt);

  if (q === `${olt} ${hubNum}`) return 1000;
  if (q === `hub ${hubNum}`) return 900;
  if (/^\d+$/.test(q) && q === hubNum) return 850;
  if (q === olt) return 700;
  if (normalize(hub.address).includes(q)) return 600;
  if (normalize(hub.city).includes(q)) return 500;
  if (normalize(hub.development).includes(q)) return 400;
  if ((hub.search || "").includes(q)) return 100;

  return 0;
}

function cleanIntersectionQuery(address) {
  let text = String(address || "").trim();

  const isCrossStreet =
    /intersection|corner|cross street|crossroad|across from|across|near|beside|next to|w\/|with/i.test(text);

  if (!isCrossStreet) return text;

  text = text.replace(/^\d+\s+/, "");
  text = text.replace(/\bat\s+the\s+intersection\s+of\b/i, "");
  text = text.replace(/\bat\s+intersection\s+w\/\b/i, " & ");
  text = text.replace(/\bat\s+intersection\s+with\b/i, " & ");
  text = text.replace(/\bintersection\s+of\b/i, "");
  text = text.replace(/\bcorner\s+of\b/i, "");
  text = text.replace(/\bat\s+corner\s+of\b/i, "");
  text = text.replace(/\bcross\s+street\s+of\b/i, " & ");
  text = text.replace(/\bacross\s+from\b/i, "");
  text = text.replace(/\bnext\s+to\b/i, "");
  text = text.replace(/\bbeside\b/i, "");
  text = text.replace(/\bnear\b/i, "");
  text = text.replace(/\bw\/\b/i, " & ");
  text = text.replace(/\bwith\b/i, " & ");
  text = text.replace(/\band\b/i, " & ");
  text = text.replace(/\s*&\s*/g, " & ");
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

function getLocationQuery(hub) {
  const pin = savedPins[hub.id];

  if (pin) {
    return `${pin.lat},${pin.lng}`;
  }

  const cleanedAddress = cleanIntersectionQuery(hub.address);

  return [cleanedAddress, hub.city, "NC"].filter(Boolean).join(", ");
}

function previewUrl(hub) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    getLocationQuery(hub)
  )}`;
}

function navigateUrl(hub) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    getLocationQuery(hub)
  )}&travelmode=driving`;
}

function saveCurrentLocation(hub) {
  if (!navigator.geolocation) {
    alert("GPS location is not available on this device.");
    return;
  }

  const confirmed = confirm(
    `Save your current GPS location for ${hub.olt} ${hub.hub}? Stand near the hub before saving.`
  );

  if (!confirmed) return;

  navigator.geolocation.getCurrentPosition(
    (position) => {
      savedPins[hub.id] = {
        lat: Number(position.coords.latitude.toFixed(7)),
        lng: Number(position.coords.longitude.toFixed(7)),
        accuracy: Math.round(position.coords.accuracy || 0),
        savedAt: new Date().toISOString()
      };

      localStorage.setItem(PIN_KEY, JSON.stringify(savedPins));

      alert(
        `Saved pin for ${hub.olt} ${hub.hub}. Accuracy: about ${savedPins[hub.id].accuracy} meters.`
      );

      render();
    },
    (error) => {
      alert(`Could not save GPS location: ${error.message}`);
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    }
  );
}

function searchHubs(query) {
  return hubs
    .map((hub) => ({ hub, score: scoreHub(hub, query) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.hub.id.localeCompare(b.hub.id))
    .map((item) => item.hub)
    .slice(0, 80);
}

function renderHub(hub) {
  const hasPin = Boolean(savedPins[hub.id]);

  const card = document.createElement("article");
  card.className = "hub-card";

  card.innerHTML = `
    <div class="hub-top">
      <div>
        <h2>${hub.olt} • ${hub.hub}</h2>
        <p class="subline">${hub.id}</p>
      </div>
    </div>

    <p class="address">${hub.address || "No location listed."}</p>

    <div class="status-row">
      <span class="badge ${hasPin ? "good" : "warn"}">
        ${hasPin ? "Verified GPS Pin" : "Spreadsheet Location"}
      </span>
    </div>

    <div class="meta">
      ${hub.city ? `<span><strong>City:</strong> ${hub.city}</span>` : ""}
      ${hub.development ? `<span><strong>Development:</strong> ${hub.development}</span>` : ""}
      ${hub.cabinet ? `<span><strong>Cabinet:</strong> ${hub.cabinet}</span>` : ""}
    </div>

    <div class="actions">
      <button class="secondary preview-btn">Preview</button>
      <button class="primary nav-btn">Navigate</button>
      <button class="secondary save-pin-btn">Save Current Location</button>
    </div>
  `;

  card.querySelector(".preview-btn").addEventListener("click", () => {
    window.open(previewUrl(hub), "_blank");
  });

  card.querySelector(".nav-btn").addEventListener("click", () => {
    window.open(navigateUrl(hub), "_blank");
  });

  card.querySelector(".save-pin-btn").addEventListener("click", () => {
    saveCurrentLocation(hub);
  });

  return card;
}

function render() {
  const query = searchInput.value;
  const list = searchHubs(query);

  stats.textContent = `${hubs.length} hubs loaded • showing ${list.length}`;

  results.innerHTML = "";

  if (!hubs.length) {
    results.innerHTML = `
      <article class="hub-card">
        <h2>No hub data loaded</h2>
        <p class="subline">Run npm run convert first.</p>
      </article>
    `;
    return;
  }

  if (!list.length) {
    results.innerHTML = `
      <article class="hub-card">
        <h2>No hubs found</h2>
        <p class="subline">Try an OLT, street, city, or hub number.</p>
      </article>
    `;
    return;
  }

  list.forEach((hub) => {
    results.appendChild(renderHub(hub));
  });
}

searchInput.addEventListener("input", render);

clearBtn.addEventListener("click", () => {
  searchInput.value = "";
  searchInput.focus();
  render();
});

render();