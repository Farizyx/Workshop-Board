const SHEET_ID = "148f8oGqJL5u3ujLdwRzm05x7TKpPoqQikyltXa1zTCw";
const SHEETS = [
  { name: 'MALAPPURAM ADVISOR TODAY', label: 'ADVISOR - TODAY', viewType: 'today', updateCell: 'LASTUPDATE!A2' },
  { name: 'MALAPPURAM ADVISOR TOTAL', label: 'ADVISOR - TOTAL', viewType: 'total', updateCell: 'LASTUPDATE!A2' },
  { name: 'MALAPPURAM TECH TODAY', label: 'MECHANIC - TODAY', viewType: 'today', updateCell: 'LASTUPDATE!A2' },
  { name: 'MALAPPURAM TECH TOTAL', label: 'MECHANIC - TOTAL', viewType: 'total', updateCell: 'LASTUPDATE!A2' }
];
const FALLBACK_IMAGE = 'https://via.placeholder.com/150/e2e8f0/3b82f6?text=N/A';
const SWITCH_DELAY = 3000; // 3 seconds delay after reaching end before switching

let currentSheetIndex = 0;
let autoScrollInterval = null;
let isUserScrolling = false;
let switchTimeout = null;

function formatNumber(num) {
  return num % 1 === 0 ? num.toString() : num.toFixed(2);
}

function parseGoogleSheetData(response) {
  const jsonString = response.substring(47).slice(0, -2);
  const data = JSON.parse(jsonString);
  const rows = data.table.rows;
  const employees = [];

  rows.forEach(row => {
    const cells = row.c;
    if (cells && cells[0] && cells[0].v) {
      const photoURL = cells[5]?.v || FALLBACK_IMAGE;
      employees.push({
        name: cells[0]?.v || 'Unknown',
        load: parseFloat(cells[1]?.v) || 0,
        labour: parseFloat(cells[2]?.v) || 0,
        vas: parseFloat(cells[3]?.v) || 0,
        mga: parseFloat(cells[4]?.v) || 0,
        photoURL: photoURL
      });
    }
  });

  return employees;
}

function updateTableHeader(isMechanic) {
  const headerRow = document.querySelector('.table-header-sticky thead tr');
  
  if (isMechanic) {
    headerRow.innerHTML = `
      <th style="width: 8%;">RANK</th>
      <th style="width: 10%;">PHOTO</th>
      <th style="width: 40%;">EMPLOYEE NAME</th>
      <th style="width: 21%;">LOAD</th>
      <th style="width: 21%;">LABOUR ₹</th>
    `;
  } else {
    headerRow.innerHTML = `
      <th style="width: 8%;">RANK</th>
      <th style="width: 10%;">PHOTO</th>
      <th style="width: 30%;">EMPLOYEE NAME</th>
      <th style="width: 13%;">LOAD</th>
      <th style="width: 13%;">LABOUR ₹</th>
      <th style="width: 13%;">VAS ₹</th>
      <th style="width: 13%;">MGA ₹</th>
    `;
  }
}

async function getLastUpdateTime() {
  try {
    const currentSheet = SHEETS[currentSheetIndex];
    const cellUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${currentSheet.updateCell.split('!')[0]}&range=${currentSheet.updateCell.split('!')[1]}`;
    
    const response = await fetch(cellUrl);
    const text = await response.text();
    const jsonString = text.substring(47).slice(0, -2);
    const data = JSON.parse(jsonString);
    
    if (data.table.rows && data.table.rows[0] && data.table.rows[0].c && data.table.rows[0].c[0]) {
      const cellValue = data.table.rows[0].c[0].v || 'N/A';
      document.getElementById('updateTime').textContent = cellValue;
    }
  } catch (error) {
    console.error('Error fetching update time:', error);
  }
}

function createChampion(employee, rank, isMechanic) {
  if (isMechanic) {
    return `
      <div class="champion rank-${rank}">
        <div class="champion-avatar">
          <div class="avatar-ring">
            <div class="avatar-inner">
              <img src="${employee.photoURL}" class="champion-img" alt="${employee.name}" onerror="this.src='${FALLBACK_IMAGE}'">
            </div>
          </div>
          <div class="rank-badge">${rank}</div>
        </div>
        <div class="champion-info">
          <div class="champion-name">${employee.name}</div>
          <div class="champion-metrics">
            <div class="metric-item">
              <div class="metric-label">Load</div>
              <div class="metric-value">${formatNumber(employee.load)}</div>
            </div>
            <div class="metric-item">
              <div class="metric-label">Labour</div>
              <div class="metric-value">₹${employee.labour.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  } else {
    return `
      <div class="champion rank-${rank}">
        <div class="champion-avatar">
          <div class="avatar-ring">
            <div class="avatar-inner">
              <img src="${employee.photoURL}" class="champion-img" alt="${employee.name}" onerror="this.src='${FALLBACK_IMAGE}'">
            </div>
          </div>
          <div class="rank-badge">${rank}</div>
        </div>
        <div class="champion-info">
          <div class="champion-name">${employee.name}</div>
          <div class="champion-metrics">
            <div class="metric-item">
              <div class="metric-label">Load</div>
              <div class="metric-value">${formatNumber(employee.load)}</div>
            </div>
            <div class="metric-item">
              <div class="metric-label">Labour</div>
              <div class="metric-value">₹${employee.labour.toLocaleString()}</div>
            </div>
            <div class="metric-item">
              <div class="metric-label">VAS</div>
              <div class="metric-value">₹${employee.vas.toLocaleString()}</div>
            </div>
            <div class="metric-item">
              <div class="metric-label">MGA</div>
              <div class="metric-value">₹${employee.mga.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

function displayData(employees) {
  if (!employees.length) return;

  const currentSheet = SHEETS[currentSheetIndex];
  const isToday = currentSheet.viewType === 'today';
  const isMechanic = currentSheet.label.includes('MECHANIC');

  document.getElementById('podiumTitle').innerHTML = 
    isToday ? '⚡ TODAY\'S TOP 3' : '🏆 TOTAL TOP 3';

  const sortedByLabour = [...employees].sort((a, b) => b.labour - a.labour);
  
  const top3 = sortedByLabour.slice(0, 3);
  document.getElementById('podium').innerHTML = top3
    .map((emp, i) => createChampion(emp, i + 1, isMechanic))
    .join('');

  const tableRows = sortedByLabour.map((emp, i) => {
    if (isMechanic) {
      return `
      <tr>
        <td class="rank-cell">${i + 1}</td>
        <td><img src="${emp.photoURL}" class="table-avatar" onerror="this.src='${FALLBACK_IMAGE}'"></td>
        <td class="name-cell">${emp.name}</td>
        <td>${formatNumber(emp.load)}</td>
        <td class="value-cell">₹${emp.labour.toLocaleString()}</td>
      </tr>
    `;
    } else {
      return `
      <tr>
        <td class="rank-cell">${i + 1}</td>
        <td><img src="${emp.photoURL}" class="table-avatar" onerror="this.src='${FALLBACK_IMAGE}'"></td>
        <td class="name-cell">${emp.name}</td>
        <td>${formatNumber(emp.load)}</td>
        <td class="value-cell">₹${emp.labour.toLocaleString()}</td>
        <td class="value-cell">₹${emp.vas.toLocaleString()}</td>
        <td class="value-cell">₹${emp.mga.toLocaleString()}</td>
      </tr>
    `;
    }
  }).join('');

  // Update table header based on type
  updateTableHeader(isMechanic);

  const tableBody = document.getElementById('tableBody');
  tableBody.innerHTML = tableRows;

  // Reset scroll to top when switching sheets
  const tableContainer = document.querySelector('.table-container');
  tableContainer.scrollTop = 0;

  startAutoScroll();
}

function showRefreshIndicator() {
  const indicator = document.getElementById('refreshIndicator');
  indicator.classList.add('show');
  setTimeout(() => indicator.classList.remove('show'), 2000);
}

async function fetchData() {
  try {
    const currentSheet = SHEETS[currentSheetIndex];
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(currentSheet.name)}`;
    
    const response = await fetch(sheetUrl);
    const text = await response.text();
    const employees = parseGoogleSheetData(text);
    
    if (employees.length === 0) throw new Error('No data found');

    displayData(employees);
    await getLastUpdateTime();
    
    document.getElementById('viewBadge').textContent = currentSheet.label;
    document.getElementById('footer').textContent = 
      `${currentSheet.label} • LIVE TRACKING • ALL BRANCHES`;

  } catch (error) {
    console.error('Error:', error);
    document.getElementById('footer').textContent = 'CONNECTION ERROR • RETRYING...';
    setTimeout(fetchData, 5000);
  }
}

function switchSheet() {
  showRefreshIndicator();
  currentSheetIndex = (currentSheetIndex + 1) % SHEETS.length;
  fetchData();
}

function startAutoScroll() {
  const tableContainer = document.querySelector('.table-container');
  
  if (autoScrollInterval) clearInterval(autoScrollInterval);
  if (switchTimeout) clearTimeout(switchTimeout);
  
  tableContainer.scrollTop = 0;
  
  autoScrollInterval = setInterval(() => {
    if (!isUserScrolling) {
      tableContainer.scrollTop += 1;
      
      // Check if we've reached the bottom
      const isAtBottom = tableContainer.scrollTop >= (tableContainer.scrollHeight - tableContainer.clientHeight - 5);
      
      if (isAtBottom) {
        clearInterval(autoScrollInterval);
        
        // Wait 3 seconds then switch to next sheet
        switchTimeout = setTimeout(() => {
          switchSheet();
        }, SWITCH_DELAY);
      }
    }
  }, 50);
}

function handleMouseEnter() {
  isUserScrolling = true;
}

function handleMouseLeave() {
  isUserScrolling = false;
}

const tableContainer = document.querySelector('.table-container');
tableContainer.addEventListener('mouseenter', handleMouseEnter);
tableContainer.addEventListener('mouseleave', handleMouseLeave);

fetchData();

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) fetchData();
});
