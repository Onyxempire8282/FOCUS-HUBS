const KEY = 'focus_hubs_data';
let hubs = JSON.parse(localStorage.getItem(KEY) || '[]');

const $ = id => document.getElementById(id);
const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
const norm = value => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function findHeader(rows) {
  return rows.findIndex(row => {
    const text = row.map(norm).join(' ');
    return text.includes('hub') && text.includes('address');
  });
}

function findCol(headers, word, fallback) {
  const index = headers.findIndex(header => norm(header).includes(word));
  return index >= 0 ? index : fallback;
}

function importWorkbook(workbook) {
  const next = [];
  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    const headerRow = findHeader(rows);
    if (headerRow < 0) return;

    const headers = rows[headerRow];
    const hubCol = findCol(headers, 'hub', 0);
    const addressCol = findCol(headers, 'address', 1);
    const developmentCol = findCol(headers, 'development', -1);
    const cabinetCol = findCol(headers, 'cabinet', -1);
    const pairCol = findCol(headers, 'pair', -1);

    rows.slice(headerRow + 1).forEach(row => {
      const rawHub = clean(row[hubCol]);
      const address = clean(row[addressCol]);
      if (!rawHub || norm(rawHub) === 'hub') return;
      const hubNumber = (rawHub.match(/\d+/) || [rawHub])[0];
      next.push({
        id: `${sheetName}-${hubNumber}`,
        olt: sheetName,
        hub: rawHub.toUpperCase().startsWith('HUB') ? rawHub : `HUB ${hubNumber}`,
        hubNumber,
        address,
        development: developmentCol >= 0 ? clean(row[developmentCol]) : '',
        cabinet: cabinetCol >= 0 ? clean(row[cabinetCol]) : '',
        pairs: pairCol >= 0 ? clean(row[pairCol]) : ''
      });
    });
  });
  hubs = next;
  localStorage.setItem(KEY, JSON.stringify(hubs));
  $('importNote').textContent = `Imported ${hubs.length} hubs.`;
  render();
}

function resultText(hub) {
  return norm(`${hub.id} ${hub.olt} ${hub.hub} ${hub.hubNumber} ${hub.address} ${hub.development} ${hub.cabinet} ${hub.pairs}`);
}

function getMatches() {
  const q = norm($('searchInput').value);
  if (!q) return hubs.slice(0, 50);
  const parts = q.split(' ');
  return hubs.filter(hub => parts.every(part => resultText(hub).includes(part))).slice(0, 80);
}

function render() {
  const list = getMatches();
  $('stats').textContent = `${hubs.length} hubs loaded • showing ${list.length}`;
  const box = $('results');
  box.innerHTML = '';
  if (!list.length) {
    box.innerHTML = '<article class="hub-card"><h2>No hubs found</h2><p class="subline">Import the workbook or try another search.</p></article>';
    return;
  }
  list.forEach(hub => {
    const template = document.getElementById('hubTemplate').content.cloneNode(true);
    template.querySelector('h2').textContent = `${hub.olt} - ${hub.hub}`;
    template.querySelector('.subline').textContent = hub.id;
    template.querySelector('.address').textContent = hub.address || 'No location description listed.';
    template.querySelector('.meta').innerHTML = [
      ['Development', hub.development],
      ['Cabinet', hub.cabinet],
      ['Pairs', hub.pairs]
    ].filter(item => item[1]).map(item => `<span><strong>${item[0]}:</strong> ${item[1]}</span>`).join('');
    template.querySelector('.status-row').innerHTML = '<span class="badge warn">Estimated from sheet</span>';
    template.querySelector('.navigate').onclick = () => {
      const query = `${hub.address} ${hub.olt} North Carolina`;
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank');
    };
    template.querySelector('.add-stop').onclick = template.querySelector('.navigate').onclick;
    template.querySelector('.save-location').onclick = () => alert('Verified pin saving is next.');
    box.appendChild(template);
  });
}

$('searchInput').addEventListener('input', render);
$('clearBtn').onclick = () => { $('searchInput').value = ''; render(); };
$('importBtn').onclick = async () => {
  const file = $('excelInput').files[0];
  if (!file) return alert('Choose the Focus hub Excel workbook first.');
  if (!window.XLSX) return alert('Excel parser did not load. Reload with internet once and try again.');
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  importWorkbook(workbook);
};

document.querySelectorAll('[data-filter]').forEach(button => button.onclick = render);
$('addAddressBtn').onclick = () => {
  const address = prompt('Enter address or location:');
  if (address) window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
};
$('openRouteBtn').onclick = () => alert('Route pad is next.');
$('clearRouteBtn').onclick = () => alert('Route pad is next.');

render();
