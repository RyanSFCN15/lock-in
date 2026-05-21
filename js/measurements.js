/* ============================================================
   LOCK IN — Measurements Tracker
   ============================================================ */

window.MeasurementsModule = (() => {
  let _profile = null;
  let _weightChart = null;
  let _bfChart = null;

  async function init(profile) {
    _profile = profile;
  }

  async function render() {
    const container = document.getElementById('body-content');
    if (!container) return;

    // Destroy old chart instances to avoid canvas reuse errors
    if (_weightChart) { _weightChart.destroy(); _weightChart = null; }
    if (_bfChart) { _bfChart.destroy(); _bfChart = null; }

    const allMeasurements = DB.getMeasurements ? await DB.getMeasurements() : [];
    const latest = allMeasurements.length > 0 ? allMeasurements[allMeasurements.length - 1] : null;
    const first  = allMeasurements.length > 0 ? allMeasurements[0] : null;

    const latestBF = latest && window.calcNavyBF
      ? window.calcNavyBF(_profile?.sex || 'male', _profile?.heightCm || 175, latest.neck, latest.waist, latest.hips)
      : null;

    const targetWeight = _profile?.targetWeightKg || null;
    const startWeight  = first?.weight || null;
    const currentWeight = latest?.weight || null;

    // Weight progress
    let weightPct = 0;
    if (startWeight && targetWeight && currentWeight && startWeight !== targetWeight) {
      weightPct = Math.min(100, Math.max(0, Math.round(
        Math.abs(currentWeight - startWeight) / Math.abs(targetWeight - startWeight) * 100
      )));
    }

    // Strength standards
    const standards = renderStrengthStandards();

    container.innerHTML = `
      <!-- Log Button -->
      <div style="margin-bottom:12px">
        <button class="btn btn-primary btn-full" onclick="openSheet('sheet-measurements')">+ Log Measurements</button>
      </div>

      <!-- Latest Measurements Card -->
      ${latest ? `
      <div class="card">
        <div class="card-title">Latest Measurements</div>
        <div style="font-size:11px;color:var(--text-dim);margin-bottom:12px">${formatDate(latest.date)}</div>
        <div class="stats-grid" style="grid-template-columns:1fr 1fr;">
          ${latest.weight  ? `<div class="stat-card"><div class="stat-value">${round1(latest.weight)}<span class="stat-unit">kg</span></div><div class="stat-label">Weight</div></div>` : ''}
          ${latestBF !== null ? `<div class="stat-card"><div class="stat-value">${round1(latestBF)}<span class="stat-unit">%</span></div><div class="stat-label">Body Fat</div></div>` : ''}
          ${latest.chest   ? `<div class="stat-card"><div class="stat-value">${round1(latest.chest)}<span class="stat-unit">cm</span></div><div class="stat-label">Chest</div></div>` : ''}
          ${latest.waist   ? `<div class="stat-card"><div class="stat-value">${round1(latest.waist)}<span class="stat-unit">cm</span></div><div class="stat-label">Waist</div></div>` : ''}
          ${latest.hips    ? `<div class="stat-card"><div class="stat-value">${round1(latest.hips)}<span class="stat-unit">cm</span></div><div class="stat-label">Hips</div></div>` : ''}
          ${latest.leftArm ? `<div class="stat-card"><div class="stat-value">${round1(latest.leftArm)}<span class="stat-unit">cm</span></div><div class="stat-label">Arm</div></div>` : ''}
          ${latest.leftLeg ? `<div class="stat-card"><div class="stat-value">${round1(latest.leftLeg)}<span class="stat-unit">cm</span></div><div class="stat-label">Leg</div></div>` : ''}
        </div>
      </div>` : `
      <div class="card card-accent">
        <div class="card-title">No Measurements Yet</div>
        <div style="font-size:14px;color:var(--text-muted)">Log your first measurements to track progress over time.</div>
      </div>`}

      <!-- Progress Toward Goal -->
      ${targetWeight && currentWeight ? `
      <div class="card">
        <div class="card-title">Progress to Goal</div>
        <div class="progress-bar-wrap">
          <div class="progress-bar-header">
            <span class="progress-bar-label">Weight</span>
            <span class="progress-bar-value">${round1(currentWeight)}kg → ${round1(targetWeight)}kg</span>
          </div>
          <div class="progress-bar-track">
            <div class="progress-bar-fill" style="width:${weightPct}%;background:${weightPct >= 100 ? 'var(--green)' : 'var(--accent)'}"></div>
          </div>
        </div>
        ${allMeasurements.length >= 2 ? `
        <div class="progress-bar-wrap" style="margin-top:8px">
          <div class="progress-bar-header">
            <span class="progress-bar-label">Body Fat Trend</span>
            <span class="progress-bar-value">${latestBF !== null ? round1(latestBF) + '%' : '—'}</span>
          </div>
          <div class="progress-bar-track">
            <div class="progress-bar-fill" style="width:${latestBF !== null ? Math.min(100, Math.round(latestBF / 30 * 100)) : 0}%;background:var(--blue)"></div>
          </div>
        </div>` : ''}
      </div>` : ''}

      <!-- Weight History Chart -->
      ${allMeasurements.length > 1 ? `
      <div class="card">
        <div class="card-title">Weight History</div>
        <canvas id="weight-chart" height="160"></canvas>
      </div>

      <!-- Body Fat Chart -->
      <div class="card">
        <div class="card-title">Body Fat % History</div>
        <canvas id="bf-chart" height="160"></canvas>
      </div>` : ''}

      <!-- All-Time Stats -->
      ${startWeight && currentWeight && allMeasurements.length >= 2 ? `
      <div class="card">
        <div class="card-title">All-Time Stats</div>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${round1(startWeight)}<span class="stat-unit">kg</span></div>
            <div class="stat-label">Starting Weight</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${round1(currentWeight)}<span class="stat-unit">kg</span></div>
            <div class="stat-label">Current Weight</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" style="color:${currentWeight <= startWeight ? 'var(--green)' : 'var(--accent)'}">
              ${currentWeight <= startWeight ? '-' : '+'}${round1(Math.abs(currentWeight - startWeight))}<span class="stat-unit">kg</span>
            </div>
            <div class="stat-label">Total Change</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${allMeasurements.length}</div>
            <div class="stat-label">Logs Recorded</div>
          </div>
        </div>
      </div>` : ''}

      <!-- Strength Standards -->
      ${standards ? `
      <div class="card">
        <div class="card-title">Strength Standards</div>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">Based on ${round1(currentWeight || _profile?.weightKg || 80)}kg bodyweight</div>
        ${standards}
      </div>` : ''}

      <!-- AI Trend Analysis -->
      <div class="ai-card" id="measurements-ai-section">
        <div class="ai-card-label">⚡ AI TREND ANALYSIS</div>
        <div id="measurements-ai-advice" class="ai-card-text">
          ${allMeasurements.length >= 2 ? `
            <div class="ai-loading"><div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div></div>
          ` : `
            <span style="color:var(--text-muted)">Log at least 2 measurements to unlock AI trend analysis.</span>
          `}
        </div>
      </div>

      <div style="height:8px"></div>
    `;

    // Draw charts
    if (allMeasurements.length > 1) {
      renderCharts(allMeasurements);
    }

    // Load AI analysis
    if (allMeasurements.length >= 2) {
      loadAIAnalysis(allMeasurements);
    }
  }

  function renderStrengthStandards() {
    if (!window.STRENGTH_STANDARDS || !window.getLiftStandard) return null;
    const bw = _profile?.weightKg || 80;

    const lifts = ['Bench Press', 'Squat', 'Deadlift', 'Overhead Press'];

    return lifts.map(lift => {
      const standard = window.getLiftStandard(lift, bw, _profile?.sex || 'male');
      if (!standard) return '';
      return `
        <div style="margin-bottom:12px">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <span style="font-size:13px;font-weight:700">${lift}</span>
            <span style="font-size:12px;color:${standard.color || 'var(--text-muted)'};font-weight:700">${standard.level || ''}</span>
          </div>
          <div class="progress-bar-track">
            <div class="progress-bar-fill" style="width:${standard.pct || 0}%;background:${standard.color || 'var(--accent)'}"></div>
          </div>
          <div style="font-size:11px;color:var(--text-dim);margin-top:4px">${standard.label || ''}</div>
        </div>
      `;
    }).join('');
  }

  function renderCharts(measurements) {
    if (typeof Chart === 'undefined') return;

    const last30 = measurements.slice(-30);

    const labels = last30.map(m => formatDate(m.date));
    const weightData = last30.map(m => m.weight || null);

    const bfData = last30.map(m => {
      if (!window.calcNavyBF) return null;
      return window.calcNavyBF(_profile?.sex || 'male', _profile?.heightCm || 175, m.neck, m.waist, m.hips);
    });

    const chartDefaults = {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: {
          grid: { color: '#222' },
          ticks: { color: '#888', font: { size: 10 }, maxTicksLimit: 6 },
        },
        y: {
          grid: { color: '#222' },
          ticks: { color: '#888', font: { size: 11 } },
        },
      },
      elements: {
        line: { tension: 0.3 },
        point: { radius: 3, hoverRadius: 5 },
      },
    };

    // Weight chart
    const weightCanvas = document.getElementById('weight-chart');
    if (weightCanvas) {
      weightCanvas.style.background = '#111';
      _weightChart = new Chart(weightCanvas, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            data: weightData,
            borderColor: '#ff3b3b',
            backgroundColor: 'rgba(255,59,59,0.08)',
            borderWidth: 2,
            fill: true,
            spanGaps: true,
          }],
        },
        options: {
          ...chartDefaults,
          scales: {
            ...chartDefaults.scales,
            y: {
              ...chartDefaults.scales.y,
              title: { display: true, text: 'kg', color: '#888', font: { size: 11 } },
            },
          },
        },
      });
    }

    // BF% chart
    const bfCanvas = document.getElementById('bf-chart');
    const validBF = bfData.some(v => v !== null);
    if (bfCanvas && validBF) {
      bfCanvas.style.background = '#111';
      _bfChart = new Chart(bfCanvas, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            data: bfData,
            borderColor: '#ffd700',
            backgroundColor: 'rgba(255,215,0,0.08)',
            borderWidth: 2,
            fill: true,
            spanGaps: true,
          }],
        },
        options: {
          ...chartDefaults,
          scales: {
            ...chartDefaults.scales,
            y: {
              ...chartDefaults.scales.y,
              title: { display: true, text: '%', color: '#888', font: { size: 11 } },
            },
          },
        },
      });
    }
  }

  async function loadAIAnalysis(measurements) {
    const el = document.getElementById('measurements-ai-advice');
    if (!el) return;
    if (!AI.isAvailable()) {
      el.innerHTML = AI.unavailableHTML ? AI.unavailableHTML() : '<span style="color:var(--text-muted)">Connect AI in Settings for trend analysis.</span>';
      return;
    }
    try {
      const analysis = AI.getMeasurementAnalysis
        ? await AI.getMeasurementAnalysis(measurements.slice(-10), _profile)
        : await AI.getCardioAdvice({ measurements: measurements.slice(-5), profile: _profile });
      if (analysis) {
        el.innerHTML = `<div style="white-space:pre-line;font-size:13px;line-height:1.7">${analysis}</div>`;
      }
    } catch (e) {
      el.innerHTML = '<span style="color:var(--text-muted)">Could not load analysis.</span>';
    }
  }

  async function save() {
    const weight    = parseFloat(document.getElementById('m-weight')?.value)    || 0;
    const neck      = parseFloat(document.getElementById('m-neck')?.value)      || 0;
    const waist     = parseFloat(document.getElementById('m-waist')?.value)     || 0;
    const hips      = parseFloat(document.getElementById('m-hips')?.value)      || 0;
    const chest     = parseFloat(document.getElementById('m-chest')?.value)     || 0;
    const leftArm   = parseFloat(document.getElementById('m-left-arm')?.value)  || 0;
    const rightArm  = parseFloat(document.getElementById('m-right-arm')?.value) || 0;
    const leftLeg   = parseFloat(document.getElementById('m-left-leg')?.value)  || 0;
    const rightLeg  = parseFloat(document.getElementById('m-right-leg')?.value) || 0;

    if (!weight && !waist && !chest) {
      toast('Enter at least one measurement to save', 'error');
      return;
    }

    const bodyFat = (window.calcNavyBF && neck && waist && (_profile?.sex === 'female' ? hips : true))
      ? window.calcNavyBF(_profile?.sex || 'male', _profile?.heightCm || 175, neck, waist, hips)
      : null;

    const measurement = {
      date: today(),
      weight:   weight   || undefined,
      neck:     neck     || undefined,
      waist:    waist    || undefined,
      hips:     hips     || undefined,
      chest:    chest    || undefined,
      leftArm:  leftArm  || undefined,
      rightArm: rightArm || undefined,
      leftLeg:  leftLeg  || undefined,
      rightLeg: rightLeg || undefined,
      bodyFat:  bodyFat  !== null ? round1(bodyFat) : undefined,
      timestamp: Date.now(),
    };

    await DB.saveMeasurement(measurement);

    await Gamification.awardBadge('measurement_log');
    await Gamification.awardMuscleXP('Measurements', 100);

    toast('Measurements saved! +100 XP', 'success', 3000);
    closeSheet('sheet-measurements');
    await render();
  }

  window.addEventListener('sectionShown', (e) => {
    if (e.detail === 'body') render();
  });

  return {
    init, render, save, renderCharts,
  };
})();
