const SHEET_ID = "148f8oGqJL5u3ujLdwRzm05x7TKpPoqQikyltXa1zTCw";
const SHEETS = [
  { 
    name: 'MALAPPURAM ADVISOR', 
    label: 'Advisor',
    todaySheet: 'MALAPPURAM ADVISOR TODAY',
    tillDateSheet: 'MALAPPURAM ADVISOR TILL DATE'
  },
  { 
    name: 'MALAPPURAM TECH', 
    label: 'Tech',
    todaySheet: 'MALAPPURAM TECH TODAY',
    tillDateSheet: 'MALAPPURAM TECH TILL DATE'
  }
];
const FALLBACK_IMAGE = 'https://via.placeholder.com/100';
const SCROLL_DURATION = 30;
let currentSheetIndex = 0;

// ===== LOGO URL CONFIGURATION =====
// Replace this URL with your company logo URL
const COMPANY_LOGO_URL = "YOUR_LOGO_URL_HERE";
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

function parseGoogleSheetData(response, dataType) {
  const jsonString = response.substring(47).slice(0, -2);
  const data = JSON.parse(jsonString);
  
  const rows = data.table.rows;
  const employees = [];

  rows.forEach(row => {
    const cells = row.c;
    if (cells && cells[0] && cells[0].v) {
      if (dataType === 'today') {
        // TODAY sheet: NAME, EMP CODE, THIS MONTH LOAD, THIS MONTH LABOUR AMOUNT, TODAY LOAD, TODAY LABOUR, PHOTO
        employees.push({
          name: cells[0]?.v || 'Unknown',
          empCode: cells[1]?.v || '',
          monthLoad: parseFloat(cells[2]?.v) || 0,
          monthLabour: parseFloat(cells[3]?.v) || 0,
          loadToday: parseFloat(cells[4]?.v) || 0,
          labourToday: parseFloat(cells[5]?.v) || 0,
          photoURL: cells[6]?.v || FALLBACK_IMAGE
        });
      } else {
        // TILL DATE sheet: NAME, EMP CODE, LOAD TILL DATE, LABOUR TILL DATE, PHOTO
        employees.push({
          name: cells[0]?.v || 'Unknown',
          empCode: cells[1]?.v || '',
          loadTillDate: parseFloat(cells[2]?.v) || 0,
          labourTillDate: parseFloat(cells[3]?.v) || 0,
          photoURL: cells[4]?.v || FALLBACK_IMAGE
        });
      }
    }
  });

  return employees;
}

function mergeEmployeeData(todayData, tillDateData) {
  // Merge data by employee code
  const merged = todayData.map(todayEmp => {
    const tillDateEmp = tillDateData.find(e => e.empCode === todayEmp.empCode) || {};
    return {
      name: todayEmp.name,
      empCode: todayEmp.empCode,
      loadToday: todayEmp.loadToday || 0,
      labourToday: todayEmp.labourToday || 0,
      loadTillDate: tillDateEmp.loadTillDate || 0,
      labourTillDate: tillDateEmp.labourTillDate || 0,
      photoURL: todayEmp.photoURL || tillDateEmp.photoURL || FALLBACK_IMAGE
    };
  });

  return merged;
}

function createTopPerformer(employee, rank) {
  return `
    <div class="top-person rank-${rank}">
      <div class="rank-badge">${rank}</div>
      <img src="${employee.photoURL}" class="top-photo" alt="${employee.name}" onerror="this.src='${FALLBACK_IMAGE}'">
      <h4>${employee.name}</h4>
      <p>₹${employee.labour.toLocaleString()}</p>
    </div>
  `;
}

function updateLastUpdateTime() {
  const dateTimeString = getFormattedDateTime();
  document.getElementById('updateDateTime').textContent = dateTimeString;
}

function displayData(employees) {
  if (!employees.length) return;

  const todayDate = getCurrentDate();
  const dateRange = getDateRange();

  // Update section titles with dates
  document.querySelector('.top-section:nth-child(1) h3').innerHTML = `🌟 ${todayDate} Top 3 Performers`;
  document.querySelector('.top-section:nth-child(2) h3').innerHTML = `👑 ${dateRange} Top 3 Performers`;

  // Today's Top 3
  const todayTop3 = [...employees]
    .map(e => ({ ...e, labour: e.labourToday }))
    .sort((a, b) => b.labour - a.labour)
    .slice(0, 3);
  
  document.getElementById('todayTop3').innerHTML = todayTop3
    .map((emp, i) => createTopPerformer(emp, i + 1))
    .join('');

  // Till Date Top 3
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
  scrollContent.style.animation = `scrollUp ${SCROLL_DURATION}s linear infinite`;
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
    
    // Fetch TODAY data
    const todayUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${currentSheet.todaySheet}`;
    const todayResponse = await fetch(todayUrl);
    const todayText = await todayResponse.text();
    const todayEmployees = parseGoogleSheetData(todayText, 'today');
    
    // Fetch TILL DATE data
    const tillDateUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${currentSheet.tillDateSheet}`;
    const tillDateResponse = await fetch(tillDateUrl);
    const tillDateText = await tillDateResponse.text();
    const tillDateEmployees = parseGoogleSheetData(tillDateText, 'tillDate');
    
    // Merge the data
    const employees = mergeEmployeeData(todayEmployees, tillDateEmployees);
    
    if (employees.length === 0) {
      throw new Error('No data found');
    }

    displayData(employees);
    updateLastUpdateTime();
    
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

// Switch sheets every 40 seconds
setInterval(switchSheet, 40000);

// Refresh when tab becomes visible
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    fetchData();
  }
});
