// ============ CONFIGURATION ============
const SHEET_ID = "148f8oGqJL5u3ujLdwRzm05x7TKpPoqQikyltXa1zTCw";
const SHEETS = [
  { name: 'MALAPPURAM ADVISOR', label: 'ADVISOR', updateCell: 'LASTUPDATE!A2' },
  { name: 'MALAPPURAM TECH', label: 'MECHANIC', updateCell: 'LASTUPDATE!A2' }
];
const FALLBACK_IMAGE = 'https://via.placeholder.com/100';
const SCROLL_DURATION = 60;
const COMPANY_LOGO_URL = "https://i.postimg.cc/mZFhnQ4H/a3898668-6ff6-40af-b0cc-7991ebfe37b2.jpg";

// ============ GLOBAL VARIABLES ============
let currentSheetIndex = 0;
let scrollTimeout = null;

// ============ HELPER FUNCTIONS ============
// Format numbers - remove .00 for whole numbers
function formatNumber(num) {
  if (num % 1 === 0) {
    return num.toString(); // Whole number, no decimals
  } else {
    return num.toFixed(2); // Has decimals, show 2 places
  }
}

// ============ LOGO SETUP ============
function setCompanyLogo() {
  const logoElement = document.getElementById('companyLogo');
  if (COMPANY_LOGO_URL) {
    logoElement.src = COMPANY_LOGO_URL;
  } else {
    logoElement.style.display = 'none';
  }
}

// ============ DATA PARSING ============
function parseGoogleSheetData(response) {
  const jsonString = response.substring(47).slice(0, -2);
  const data = JSON.parse(jsonString);
  const rows = data.table.rows;
  const employees = [];

  rows.forEach(row => {
    const cells = row.c;
    if (cells && cells[0] && cells[0].v) {
      employees.push({
        name: cells[0]?.v || 'Unknown',
        empCode: cells[6]?.v || '',
        loadTillDate: parseFloat(cells[1]?.v) || 0,
        labourTillDate: parseFloat(cells[2]?.v) || 0,
        loadToday: parseFloat(cells[3]?.v) || 0,
        labourToday: parseFloat(cells[4]?.v) || 0,
        photoURL: cells[5]?.v || FALLBACK_IMAGE
      });
    }
  });

  return employees;
}

// ============ GET LAST UPDATE TIME FROM SHEET ============
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
      document.getElementById('updateDateTime').textContent = cellValue;
    }
  } catch (error) {
    console.error('Error fetching last update time:', error);
  }
}

// ============ CREATE TOP PERFORMER HTML ============
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

// ============ DISPLAY DATA ============
function displayData(employees) {
  if (!employees.length) return;

  document.querySelector('.top-section:nth-child(1) h3').innerHTML = `🌟 Today's Top 3 Performers`;
  document.querySelector('.top-section:nth-child(2) h3').innerHTML = `👑 This Month Top 3 Performers`;

  // Today's Top 3
  const todayTop3 = [...employees]
    .map(e => ({ ...e, labour: e.labourToday }))
    .sort((a, b) => b.labour - a.labour)
    .slice(0, 3);
  
  document.getElementById('todayTop3').innerHTML = todayTop3
    .map((emp, i) => createTopPerformer(emp, i + 1))
    .join('');

  // This Month Top 3
  const tillDateTop3 = [...employees]
    .map(e => ({ ...e, labour: e.labourTillDate }))
    .sort((a, b) => b.labour - a.labour)
    .slice(0, 3);
  
  document.getElementById('tillDateTop3').innerHTML = tillDateTop3
    .map((emp, i) => createTopPerformer(emp, i + 1))
    .join('');

  // Table
  const sortedEmployees = [...employees].sort((a, b) => b.labourToday - a.labourToday);
  
  const tableHTML = `
    <table>
      <tbody>
        ${sortedEmployees.map((emp, i) => `
          <tr>
            <td style="width: 8%;"><strong>${i + 1}</strong></td>
            <td style="width: 10%;"><img src="${emp.photoURL}" onerror="this.src='${FALLBACK_IMAGE}'"></td>
            <td style="width: 22%;"><strong>${emp.name}</strong></td>
            <td style="width: 12%;">${formatNumber(emp.loadToday)}</td>
            <td style="width: 12%;">${formatNumber(emp.loadTillDate)}</td>
            <td style="width: 12%;"><strong>₹${emp.labourToday.toLocaleString()}</strong></td>
            <td style="width: 12%;">₹${emp.labourTillDate.toLocaleString()}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  const scrollContent = document.getElementById('scroll-content');
  scrollContent.innerHTML = tableHTML + tableHTML;
  scrollContent.style.animation = 'none';
  void scrollContent.offsetHeight;
  scrollContent.style.animation = `scrollUp ${SCROLL_DURATION}s linear`;
  
  if (scrollTimeout) {
    clearTimeout(scrollTimeout);
  }
  
  scrollTimeout = setTimeout(() => {
    switchSheet();
  }, SCROLL_DURATION * 1000);
}

// ============ SHOW REFRESH INDICATOR ============
function showRefreshIndicator() {
  const indicator = document.getElementById('refreshIndicator');
  indicator.classList.add('show');
  setTimeout(() => {
    indicator.classList.remove('show');
  }, 1500);
}

// ============ FETCH DATA ============
async function fetchData() {
  try {
    const currentSheet = SHEETS[currentSheetIndex];
    
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${currentSheet.name}`;
    const response = await fetch(sheetUrl);
    const text = await response.text();
    const employees = parseGoogleSheetData(text);
    
    if (employees.length === 0) {
      throw new Error('No data found');
    }

    displayData(employees);
    await getLastUpdateTime();
    
    document.getElementById('viewBadge').textContent = currentSheet.label;
    document.getElementById('footer').textContent = 
      `Viewing: ${currentSheet.label} | Auto-switching views`;

  } catch (error) {
    console.error('Error fetching data:', error);
    document.getElementById('footer').textContent = 'Error loading data. Retrying...';
    setTimeout(fetchData, 5000);
  }
}

// ============ SWITCH SHEETS ============
function switchSheet() {
  showRefreshIndicator();
  currentSheetIndex = (currentSheetIndex + 1) % SHEETS.length;
  fetchData();
}

// ============ INITIAL SETUP ============
setCompanyLogo();
fetchData();

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    fetchData();
  }
});
