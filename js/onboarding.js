/* ============================================================
   LOCK IN — Onboarding Flow
   ============================================================ */

window.Onboarding = (() => {
  let step = 0;
  let data = {};

  const TOTAL_STEPS = 12;

  const SPLITS = {
    ppl:        { name: 'Push / Pull / Legs', days: ['Push','Pull','Legs','Push','Pull','Legs','Rest'] },
    upper_lower:{ name: 'Upper / Lower',      days: ['Upper','Lower','Rest','Upper','Lower','Rest','Rest'] },
    bro:        { name: 'Bro Split',          days: ['Chest','Back','Shoulders','Arms','Legs','Rest','Rest'] },
    full_body:  { name: 'Full Body',          days: ['Full Body','Rest','Full Body','Rest','Full Body','Rest','Rest'] },
    custom:     { name: 'Custom',             days: ['Day 1','Day 2','Day 3','Day 4','Rest','Rest','Rest'] },
  };

  const DEFAULT_EXERCISES = {
    Push:    ['Bench Press','Incline Bench Press','Overhead Press','Lateral Raise','Tricep Pushdown','Cable Fly'],
    Pull:    ['Deadlift','Barbell Row','Lat Pulldown','Face Pull','Bicep Curl','Hammer Curl'],
    Legs:    ['Squat','Romanian Deadlift','Leg Press','Leg Curl','Leg Extension','Calf Raise'],
    Upper:   ['Bench Press','Row','Overhead Press','Lat Pulldown','Bicep Curl','Tricep Extension'],
    Lower:   ['Squat','Romanian Deadlift','Leg Press','Leg Curl','Calf Raise'],
    Chest:   ['Bench Press','Incline Bench Press','Cable Fly','Chest Dip'],
    Back:    ['Barbell Row','Lat Pulldown','Seated Row','Face Pull','Deadlift'],
    Shoulders:['Overhead Press','Lateral Raise','Rear Delt Fly','Front Raise'],
    Arms:    ['Barbell Curl','Hammer Curl','Tricep Pushdown','Skull Crusher'],
    Legs:    ['Squat','Leg Press','Romanian Deadlift','Leg Curl','Calf Raise'],
    'Full Body':['Squat','Bench Press','Deadlift','Overhead Press','Row','Pull-up'],
    'Day 1': ['Squat','Bench Press','Barbell Row'],
    'Day 2': ['Overhead Press','Deadlift','Pull-up'],
    'Day 3': ['Front Squat','Incline Press','Pendlay Row'],
    'Day 4': ['Romanian Deadlift','Dip','Lat Pulldown'],
  };

  function pct() {
    return Math.round((step / TOTAL_STEPS) * 100);
  }

  function render() {
    const el = document.getElementById('onboarding');
    el.innerHTML = buildStep(step);
    el.style.display = 'block';
    // Animate in
    const screen = el.querySelector('.onboarding-screen');
    if (screen) screen.style.animation = 'slide-up 0.3s ease';
  }

  function buildStep(s) {
    const header = `
      <div class="onboarding-logo">LOCK IN</div>
      <div class="onboarding-step">Step ${s + 1} of ${TOTAL_STEPS}</div>
      <div class="onboarding-progress">
        <div class="onboarding-progress-bar" style="width:${pct()}%"></div>
      </div>
    `;

    const steps = [
      buildStep0, buildStep1, buildStep2, buildStep3, buildStep4,
      buildStep5, buildStep6, buildStep7, buildStep8, buildStep9,
      buildStep10, buildStep11,
    ];

    return `<div class="onboarding-screen active">${header}${(steps[s] || buildStep0)()}</div>`;
  }

  function navButtons(backLabel = 'Back', nextLabel = 'Continue', nextFn = 'Onboarding.next()') {
    const showBack = step > 0;
    return `<div class="onboarding-nav">
      ${showBack ? `<button class="btn btn-secondary" onclick="Onboarding.back()">${backLabel}</button>` : ''}
      <button class="btn btn-primary" onclick="${nextFn}">${nextLabel}</button>
    </div>`;
  }

  // Step 0: Name, age, sex
  function buildStep0() {
    return `
      <div class="onboarding-title">Let's get started.</div>
      <div class="onboarding-subtitle">No fluff. Real data. Real results.</div>
      <div class="onboarding-fields">
        <div class="field-group">
          <label>Your Name</label>
          <input type="text" id="ob-name" placeholder="What do they call you?" value="${data.name||''}" />
        </div>
        <div class="input-row">
          <div class="field-group">
            <label>Age</label>
            <input type="number" id="ob-age" placeholder="25" min="13" max="99" value="${data.age||''}" />
          </div>
          <div class="field-group">
            <label>Sex</label>
            <select id="ob-sex">
              <option value="male" ${data.sex==='male'?'selected':''}>Male</option>
              <option value="female" ${data.sex==='female'?'selected':''}>Female</option>
            </select>
          </div>
        </div>
        <div class="input-row">
          <div class="field-group">
            <label>Height (cm)</label>
            <input type="number" id="ob-height" placeholder="178" min="120" max="250" value="${data.heightCm||''}" />
          </div>
          <div class="field-group">
            <label>Weight (kg)</label>
            <input type="number" id="ob-weight" placeholder="80" step="0.1" min="30" max="300" value="${data.weightKg||''}" />
          </div>
        </div>
      </div>
      ${navButtons('', 'Let\'s Go →')}
    `;
  }

  // Step 1: Measurements for Navy BF%
  function buildStep1() {
    return `
      <div class="onboarding-title">Body measurements.</div>
      <div class="onboarding-subtitle">Used to calculate your body fat % using the Navy formula. Measure relaxed, not flexed.</div>
      <div class="onboarding-fields">
        <div class="field-group">
          <label>Neck circumference (cm)</label>
          <input type="number" id="ob-neck" placeholder="38" step="0.5" min="20" max="60" value="${data.neckCm||''}" />
        </div>
        <div class="field-group">
          <label>Waist circumference (cm) — at navel</label>
          <input type="number" id="ob-waist" placeholder="85" step="0.5" min="50" max="160" value="${data.waistCm||''}" />
        </div>
        ${data.sex === 'female' ? `
        <div class="field-group">
          <label>Hips circumference (cm) — widest point</label>
          <input type="number" id="ob-hips" placeholder="95" step="0.5" min="60" max="160" value="${data.hipsCm||''}" />
        </div>` : ''}
        <div id="bf-preview" style="margin-top:8px;color:var(--text-muted);font-size:14px"></div>
      </div>
      ${navButtons()}
    `;

    // Live BF preview
    setTimeout(() => {
      const inputs = ['ob-neck', 'ob-waist', 'ob-hips'].map(id => document.getElementById(id)).filter(Boolean);
      inputs.forEach(i => i?.addEventListener('input', updateBFPreview));
    }, 50);
  }

  function updateBFPreview() {
    const neck = parseFloat(document.getElementById('ob-neck')?.value);
    const waist = parseFloat(document.getElementById('ob-waist')?.value);
    const hips = parseFloat(document.getElementById('ob-hips')?.value);
    const bf = calcNavyBF(data.sex, data.heightCm, neck, waist, hips);
    const el = document.getElementById('bf-preview');
    if (el && bf !== null) el.textContent = `Estimated body fat: ${bf}%`;
  }

  // Step 2: Current lifts
  function buildStep2() {
    return `
      <div class="onboarding-title">Current lifts.</div>
      <div class="onboarding-subtitle">Your 1RM or recent working weight. Be honest — the app calibrates to this.</div>
      <div class="onboarding-fields">
        <div class="input-row">
          <div class="field-group">
            <label>Bench Press (kg)</label>
            <input type="number" id="ob-bench" placeholder="80" min="0" value="${data.lifts?.bench||''}" />
          </div>
          <div class="field-group">
            <label>Squat (kg)</label>
            <input type="number" id="ob-squat" placeholder="100" min="0" value="${data.lifts?.squat||''}" />
          </div>
        </div>
        <div class="input-row">
          <div class="field-group">
            <label>Deadlift (kg)</label>
            <input type="number" id="ob-deadlift" placeholder="120" min="0" value="${data.lifts?.deadlift||''}" />
          </div>
          <div class="field-group">
            <label>Overhead Press (kg)</label>
            <input type="number" id="ob-ohp" placeholder="60" min="0" value="${data.lifts?.ohp||''}" />
          </div>
        </div>
        <div style="margin-top:8px;font-size:13px;color:var(--text-muted)">Skip any you don't do. Estimated 1RM from working sets.</div>
      </div>
      ${navButtons()}
    `;
  }

  // Step 3: Split setup
  function buildStep3() {
    const selected = data.splitType || 'ppl';
    return `
      <div class="onboarding-title">Training split.</div>
      <div class="onboarding-subtitle">How do you structure your week?</div>
      <div class="onboarding-fields">
        <div class="option-cards" id="split-cards">
          ${Object.entries(SPLITS).map(([key, val]) => `
            <div class="option-card ${selected === key ? 'selected' : ''}" onclick="Onboarding.selectSplit('${key}', this)">
              <div class="card-label">${val.name}</div>
            </div>
          `).join('')}
        </div>
        <div id="split-preview" style="margin-top:16px"></div>
      </div>
      ${navButtons()}
    `;
    setTimeout(() => renderSplitPreview(selected), 50);
  }

  function renderSplitPreview(key) {
    const el = document.getElementById('split-preview');
    if (!el) return;
    const split = SPLITS[key];
    if (!split) return;
    el.innerHTML = `
      <div class="card-title">Weekly Schedule</div>
      <div class="week-calendar">
        ${['M','T','W','T','F','S','S'].map((d, i) => `
          <div class="cal-day">
            <div class="cal-day-name">${d}</div>
            <div class="cal-day-dot ${split.days[i] === 'Rest' ? 'rest' : 'planned'}" style="font-size:9px">${split.days[i] === 'Rest' ? '—' : split.days[i].slice(0,3)}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Step 4: Goal
  function buildStep4() {
    const goals = [
      { key: 'bulk',      icon: '📈', label: 'Bulk',      sub: 'Build muscle & size' },
      { key: 'cut',       icon: '🔥', label: 'Cut',       sub: 'Lose fat, keep muscle' },
      { key: 'recomp',    icon: '⚡', label: 'Recomp',    sub: 'Build & lose simultaneously' },
      { key: 'strength',  icon: '🏋️', label: 'Strength',  sub: 'Maximize 1RM' },
      { key: 'endurance', icon: '🏃', label: 'Endurance', sub: 'Cardio & conditioning' },
    ];
    const selected = data.goal || 'bulk';
    return `
      <div class="onboarding-title">Your goal.</div>
      <div class="onboarding-subtitle">What are you training FOR?</div>
      <div class="onboarding-fields">
        <div class="option-cards">
          ${goals.map(g => `
            <div class="option-card ${selected === g.key ? 'selected' : ''}" onclick="Onboarding.selectGoal('${g.key}', this)">
              <div class="card-icon">${g.icon}</div>
              <div class="card-label">${g.label}</div>
              <div class="card-sub">${g.sub}</div>
            </div>
          `).join('')}
        </div>
        <div class="input-row" style="margin-top:16px">
          <div class="field-group">
            <label>Target Weight (kg)</label>
            <input type="number" id="ob-target-weight" placeholder="${data.weightKg||75}" step="0.5" value="${data.targetWeightKg||''}" />
          </div>
          <div class="field-group">
            <label>Weeks to Goal</label>
            <input type="number" id="ob-weeks" placeholder="16" min="4" max="104" value="${data.weeksToGoal||''}" />
          </div>
        </div>
      </div>
      ${navButtons()}
    `;
  }

  // Step 5: Activity level
  function buildStep5() {
    const levels = [
      { key: 'sedentary',         icon: '🪑', label: 'Sedentary',          sub: 'Desk job, little exercise' },
      { key: 'lightly_active',    icon: '🚶', label: 'Lightly Active',     sub: '1–2 workouts/week' },
      { key: 'moderately_active', icon: '🏃', label: 'Moderately Active',  sub: '3–4 workouts/week' },
      { key: 'very_active',       icon: '🔥', label: 'Very Active',        sub: '5+ workouts/week' },
    ];
    const selected = data.activityLevel || 'moderately_active';
    return `
      <div class="onboarding-title">Activity level.</div>
      <div class="onboarding-subtitle">Sets your base calorie target (TDEE).</div>
      <div class="onboarding-fields">
        <div class="option-cards">
          ${levels.map(l => `
            <div class="option-card ${selected === l.key ? 'selected' : ''}" onclick="Onboarding.selectActivity('${l.key}', this)">
              <div class="card-icon">${l.icon}</div>
              <div class="card-label">${l.label}</div>
              <div class="card-sub">${l.sub}</div>
            </div>
          `).join('')}
        </div>
      </div>
      ${navButtons()}
    `;
  }

  // Step 6: Diet preference
  function buildStep6() {
    const diets = [
      { key: 'standard',    icon: '🍗', label: 'Standard'    },
      { key: 'keto',        icon: '🥑', label: 'Keto'        },
      { key: 'vegan',       icon: '🌱', label: 'Vegan'       },
      { key: 'vegetarian',  icon: '🥕', label: 'Vegetarian'  },
      { key: 'fasting',     icon: '⏱️', label: 'Fasting'     },
    ];
    const selected = data.dietPreference || 'standard';
    return `
      <div class="onboarding-title">Diet preference.</div>
      <div class="onboarding-subtitle">Shapes your meal plans and food recommendations.</div>
      <div class="onboarding-fields">
        <div class="option-cards">
          ${diets.map(d => `
            <div class="option-card ${selected === d.key ? 'selected' : ''}" onclick="Onboarding.selectDiet('${d.key}', this)">
              <div class="card-icon">${d.icon}</div>
              <div class="card-label">${d.label}</div>
            </div>
          `).join('')}
        </div>
        <div id="fasting-protocol-section" style="display:${selected === 'fasting' ? 'block' : 'none'};margin-top:16px">
          <div class="field-group">
            <label>Fasting Protocol</label>
            <select id="ob-fasting-protocol">
              <option value="16:8" ${data.fastingProtocol?.type==='16:8'?'selected':''}>16:8 (16h fast, 8h eating)</option>
              <option value="18:6" ${data.fastingProtocol?.type==='18:6'?'selected':''}>18:6 (18h fast, 6h eating)</option>
              <option value="20:4" ${data.fastingProtocol?.type==='20:4'?'selected':''}>20:4 (20h fast, 4h eating)</option>
              <option value="OMAD" ${data.fastingProtocol?.type==='OMAD'?'selected':''}>OMAD (One meal a day)</option>
              <option value="5:2"  ${data.fastingProtocol?.type==='5:2'?'selected':''}>5:2 (2 low-cal days/week)</option>
              <option value="custom"${data.fastingProtocol?.type==='custom'?'selected':''}>Custom</option>
            </select>
          </div>
        </div>
      </div>
      ${navButtons()}
    `;
  }

  // Step 7: Injuries
  function buildStep7() {
    return `
      <div class="onboarding-title">Injuries & limits.</div>
      <div class="onboarding-subtitle">Any injuries, pain, or movement restrictions? The AI works around them.</div>
      <div class="onboarding-fields">
        <div class="field-group">
          <label>Injuries / Limitations</label>
          <textarea id="ob-injuries" placeholder="e.g. Left shoulder impingement, lower back pain on deadlifts, bad knees (skip full depth squats)">${data.injuries||''}</textarea>
        </div>
        <div style="font-size:13px;color:var(--text-muted)">Leave blank if none. This is fitness guidance, not medical advice.</div>
      </div>
      ${navButtons('Back', 'Continue')}
    `;
  }

  // Step 8: Budget
  function buildStep8() {
    return `
      <div class="onboarding-title">Weekly grocery budget.</div>
      <div class="onboarding-subtitle">Optional. Enables Budget Mode — the AI builds macro-optimized meal plans around your budget in CAD.</div>
      <div class="onboarding-fields">
        <div class="field-group">
          <label>Weekly Budget (CAD) — optional</label>
          <input type="number" id="ob-budget" placeholder="e.g. 75" min="0" max="500" value="${data.weeklyBudget||''}" />
        </div>
        <div class="pill-group" style="margin-top:8px">
          ${[50,75,100,150,200].map(b => `
            <div class="pill ${data.weeklyBudget==b?'selected':''}" onclick="this.parentElement.querySelectorAll('.pill').forEach(p=>p.classList.remove('selected'));this.classList.add('selected');document.getElementById('ob-budget').value=${b}">${b}</div>
          `).join('')}
        </div>
      </div>
      ${navButtons('Back', 'Continue')}
    `;
  }

  // Step 9: Goal build (body silhouette)
  function buildStep9() {
    const builds = [
      { key: 'lean',        icon: '🏃', label: 'Lean',        sub: 'Low BF%, athletic look' },
      { key: 'athletic',    icon: '⚡', label: 'Athletic',    sub: 'Functional & defined' },
      { key: 'muscular',    icon: '💪', label: 'Muscular',    sub: 'Hypertrophy focus' },
      { key: 'powerlifter', icon: '🏋️', label: 'Powerlifter', sub: 'Max strength build' },
    ];
    const selected = data.goalBuild || 'athletic';
    return `
      <div class="onboarding-title">Goal physique.</div>
      <div class="onboarding-subtitle">What's the target? This sets your visual goal figure.</div>
      <div class="onboarding-fields">
        <div class="option-cards">
          ${builds.map(b => `
            <div class="option-card ${selected === b.key ? 'selected' : ''}" onclick="Onboarding.selectBuild('${b.key}', this)">
              <div class="card-icon">${b.icon}</div>
              <div class="card-label">${b.label}</div>
              <div class="card-sub">${b.sub}</div>
            </div>
          `).join('')}
        </div>
      </div>
      ${navButtons()}
    `;
  }

  // Step 10: Custom exercises per split day
  function buildStep10() {
    const splitType = data.splitType || 'ppl';
    const split = SPLITS[splitType];
    const trainingDays = split.days.filter(d => d !== 'Rest');
    const uniqueDays = [...new Set(trainingDays)];

    return `
      <div class="onboarding-title">Your exercises.</div>
      <div class="onboarding-subtitle">Exercises for each training day. Edit or leave defaults.</div>
      <div class="onboarding-fields" style="gap:20px">
        ${uniqueDays.map(day => {
          const defaultExs = DEFAULT_EXERCISES[day] || ['Squat','Bench Press','Row'];
          const existing = (data.splitExercises?.[day] || defaultExs).join('\n');
          return `
            <div class="field-group">
              <label>${day}</label>
              <textarea id="ob-ex-${day.replace(/\s/g,'_')}" style="min-height:100px;font-size:13px">${existing}</textarea>
            </div>
          `;
        }).join('')}
      </div>
      ${navButtons()}
    `;
  }

  // Step 11: Review & launch
  function buildStep11() {
    const tdee = data.weightKg && data.heightCm ? calcTDEE(data) : null;
    const macros = tdee ? calcMacroTargets(data) : null;
    const bf = calcNavyBF(data.sex, data.heightCm, data.neckCm, data.waistCm, data.hipsCm);
    return `
      <div class="onboarding-title">You're ready.<br>Lock in.</div>
      <div class="onboarding-subtitle">Here's what we've got:</div>
      <div class="onboarding-fields">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${data.weightKg}<span class="stat-unit">kg</span></div>
            <div class="stat-label">Current Weight</div>
          </div>
          ${bf !== null ? `<div class="stat-card">
            <div class="stat-value">${bf}<span class="stat-unit">%</span></div>
            <div class="stat-label">Body Fat (Navy)</div>
          </div>` : ''}
          ${tdee ? `<div class="stat-card">
            <div class="stat-value">${tdee}<span class="stat-unit">cal</span></div>
            <div class="stat-label">Daily TDEE</div>
          </div>` : ''}
          ${macros ? `<div class="stat-card">
            <div class="stat-value">${macros.protein}<span class="stat-unit">g</span></div>
            <div class="stat-label">Protein Target</div>
          </div>` : ''}
        </div>
        <div class="card" style="margin-top:8px">
          <div style="display:flex;flex-direction:column;gap:6px;font-size:14px">
            <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Goal</span><span style="font-weight:700;text-transform:capitalize">${data.goal}</span></div>
            <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Split</span><span style="font-weight:700">${SPLITS[data.splitType]?.name || 'Custom'}</span></div>
            <div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Diet</span><span style="font-weight:700;text-transform:capitalize">${data.dietPreference}</span></div>
            ${data.weeklyBudget ? `<div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">Budget</span><span style="font-weight:700;color:var(--green)">$${data.weeklyBudget} CAD/week</span></div>` : ''}
          </div>
        </div>
      </div>
      <div class="onboarding-nav">
        <button class="btn btn-secondary" onclick="Onboarding.back()">Back</button>
        <button class="btn btn-primary" onclick="Onboarding.finish()" style="font-size:18px;letter-spacing:3px">LOCK IN</button>
      </div>
    `;
  }

  // ---- Data collection per step ----

  function collectStep(s) {
    switch (s) {
      case 0:
        data.name       = document.getElementById('ob-name')?.value?.trim();
        data.age        = parseInt(document.getElementById('ob-age')?.value) || null;
        data.sex        = document.getElementById('ob-sex')?.value || 'male';
        data.heightCm   = parseFloat(document.getElementById('ob-height')?.value) || null;
        data.weightKg   = parseFloat(document.getElementById('ob-weight')?.value) || null;
        if (!data.name || !data.age || !data.heightCm || !data.weightKg) {
          toast('Fill in all fields', 'error'); return false;
        }
        return true;

      case 1:
        data.neckCm  = parseFloat(document.getElementById('ob-neck')?.value)  || null;
        data.waistCm = parseFloat(document.getElementById('ob-waist')?.value) || null;
        data.hipsCm  = parseFloat(document.getElementById('ob-hips')?.value)  || null;
        return true;

      case 2:
        data.lifts = {
          bench:    parseFloat(document.getElementById('ob-bench')?.value)    || 0,
          squat:    parseFloat(document.getElementById('ob-squat')?.value)    || 0,
          deadlift: parseFloat(document.getElementById('ob-deadlift')?.value) || 0,
          ohp:      parseFloat(document.getElementById('ob-ohp')?.value)      || 0,
        };
        return true;

      case 3:
        if (!data.splitType) data.splitType = 'ppl';
        return true;

      case 4:
        if (!data.goal) data.goal = 'bulk';
        data.targetWeightKg = parseFloat(document.getElementById('ob-target-weight')?.value) || data.weightKg;
        data.weeksToGoal    = parseInt(document.getElementById('ob-weeks')?.value) || 16;
        return true;

      case 5:
        if (!data.activityLevel) data.activityLevel = 'moderately_active';
        return true;

      case 6:
        if (!data.dietPreference) data.dietPreference = 'standard';
        if (data.dietPreference === 'fasting') {
          data.fastingProtocol = { type: document.getElementById('ob-fasting-protocol')?.value || '16:8' };
        } else {
          data.fastingProtocol = { type: 'none' };
        }
        return true;

      case 7:
        data.injuries = document.getElementById('ob-injuries')?.value?.trim() || '';
        return true;

      case 8:
        data.weeklyBudget = parseFloat(document.getElementById('ob-budget')?.value) || null;
        return true;

      case 9:
        if (!data.goalBuild) data.goalBuild = 'athletic';
        return true;

      case 10:
        const splitType = data.splitType || 'ppl';
        const split = SPLITS[splitType];
        const trainingDays = [...new Set(split.days.filter(d => d !== 'Rest'))];
        data.splitExercises = {};
        for (const day of trainingDays) {
          const id = `ob-ex-${day.replace(/\s/g,'_')}`;
          const val = document.getElementById(id)?.value || '';
          data.splitExercises[day] = val.split('\n').map(e => e.trim()).filter(Boolean);
        }
        data.split = {
          type: splitType,
          name: SPLITS[splitType].name,
          days: SPLITS[splitType].days,
          exercises: data.splitExercises,
        };
        return true;

      default:
        return true;
    }
  }

  // ---- Public API ----

  function selectSplit(key, el) {
    data.splitType = key;
    document.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    renderSplitPreview(key);
  }

  function selectGoal(key, el) {
    data.goal = key;
    document.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
  }

  function selectActivity(key, el) {
    data.activityLevel = key;
    document.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
  }

  function selectDiet(key, el) {
    data.dietPreference = key;
    document.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    const section = document.getElementById('fasting-protocol-section');
    if (section) section.style.display = key === 'fasting' ? 'block' : 'none';
  }

  function selectBuild(key, el) {
    data.goalBuild = key;
    document.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
  }

  function next() {
    if (!collectStep(step)) return;
    if (step < TOTAL_STEPS - 1) {
      step++;
      render();
    }
  }

  function back() {
    if (step > 0) { step--; render(); }
  }

  async function finish() {
    if (!collectStep(step)) return;

    const profile = {
      ...data,
      onboarded: true,
      createdAt: new Date().toISOString(),
    };

    await DB.saveProfile(profile);

    // Save initial measurement
    if (data.weightKg) {
      const bf = calcNavyBF(data.sex, data.heightCm, data.neckCm, data.waistCm, data.hipsCm);
      await DB.saveMeasurement({
        weight: data.weightKg,
        neck: data.neckCm,
        waist: data.waistCm,
        hips: data.hipsCm,
        bodyFatPct: bf,
      });
    }

    // Award first badge
    await Gamification.awardBadge('first_login', 'Day One', '🔑', 'Started the journey');

    // Hide onboarding, show app
    const ob = document.getElementById('onboarding');
    if (ob) { ob.style.opacity = '0'; setTimeout(() => { ob.style.display = 'none'; ob.style.opacity = '1'; }, 400); }

    document.getElementById('app').style.display = 'flex';

    await DB.updateStreak();
    await initApp(profile);
    navigateTo('dashboard');
    toast(`Welcome, ${profile.name}. Time to lock in.`, 'success', 4000);
  }

  function init() {
    step = 0;
    data = {};
    render();
  }

  return { init, next, back, finish, selectSplit, selectGoal, selectActivity, selectDiet, selectBuild };
})();
