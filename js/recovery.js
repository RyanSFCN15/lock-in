/* ============================================================
   LOCK IN — Recovery Tracker
   ============================================================ */

window.RecoveryModule = (() => {
  let _profile = null;

  // Pill group state
  let _soreness = null;
  let _stress = null;
  let _readiness = null;

  async function init(profile) {
    _profile = profile;
  }

  async function render() {
    const container = document.getElementById('body-content');
    if (!container) return;

    const todayRecovery = await DB.getTodayRecovery();

    // Pre-fill from today's log if it exists
    if (todayRecovery) {
      _soreness  = _soreness  ?? todayRecovery.soreness  ?? null;
      _stress    = _stress    ?? todayRecovery.stress    ?? null;
      _readiness = _readiness ?? todayRecovery.readiness ?? null;
    }

    // 7-day sleep trend
    const weekAgo = (() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0]; })();
    const weeklyLogs = DB.getLogsRange ? await DB.getLogsRange('recoveryLogs', weekAgo, today()) : [];

    const injuries = todayRecovery?.injuries || [];

    container.innerHTML = `
      <!-- Morning Check-In -->
      <div class="card">
        <div class="card-title">Morning Check-In</div>

        <!-- Sleep -->
        <div class="field-group" style="margin-bottom:16px">
          <label style="font-size:13px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:8px">Sleep Hours</label>
          <input type="number" id="recovery-sleep" min="0" max="24" step="0.5" placeholder="e.g. 7.5"
            value="${todayRecovery?.sleep || ''}"
            style="width:100%;max-width:140px" />
        </div>

        <!-- Soreness -->
        <div class="field-group" style="margin-bottom:16px">
          <label style="font-size:13px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:8px">Soreness <span style="color:var(--text-dim)">(1 = none, 10 = very sore)</span></label>
          <div class="pill-group">
            ${[1,2,3,4,5,6,7,8,9,10].map(n => `
              <div class="pill ${_soreness === n ? 'selected' : ''}" onclick="RecoveryModule.setPill('soreness', ${n})">${n}</div>
            `).join('')}
          </div>
        </div>

        <!-- Stress -->
        <div class="field-group" style="margin-bottom:16px">
          <label style="font-size:13px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:8px">Stress <span style="color:var(--text-dim)">(1 = calm, 10 = very stressed)</span></label>
          <div class="pill-group">
            ${[1,2,3,4,5,6,7,8,9,10].map(n => `
              <div class="pill ${_stress === n ? 'selected' : ''}" onclick="RecoveryModule.setPill('stress', ${n})">${n}</div>
            `).join('')}
          </div>
        </div>

        <!-- Readiness -->
        <div class="field-group" style="margin-bottom:16px">
          <label style="font-size:13px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:8px">Readiness <span style="color:var(--text-dim)">(1 = wiped, 10 = locked in)</span></label>
          <div class="pill-group">
            ${[1,2,3,4,5,6,7,8,9,10].map(n => `
              <div class="pill ${_readiness === n ? 'selected' : ''}" onclick="RecoveryModule.setPill('readiness', ${n})">${n}</div>
            `).join('')}
          </div>
        </div>

        <button class="btn btn-primary btn-full" onclick="RecoveryModule.save()">Save Check-In</button>
      </div>

      <!-- AI Intensity Adjustment -->
      <div class="ai-card" id="recovery-ai-section">
        <div class="ai-card-label">⚡ AI INTENSITY ADJUSTMENT</div>
        <div id="recovery-ai-advice" class="ai-card-text">
          ${_readiness !== null ? `
            <div class="ai-loading"><div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div></div>
          ` : `
            <span style="color:var(--text-muted)">Fill in your readiness score above to get an AI intensity recommendation.</span>
          `}
        </div>
      </div>

      <!-- Injury Log -->
      <div class="card">
        <div class="card-title">Injury Log</div>
        <div style="display:flex;gap:8px;margin-bottom:12px">
          <input type="text" id="injury-body-part" placeholder="Body part (e.g. left knee)" style="flex:1" />
          <input type="number" id="injury-severity" min="1" max="10" placeholder="1-10" style="width:70px" />
          <button class="btn btn-ghost btn-sm" onclick="RecoveryModule.addInjury()">Add</button>
        </div>
        ${injuries.length === 0 ? `
          <div style="font-size:13px;color:var(--text-dim)">No injuries logged today</div>
        ` : injuries.map((inj, i) => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
            <div>
              <div style="font-size:14px;font-weight:700">${inj.bodyPart}</div>
              <div style="font-size:12px;color:var(--text-muted)">Severity: ${inj.severity}/10</div>
            </div>
          </div>
        `).join('')}
        <div id="injury-ai-advice" style="margin-top:12px"></div>
      </div>

      <!-- 7-Day Sleep Trend -->
      <div class="card">
        <div class="card-title">7-Day Sleep Trend</div>
        ${renderSleepBars(weeklyLogs)}
      </div>

      <div style="height:8px"></div>
    `;

    // Load AI advice if readiness is set
    if (_readiness !== null) {
      loadAIIntensityAdvice();
    }
  }

  function renderSleepBars(logs) {
    if (!logs.length) {
      return '<div style="font-size:13px;color:var(--text-dim)">No data yet — check in daily to see your trend.</div>';
    }

    const maxSleep = 10;
    const days = [];

    // Build last 7 days array
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const log = logs.find(l => l.date === dateStr);
      days.push({ dateStr, sleep: log?.sleep || 0 });
    }

    return `
      <div style="display:flex;align-items:flex-end;gap:6px;height:80px;padding-bottom:20px;position:relative">
        ${days.map(day => {
          const pct = Math.min(100, Math.round((day.sleep / maxSleep) * 100));
          const color = day.sleep >= 7 ? 'var(--green)' : day.sleep >= 5 ? 'var(--yellow)' : day.sleep > 0 ? 'var(--accent)' : 'var(--border)';
          const label = dayName(day.dateStr);
          return `
            <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;height:100%">
              <div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;width:100%">
                <div style="height:${pct}%;background:${color};border-radius:4px 4px 0 0;min-height:${day.sleep > 0 ? 4 : 0}px;transition:height 0.3s"></div>
              </div>
              <div style="font-size:10px;color:var(--text-dim);font-weight:700">${label}</div>
              ${day.sleep > 0 ? `<div style="font-size:10px;color:var(--text-muted)">${day.sleep}h</div>` : '<div style="font-size:10px;color:var(--border)">—</div>'}
            </div>
          `;
        }).join('')}
      </div>
      <div style="font-size:11px;color:var(--text-dim);margin-top:4px">Target: 7-9h per night</div>
    `;
  }

  function setPill(type, value) {
    if (type === 'soreness')  _soreness  = value;
    if (type === 'stress')    _stress    = value;
    if (type === 'readiness') _readiness = value;

    // Update pill UI without full re-render
    const groups = { soreness: 0, stress: 1, readiness: 2 };
    const allGroups = document.querySelectorAll('.pill-group');
    const groupEl = allGroups[groups[type]];
    if (groupEl) {
      groupEl.querySelectorAll('.pill').forEach(pill => {
        pill.classList.toggle('selected', parseInt(pill.textContent) === value);
      });
    }

    // Trigger AI advice when readiness changes
    if (type === 'readiness') {
      loadAIIntensityAdvice();
    }
  }

  async function loadAIIntensityAdvice() {
    const el = document.getElementById('recovery-ai-advice');
    if (!el || _readiness === null) return;
    el.innerHTML = '<div class="ai-loading"><div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div></div>';
    if (!AI.isAvailable()) {
      el.innerHTML = '<span style="color:var(--text-muted)">Connect AI in Settings for personalized advice.</span>';
      return;
    }
    try {
      const advice = await AI.getRecoveryAdvice ? AI.getRecoveryAdvice({
        readiness: _readiness,
        soreness: _soreness,
        stress: _stress,
        profile: _profile,
      }) : AI.getCardioAdvice({ readiness: _readiness });
      if (advice) {
        el.innerHTML = `<div style="white-space:pre-line;font-size:13px;line-height:1.7">${advice}</div>`;
      }
    } catch (e) {
      el.innerHTML = '<span style="color:var(--text-muted)">Could not load advice.</span>';
    }
  }

  async function save() {
    const sleep = parseFloat(document.getElementById('recovery-sleep')?.value) || 0;

    if (!sleep && _soreness === null && _stress === null && _readiness === null) {
      toast('Fill in at least one field to save your check-in', 'error');
      return;
    }

    const existing = (await DB.getTodayRecovery()) || {};

    const log = {
      ...existing,
      sleep: sleep || existing.sleep || 0,
      soreness:  _soreness  ?? existing.soreness  ?? 0,
      stress:    _stress    ?? existing.stress    ?? 0,
      readiness: _readiness ?? existing.readiness ?? 0,
    };

    await DB.saveRecoveryLog(log);
    await Gamification.awardMuscleXP('Recovery', 50);
    await refreshStreakHeader();

    toast('Recovery check-in saved!', 'success', 3000);
    await render();
  }

  async function addInjury() {
    const bodyPart = document.getElementById('injury-body-part')?.value?.trim();
    const severity = parseInt(document.getElementById('injury-severity')?.value) || 5;

    if (!bodyPart) {
      toast('Enter a body part', 'error');
      return;
    }

    const existing = (await DB.getTodayRecovery()) || {};
    existing.injuries = [...(existing.injuries || []), { bodyPart, severity, timestamp: Date.now() }];
    await DB.saveRecoveryLog(existing);

    toast(`${bodyPart} injury logged`, 'success', 2000);

    // Clear inputs
    const partInput = document.getElementById('injury-body-part');
    const sevInput = document.getElementById('injury-severity');
    if (partInput) partInput.value = '';
    if (sevInput) sevInput.value = '';

    // Load AI injury advice
    const adviceEl = document.getElementById('injury-ai-advice');
    if (adviceEl && AI.isAvailable()) {
      adviceEl.innerHTML = '<div class="ai-loading"><div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div></div>';
      try {
        const advice = AI.getInjuryAdvice ? await AI.getInjuryAdvice(bodyPart, severity) : null;
        if (advice) {
          adviceEl.innerHTML = `<div class="ai-card"><div class="ai-card-label">⚡ INJURY ADVICE</div><div class="ai-card-text" style="white-space:pre-line">${advice}</div></div>`;
        } else {
          adviceEl.innerHTML = '';
        }
      } catch (e) {
        adviceEl.innerHTML = '';
      }
    }

    await render();
  }

  window.addEventListener('sectionShown', (e) => {
    if (e.detail === 'body') render();
  });

  return {
    init, render, save, addInjury, setPill,
  };
})();
