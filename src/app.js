const hubs = Array.isArray(window.FOCUS_HUBS) ? window.FOCUS_HUBS : [];

const $ = (id) => document.getElementById(id);

const searchInput = $("searchInput");
const clearBtn = $("clearBtn");
const results = $("results");
const stats = $("stats");

const normalize = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

function scoreHub(hub, query) {
  const q = normalize(query);
  if (!q) return 1;

  const search = hub.search || normalize(Object.values(hub).join(" "));
  const oltHub = normalize(`${hub.olt} ${hub.hubNumber}`);
  const hubOnly = normalize(hub.hubNumber);

  if (oltHub === q) return 100;
  if (normalize(hub.id) === q) return 95;
  if (normalize(hub.olt) === q) return 80;
  if (hubOnly === q) return 60;
  if (search.includes(q)) return 40;

  const parts = q.split(" ").filter(Boolean);
  const matches = parts.filter((part) => search.includes(part)).length;

  return matches === parts.length ? 20 + matches : 0;
}

function cleanIntersectionQuery(address) {
  let text = String(address || "").trim();

  const isIntersection =
    /intersection/i.test(text) ||
    /\sw\/\s/i.test(text) ||
    /\bwith\b/i.test(text);

  if (!isIntersection) return text;

  // Remove house number (ex: 1801)
  text = text.replace(/^\d+\s+/, "");

  text = text.replace(/\bat intersection w\/\b/i, " & ");
  text = text.replace(/\bat intersection with\b/i, " & ");
  text = text.replace(/\bintersection of\b/i, "");
  text = text.replace(/\band\b/i, " & ");
  text = text.replace(/\bw\/\b/i, " & ");
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

function getLocationQuery(hub) {
  const cleanedAddress = cleanIntersectionQuery(hub.address);

  return [
    cleanedAddress,
    hub.city,
    "NC"
  ].filter(Boolean).join(", ");
}

function previewUrl(hub) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(getLocationQuery(hub))}`;
}

function navigateUrl(hub) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(getLocationQuery(hub))}&travelmode=driving`;
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

    <div class="meta">
      ${hub.city ? `<span><strong>City:</strong> ${hub.city}</span>` : ""}
      ${hub.development ? `<span><strong>Development:</strong> ${hub.development}</span>` : ""}
      ${hub.cabinet ? `<span><strong>Cabinet:</strong> ${hub.cabinet}</span>` : ""}
    </div>

    <div class="actions">
      <button class="secondary preview-btn">Preview</button>
      <button class="primary nav-btn">Navigate</button>
    </div>
  `;

  card.querySelector(".preview-btn").addEventListener("click", () => {
    window.open(previewUrl(hub), "_blank");
  });

  card.querySelector(".nav-btn").addEventListener("click", () => {
    window.open(navigateUrl(hub), "_blank");
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