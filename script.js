const SHEET_ID = "148f8oGqJL5u3ujLdwRzm05x7TKpPoqQikyltXa1zTCw";
const SHEETS = [
  { 
    name: 'MALAPPURAM ADVISOR', 
    label: 'ADVISOR'
  },
  { 
    name: 'MALAPPURAM TECH', 
    label: 'MECHANIC'
  }
];
const FALLBACK_IMAGE = 'https://via.placeholder.com/100';
const SCROLL_DURATION = 60; // Slower scrolling - 60 seconds
let currentSheetIndex = 0;
let scrollTimeout = null;
let previousData = null; // Store previous data to detect changes

// ===== LOGO URL CONFIGURATION =====
// Replace this URL with your company logo URL
const COMPANY_LOGO_URL = "https://i.postimg.cc/mZFhnQ4H/a3898668-6ff6-40af-b0cc-7991ebfe37b2.jpg";
// Example: "https://example.com/logo.png"
// ===================================

// Get current date in dd/mm/yyyy format
function getCurrentDate() {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  return `${day}/${month}/${year}`;
}

// Get date range from 1st of current month till today
function getDateRange() {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  return `01/${month}/${year} - ${day}/${month}/${year}`;
}

// Get formatted date and time for last update display
function getFormattedDateTime() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

// Set company logo
function setCompanyLogo() {
  const logoElement = document.getElementById('companyLogo');
  if (COMPANY_LOGO_URL && COMPANY_LOGO_URL !== "YOUR_LOGO_URL_HERE") {
    logoElement.src = COMPANY_LOGO_URL;
  } else {
    // Hide logo if no URL is provided
    logoElement.style.display = 'none';
  }
}

function parseGoogleSheetData(response) {
  const jsonString = response.substring(47).slice(0, -2);
  const data = JSON.parse(jsonString);
  
  const rows = data.table.rows;
  const employees = [];

  rows.forEach(row => {
    const cells = row.c;
    if (cells && cells[0] && cells[0].v) {
      // Sheet format: NAME, EMP CODE, THIS MONTH LOAD, THIS MONTH LABOUR AMOUNT, TODAY LOAD, TODAY LABOUR, PHOTO
      employees.push({
        name: cells[0]?.v || 'Unknown',
        empCode: cells[1]?.v || '',
        loadTillDate: parseFloat(cells[2]?.v) || 0,
        labourTillDate: parseFloat(cells[3]?.v) || 0,
        loadToday: parseFloat(cells[4]?.v) || 0,
        labourToday: parseFloat(cells[5]?.v) || 0,
        photoURL: cells[6]?.v || FALLBACK_IMAGE
      });
    }
  });

  return employees;
}

function createTopPerformer(employee, rank) {
  return `
    <div class="top-person rank-${rank}">
      <div class="rank-badge">${rank}</div>
      <img src="${employee.photoURL}" class="top-photo" alt="${employee.name}" onerror="this.src='${FALLBACK_IMAGE}'">
      <div class="top-person-info">
        <h4>${employee.name}</h4>
        <p>₹${employee.labour.toLocaleString()}</p>
      </div>
    </div>
  `;
}

function updateLastUpdateTime() {
  const dateTimeString = getFormattedDateTime();
  document.getElementById('updateDateTime').textContent = dateTimeString;
}

// Check if data has changed (specifically labour amounts)
function hasDataChanged(newData) {
  if (!previousData) return true;
  
  // Compare labour amounts to detect changes
  const newLabourSum = newData.reduce((sum, emp) => sum + emp.labourToday + emp.labourTillDate, 0);
  const oldLabourSum = previousData.reduce((sum, emp) => sum + emp.labourToday + emp.labourTillDate, 0);
  
  return newLabourSum !== oldLabourSum;
}

function displayData(employees) {
  if (!employees.length) return;

  // Update section titles WITHOUT dates
  document.querySelector('.top-section:nth-child(1) h3').innerHTML = `🌟 Today's Top 3 Performers`;
  document.querySelector('.top-section:nth-child(2) h3').innerHTML = `👑 This Month Top 3 Performers`;

  // Today's Top 3 (based on TODAY LABOUR)
  const todayTop3 = [...employees]
    .map(e => ({ ...e, labour: e.labourToday }))
    .sort((a, b) => b.labour - a.labour)
    .slice(0, 3);
  
  document.getElementById('todayTop3').innerHTML = todayTop3
    .map((emp, i) => createTopPerformer(emp, i + 1))
    .join('');

  // This Month Top 3 (based on THIS MONTH LABOUR AMOUNT)
  const tillDateTop3 = [...employees]
    .map(e => ({ ...e, labour: e.labourTillDate }))
    .sort((a, b) => b.labour - a.labour)
    .slice(0, 3);
  
  document.getElementById('tillDateTop3').innerHTML = tillDateTop3
    .map((emp, i) => createTopPerformer(emp, i + 1))
    .join('');

  // Table sorted by Labour Today (highest first)
  const sortedEmployees = [...employees].sort((a, b) => b.labourToday - a.labourToday);
  
  const tableHTML = `
    <table>
      <tbody>
        ${sortedEmployees.map((emp, i) => `
          <tr>
            <td style="width: 8%;"><strong>${i + 1}</strong></td>
            <td style="width: 10%;"><img src="${emp.photoURL}" onerror="this.src='${FALLBACK_IMAGE}'"></td>
            <td style="width: 22%;"><strong>${emp.name}</strong></td>
            <td style="width: 12%;">${emp.loadToday.toFixed(2)}</td>
            <td style="width: 12%;">${emp.loadTillDate.toFixed(2)}</td>
            <td style="width: 12%;"><strong>₹${emp.labourToday.toLocaleString()}</strong></td>
            <td style="width: 12%;">₹${emp.labourTillDate.toLocaleString()}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  const scrollContent = document.getElementById('scroll-content');
  scrollContent.innerHTML = tableHTML + tableHTML;
  
  // Remove old animation and force reflow
  scrollContent.style.animation = 'none';
  void scrollContent.offsetHeight; // Force reflow
  scrollContent.style.animation = `scrollUp ${SCROLL_DURATION}s linear`;
  
  // Clear any existing timeout
  if (scrollTimeout) {
    clearTimeout(scrollTimeout);
  }
  
  // Auto-switch after scroll completes
  scrollTimeout = setTimeout(() => {
    switchSheet();
  }, SCROLL_DURATION * 1000);
}

function showRefreshIndicator() {
  const indicator = document.getElementById('refreshIndicator');
  indicator.classList.add('show');
  setTimeout(() => {
    indicator.classList.remove('show');
  }, 1500);
}

async function fetchData() {
  try {
    const currentSheet = SHEETS[currentSheetIndex];
    
    // Fetch data from single sheet
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${currentSheet.name}`;
    const response = await fetch(sheetUrl);
    const text = await response.text();
    const employees = parseGoogleSheetData(text);
    
    if (employees.length === 0) {
      throw new Error('No data found');
    }

    // Only update timestamp if data actually changed
    if (hasDataChanged(employees)) {
      updateLastUpdateTime();
      previousData = JSON.parse(JSON.stringify(employees)); // Deep copy
    }

    displayData(employees);
    
    document.getElementById('viewBadge').textContent = currentSheet.label;
    document.getElementById('footer').textContent = 
      `Viewing: ${currentSheet.label} | Auto-switching views`;

  } catch (error) {
    console.error('Error fetching data:', error);
    document.getElementById('footer').textContent = 'Error loading data. Retrying...';
    setTimeout(fetchData, 5000);
  }
}

function switchSheet() {
  showRefreshIndicator();
  currentSheetIndex = (currentSheetIndex + 1) % SHEETS.length;
  fetchData();
}

// Initial setup
setCompanyLogo();
fetchData();

// Refresh when tab becomes visible
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    fetchData();
  }
});
