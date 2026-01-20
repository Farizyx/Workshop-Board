const CONFIG = {
  SHEET_ID: "148f8oGqJL5u3ujLdwRzm05x7TKpPoqQikyltXa1zTCw",
  SHEETS: [
    { name: 'MALAPPURAM ADVISOR TOTAL', label: 'ADVISOR - THIS MONTH', type: 'total', category: 'SA', updateCell: 'LASTUPDATE!A2' },
    { name: 'MALAPPURAM ADVISOR TOTAL', label: 'ADVISOR - THIS MONTH', type: 'total', category: 'BSA', updateCell: 'LASTUPDATE!A2' },
    { name: 'MALAPPURAM TECH TOTAL', label: 'MECHANIC - THIS MONTH', type: 'total', category: null, updateCell: 'LASTUPDATE!A2' }
  ],
  FALLBACK_IMG: 'https://via.placeholder.com/150/e8ecf0/2563eb?text=N/A',
  SWITCH_DELAY: 15000
};

let state = {
  currentIndex: 0,
  scrollInterval: null,
  switchTimer: null,
  userInteracting: false,
  scrollPaused: false,
  isScrolling: false,
  savedScrollPosition: 0
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
        <th class="col-rank">RANK</th>
        <th class="col-photo">PHOTO</th>
        <th class="col-name">NAME</th>
        <th class="col-data">LOAD</th>
        <th class="col-data">LABOUR ₹</th>
      </tr>
    `;
  } else {
    head.innerHTML = `
      <tr>
        <th class="col-rank">RANK</th>
        <th class="col-photo">PHOTO</th>
        <th class="col-name">NAME</th>
        <th class="col-data">LOAD</th>
        <th class="col-data">LABOUR ₹</th>
        <th class="col-data">VAS ₹</th>
        <th class="col-data">MGA ₹</th>
        <th class="col-score">SCORE</th>
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
      <div class="stat-label">LOAD</div>
      <div class="stat-number">${formatNum(emp.load)}</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">LABOUR</div>
      <div class="stat-number">₹${emp.labour.toLocaleString()}</div>
    </div>
  ` : `
    <div class="stat-box">
      <div class="stat-label">LOAD</div>
      <div class="stat-number">${formatNum(emp.load)}</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">LABOUR</div>
      <div class="stat-number">₹${(emp.labour/1000).toFixed(0)}K</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">SCORE</div>
      <div class="stat-number">${formatNum(emp.score)}</div>
    </div>
  `;

  return `
    <div class="champion-box rank-${rank}">
      <div class="avatar-section">
        <div class="avatar-ring">
          <img src="${emp.photo}" alt="${emp.name}" class="avatar-photo" onerror="this.src='${CONFIG.FALLBACK_IMG}'">
        </div>
        <div class="rank-badge">${rank}</div>
      </div>
      <div class="champion-info">
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
  if (state.switchTimer) {
    clearTimeout(state.switchTimer);
    state.switchTimer = null;
  }
  state.isScrolling = false;
  state.scrollPaused = false;
}

function startScrolling() {
  stopScrolling();
  
  const container = document.getElementById('tableBodyContainer');
  
  setTimeout(() => {
    const maxScroll = container.scrollHeight - container.clientHeight;
    
    if (maxScroll <= 10) {
      state.switchTimer = setTimeout(() => {
        if (!state.userInteracting) {
          switchView();
        }
      }, CONFIG.SWITCH_DELAY);
      return;
    }
    
    let scrollPos = 0;
    container.scrollTop = 0;
    
    const scrollSpeed = 2.5;
    const pauseAtBottom = 3000;
    state.isScrolling = true;
    
    state.scrollInterval = setInterval(() => {
      if (state.userInteracting || state.scrollPaused) {
        return;
      }
      
      const currentMaxScroll = container.scrollHeight - container.clientHeight;
      
      if (scrollPos >= currentMaxScroll - 10) {
        state.scrollPaused = true;
        stopScrolling();
        
        state.switchTimer = setTimeout(() => {
          if (!state.userInteracting) {
            switchView();
          }
        }, pauseAtBottom);
      } else {
        scrollPos += scrollSpeed;
        container.scrollTop = scrollPos;
      }
    }, 45);
  }, 100);
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
    categoryBadge.classList.add('visible');
  } else {
    categoryBadge.classList.remove('visible');
  }

  const sorted = [...filteredData].sort((a, b) => b.score - a.score);
  
  const top3 = sorted.slice(0, 3);
  document.getElementById('championsList').innerHTML = top3.map((e, i) => buildChampionCard(e, i + 1, isMech)).join('');

  const rows = sorted.map((e, i) => {
    const rankClass = i === 0 ? 'top-1' : i === 1 ? 'top-2' : i === 2 ? 'top-3' : '';
    
    if (isMech) {
      return `
        <tr class="${rankClass}">
          <td class="rank-cell">${i + 1}</td>
          <td class="photo-cell"><img src="${e.photo}" onerror="this.src='${CONFIG.FALLBACK_IMG}'"></td>
          <td class="name-cell">${e.name}</td>
          <td>${formatNum(e.load)}</td>
          <td class="value-cell">₹${e.labour.toLocaleString()}</td>
        </tr>
      `;
    } else {
      return `
        <tr class="${rankClass}">
          <td class="rank-cell">${i + 1}</td>
          <td class="photo-cell"><img src="${e.photo}" onerror="this.src='${CONFIG.FALLBACK_IMG}'"></td>
          <td class="name-cell">${e.name}</td>
          <td>${formatNum(e.load)}</td>
          <td class="value-cell">₹${e.labour.toLocaleString()}</td>
          <td class="value-cell">₹${e.vas.toLocaleString()}</td>
          <td class="value-cell">₹${e.mga.toLocaleString()}</td>
          <td class="value-cell">${formatNum(e.score)}</td>
        </tr>
      `;
    }
  }).join('');

  updateHeader(isMech);
  
  const tbody = document.getElementById('dataRows');
  tbody.innerHTML = rows;

  const container = document.getElementById('tableBodyContainer');
  
  if (state.savedScrollPosition > 0 && state.isScrolling) {
    setTimeout(() => {
      container.scrollTop = state.savedScrollPosition;
      resumeScrollingFromCurrent();
    }, 100);
  } else {
    container.scrollTop = 0;
    state.savedScrollPosition = 0;
    
    stopScrolling();
    
    setTimeout(() => {
      startScrolling();
    }, 800);
  }
}

function showTransition() {
  const screen = document.getElementById('transitionScreen');
  screen.classList.add('active');
  setTimeout(() => screen.classList.remove('active'), 1000);
}

async function loadData() {
  try {
    const sheet = CONFIG.SHEETS[state.currentIndex];
    const url = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheet.name)}`;
    
    const container = document.getElementById('tableBodyContainer');
    if (container && state.isScrolling) {
      state.savedScrollPosition = container.scrollTop;
    }
    
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
    state.switchTimer = setTimeout(switchView, 5000);
    return;
  }
  
  showTransition();
  stopScrolling();
  
  state.savedScrollPosition = 0;
  
  state.currentIndex = (state.currentIndex + 1) % CONFIG.SHEETS.length;
  
  updateActiveButton();
  
  setTimeout(() => {
    loadData();
  }, 500);
}

function updateActiveButton() {
  const buttons = document.querySelectorAll('.view-btn');
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
  
  state.savedScrollPosition = 0;
  
  state.currentIndex = index;
  updateActiveButton();
  showTransition();
  
  setTimeout(() => {
    loadData();
  }, 500);
  
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
    resumeScrollingFromCurrent();
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
      resumeScrollingFromCurrent();
    }
  }, 2000);
});

container.addEventListener('wheel', (e) => {
  state.userInteracting = true;
  stopScrolling();
  
  clearTimeout(state.wheelTimeout);
  state.wheelTimeout = setTimeout(() => {
    state.userInteracting = false;
    resumeScrollingFromCurrent();
  }, 3000);
});

container.addEventListener('scroll', () => {
  if (!state.isScrolling && !state.userInteracting) {
    clearTimeout(state.manualScrollTimeout);
    state.manualScrollTimeout = setTimeout(() => {
      resumeScrollingFromCurrent();
    }, 2000);
  }
});

function resumeScrollingFromCurrent() {
  stopScrolling();
  
  const container = document.getElementById('tableBodyContainer');
  const maxScroll = container.scrollHeight - container.clientHeight;
  
  if (maxScroll <= 10) {
    state.switchTimer = setTimeout(() => {
      if (!state.userInteracting) {
        switchView();
      }
    }, CONFIG.SWITCH_DELAY);
    return;
  }
  
  let scrollPos = container.scrollTop;
  const scrollSpeed = 2.5;
  const pauseAtBottom = 3000;
  state.isScrolling = true;
  
  state.scrollInterval = setInterval(() => {
    if (state.userInteracting || state.scrollPaused) {
      return;
    }
    
    const currentMaxScroll = container.scrollHeight - container.clientHeight;
    
    if (scrollPos >= currentMaxScroll - 10) {
      state.scrollPaused = true;
      stopScrolling();
      
      state.switchTimer = setTimeout(() => {
        if (!state.userInteracting) {
          switchView();
        }
      }, pauseAtBottom);
    } else {
      scrollPos += scrollSpeed;
      container.scrollTop = scrollPos;
    }
  }, 45);
}

document.querySelectorAll('.view-btn').forEach(btn => {
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
