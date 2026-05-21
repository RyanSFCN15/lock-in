/* ============================================================
   LOCK IN — Stats Module & Progress Module
   ============================================================ */

// ---- Stats Module ----

window.StatsModule = (() => {
  let _profile = null;

  function init(profile) {
    _profile = profile;
  }

  async function render() {
    const container = document.getElementById('more-content');
    if (!container) return;

    container.innerHTML = `<div class="ai-loading" style="padding:40px;justify-content:center;display:flex;align-items:center;gap:8px"><div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div><span style="margin-left:6px;color:var(--text-muted)">Loading stats...</span></div>`;

    const [stats, prs, muscleXP] = await Promise.all([
      DB.getLifetimeStats(),
      DB.getPRs(),
      DB.getAllMuscleXP(),
    ]);

    container.innerHTML = `

      <!-- Hero stat -->
      <div class="card card-accent" style="text-align:center;padding:28px 20px">
        <div style="font-size:13px;font-weight:700;letter-spacing:2px;color:var(--text-muted);text-transform:uppercase;margin-bottom:8px">Days Since Starting Lock In</div>
        <div style="font-size:80px;font-weight:900;line-height:1;color:var(--accent);font-variant-numeric:tabular-nums">${stats.daysSinceStart}</div>
        <div style="font-size:13px;color:var(--text-dim);margin-top:8px">Started ${formatDate(stats.startDate)}</div>
      </div>

      <!-- Stats grid -->
      <div class="card">
        <div class="card-title">All-Time Numbers</div>
        <div class="stats-grid">
          ${statCell('Workouts', stats.totalWorkouts, '')}
          ${statCell('Sets', stats.totalSets.toLocaleString(), '')}
          ${statCell('Reps', stats.totalReps.toLocaleString(), '')}
          ${statCell('Weight', stats.totalWeightLbs.toLocaleString(), 'lbs')}
          ${statCell('Weight', stats.totalWeightKg.toLocaleString(), 'kg')}
          ${statCell('Fasts', stats.totalFasts, '')}
          ${statCell('Water', stats.totalWaterL, 'L')}
          ${statCell('Meals', stats.totalMeals.toLocaleString(), '')}
          ${statCell('Cardio Cal', stats.totalCalorieBurned.toLocaleString(), 'kcal')}
          ${statCell('Distance', stats.totalDistanceKm, 'km')}
          ${statCell('Total XP', stats.totalXP.toLocaleString(), '')}
          ${statCell('Badges', stats.totalBadges, '')}
          ${statCell('Best Streak', stats.longestStreak, 'days')}
          ${statCell('Cur. Streak', stats.currentStreak, 'days')}
        </div>
      </div>

      <!-- All-time PRs -->
      <div class="card">
        <div class="card-title">🏆 All-Time PRs</div>
        ${Object.keys(prs).length === 0
          ? `<div style="color:var(--text-muted);font-size:14px;padding:12px 0">No PRs yet. Start lifting!</div>`
          : Object.entries(prs).sort((a, b) => b[1].orm - a[1].orm).map(([lift, pr]) => `
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
          `).join('')
        }
      </div>

      <!-- Muscle Levels -->
      <div class="card">
        <div class="card-title">💪 Muscle Levels</div>
        <div id="stats-muscle-list"></div>
      </div>

      <!-- AI Legacy Reflection -->
      <div class="card">
        <div class="card-title">⚡ AI Legacy Reflection</div>
        <div id="stats-legacy-card">
          ${AI.isAvailable()
            ? `<button class="btn btn-primary btn-full" onclick="StatsModule.generateLegacy()">Generate Legacy Reflection</button>`
            : AI.unavailableHTML('Connect AI in Settings to unlock your legacy reflection.')
          }
        </div>
      </div>

      <!-- Export buttons -->
      <div class="card">
        <div class="card-title">📤 Export Data</div>
        <div style="display:flex;gap:10px">
          <button class="btn btn-ghost" style="flex:1" onclick="StatsModule.exportJSON()">Export JSON</button>
          <button class="btn btn-ghost" style="flex:1" onclick="StatsModule.exportCSV()">Export CSV</button>
        </div>
      </div>

      <!-- Badges -->
      <div class="card">
        <div class="card-title">🎖️ Badges</div>
        <div id="stats-badges-grid"></div>
      </div>

      <div style="height:8px"></div>
    `;

    // Render sub-components
    Gamification.renderMuscleLeaderboard('stats-muscle-list');
    Gamification.renderBadgesGrid('stats-badges-grid');

    // Store stats for AI call
    StatsModule._lastStats = stats;
  }

  function statCell(label, value, unit) {
    return `
      <div class="stat-card">
        <div class="stat-value">${value}${unit ? `<span class="stat-unit">${unit}</span>` : ''}</div>
        <div class="stat-label">${label}</div>
      </div>
    `;
  }

  async function generateLegacy() {
    const el = document.getElementById('stats-legacy-card');
    if (!el) return;
    el.innerHTML = `<div class="ai-loading" style="display:flex;align-items:center;gap:8px;padding:12px 0"><div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div><span style="color:var(--text-muted)">Reflecting on your journey...</span></div>`;

    try {
      const stats = StatsModule._lastStats || await DB.getLifetimeStats();
      const text = await AI.getLifetimeLegacy(stats);
      if (text) {
        el.innerHTML = `<div class="ai-card"><div class="ai-card-label">⚡ YOUR LEGACY</div><div class="ai-card-text">${text}</div></div>`;
      } else {
        el.innerHTML = `<div style="color:var(--text-muted);font-size:14px">Could not generate reflection. Try again.</div>
          <button class="btn btn-ghost btn-full" style="margin-top:10px" onclick="StatsModule.generateLegacy()">Retry</button>`;
      }
    } catch(e) {
      el.innerHTML = `<div style="color:var(--text-muted);font-size:14px">Error generating reflection.</div>
        <button class="btn btn-ghost btn-full" style="margin-top:10px" onclick="StatsModule.generateLegacy()">Retry</button>`;
    }
  }

  async function exportJSON() {
    try {
      const json = await DB.exportAll();
      downloadFile('lock-in-data.json', json, 'application/json');
      toast('Data exported as JSON', 'success');
    } catch(e) {
      toast('Export failed', 'error');
    }
  }

  async function exportCSV() {
    try {
      const workouts = await DB.getAllWorkouts();
      const nutrition = await DB.getAll('nutritionLogs');

      const rows = [['Date', 'Type', 'Detail', 'Value']];

      for (const w of workouts) {
        let totalSets = 0, totalReps = 0, totalVolume = 0;
        for (const ex of (w.exercises || [])) {
          for (const set of (ex.sets || [])) {
            if (set.completed) {
              totalSets++;
              totalReps += set.reps || 0;
              totalVolume += (set.weight || 0) * (set.reps || 0);
            }
          }
        }
        rows.push([w.date, 'Workout', 'Sets', totalSets]);
        rows.push([w.date, 'Workout', 'Reps', totalReps]);
        rows.push([w.date, 'Workout', 'Volume (kg)', totalVolume.toFixed(1)]);
      }

      for (const n of nutrition) {
        let cal = 0, prot = 0, carbs = 0, fat = 0;
        for (const meal of (n.meals || [])) {
          for (const food of (meal.foods || [])) {
            cal   += food.calories || 0;
            prot  += food.protein  || 0;
            carbs += food.carbs    || 0;
            fat   += food.fat      || 0;
          }
        }
        rows.push([n.date, 'Nutrition', 'Calories', Math.round(cal)]);
        rows.push([n.date, 'Nutrition', 'Protein (g)', Math.round(prot)]);
        rows.push([n.date, 'Nutrition', 'Carbs (g)', Math.round(carbs)]);
        rows.push([n.date, 'Nutrition', 'Fat (g)', Math.round(fat)]);
        rows.push([n.date, 'Nutrition', 'Water (ml)', n.water || 0]);
      }

      const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      downloadFile('lock-in-data.csv', csv, 'text/csv');
      toast('Data exported as CSV', 'success');
    } catch(e) {
      toast('CSV export failed', 'error');
    }
  }

  function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  return { init, render, generateLegacy, exportJSON, exportCSV };
})();

// ---- Progress Module ----

window.ProgressModule = (() => {

  async function render() {
    const container = document.getElementById('more-content');
    if (!container) return;

    const profile = await DB.getProfile();
    const today = new Date().toISOString().split('T')[0];
    const isSunday = new Date().getDay() === 0;

    // Consistency score: last 30 days with at least one log
    const thirtyDaysAgo = (() => {
      const d = new Date();
      d.setDate(d.getDate() - 29);
      return d.toISOString().split('T')[0];
    })();

    const [workouts, nutrition, cardio, recovery] = await Promise.all([
      DB.getLogsRange('workoutLogs', thirtyDaysAgo, today),
      DB.getLogsRange('nutritionLogs', thirtyDaysAgo, today),
      DB.getLogsRange('cardioLogs', thirtyDaysAgo, today),
      DB.getLogsRange('recoveryLogs', thirtyDaysAgo, today),
    ]);

    const loggedDays = new Set([
      ...workouts.map(w => w.date),
      ...nutrition.map(n => n.date),
      ...cardio.map(c => c.date),
      ...recovery.map(r => r.date),
    ]);
    const consistencyPct = Math.round(loggedDays.size / 30 * 100);

    // Goal timeline
    let goalTimelineHTML = '';
    if (profile) {
      const weightLogs = await DB.getAllMeasurements();
      const recentWeights = weightLogs.slice(-7).map(m => m.weight || m.weightKg).filter(Boolean);
      const currentWeight = recentWeights.length
        ? recentWeights[recentWeights.length - 1]
        : (profile.weightKg || 0);
      const targetWeight = profile.targetWeightKg || currentWeight;
      const diff = targetWeight - currentWeight;
      const weeksToGoal = profile.weeksToGoal || 12;

      let weeklyChange = 0;
      if (recentWeights.length >= 2) {
        const totalChange = recentWeights[recentWeights.length - 1] - recentWeights[0];
        weeklyChange = totalChange / (recentWeights.length - 1) * 7 / 7; // per week approx
      }

      let projectedWeeks = null;
      let projectedDateStr = '';
      if (weeklyChange !== 0 && Math.sign(weeklyChange) === Math.sign(diff)) {
        projectedWeeks = Math.ceil(Math.abs(diff / weeklyChange));
        const projDate = new Date();
        projDate.setDate(projDate.getDate() + projectedWeeks * 7);
        projectedDateStr = projDate.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
      }

      goalTimelineHTML = `
        <div class="card">
          <div class="card-title">🎯 Goal Timeline</div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <div>
              <div style="font-size:12px;color:var(--text-muted)">Current</div>
              <div style="font-size:22px;font-weight:900">${round1(currentWeight)} kg</div>
            </div>
            <div style="color:var(--text-dim);font-size:24px">→</div>
            <div style="text-align:right">
              <div style="font-size:12px;color:var(--text-muted)">Target</div>
              <div style="font-size:22px;font-weight:900;color:var(--accent)">${round1(targetWeight)} kg</div>
            </div>
          </div>
          <div style="font-size:14px;color:var(--text-muted)">Goal: <strong style="color:var(--text)">${profile.goal || 'N/A'}</strong> · ${weeksToGoal} weeks planned</div>
          ${projectedDateStr
            ? `<div style="font-size:13px;color:var(--green);margin-top:6px">📅 Projected: ${projectedDateStr} (${projectedWeeks}w at current rate)</div>`
            : `<div style="font-size:13px;color:var(--text-dim);margin-top:6px">Log measurements to see projected date</div>`
          }
        </div>
      `;
    }

    container.innerHTML = `

      <!-- Consistency score -->
      <div class="card card-accent">
        <div class="card-title">📊 30-Day Consistency</div>
        <div style="display:flex;align-items:center;gap:16px">
          <div style="font-size:52px;font-weight:900;color:var(--accent)">${consistencyPct}%</div>
          <div>
            <div style="font-size:14px;font-weight:700">${loggedDays.size} / 30 days</div>
            <div style="font-size:12px;color:var(--text-muted)">with at least one log</div>
          </div>
        </div>
        <div class="progress-bar-track" style="margin-top:12px">
          <div class="progress-bar-fill green" style="width:${consistencyPct}%"></div>
        </div>
      </div>

      <!-- Weekly challenges -->
      <div class="card">
        <div class="card-title">⚡ Weekly Challenges</div>
        <div id="progress-challenges"></div>
      </div>

      <!-- Goal timeline -->
      ${goalTimelineHTML}

      <!-- Muscle levels -->
      <div class="card">
        <div class="card-title">💪 Muscle Levels</div>
        <div id="progress-muscles"></div>
      </div>

      <!-- Sunday check-in -->
      ${isSunday ? `
        <div class="card card-accent">
          <div class="card-title">📋 Weekly Check-In</div>
          <div style="font-size:14px;color:var(--text-muted);margin-bottom:12px">It's Sunday — time for your weekly review. AI will analyse your full week and give you 3 adjustments for next week.</div>
          <button class="btn btn-primary btn-full" id="weekly-checkin-btn" onclick="ProgressModule.runWeeklyCheckIn()">Run Weekly AI Check-In</button>
          <div id="weekly-checkin-result" style="margin-top:12px"></div>
        </div>
      ` : ''}

      <!-- All badges -->
      <div class="card">
        <div class="card-title">🎖️ Badges</div>
        <div id="progress-badges"></div>
      </div>

      <div style="height:8px"></div>
    `;

    Gamification.renderChallenges('progress-challenges');
    Gamification.renderMuscleLeaderboard('progress-muscles');
    Gamification.renderBadgesGrid('progress-badges');
  }

  async function runWeeklyCheckIn() {
    const btn = document.getElementById('weekly-checkin-btn');
    const resultEl = document.getElementById('weekly-checkin-result');
    if (!btn || !resultEl) return;

    btn.disabled = true;
    btn.textContent = 'Analysing your week...';
    resultEl.innerHTML = `<div class="ai-loading" style="display:flex;align-items:center;gap:8px"><div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div></div>`;

    try {
      const weekAgo = (() => {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        return d.toISOString().split('T')[0];
      })();
      const todayStr = new Date().toISOString().split('T')[0];

      const [workouts, nutrition, cardio, recovery] = await Promise.all([
        DB.getLogsRange('workoutLogs', weekAgo, todayStr),
        DB.getLogsRange('nutritionLogs', weekAgo, todayStr),
        DB.getLogsRange('cardioLogs', weekAgo, todayStr),
        DB.getLogsRange('recoveryLogs', weekAgo, todayStr),
      ]);

      const weekData = {
        workouts: workouts.length,
        cardioSessions: cardio.reduce((a, c) => a + (c.entries || []).length, 0),
        avgSleep: recovery.length
          ? (recovery.reduce((a, r) => a + (r.sleep || 0), 0) / recovery.length).toFixed(1)
          : 0,
        avgReadiness: recovery.length
          ? (recovery.reduce((a, r) => a + (r.readiness || 0), 0) / recovery.length).toFixed(1)
          : 0,
        nutritionDays: nutrition.length,
      };

      const text = await AI.getWeeklyCheckIn(weekData);
      if (text) {
        resultEl.innerHTML = `<div class="ai-card"><div class="ai-card-label">⚡ WEEKLY REVIEW</div><div class="ai-card-text">${text}</div></div>`;
      } else {
        resultEl.innerHTML = `<div style="color:var(--text-muted);font-size:14px">Could not load review.</div>`;
      }
    } catch(e) {
      resultEl.innerHTML = `<div style="color:var(--text-muted);font-size:14px">Error loading review.</div>`;
    }

    btn.disabled = false;
    btn.textContent = 'Run Weekly AI Check-In';
  }

  return { render, runWeeklyCheckIn };
})();
