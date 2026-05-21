/* ============================================================
   LOCK IN — Recovery Tracker (touch-fixed)
   ============================================================ */

window.RecoveryModule = (() => {
  let _profile = null;
  let _soreness  = null;
  let _stress    = null;
  let _readiness = null;

  async function init(profile) {
    _profile = profile;
  }

  async function render() {
    const container = document.getElementById('body-content');
    if (!container) return;

    const todayRecovery = await DB.getTodayRecovery();

    if (todayRecovery) {
      _soreness  = _soreness  ?? todayRecovery.soreness  ?? null;
      _stress    = _stress    ?? todayRecovery.stress    ?? null;
      _readiness = _readiness ?? todayRecovery.readiness ?? null;
    }

    const weekAgo = (() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0]; })();
    const weeklyLogs = DB.getLogsRange ? await DB.getLogsRange('recoveryLogs', weekAgo, today()) : [];
    const injuries = todayRecovery?.injuries || [];
    const alreadySaved = !!todayRecovery;

    container.innerHTML = `
      <!-- Status banner if already saved today -->
      ${alreadySaved ? `
      <div style="background:rgba(0,255,136,0.08);border:1px solid rgba(0,255,136,0.3);border-radius:var(--radius);padding:12px 16px;margin-bottom:14px;font-size:14px;color:var(--green);font-weight:700">
        ✓ Check-in saved for today — update below if needed
      </div>` : ''}

      <!-- Morning Check-In card -->
      <div class="card">
        <div class="card-title">🌅 Morning Check-In</div>

        <!-- Sleep -->
        <div style="margin-bottom:20px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <div style="font-size:14px;font-weight:700">Sleep Hours</div>
            <div style="font-size:13px;color:var(--text-muted)">Target: 7–9h</div>
          </div>
          ${window.unitWeightInput ? '' /* skip — no unit toggle for sleep */ : ''}
          <input type="number" id="recovery-sleep"
            min="0" max="24" step="0.5" placeholder="e.g. 7.5"
            value="${todayRecovery?.sleep || ''}"
            style="max-width:160px;font-size:20px;font-weight:900;text-align:center" />
        </div>

        <!-- Soreness -->
        <div style="margin-bottom:20px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <div style="font-size:14px;font-weight:700">Muscle Soreness</div>
            <div style="font-size:13px;color:${_soreness ? scoreColor(_soreness, 'soreness') : 'var(--text-muted)'}">${_soreness ? _soreness + '/10' : 'Tap to rate'}</div>
          </div>
          <div class="pill-group-rating">
            ${[1,2,3,4,5,6,7,8,9,10].map(n => `
              <button type="button"
                class="pill pill-rating ${_soreness === n ? 'selected' : ''}"
                style="${_soreness === n ? 'background:' + scoreColor(n, 'soreness') + ';border-color:' + scoreColor(n, 'soreness') + ';color:#000' : ''}"
                onclick="RecoveryModule.setPill('soreness',${n})">${n}</button>
            `).join('')}
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:10px;color:var(--text-dim)">
            <span>None</span><span>Very sore</span>
          </div>
        </div>

        <!-- Stress -->
        <div style="margin-bottom:20px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <div style="font-size:14px;font-weight:700">Stress Level</div>
            <div style="font-size:13px;color:${_stress ? scoreColor(_stress, 'stress') : 'var(--text-muted)'}">${_stress ? _stress + '/10' : 'Tap to rate'}</div>
          </div>
          <div class="pill-group-rating">
            ${[1,2,3,4,5,6,7,8,9,10].map(n => `
              <button type="button"
                class="pill pill-rating ${_stress === n ? 'selected' : ''}"
                style="${_stress === n ? 'background:' + scoreColor(n, 'stress') + ';border-color:' + scoreColor(n, 'stress') + ';color:#000' : ''}"
                onclick="RecoveryModule.setPill('stress',${n})">${n}</button>
            `).join('')}
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:10px;color:var(--text-dim)">
            <span>Calm</span><span>Max stress</span>
          </div>
        </div>

        <!-- Readiness -->
        <div style="margin-bottom:20px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <div style="font-size:14px;font-weight:700">Training Readiness</div>
            <div style="font-size:13px;color:${_readiness ? scoreColor(_readiness, 'readiness') : 'var(--text-muted)'}">${_readiness ? _readiness + '/10' : 'Tap to rate'}</div>
          </div>
          <div class="pill-group-rating">
            ${[1,2,3,4,5,6,7,8,9,10].map(n => `
              <button type="button"
                class="pill pill-rating ${_readiness === n ? 'selected' : ''}"
                style="${_readiness === n ? 'background:' + scoreColor(n, 'readiness') + ';border-color:' + scoreColor(n, 'readiness') + ';color:#000' : ''}"
                onclick="RecoveryModule.setPill('readiness',${n})">${n}</button>
            `).join('')}
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:10px;color:var(--text-dim)">
            <span>Wiped out</span><span>Locked in</span>
          </div>
        </div>

        <button class="btn btn-primary btn-full" type="button" onclick="RecoveryModule.save()">
          ${alreadySaved ? 'Update Check-In' : 'Save Check-In'}
        </button>
      </div>

      <!-- AI Intensity card -->
      <div class="ai-card" id="recovery-ai-section">
        <div class="ai-card-label">⚡ AI INTENSITY ADJUSTMENT</div>
        <div id="recovery-ai-advice" class="ai-card-text">
          ${_readiness !== null
            ? '<div class="ai-loading"><div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div></div>'
            : '<span style="color:var(--text-muted)">Fill in your readiness score above.</span>'
          }
        </div>
      </div>

      <!-- Injury Log -->
      <div class="card">
        <div class="card-title">🩹 Injury Log</div>
        <div style="display:flex;gap:8px;margin-bottom:12px;align-items:flex-end">
          <div class="field-group" style="flex:1">
            <label>Body part</label>
            <input type="text" id="injury-body-part" placeholder="e.g. left knee" />
          </div>
          <div class="field-group" style="width:72px">
            <label>Pain 1-10</label>
            <input type="number" id="injury-severity" min="1" max="10" placeholder="5" />
          </div>
          <button class="btn btn-ghost btn-sm" type="button" onclick="RecoveryModule.addInjury()">Add</button>
        </div>
        ${injuries.length === 0
          ? '<div style="font-size:13px;color:var(--text-dim);padding:4px 0">No injuries logged today</div>'
          : injuries.map(inj => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">
              <div>
                <div style="font-size:14px;font-weight:700">${inj.bodyPart}</div>
                <div style="font-size:12px;color:var(--accent)">Pain: ${inj.severity}/10</div>
              </div>
            </div>
          `).join('')
        }
        <div id="injury-ai-advice" style="margin-top:12px"></div>
      </div>

      <!-- 7-Day Sleep Trend -->
      <div class="card">
        <div class="card-title">📈 7-Day Sleep Trend</div>
        ${renderSleepBars(weeklyLogs)}
      </div>

      <div style="height:8px"></div>
    `;

    if (_readiness !== null) loadAIIntensityAdvice();
  }

  // Color coding for scores
  function scoreColor(n, type) {
    if (type === 'readiness') {
      return n >= 7 ? 'var(--green)' : n >= 5 ? 'var(--yellow)' : 'var(--accent)';
    }
    if (type === 'soreness' || type === 'stress') {
      return n >= 8 ? 'var(--accent)' : n >= 5 ? 'var(--yellow)' : 'var(--green)';
    }
    return 'var(--text-muted)';
  }

  function renderSleepBars(logs) {
    if (!logs.length) {
      return '<div style="font-size:13px;color:var(--text-dim)">No data yet — check in daily to see your trend.</div>';
    }
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const log = logs.find(l => l.date === dateStr);
      days.push({ dateStr, sleep: log?.sleep || 0 });
    }
    const maxSleep = 10;
    return `
      <div style="display:flex;align-items:flex-end;gap:6px;height:90px;padding-bottom:24px;position:relative">
        ${days.map(day => {
          const pct = Math.min(100, Math.round((day.sleep / maxSleep) * 100));
          const color = day.sleep >= 7 ? 'var(--green)' : day.sleep >= 5 ? 'var(--yellow)' : day.sleep > 0 ? 'var(--accent)' : 'var(--border)';
          return `
            <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;height:100%">
              <div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;width:100%">
                <div style="height:${pct}%;background:${color};border-radius:4px 4px 0 0;min-height:${day.sleep>0?3:0}px"></div>
              </div>
              <div style="font-size:9px;color:var(--text-dim);font-weight:700">${dayName(day.dateStr)}</div>
              <div style="font-size:9px;color:${color}">${day.sleep > 0 ? day.sleep + 'h' : '—'}</div>
            </div>`;
        }).join('')}
      </div>
      <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-dim);margin-top:4px">
        <span>Target: 7-9h</span>
        <span>Avg: ${(days.reduce((a,d)=>a+d.sleep,0)/days.filter(d=>d.sleep>0).length||0).toFixed(1)}h</span>
      </div>`;
  }

  function setPill(type, value) {
    if (type === 'soreness')  _soreness  = value;
    if (type === 'stress')    _stress    = value;
    if (type === 'readiness') _readiness = value;

    // Update pill styling without full re-render — find the exact pill group
    const allGroups = document.querySelectorAll('.pill-group-rating');
    const groupIdx = { soreness: 0, stress: 1, readiness: 2 }[type];
    const groupEl = allGroups[groupIdx];
    if (groupEl) {
      groupEl.querySelectorAll('.pill-rating').forEach(btn => {
        const n = parseInt(btn.textContent);
        const isSelected = n === value;
        btn.classList.toggle('selected', isSelected);
        if (isSelected) {
          const col = scoreColor(n, type);
          btn.style.background = col;
          btn.style.borderColor = col;
          btn.style.color = '#000';
        } else {
          btn.style.background = '';
          btn.style.borderColor = '';
          btn.style.color = '';
        }
      });
    }

    // Update score label
    const labels = document.querySelectorAll('[id^="recovery-"] .card');
    // Update the score display next to the label
    const scoreDisplays = document.querySelectorAll('.pill-rating').length > 0
      ? document.querySelectorAll('.card')[0]?.querySelectorAll('[style*="Tap to rate"], [style*="/10"]')
      : null;

    if (type === 'readiness') loadAIIntensityAdvice();
  }

  async function loadAIIntensityAdvice() {
    const el = document.getElementById('recovery-ai-advice');
    if (!el || _readiness === null) return;
    if (!AI.isAvailable()) {
      el.innerHTML = '<span style="color:var(--text-muted)">Connect AI in Settings for personalized advice.</span>';
      return;
    }
    el.innerHTML = '<div class="ai-loading"><div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div></div>';
    try {
      const prompt = `My readiness today is ${_readiness}/10, soreness ${_soreness||'?'}/10, stress ${_stress||'?'}/10. My training goal is ${_profile?.goal || 'general fitness'}. Should I train hard, moderate, or recover today? Give specific intensity guidance in 2 sentences max.`;
      const advice = await AI.generate(prompt, { maxLen: 200 });
      if (advice) {
        el.innerHTML = `<div style="font-size:14px;line-height:1.6">${advice}</div>`;
      }
    } catch (e) {
      el.innerHTML = '<span style="color:var(--text-muted)">Could not load advice.</span>';
    }
  }

  async function save() {
    const sleep = parseFloat(document.getElementById('recovery-sleep')?.value) || 0;
    if (!sleep && _soreness === null && _stress === null && _readiness === null) {
      toast('Fill in at least one field', 'error'); return;
    }
    const existing = (await DB.getTodayRecovery()) || {};
    const log = {
      ...existing,
      sleep:     sleep || existing.sleep || 0,
      soreness:  _soreness  ?? existing.soreness  ?? 0,
      stress:    _stress    ?? existing.stress    ?? 0,
      readiness: _readiness ?? existing.readiness ?? 0,
    };
    await DB.saveRecoveryLog(log);
    await Gamification.awardMuscleXP('Recovery', 50);
    await refreshStreakHeader();
    toast('Recovery check-in saved! ✓', 'success', 2500);
    await render();
  }

  async function addInjury() {
    const bodyPart = document.getElementById('injury-body-part')?.value?.trim();
    const severity = parseInt(document.getElementById('injury-severity')?.value) || 5;
    if (!bodyPart) { toast('Enter a body part', 'error'); return; }

    const existing = (await DB.getTodayRecovery()) || {};
    existing.injuries = [...(existing.injuries || []), { bodyPart, severity, timestamp: Date.now() }];
    await DB.saveRecoveryLog(existing);
    toast(`${bodyPart} logged`, 'success', 2000);

    document.getElementById('injury-body-part').value = '';
    document.getElementById('injury-severity').value = '';

    const adviceEl = document.getElementById('injury-ai-advice');
    if (adviceEl && AI.isAvailable()) {
      adviceEl.innerHTML = '<div class="ai-loading"><div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div></div>';
      try {
        const advice = await AI.getInjuryAdvice(bodyPart, severity);
        if (advice) {
          adviceEl.innerHTML = `<div class="ai-card" style="margin:0"><div class="ai-card-label">⚡ INJURY ADVICE</div><div class="ai-card-text" style="white-space:pre-line">${advice}</div></div>`;
        } else adviceEl.innerHTML = '';
      } catch { adviceEl.innerHTML = ''; }
    }
    await render();
  }

  window.addEventListener('sectionShown', (e) => {
    if (e.detail === 'body') render();
  });

  return { init, render, save, addInjury, setPill };
})();
