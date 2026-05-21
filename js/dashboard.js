/* ============================================================
   LOCK IN — Dashboard
   ============================================================ */

window.Dashboard = (() => {
  let _profile = null;
  let _score = 0;
  let _scoreBreakdown = [];

  async function init(profile) {
    _profile = profile;
    await render();
  }

  async function render() {
    const container = document.getElementById('dashboard-content');
    if (!container) return;

    const [score, streak, todayWorkout, todayNutrition, todayRecovery, prs, macroTargets] = await Promise.all([
      calcLockedInScore(),
      DB.getStreak(),
      DB.getTodayWorkout(),
      DB.getTodayNutrition(),
      DB.getTodayRecovery(),
      DB.getPRs(),
      Promise.resolve(_profile ? calcMacroTargets(_profile, !!(await DB.getTodayWorkout())) : { calories: 2000, protein: 150, carbs: 200, fat: 60, waterMl: 2800 }),
    ]);

    _score = score.total;
    _scoreBreakdown = score.breakdown;

    const todayMacros = calcTodayMacros(todayNutrition);
    const waterMl = todayNutrition?.water || 0;

    container.innerHTML = `
      <!-- Locked In Meter -->
      ${renderLockedInMeter(score.total)}

      <!-- AI Daily Brief -->
      <div id="dashboard-ai-brief" class="ai-card">
        <div class="ai-card-label">⚡ DAILY BRIEF</div>
        <div class="ai-card-text">
          <div class="ai-loading"><div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div><span style="margin-left:6px">Loading your brief...</span></div>
        </div>
      </div>

      <!-- Streak + AI Tasks -->
      <div class="stats-grid" style="margin-bottom:12px">
        <div class="stat-card" style="cursor:pointer" onclick="Dashboard.showStreakDetail()">
          <div class="stat-value">${streak.current}<span class="stat-unit">🔥</span></div>
          <div class="stat-label">Day Streak</div>
          ${streak.freezes ? `<div style="font-size:11px;color:var(--blue);margin-top:4px">❄️ ${streak.freezes} freeze${streak.freezes>1?'s':''}</div>` : ''}
        </div>
        <div class="stat-card">
          <div class="stat-value">${streak.longest}</div>
          <div class="stat-label">Best Streak</div>
        </div>
      </div>

      <!-- Macro Progress -->
      <div class="card">
        <div class="card-title">Today's Macros</div>
        ${renderMacroBar('Protein', todayMacros.protein, macroTargets.protein, 'g', 'protein')}
        ${renderMacroBar('Carbs', todayMacros.carbs, macroTargets.carbs, 'g', 'carbs')}
        ${renderMacroBar('Fat', todayMacros.fat, macroTargets.fat, 'g', 'fat')}
        ${renderMacroBar('Calories', todayMacros.calories, macroTargets.calories, 'kcal', 'calories')}
        <div style="margin-top:10px">
          <button class="btn btn-ghost btn-full btn-sm" onclick="navigateTo('nutrition')">Log Food →</button>
        </div>
      </div>

      <!-- Water -->
      <div class="card">
        <div class="card-title">💧 Water</div>
        ${renderMacroBar('Water', waterMl, macroTargets.waterMl, 'ml', 'water')}
        <div style="display:flex;gap:8px;margin-top:10px">
          ${[250,500,750].map(ml => `<button class="btn btn-ghost" style="flex:1;font-size:13px" onclick="Dashboard.addWater(${ml})">+${ml}ml</button>`).join('')}
        </div>
      </div>

      <!-- Weekly calendar -->
      <div class="card">
        <div class="card-title">This Week</div>
        ${renderWeekCalendar(todayWorkout)}
        <div style="margin-top:12px">
          <button class="btn btn-ghost btn-full btn-sm" onclick="navigateTo('workout')">
            ${todayWorkout?.completed ? 'View Workout' : "Today's Workout →"}
          </button>
        </div>
      </div>

      <!-- Morning check-in prompt -->
      ${!todayRecovery ? `
      <div class="card card-accent">
        <div class="card-title">🌅 Morning Check-In</div>
        <div style="font-size:14px;color:var(--text-muted);margin-bottom:12px">Log your sleep, soreness & readiness to unlock full AI recommendations.</div>
        <button class="btn btn-primary btn-full btn-sm" onclick="navigateTo('body')">Log Recovery →</button>
      </div>` : ''}

      <!-- Muscle Heatmap -->
      <div class="card">
        <div class="card-title">Muscle Training Map</div>
        <div id="muscle-heatmap-wrap" class="muscle-heatmap">
          ${renderMuscleHeatmapSVG('front')}
          ${renderMuscleHeatmapSVG('back')}
        </div>
        <div style="display:flex;gap:10px;margin-top:8px;font-size:11px;color:var(--text-muted);flex-wrap:wrap;justify-content:center">
          <span>🟢 Today</span><span style="color:rgba(0,255,136,0.5)">🟩 This week</span><span style="color:var(--yellow)">🟨 Aging</span><span style="color:rgba(255,59,59,0.5)">🟥 Needs work</span>
        </div>
      </div>

      <!-- PR Board -->
      ${Object.keys(prs).length ? `
      <div class="card">
        <div class="card-title">🏆 PR Board</div>
        ${Object.entries(prs).slice(0,5).map(([lift, pr]) => `
          <div class="pr-item">
            <div>
              <div class="pr-lift">${lift}</div>
              <div style="font-size:11px;color:var(--text-muted)">${formatDate(pr.date)}</div>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              <div class="pr-weight">${pr.weight}kg × ${pr.reps}</div>
              <div class="pr-badge">1RM ~${pr.orm}kg</div>
            </div>
          </div>
        `).join('')}
      </div>` : ''}

      <!-- AI Daily Tasks -->
      <div class="card">
        <div class="card-title">📋 Today's Targets</div>
        <div id="dashboard-tasks">
          <div class="ai-loading"><div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div></div>
        </div>
      </div>

      <div style="height:8px"></div>
    `;

    // Update heatmap from recent workout data
    updateMuscleHeatmap();

    // Load AI content async
    loadAIBrief();
    loadAITasks();
  }

  function renderLockedInMeter(pct) {
    const CIRCUMFERENCE = 565;
    const offset = CIRCUMFERENCE - (pct / 100) * CIRCUMFERENCE;
    const tier = pct <= 40 ? 'Coasting' : pct <= 70 ? 'Showing Up' : pct <= 90 ? 'Locked In' : pct < 100 ? 'Elite' : 'LOCKED IN';
    const tierClass = pct <= 40 ? 'coasting' : pct <= 70 ? 'showing-up' : pct <= 90 ? 'locked-in' : pct < 100 ? 'elite' : 'perfect';
    const strokeColor = pct <= 40 ? '#555' : pct <= 70 ? '#ffcc00' : pct <= 90 ? '#00ff88' : pct < 100 ? '#ffd700' : '#ff3b3b';

    return `
      <div class="locked-in-meter" onclick="Dashboard.showBreakdown()">
        <div class="meter-ring-wrap">
          <svg class="meter-svg" viewBox="0 0 200 200">
            <circle class="meter-bg-circle" cx="100" cy="100" r="90"/>
            <circle class="meter-progress-circle" cx="100" cy="100" r="90"
              style="stroke-dashoffset:${offset};stroke:${strokeColor}" />
          </svg>
          <div class="meter-center">
            <div class="meter-pct">${pct}%</div>
            <div class="meter-label" style="color:${strokeColor}">LOCKED IN</div>
          </div>
        </div>
        <div class="meter-tier ${tierClass}">${tier}</div>
        <div style="font-size:12px;color:var(--text-dim);margin-top:4px">Tap for breakdown</div>
      </div>
    `;
  }

  function renderMacroBar(label, current, target, unit, type) {
    const pct = target > 0 ? Math.min(100, Math.round(current / target * 100)) : 0;
    const over = current > target * 1.05;
    return `
      <div class="progress-bar-wrap">
        <div class="progress-bar-header">
          <span class="progress-bar-label">${label}</span>
          <span class="progress-bar-value">${current} / ${target}${unit}</span>
        </div>
        <div class="progress-bar-track">
          <div class="progress-bar-fill ${over ? 'over' : type}" style="width:${pct}%"></div>
        </div>
      </div>
    `;
  }

  function renderWeekCalendar(todayWorkout) {
    const days = ['M','T','W','T','F','S','S'];
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const split = _profile?.split;

    return `<div class="week-calendar">
      ${days.map((d, i) => {
        const date = new Date(today);
        const dayOfWeek = today.getDay();
        const monday = new Date(today);
        monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        monday.setDate(monday.getDate() + i);
        const dateStr = monday.toISOString().split('T')[0];
        const isToday = dateStr === todayStr;
        const isPast = dateStr < todayStr;

        const splitDay = split?.days?.[i];
        const isRest = splitDay === 'Rest';

        let dotClass = isToday ? 'today' : isRest ? 'rest' : isPast ? '' : 'planned';
        if (isToday && todayWorkout?.completed) dotClass = 'completed';
        else if (isToday && !isRest) dotClass += ' today';

        return `
          <div class="cal-day">
            <div class="cal-day-name">${d}</div>
            <div class="cal-day-dot ${dotClass}">${isRest ? '—' : splitDay?.slice(0,3) || d}</div>
          </div>
        `;
      }).join('')}
    </div>`;
  }

  function renderMuscleHeatmapSVG(side) {
    if (side === 'front') {
      return `
        <svg viewBox="0 0 120 280" xmlns="http://www.w3.org/2000/svg" id="heatmap-front">
          <title>Front muscles</title>
          <!-- Body outline -->
          <ellipse cx="60" cy="30" rx="18" ry="22" fill="#222" stroke="#333" stroke-width="1"/>
          <!-- Neck -->
          <rect x="54" y="50" width="12" height="14" rx="4" fill="#222" stroke="#333" stroke-width="1"/>
          <!-- Chest L -->
          <ellipse class="muscle-group resting" id="hm-chest-l" data-muscle="Chest" cx="45" cy="75" rx="15" ry="13" fill="#3c3c3c" onclick="Dashboard.showMuscleInfo('Chest')" style="cursor:pointer"/>
          <!-- Chest R -->
          <ellipse class="muscle-group resting" id="hm-chest-r" data-muscle="Chest" cx="75" cy="75" rx="15" ry="13" fill="#3c3c3c" onclick="Dashboard.showMuscleInfo('Chest')" style="cursor:pointer"/>
          <!-- Shoulders L -->
          <ellipse class="muscle-group resting" id="hm-shoulder-l" data-muscle="Shoulders" cx="30" cy="65" rx="12" ry="10" fill="#3c3c3c" onclick="Dashboard.showMuscleInfo('Shoulders')" style="cursor:pointer"/>
          <!-- Shoulders R -->
          <ellipse class="muscle-group resting" id="hm-shoulder-r" data-muscle="Shoulders" cx="90" cy="65" rx="12" ry="10" fill="#3c3c3c" onclick="Dashboard.showMuscleInfo('Shoulders')" style="cursor:pointer"/>
          <!-- Bicep L -->
          <rect class="muscle-group resting" id="hm-bicep-l" data-muscle="Biceps" x="18" y="78" width="14" height="35" rx="7" fill="#3c3c3c" onclick="Dashboard.showMuscleInfo('Biceps')" style="cursor:pointer"/>
          <!-- Bicep R -->
          <rect class="muscle-group resting" id="hm-bicep-r" data-muscle="Biceps" x="88" y="78" width="14" height="35" rx="7" fill="#3c3c3c" onclick="Dashboard.showMuscleInfo('Biceps')" style="cursor:pointer"/>
          <!-- Forearm L -->
          <rect x="16" y="115" width="12" height="30" rx="6" fill="#222" stroke="#333" stroke-width="1"/>
          <!-- Forearm R -->
          <rect x="92" y="115" width="12" height="30" rx="6" fill="#222" stroke="#333" stroke-width="1"/>
          <!-- Core / Abs -->
          <rect class="muscle-group resting" id="hm-core" data-muscle="Core" x="48" y="95" width="24" height="45" rx="6" fill="#3c3c3c" onclick="Dashboard.showMuscleInfo('Core')" style="cursor:pointer"/>
          <!-- Quads L -->
          <rect class="muscle-group resting" id="hm-quad-l" data-muscle="Quads" x="40" y="145" width="18" height="55" rx="8" fill="#3c3c3c" onclick="Dashboard.showMuscleInfo('Quads')" style="cursor:pointer"/>
          <!-- Quads R -->
          <rect class="muscle-group resting" id="hm-quad-r" data-muscle="Quads" x="62" y="145" width="18" height="55" rx="8" fill="#3c3c3c" onclick="Dashboard.showMuscleInfo('Quads')" style="cursor:pointer"/>
          <!-- Calves L -->
          <rect class="muscle-group resting" id="hm-calf-l" data-muscle="Calves" x="42" y="205" width="14" height="45" rx="6" fill="#3c3c3c" onclick="Dashboard.showMuscleInfo('Calves')" style="cursor:pointer"/>
          <!-- Calves R -->
          <rect class="muscle-group resting" id="hm-calf-r" data-muscle="Calves" x="64" y="205" width="14" height="45" rx="6" fill="#3c3c3c" onclick="Dashboard.showMuscleInfo('Calves')" style="cursor:pointer"/>
          <text x="60" y="272" text-anchor="middle" fill="#555" font-size="9" font-family="sans-serif">FRONT</text>
        </svg>
      `;
    } else {
      return `
        <svg viewBox="0 0 120 280" xmlns="http://www.w3.org/2000/svg" id="heatmap-back">
          <title>Back muscles</title>
          <ellipse cx="60" cy="30" rx="18" ry="22" fill="#222" stroke="#333" stroke-width="1"/>
          <rect x="54" y="50" width="12" height="14" rx="4" fill="#222" stroke="#333" stroke-width="1"/>
          <!-- Upper traps / back shoulders -->
          <ellipse class="muscle-group resting" id="hm-back" data-muscle="Back" cx="60" cy="80" rx="28" ry="22" fill="#3c3c3c" onclick="Dashboard.showMuscleInfo('Back')" style="cursor:pointer"/>
          <!-- Shoulder R -->
          <ellipse class="muscle-group resting" id="hm-shoulder-bl" data-muscle="Shoulders" cx="30" cy="65" rx="12" ry="10" fill="#3c3c3c" onclick="Dashboard.showMuscleInfo('Shoulders')" style="cursor:pointer"/>
          <!-- Shoulder L -->
          <ellipse class="muscle-group resting" id="hm-shoulder-br" data-muscle="Shoulders" cx="90" cy="65" rx="12" ry="10" fill="#3c3c3c" onclick="Dashboard.showMuscleInfo('Shoulders')" style="cursor:pointer"/>
          <!-- Tricep L -->
          <rect class="muscle-group resting" id="hm-tricep-l" data-muscle="Triceps" x="18" y="78" width="14" height="35" rx="7" fill="#3c3c3c" onclick="Dashboard.showMuscleInfo('Triceps')" style="cursor:pointer"/>
          <!-- Tricep R -->
          <rect class="muscle-group resting" id="hm-tricep-r" data-muscle="Triceps" x="88" y="78" width="14" height="35" rx="7" fill="#3c3c3c" onclick="Dashboard.showMuscleInfo('Triceps')" style="cursor:pointer"/>
          <!-- Lower back -->
          <rect x="46" y="102" width="28" height="25" rx="6" fill="#2a2a2a" stroke="#333" stroke-width="1"/>
          <!-- Glutes -->
          <ellipse class="muscle-group resting" id="hm-glutes" data-muscle="Glutes" cx="60" cy="143" rx="22" ry="16" fill="#3c3c3c" onclick="Dashboard.showMuscleInfo('Glutes')" style="cursor:pointer"/>
          <!-- Hamstrings L -->
          <rect class="muscle-group resting" id="hm-ham-l" data-muscle="Hamstrings" x="40" y="160" width="17" height="42" rx="8" fill="#3c3c3c" onclick="Dashboard.showMuscleInfo('Hamstrings')" style="cursor:pointer"/>
          <!-- Hamstrings R -->
          <rect class="muscle-group resting" id="hm-ham-r" data-muscle="Hamstrings" x="63" y="160" width="17" height="42" rx="8" fill="#3c3c3c" onclick="Dashboard.showMuscleInfo('Hamstrings')" style="cursor:pointer"/>
          <!-- Calves back L -->
          <rect class="muscle-group resting" id="hm-calf-bl" data-muscle="Calves" x="42" y="205" width="14" height="45" rx="6" fill="#3c3c3c" onclick="Dashboard.showMuscleInfo('Calves')" style="cursor:pointer"/>
          <!-- Calves back R -->
          <rect class="muscle-group resting" id="hm-calf-br" data-muscle="Calves" x="64" y="205" width="14" height="45" rx="6" fill="#3c3c3c" onclick="Dashboard.showMuscleInfo('Calves')" style="cursor:pointer"/>
          <text x="60" y="272" text-anchor="middle" fill="#555" font-size="9" font-family="sans-serif">BACK</text>
        </svg>
      `;
    }
  }

  async function updateMuscleHeatmap() {
    const todayStr = today();
    const weekAgo = (() => { const d = new Date(); d.setDate(d.getDate()-7); return d.toISOString().split('T')[0]; })();
    const recentWorkouts = await DB.getLogsRange('workoutLogs', weekAgo, todayStr);

    const lastTrainedMap = {};
    for (const w of recentWorkouts) {
      for (const ex of (w.exercises || [])) {
        for (const m of (ex.targetMuscles || [])) {
          if (!lastTrainedMap[m] || w.date > lastTrainedMap[m]) {
            lastTrainedMap[m] = w.date;
          }
        }
      }
    }

    const muscleToIds = {
      Chest:      ['hm-chest-l','hm-chest-r'],
      Back:       ['hm-back'],
      Shoulders:  ['hm-shoulder-l','hm-shoulder-r','hm-shoulder-bl','hm-shoulder-br'],
      Biceps:     ['hm-bicep-l','hm-bicep-r'],
      Triceps:    ['hm-tricep-l','hm-tricep-r'],
      Core:       ['hm-core'],
      Quads:      ['hm-quad-l','hm-quad-r'],
      Hamstrings: ['hm-ham-l','hm-ham-r'],
      Glutes:     ['hm-glutes'],
      Calves:     ['hm-calf-l','hm-calf-r','hm-calf-bl','hm-calf-br'],
    };

    for (const [muscle, ids] of Object.entries(muscleToIds)) {
      const lastDate = lastTrainedMap[muscle];
      let cls = 'resting';
      if (lastDate) {
        const daysAgo = Math.floor((new Date() - new Date(lastDate + 'T12:00:00')) / 86400000);
        if (daysAgo === 0) cls = 'fresh';
        else if (daysAgo <= 2) cls = 'recent';
        else if (daysAgo <= 5) cls = 'aging';
        else cls = 'stale';
      }
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el) {
          el.className = `muscle-group ${cls}`;
          el.setAttribute('fill', '');
        }
      }
    }
  }

  async function loadAIBrief() {
    const el = document.getElementById('dashboard-ai-brief');
    if (!el) return;
    if (!AI.isAvailable()) {
      el.innerHTML = AI.unavailableHTML();
      return;
    }
    try {
      const brief = await AI.getDailyBrief();
      if (brief) {
        el.innerHTML = `<div class="ai-card-label">⚡ DAILY BRIEF</div><div class="ai-card-text">${brief}</div>`;
      }
    } catch(e) {
      el.innerHTML = AI.unavailableHTML('Could not load brief.');
    }
  }

  async function loadAITasks() {
    const el = document.getElementById('dashboard-tasks');
    if (!el) return;
    if (!AI.isAvailable()) {
      el.innerHTML = '<div style="color:var(--text-muted);font-size:13px">Connect AI in Settings for personalized daily tasks.</div>';
      return;
    }
    try {
      const tasks = await AI.getDailyTasks();
      if (tasks) {
        const lines = tasks.split('\n').filter(l => l.trim() && /\d\./.test(l));
        el.innerHTML = `<div style="display:flex;flex-direction:column;gap:8px">
          ${lines.map(line => {
            const text = line.replace(/^\d+\.\s*/, '');
            return `<div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
              <div style="width:20px;height:20px;background:var(--accent);border-radius:50%;flex-shrink:0;margin-top:1px"></div>
              <div style="font-size:14px">${text}</div>
            </div>`;
          }).join('')}
        </div>`;
      }
    } catch(e) {
      el.innerHTML = '<div style="color:var(--text-muted);font-size:13px">Could not load tasks.</div>';
    }
  }

  // ---- Public actions ----

  async function addWater(ml) {
    const existing = await DB.getTodayNutrition() || { meals: [], water: 0 };
    existing.water = (existing.water || 0) + ml;
    await DB.saveNutritionLog(existing);
    toast(`+${ml}ml 💧`, 'success', 1500);
    await Gamification.updateChallengeProgress('water');
    await refreshStreakHeader();
    await render();
  }

  async function showBreakdown() {
    const content = document.getElementById('sheet-locked-in-content');
    if (!content) return;

    const { total, breakdown } = await calcLockedInScore();

    content.innerHTML = `
      <div style="text-align:center;margin-bottom:20px">
        <div style="font-size:48px;font-weight:900;color:var(--accent)">${total}%</div>
        <div style="font-size:13px;color:var(--text-muted)">Today's Locked In Score</div>
      </div>
      ${breakdown.map(item => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border)">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:20px">${item.icon}</span>
            <div>
              <div style="font-size:14px;font-weight:700">${item.label}</div>
              <div style="font-size:12px;color:var(--text-muted)">${item.tip}</div>
            </div>
          </div>
          <div style="font-size:16px;font-weight:900;color:${item.done ? 'var(--green)' : 'var(--text-muted)'}">
            ${item.pts}/${item.max}
          </div>
        </div>
      `).join('')}
      <div id="locked-in-ai" style="margin-top:16px">
        <div class="ai-loading"><div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div></div>
      </div>
    `;

    openSheet('sheet-locked-in');

    // Load AI analysis
    if (AI.isAvailable()) {
      AI.getLockedInAnalysis(total).then(text => {
        const el = document.getElementById('locked-in-ai');
        if (el && text) {
          el.innerHTML = `<div class="ai-card"><div class="ai-card-label">⚡ AI ANALYSIS</div><div class="ai-card-text">${text}</div></div>`;
        }
      });
    }
  }

  function showStreakDetail() {
    DB.getStreak().then(streak => {
      Gamification.checkStreakBadges(streak.current);
    });
  }

  function showMuscleInfo(muscle) {
    toast(`${muscle} — tap workout to train this muscle group`, '', 2000);
  }

  // Refresh on section shown
  window.addEventListener('sectionShown', (e) => {
    if (e.detail === 'dashboard') render();
  });

  return { init, render, addWater, showBreakdown, showStreakDetail, showMuscleInfo };
})();
