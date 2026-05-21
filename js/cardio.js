/* ============================================================
   LOCK IN — Cardio Logger
   ============================================================ */

window.CardioModule = (() => {
  let _profile = null;

  // MET values by activity type
  const MET_VALUES = {
    run:      9.8,
    walk:     3.5,
    cycle:    7.5,
    swim:     6.0,
    row:      7.0,
    elliptic: 5.0,
    hiit:     10.0,
    jump:     8.0,
    stair:    9.0,
    other:    5.5,
  };

  const CARDIO_LABELS = {
    run:      'Running',
    walk:     'Walking / Hiking',
    cycle:    'Cycling',
    swim:     'Swimming',
    row:      'Rowing',
    elliptic: 'Elliptical',
    hiit:     'HIIT',
    jump:     'Jump Rope',
    stair:    'Stair Climber',
    other:    'Other',
  };

  async function init(profile) {
    _profile = profile;
  }

  async function render() {
    const container = document.getElementById('body-content');
    if (!container) return;

    let todaySessions = [], lifetimeStats = null;
    try {
      [todaySessions, lifetimeStats] = await Promise.all([
        DB.getTodayCardio ? DB.getTodayCardio() : Promise.resolve([]),
        DB.getLifetimeCardio ? DB.getLifetimeCardio() : Promise.resolve(null),
      ]);
      // Normalise — DB might return an object {date, entries:[]} or an array
      if (todaySessions && !Array.isArray(todaySessions)) {
        todaySessions = todaySessions.entries || todaySessions.sessions || [];
      }
    } catch(e) {
      console.warn('Cardio render error:', e);
      todaySessions = [];
    }

    // Weekly stats
    const weekAgo = (() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0]; })();
    const weeklyLogs = DB.getLogsRange ? await DB.getLogsRange('cardioLogs', weekAgo, today()) : [];
    const weeklySessionCount = weeklyLogs.reduce((sum, day) => sum + (day.sessions?.length || 0), 0) + (todaySessions.length || 0);
    const weeklyDistance = weeklyLogs.reduce((sum, day) => sum + (day.sessions || []).reduce((s, sess) => s + (sess.distance || 0), 0), 0)
      + todaySessions.reduce((s, sess) => s + (sess.distance || 0), 0);
    const weeklyDuration = weeklyLogs.reduce((sum, day) => sum + (day.sessions || []).reduce((s, sess) => s + (sess.duration || 0), 0), 0)
      + todaySessions.reduce((s, sess) => s + (sess.duration || 0), 0);

    const cardioGoal = _profile?.cardioSessionsPerWeek || 3;
    const goalPct = Math.min(100, Math.round((weeklySessionCount / cardioGoal) * 100));

    container.innerHTML = `
      <!-- Today's Sessions -->
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div class="card-title" style="margin-bottom:0">Today's Cardio</div>
          <button class="btn btn-primary btn-sm" onclick="CardioModule.openLog()">+ Log Cardio</button>
        </div>
        ${todaySessions.length === 0 ? `
          <div style="font-size:14px;color:var(--text-muted);text-align:center;padding:16px 0">
            No cardio logged today. Get moving!
          </div>
        ` : todaySessions.map(sess => renderSessionRow(sess)).join('')}
      </div>

      <!-- Weekly Goal Progress -->
      <div class="card">
        <div class="card-title">Weekly Cardio Goal</div>
        <div class="progress-bar-wrap">
          <div class="progress-bar-header">
            <span class="progress-bar-label">Sessions</span>
            <span class="progress-bar-value">${weeklySessionCount} / ${cardioGoal}</span>
          </div>
          <div class="progress-bar-track">
            <div class="progress-bar-fill" style="width:${goalPct}%;background:${goalPct >= 100 ? 'var(--green)' : 'var(--accent)'}"></div>
          </div>
        </div>
        ${goalPct >= 100 ? `<div style="font-size:13px;color:var(--green);font-weight:700;margin-top:8px">Goal crushed this week!</div>` : ''}
      </div>

      <!-- Weekly Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${round1(weeklyDistance)}<span class="stat-unit">km</span></div>
          <div class="stat-label">Weekly Distance</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${round(weeklyDuration)}<span class="stat-unit">min</span></div>
          <div class="stat-label">Weekly Duration</div>
        </div>
      </div>

      <!-- AI Advice -->
      <div class="ai-card" id="cardio-ai-section">
        <div class="ai-card-label">⚡ AI CARDIO ADVICE</div>
        <div id="cardio-ai-advice" class="ai-card-text">
          <div class="ai-loading"><div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div></div>
        </div>
      </div>

      <!-- Lifetime Stats -->
      ${lifetimeStats ? `
      <div class="card">
        <div class="card-title">Lifetime Stats</div>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${lifetimeStats.totalSessions || 0}</div>
            <div class="stat-label">Total Sessions</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${round1(lifetimeStats.totalDistance || 0)}<span class="stat-unit">km</span></div>
            <div class="stat-label">Total Distance</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${round(lifetimeStats.totalDuration || 0)}<span class="stat-unit">min</span></div>
            <div class="stat-label">Total Time</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${round(lifetimeStats.totalCalories || 0)}<span class="stat-unit">kcal</span></div>
            <div class="stat-label">Calories Burned</div>
          </div>
        </div>
      </div>` : ''}

      <div style="height:8px"></div>
    `;

    // Load AI advice async
    loadAIAdvice();
  }

  function renderSessionRow(sess) {
    const label = CARDIO_LABELS[sess.type] || sess.type || 'Cardio';
    const intensityColor = sess.intensity >= 8 ? 'var(--accent)' : sess.intensity >= 5 ? 'var(--yellow)' : 'var(--green)';
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">
        <div>
          <div style="font-size:14px;font-weight:700">${label}</div>
          <div style="font-size:12px;color:var(--text-muted)">${sess.duration || 0} min${sess.distance ? ' · ' + round1(sess.distance) + ' km' : ''}${sess.hr ? ' · ' + sess.hr + ' bpm' : ''}</div>
        </div>
        <div style="text-align:right">
          ${sess.calories ? `<div style="font-size:14px;font-weight:700">${round(sess.calories)} kcal</div>` : ''}
          ${sess.intensity ? `<div style="font-size:12px;font-weight:700;color:${intensityColor}">RPE ${sess.intensity}</div>` : ''}
        </div>
      </div>
    `;
  }

  async function loadAIAdvice() {
    const el = document.getElementById('cardio-ai-advice');
    if (!el) return;
    if (!AI.isAvailable()) {
      el.innerHTML = AI.unavailableHTML ? AI.unavailableHTML() : '<span style="color:var(--text-muted)">Connect AI in Settings for personalized advice.</span>';
      return;
    }
    try {
      const advice = await AI.getCardioAdvice(_profile);
      if (advice) {
        el.innerHTML = `<div style="white-space:pre-line;font-size:13px;line-height:1.7">${advice}</div>`;
      }
    } catch (e) {
      el.innerHTML = '<span style="color:var(--text-muted)">Could not load advice.</span>';
    }
  }

  async function showAIAdvice(type, duration, intensity) {
    const el = document.getElementById('cardio-ai-advice-sheet');
    if (!el) return;
    el.innerHTML = '<div class="ai-loading"><div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div></div>';
    if (!AI.isAvailable()) {
      el.innerHTML = '<span style="color:var(--text-muted)">Connect AI in Settings.</span>';
      return;
    }
    try {
      const advice = await AI.getCardioAdvice({ type, duration, intensity, profile: _profile });
      if (advice) {
        el.innerHTML = `<div class="ai-card"><div class="ai-card-label">⚡ CARDIO TIPS</div><div class="ai-card-text" style="white-space:pre-line">${advice}</div></div>`;
      }
    } catch (e) {
      el.innerHTML = '<span style="color:var(--text-muted)">Could not load advice.</span>';
    }
  }

  function openLog() {
    openSheet('sheet-cardio');
  }

  async function save() {
    const type = document.getElementById('cardio-type')?.value || 'other';
    const duration = parseFloat(document.getElementById('cardio-duration')?.value);
    const distance = parseFloat(document.getElementById('cardio-distance')?.value) || 0;
    const intensity = parseInt(document.getElementById('cardio-intensity')?.value) || 5;
    const hr = parseInt(document.getElementById('cardio-hr')?.value) || 0;

    if (!duration || duration <= 0) {
      toast('Enter a duration to log cardio', 'error');
      return;
    }

    const weightKg = _profile?.weightKg || 75;
    const met = MET_VALUES[type] || 5.5;
    const calories = Math.round(met * weightKg * (duration / 60));

    const session = {
      type,
      duration,
      distance,
      intensity,
      hr: hr || undefined,
      calories,
      timestamp: Date.now(),
    };

    await DB.saveCardioLog(session);

    await Gamification.awardMuscleXP('Cardio', 50);
    await Gamification.updateChallengeProgress('cardio');
    await refreshStreakHeader();

    toast(`Cardio logged! ${calories} kcal burned`, 'success', 3000);
    closeSheet('sheet-cardio');
    await render();
  }

  // Listen for type/duration/intensity changes in sheet to update AI advice
  function onSheetFieldChange() {
    const type = document.getElementById('cardio-type')?.value;
    const duration = document.getElementById('cardio-duration')?.value;
    const intensity = document.getElementById('cardio-intensity')?.value;
    if (type && duration && intensity) {
      showAIAdvice(type, duration, intensity);
    }
  }

  window.addEventListener('sectionShown', (e) => {
    if (e.detail === 'body') render();
  });

  return {
    init, render, save, openLog, showAIAdvice, onSheetFieldChange,
  };
})();
