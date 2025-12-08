const CONFIG = {
  SHEET_ID: "148f8oGqJL5u3ujLdwRzm05x7TKpPoqQikyltXa1zTCw",
  SHEETS: [
    { name: 'MALAPPURAM ADVISOR TODAY', label: 'ADVISOR - TODAY', type: 'today', category: 'SA', updateCell: 'LASTUPDATE!A2' },
    { name: 'MALAPPURAM ADVISOR TODAY', label: 'ADVISOR - TODAY', type: 'today', category: 'BSA', updateCell: 'LASTUPDATE!A2' },
    { name: 'MALAPPURAM ADVISOR TOTAL', label: 'ADVISOR - THIS MONTH', type: 'total', category: 'SA', updateCell: 'LASTUPDATE!A2' },
    { name: 'MALAPPURAM ADVISOR TOTAL', label: 'ADVISOR - THIS MONTH', type: 'total', category: 'BSA', updateCell: 'LASTUPDATE!A2' },
    { name: 'MALAPPURAM TECH TODAY', label: 'MECHANIC - TODAY', type: 'today', category: null, updateCell: 'LASTUPDATE!A2' },
    { name: 'MALAPPURAM TECH TOTAL', label: 'MECHANIC - THIS MONTH', type: 'total', category: null, updateCell: 'LASTUPDATE!A2' }
  ],
  FALLBACK_IMG: 'https://via.placeholder.com/150/e2e8f0/6366f1?text=N/A',
  SWITCH_DELAY: 15000
};

let state = {
  currentIndex: 0,
  scrollInterval: null,
  switchTimer: null,
  userInteracting: false,
  scrollPaused: false,
  isScrolling: false
};

function formatNum(n) {
  return n % 1 === 0 ? n.toString() : n.toFixed(2);
}

function parseSheetData(response) {
  const json = JSON.parse(response.substring(47).slice(0, -2));
  const rows = json.table.rows;
  const data = [];

  rows.forEach(row => {
    const c = row.c;
    if (c && c[0] && c[0].v) {
      data.push({
        name: c[0]?.v || 'Unknown',
        load: parseFloat(c[1]?.v) || 0,
        labour: parseFloat(c[2]?.v) || 0,
        vas: parseFloat(c[3]?.v) || 0,
        mga: parseFloat(c[4]?.v) || 0,
        category: c[5]?.v || '',
        score: parseFloat(c[6]?.v) || 0,
        photo: c[7]?.v || CONFIG.FALLBACK_IMG
      });
    }
  });

  return data;
}

function updateHeader(isMech) {
  const head = document.getElementById('tableHead');
  if (isMech) {
    head.innerHTML = `
      <tr>
        <th style="width: 8%; text-align: center;">RANK</th>
        <th style="width: 12%; text-align: center;">PHOTO</th>
        <th style="width: 50%; text-align: left; padding-left: 24px;">NAME</th>
        <th style="width: 15%; text-align: center;">LOAD</th>
        <th style="width: 15%; text-align: center;">LABOUR ₹</th>
      </tr>
    `;
  } else {
    head.innerHTML = `
      <tr>
        <th style="width: 7%; text-align: center;">RANK</th>
        <th style="width: 9%; text-align: center;">PHOTO</th>
        <th style="width: 23%; text-align: left; padding-left: 24px;">NAME</th>
        <th style="width: 11%; text-align: center;">LOAD</th>
        <th style="width: 12%; text-align: center;">LABOUR ₹</th>
        <th style="width: 12%; text-align: center;">VAS ₹</th>
        <th style="width: 12%; text-align: center;">MGA ₹</th>
        <th style="width: 14%; text-align: center;">SCORE</th>
      </tr>
    `;
  }
}

async function fetchUpdateTime() {
  try {
    const sheet = CONFIG.SHEETS[state.currentIndex];
    const [sheetName, cell] = sheet.updateCell.split('!');
    const url = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq?tqx=out:json&sheet=${sheetName}&range=${cell}`;
    
    const res = await fetch(url);
    const text = await res.text();
    const json = JSON.parse(text.substring(47).slice(0, -2));
    
    if (json.table.rows?.[0]?.c?.[0]?.v) {
      document.getElementById('lastUpdate').textContent = json.table.rows[0].c[0].v;
    }
  } catch (e) {
    console.error('Update time error:', e);
  }
}

function buildChampionCard(emp, rank, isMech) {
  const stats = isMech ? `
    <div class="stat-box">
      <div class="stat-label">Load</div>
      <div class="stat-value">${formatNum(emp.load)}</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">Labour</div>
      <div class="stat-value">₹${emp.labour.toLocaleString()}</div>
    </div>
  ` : `
    <div class="stat-box">
      <div class="stat-label">Load</div>
      <div class="stat-value">${formatNum(emp.load)}</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">Labour</div>
      <div class="stat-value">₹${emp.labour.toLocaleString()}</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">Score</div>
      <div class="stat-value">${formatNum(emp.score)}</div>
    </div>
  `;

  return `
    <div class="champion-card rank-${rank}">
      <div class="champion-avatar-wrap">
        <div class="champion-avatar-ring">
          <div class="champion-avatar-inner">
            <img src="${emp.photo}" alt="${emp.name}" onerror="this.src='${CONFIG.FALLBACK_IMG}'">
          </div>
        </div>
        <div class="champion-rank-badge">${rank}</div>
      </div>
      <div class="champion-details">
        <div class="champion-name">${emp.name}</div>
        <div class="champion-stats">${stats}</div>
      </div>
    </div>
  `;
}

function stopScrolling() {
  if (state.scrollInterval) {
    clearInterval(state.scrollInterval);
    state.scrollInterval = null;
  }
  state.isScrolling = false;
  state.scrollPaused = false;
}

function startScrolling() {
  stopScrolling();
  
  const container = document.getElementById('tableBodyContainer');
  const maxScroll = container.scrollHeight - container.clientHeight;
  
  if (maxScroll <= 10) {
    setTimeout(() => {
      if (!state.userInteracting) {
        switchView();
      }
    }, CONFIG.SWITCH_DELAY);
    return;
  }
  
  container.scrollTop = 0;
  let scrollPos = 0;
  const scrollSpeed = 2;
  const pauseAtBottom = 4000;
  state.isScrolling = true;
  
  state.scrollInterval = setInterval(() => {
    if (state.userInteracting || state.scrollPaused) {
      return;
    }
    
    if (scrollPos >= maxScroll - 5) {
      state.scrollPaused = true;
      stopScrolling();
      
      setTimeout(() => {
        if (!state.userInteracting) {
          switchView();
        }
      }, pauseAtBottom);
    } else {
      scrollPos += scrollSpeed;
      container.scrollTop = scrollPos;
    }
  }, 50);
}

function renderData(data) {
  if (!data.length) return;

  const sheet = CONFIG.SHEETS[state.currentIndex];
  const isToday = sheet.type === 'today';
  const isMech = sheet.label.includes('MECHANIC');
  const category = sheet.category;

  let filteredData = data;
  if (category) {
    filteredData = data.filter(emp => emp.category === category);
  }

  const categoryBadge = document.getElementById('categoryBadge');
  if (category) {
    categoryBadge.textContent = category;
    categoryBadge.style.display = 'inline-block';
  } else {
    categoryBadge.style.display = 'none';
  }

  document.getElementById('championsTitle').innerHTML = isToday ? '⚡ TODAY\'S TOP 3' : '🏆 THIS MONTH TOP 3';

  const sorted = [...filteredData].sort((a, b) => b.score - a.score);
  
  const top3 = sorted.slice(0, 3);
  document.getElementById('championsList').innerHTML = top3.map((e, i) => buildChampionCard(e, i + 1, isMech)).join('');

  const rows = sorted.map((e, i) => {
    const rankClass = i === 0 ? 'top-1' : i === 1 ? 'top-2' : i === 2 ? 'top-3' : '';
    
    if (isMech) {
      return `
        <tr class="${rankClass}">
          <td class="rank-col" style="width: 8%; text-align: center;">${i + 1}</td>
          <td class="photo-col" style="width: 12%; text-align: center;"><img src="${e.photo}" onerror="this.src='${CONFIG.FALLBACK_IMG}'"></td>
          <td class="name-col" style="width: 50%; text-align: left;">${e.name}</td>
          <td style="width: 15%; text-align: center;">${formatNum(e.load)}</td>
          <td class="value-col" style="width: 15%; text-align: center;">₹${e.labour.toLocaleString()}</td>
        </tr>
      `;
    } else {
      return `
        <tr class="${rankClass}">
          <td class="rank-col" style="width: 7%; text-align: center;">${i + 1}</td>
          <td class="photo-col" style="width: 9%; text-align: center;"><img src="${e.photo}" onerror="this.src='${CONFIG.FALLBACK_IMG}'"></td>
          <td class="name-col" style="width: 23%; text-align: left;">${e.name}</td>
          <td style="width: 11%; text-align: center;">${formatNum(e.load)}</td>
          <td class="value-col" style="width: 12%; text-align: center;">₹${e.labour.toLocaleString()}</td>
          <td class="value-col" style="width: 12%; text-align: center;">₹${e.vas.toLocaleString()}</td>
          <td class="value-col" style="width: 12%; text-align: center;">₹${e.mga.toLocaleString()}</td>
          <td class="value-col" style="width: 14%; text-align: center;">${formatNum(e.score)}</td>
        </tr>
      `;
    }
  }).join('');

  updateHeader(isMech);
  
  const tbody = document.getElementById('dataRows');
  tbody.innerHTML = rows;

  const container = document.getElementById('tableBodyContainer');
  container.scrollTop = 0;
  
  setTimeout(() => {
    startScrolling();
  }, 500);
}

function showSwitchNotif() {
  const notif = document.getElementById('switchNotification');
  notif.classList.add('active');
  setTimeout(() => notif.classList.remove('active'), 2000);
}

async function loadData() {
  try {
    const sheet = CONFIG.SHEETS[state.currentIndex];
    const url = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheet.name)}`;
    
    const res = await fetch(url);
    const text = await res.text();
    const data = parseSheetData(text);
    
    document.getElementById('modeIndicator').textContent = sheet.label;
    renderData(data);
    await fetchUpdateTime();
  } catch (e) {
    console.error('Load error:', e);
    document.getElementById('modeIndicator').textContent = 'ERROR';
  }
}

function switchView() {
  if (state.userInteracting) {
    setTimeout(switchView, 5000);
    return;
  }
  
  showSwitchNotif();
  stopScrolling();
  
  state.currentIndex = (state.currentIndex + 1) % CONFIG.SHEETS.length;
  
  updateActiveButton();
  
  setTimeout(() => {
    loadData();
  }, 500);
}

function updateActiveButton() {
  const buttons = document.querySelectorAll('.control-btn');
  buttons.forEach((btn, idx) => {
    if (idx === state.currentIndex) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function manualSwitch(index) {
  state.userInteracting = true;
  stopScrolling();
  
  state.currentIndex = index;
  updateActiveButton();
  loadData();
  
  setTimeout(() => {
    state.userInteracting = false;
  }, 3000);
}

const container = document.getElementById('tableBodyContainer');

container.addEventListener('mouseenter', () => {
  state.userInteracting = true;
});

container.addEventListener('mouseleave', () => {
  state.userInteracting = false;
  if (!state.isScrolling) {
    startScrolling();
  }
});

container.addEventListener('touchstart', () => {
  state.userInteracting = true;
  stopScrolling();
});

container.addEventListener('touchend', () => {
  setTimeout(() => {
    state.userInteracting = false;
    if (!state.isScrolling) {
      startScrolling();
    }
  }, 2000);
});

container.addEventListener('wheel', (e) => {
  state.userInteracting = true;
  stopScrolling();
  
  clearTimeout(state.wheelTimeout);
  state.wheelTimeout = setTimeout(() => {
    state.userInteracting = false;
    if (!state.isScrolling) {
      startScrolling();
    }
  }, 3000);
});

container.addEventListener('scroll', () => {
  if (!state.isScrolling && !state.userInteracting) {
    clearTimeout(state.manualScrollTimeout);
    state.manualScrollTimeout = setTimeout(() => {
      startScrolling();
    }, 2000);
  }
});

// Manual control buttons
document.querySelectorAll('.control-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const index = parseInt(btn.getAttribute('data-index'));
    manualSwitch(index);
  });
});

loadData();

setInterval(() => {
  if (!state.userInteracting && !state.isScrolling) {
    loadData();
  }
}, 30000);
