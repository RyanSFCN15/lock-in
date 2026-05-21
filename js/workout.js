/* ============================================================
   LOCK IN — Workout Logger
   ============================================================ */

window.WorkoutModule = (() => {
  let _profile = null;
  let _workout = null; // current session
  let _restTimerInterval = null;
  let _restSeconds = 0;
  let _travelMode = false;
  let _sessionTimerInterval = null;

  const EXERCISE_DB = [
    // Chest
    { name:'Bench Press',       muscles:['Chest','Triceps','Shoulders'],  type:'barbell', cues:'Retract scapula, arch slightly, bar to lower chest' },
    { name:'Incline Bench Press',muscles:['Chest','Shoulders','Triceps'], type:'barbell', cues:'30-45° incline, control the descent' },
    { name:'Dumbbell Fly',      muscles:['Chest'],                        type:'dumbbell',cues:'Wide arc, slight elbow bend, feel stretch at bottom' },
    { name:'Cable Fly',         muscles:['Chest'],                        type:'cable',   cues:'High to low for lower chest, constant tension' },
    { name:'Chest Dip',         muscles:['Chest','Triceps'],              type:'bodyweight',cues:'Lean forward, go deep, feel chest stretch' },
    { name:'Push-up',           muscles:['Chest','Triceps','Shoulders'],  type:'bodyweight',cues:'Full range, core tight, elbows at 45°' },
    // Back
    { name:'Deadlift',          muscles:['Back','Hamstrings','Glutes'],   type:'barbell', cues:'Hinge at hips, bar stays close, brace hard' },
    { name:'Barbell Row',       muscles:['Back','Biceps'],                type:'barbell', cues:'Horizontal pull, squeeze shoulder blades, elbows back' },
    { name:'Lat Pulldown',      muscles:['Back','Biceps'],                type:'cable',   cues:'Pull to upper chest, lean slightly back, squeeze lats' },
    { name:'Seated Cable Row',  muscles:['Back','Biceps'],                type:'cable',   cues:'Neutral spine, pull to lower chest, retract blades' },
    { name:'Pull-up',           muscles:['Back','Biceps'],                type:'bodyweight',cues:'Full hang to chin over bar, no kipping' },
    { name:'Face Pull',         muscles:['Shoulders','Back'],             type:'cable',   cues:'Pull to forehead, elbows high, external rotation' },
    { name:'Romanian Deadlift', muscles:['Hamstrings','Glutes'],          type:'barbell', cues:'Hinge, push hips back, feel hamstring stretch' },
    // Shoulders
    { name:'Overhead Press',    muscles:['Shoulders','Triceps'],          type:'barbell', cues:'Vertical bar path, brace core, press through mid-foot' },
    { name:'Dumbbell OHP',      muscles:['Shoulders','Triceps'],          type:'dumbbell',cues:'Neutral grip option, control the descent, elbows slightly forward' },
    { name:'Lateral Raise',     muscles:['Shoulders'],                    type:'dumbbell',cues:'Slight lean, raise to shoulder height, lead with elbows' },
    { name:'Rear Delt Fly',     muscles:['Shoulders','Back'],             type:'dumbbell',cues:'Hinge over, lead with elbows, squeeze rear delts' },
    { name:'Arnold Press',      muscles:['Shoulders'],                    type:'dumbbell',cues:'Rotate through full ROM, control every degree' },
    // Arms
    { name:'Barbell Curl',      muscles:['Biceps'],                       type:'barbell', cues:'No swinging, full extension at bottom, peak contraction at top' },
    { name:'Hammer Curl',       muscles:['Biceps'],                       type:'dumbbell',cues:'Neutral grip, strict form, both heads targeted' },
    { name:'Incline Curl',      muscles:['Biceps'],                       type:'dumbbell',cues:'Full stretch at bottom, great long-head activation' },
    { name:'Tricep Pushdown',   muscles:['Triceps'],                      type:'cable',   cues:'Elbows pinned, full extension, squeeze at bottom' },
    { name:'Skull Crusher',     muscles:['Triceps'],                      type:'barbell', cues:'Lower to forehead, elbows slightly back, all three heads' },
    { name:'Overhead Tricep',   muscles:['Triceps'],                      type:'dumbbell',cues:'Elbow to ceiling, full stretch and extension' },
    { name:'Dip',               muscles:['Triceps','Chest'],              type:'bodyweight',cues:'Upright torso for triceps, wide elbows for chest' },
    // Legs
    { name:'Squat',             muscles:['Quads','Glutes','Hamstrings'],  type:'barbell', cues:'Knees track toes, hit depth, drive through full foot' },
    { name:'Front Squat',       muscles:['Quads'],                        type:'barbell', cues:'Elbows high, upright torso, quad dominant' },
    { name:'Leg Press',         muscles:['Quads','Glutes'],               type:'machine', cues:'Full ROM, don\'t lock out, press through heels' },
    { name:'Leg Curl',          muscles:['Hamstrings'],                   type:'machine', cues:'Full extension, curl to full contraction, no hip movement' },
    { name:'Leg Extension',     muscles:['Quads'],                        type:'machine', cues:'Full ROM, squeeze at top, control descent' },
    { name:'Calf Raise',        muscles:['Calves'],                       type:'machine', cues:'Full stretch at bottom, hold at top, slow tempo' },
    { name:'Hip Thrust',        muscles:['Glutes'],                       type:'barbell', cues:'Shoulder blades on bench, drive hips up, squeeze glutes hard' },
    { name:'Bulgarian Split Squat',muscles:['Quads','Glutes'],            type:'dumbbell',cues:'Vertical shin, upright torso, control the descent' },
    // Core
    { name:'Plank',             muscles:['Core'],                         type:'bodyweight',cues:'Neutral spine, squeeze everything, breathe' },
    { name:'Ab Wheel',          muscles:['Core'],                         type:'other',   cues:'Don\'t let hips sag, control the return, full extension' },
    { name:'Hanging Leg Raise', muscles:['Core'],                         type:'bodyweight',cues:'No swinging, controlled raise, squeeze at top' },
    { name:'Cable Crunch',      muscles:['Core'],                         type:'cable',   cues:'Hinge at hips, round the back, squeeze abs hard' },
    // Cardio-style lifts
    { name:'Kettlebell Swing',  muscles:['Glutes','Hamstrings','Core'],   type:'other',   cues:'Hip hinge not squat, explosive hip snap, arms passive' },
    { name:'Clean and Press',   muscles:['Shoulders','Back','Legs'],      type:'barbell', cues:'Triple extension, catch in rack position, press overhead' },
  ];

  async function init(profile) {
    _profile = profile;
    _workout = await DB.getTodayWorkout();
    await render();
  }

  async function render() {
    const container = document.getElementById('workout-content');
    if (!container) return;

    _workout = _workout || await DB.getTodayWorkout();
    const todayRecovery = await DB.getTodayRecovery();
    const split = _profile?.split;

    // Determine today's split day (respect custom schedule from settings)
    const workoutSchedule = window._settings?.workoutSchedule;
    const dayOfWeek = new Date().getDay(); // 0=Sun
    const splitIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const scheduledDay = workoutSchedule?.[splitIndex];
    const todaySplitDay = scheduledDay || split?.days?.[splitIndex] || 'Training';
    const isRest = todaySplitDay === 'Rest';

    // ---- COMPLETED ----
    if (_workout?.completed) {
      _stopSessionTimer();
      const dur = _workout.endTime && _workout.startTime
        ? Math.round((_workout.endTime - _workout.startTime) / 60000) : 0;
      const totalSets = (_workout.exercises||[]).reduce((a,e)=>a+(e.sets||[]).filter(s=>s.completed).length,0);
      container.innerHTML = `
        <div class="card card-green" style="text-align:center;padding:24px 16px;margin-bottom:12px">
          <div style="font-size:40px;margin-bottom:8px">🏁</div>
          <div style="font-size:22px;font-weight:900;color:var(--green)">Workout Complete!</div>
          <div style="font-size:14px;color:var(--text-muted);margin:8px 0">${_workout.splitDay} · ${_workout.exercises?.length||0} exercises · ${totalSets} sets${dur ? ` · ${dur} min` : ''}</div>
          ${_workout.rating ? `<div style="font-size:13px;color:var(--text-muted)">Rating: ${_workout.rating}/10</div>` : ''}
          ${_workout.notes ? `<div style="font-size:13px;color:var(--text-muted);margin-top:4px">"${_workout.notes}"</div>` : ''}
        </div>
        <button class="btn btn-ghost btn-full" style="margin-bottom:12px" onclick="WorkoutModule.startCustomWorkout()">+ Start Another Workout</button>
        <div class="card">
          <div class="card-title">🏋️ Plate Calculator</div>
          <div style="display:flex;gap:10px;align-items:center;margin-bottom:12px">
            <input type="number" id="plate-calc-input" placeholder="Target kg" style="flex:1" oninput="WorkoutModule.calcPlates()" />
            <div style="font-size:13px;color:var(--text-muted)">Bar: 20kg</div>
          </div>
          <div id="plate-calc-result"></div>
        </div>
        <div class="card"><div class="card-title">📊 Weekly Volume</div><div id="volume-landmarks"></div></div>
        <div style="height:8px"></div>
      `;
      updateVolumeLandmarks();
      return;
    }

    // ---- REST DAY (no active workout) ----
    if (isRest && !_workout) {
      container.innerHTML = renderRestDayView(todayRecovery);
      return;
    }

    // ---- PRE-WORKOUT: show start screen ----
    if (!_workout) {
      const defaultExercises = split?.exercises?.[todaySplitDay] || [];
      const comeback = await _checkComeback();
      container.innerHTML = `
        ${comeback ? comeback : ''}
        <div class="card" style="margin-bottom:12px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
            <div>
              <div style="font-size:20px;font-weight:900">${todaySplitDay}</div>
              <div style="font-size:12px;color:var(--text-muted)">Today's session</div>
            </div>
            ${todayRecovery ? `<div style="text-align:right;font-size:12px;color:var(--text-muted)">
              Readiness <span style="color:${todayRecovery.readiness>=7?'var(--green)':todayRecovery.readiness>=5?'var(--yellow)':'var(--accent)'};font-weight:700">${todayRecovery.readiness}/10</span>
            </div>` : ''}
          </div>
          ${defaultExercises.length ? `
            <div style="margin-bottom:12px">
              <div style="font-size:12px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Planned</div>
              <div style="display:flex;flex-wrap:wrap;gap:6px">
                ${defaultExercises.map(e => `<span style="background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:8px;padding:4px 10px;font-size:12px">${e}</span>`).join('')}
              </div>
            </div>
          ` : ''}
          <button class="btn btn-primary btn-full" style="font-size:18px;letter-spacing:2px;min-height:56px" onclick="WorkoutModule.startWorkout()">
            START WORKOUT
          </button>
          <button class="btn btn-ghost btn-full btn-sm" style="margin-top:8px" onclick="WorkoutModule.toggleTravel()">✈️ Travel / Hotel Mode</button>
        </div>
        <div class="card"><div class="card-title">🏋️ Plate Calculator</div>
          <div style="display:flex;gap:10px;align-items:center;margin-bottom:12px">
            <input type="number" id="plate-calc-input" placeholder="Target kg" style="flex:1" oninput="WorkoutModule.calcPlates()" />
            <div style="font-size:13px;color:var(--text-muted)">Bar: 20kg</div>
          </div>
          <div id="plate-calc-result"></div>
        </div>
        <div class="card"><div class="card-title">📊 Weekly Volume</div><div id="volume-landmarks"></div></div>
        <div style="height:8px"></div>
      `;
      updateVolumeLandmarks();
      return;
    }

    // ---- ACTIVE WORKOUT ----
    _startSessionTimer();

    const elapsed = _workout.startTime ? Math.round((Date.now() - _workout.startTime) / 60000) : 0;

    container.innerHTML = `
      <!-- Active session header -->
      <div class="card" style="margin-bottom:12px;background:rgba(255,59,59,0.06);border-color:rgba(255,59,59,0.25)">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div>
            <div style="font-size:18px;font-weight:900">${_workout.splitDay}</div>
            <div style="font-size:12px;color:var(--text-muted)">${(_workout.exercises||[]).length} exercises · <span id="session-timer" style="color:var(--accent);font-weight:700">${elapsed}m</span></div>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            <button class="btn btn-sm btn-ghost" onclick="WorkoutModule.toggleTravel()" style="${_travelMode?'border-color:var(--blue);color:var(--blue)':''}">✈️</button>
            <button class="btn btn-sm btn-ghost" style="color:var(--text-dim);font-size:11px" onclick="WorkoutModule.discardWorkout()">Discard</button>
          </div>
        </div>
      </div>

      <!-- Exercises -->
      <div id="exercise-list">
        ${(_workout.exercises||[]).map((ex, idx) => renderExerciseCard(ex, idx)).join('')}
      </div>

      <!-- Add exercise — always visible and prominent -->
      <button class="btn btn-ghost btn-full" style="margin-bottom:12px;min-height:56px;font-size:16px;border-style:dashed" onclick="WorkoutModule.openExerciseSearch()">+ Add Exercise</button>

      <!-- Finish -->
      <div class="card" style="margin-bottom:12px">
        <div class="card-title">Finish Session</div>
        <div class="field-group" style="margin-bottom:12px">
          <label>Session Rating (1-10)</label>
          <div class="pill-group-rating">
            ${[1,2,3,4,5,6,7,8,9,10].map(n => `<button type="button" class="pill pill-rating ${_workout.rating==n?'selected':''}" onclick="WorkoutModule.setRating(${n})">${n}</button>`).join('')}
          </div>
        </div>
        <div class="field-group" style="margin-bottom:12px">
          <label>Notes</label>
          <textarea id="workout-notes" placeholder="How'd it feel?" style="min-height:60px">${_workout.notes||''}</textarea>
        </div>
        <button class="btn btn-primary btn-full" style="min-height:52px;font-size:17px" onclick="WorkoutModule.finishWorkout()">Finish Workout 🏁</button>
      </div>

      <!-- Plate Calculator -->
      <div class="card">
        <div class="card-title">🏋️ Plate Calculator</div>
        <div style="display:flex;gap:10px;align-items:center;margin-bottom:12px">
          <input type="number" id="plate-calc-input" placeholder="Target kg" style="flex:1" oninput="WorkoutModule.calcPlates()" />
          <div style="font-size:13px;color:var(--text-muted)">Bar: 20kg</div>
        </div>
        <div id="plate-calc-result"></div>
      </div>
      <div style="height:8px"></div>
    `;

    updateVolumeLandmarks();
  }

  function _startSessionTimer() {
    if (_sessionTimerInterval) return; // already running
    _sessionTimerInterval = setInterval(() => {
      const el = document.getElementById('session-timer');
      if (!el || !_workout?.startTime) return;
      const mins = Math.round((Date.now() - _workout.startTime) / 60000);
      el.textContent = mins + 'm';
    }, 30000); // update every 30s
  }

  function _stopSessionTimer() {
    if (_sessionTimerInterval) { clearInterval(_sessionTimerInterval); _sessionTimerInterval = null; }
  }

  async function _checkComeback() {
    const streak = await DB.getStreak();
    if (streak.current === 0 && streak.lastDate) {
      const daysMissed = Math.floor((Date.now() - new Date(streak.lastDate + 'T12:00:00')) / 86400000);
      if (daysMissed >= 5) {
        return `<div class="card card-accent" style="margin-bottom:12px">
          <div style="font-size:18px;font-weight:900;margin-bottom:8px">Welcome back 👊</div>
          <div style="font-size:14px;color:var(--text-muted)">Off ${daysMissed} days. Ease back in — don't destroy yourself on day 1.</div>
        </div>`;
      }
    }
    return '';
  }

  async function startWorkout() {
    const split = _profile?.split;
    const workoutSchedule = window._settings?.workoutSchedule;
    const dayOfWeek = new Date().getDay();
    const splitIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const todaySplitDay = workoutSchedule?.[splitIndex] || split?.days?.[splitIndex] || 'Training';
    const defaultExercises = split?.exercises?.[todaySplitDay] || [];

    _workout = {
      splitDay: todaySplitDay,
      exercises: defaultExercises.map(name => ({
        name,
        targetMuscles: getExerciseMuscles(name),
        cues: EXERCISE_DB.find(e=>e.name===name)?.cues || '',
        sets: [{ weight: '', reps: '', rpe: '', completed: false }],
      })),
      completed: false,
      startTime: Date.now(),
    };

    await saveWorkout();
    await render();
    // Scroll to top
    document.getElementById('workout-content')?.scrollIntoView({ behavior: 'smooth' });
  }

  function renderExerciseCard(ex, idx) {
    const sets = ex.sets || [];
    const completedSets = sets.filter(s => s.completed);
    const prevSets = ex.previousSets || [];

    return `
      <div class="exercise-card" id="ex-card-${idx}">
        <div class="exercise-header">
          <div>
            <div class="exercise-name">${ex.name}</div>
            <div class="exercise-muscle">${(ex.targetMuscles || []).join(' · ')}</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            <span style="font-size:13px;color:var(--text-muted)">${completedSets.length}/${sets.length} sets</span>
            <button class="btn btn-icon btn-ghost" style="font-size:18px" onclick="WorkoutModule.removeExercise(${idx})">×</button>
          </div>
        </div>

        <!-- Form cue -->
        ${ex.cues ? `<div style="padding:8px 16px;font-size:12px;color:var(--text-muted);border-bottom:1px solid var(--border)">💡 ${ex.cues}</div>` : ''}

        <!-- Set table header -->
        <div style="padding:8px 16px 4px;display:grid;grid-template-columns:32px 1fr 1fr 56px;gap:8px;font-size:11px;color:var(--text-dim);font-weight:700;text-transform:uppercase;letter-spacing:1px">
          <span>#</span><span>${window._unitSystem === 'imperial' ? 'LBS' : 'KG'}</span><span>REPS</span><span>DONE</span>
        </div>

        <div class="set-table" id="set-table-${idx}">
          ${sets.map((set, si) => renderSetRow(ex, idx, set, si, prevSets[si])).join('')}
        </div>

        <div style="padding:8px 16px;display:flex;gap:8px">
          <button class="btn btn-ghost btn-sm" style="flex:1" onclick="WorkoutModule.addSet(${idx})">+ Set</button>
          <button class="btn btn-ghost btn-sm" onclick="WorkoutModule.loadFormCues(${idx})" style="font-size:12px">🎯 Cues</button>
          <button class="btn btn-ghost btn-sm" onclick="WorkoutModule.loadNextTarget(${idx})" style="font-size:12px">⬆️ Next</button>
        </div>

        <div id="ai-next-${idx}" style="padding:0 16px 12px;font-size:13px;color:var(--text-muted)"></div>
      </div>
    `;
  }

  function renderSetRow(ex, exIdx, set, setIdx, prevSet) {
    const isCompleted = set.completed;
    const prFlag = set.isPR ? ' pr' : '';
    const isImp = window._unitSystem === 'imperial';
    // Display weight in current unit; store always in kg
    const displayWeight = set.weight ? (isImp ? Math.round(kgToLbs(set.weight) * 10) / 10 : set.weight) : '';
    const displayPrevW  = prevSet?.weight ? (isImp ? Math.round(kgToLbs(prevSet.weight)) : prevSet.weight) : (isImp ? '0' : '0');
    const unitLabel = isImp ? 'lbs' : 'kg';
    const prevInfo = prevSet ? `${displayPrevW}${unitLabel}×${prevSet.reps}` : '';

    return `
      <div class="set-row" id="set-row-${exIdx}-${setIdx}">
        <div class="set-num${isCompleted ? ' completed' : ''}${prFlag}">${setIdx + 1}</div>
        <input class="set-input" type="number" step="${isImp ? '5' : '2.5'}" min="0" max="${isImp ? '1100' : '500'}"
          value="${displayWeight}" placeholder="${displayPrevW}"
          onchange="WorkoutModule.updateSet(${exIdx}, ${setIdx}, 'weight', this.value)"
          ${isCompleted ? 'readonly' : ''} />
        <input class="set-input" type="number" min="1" max="100"
          value="${set.reps || ''}" placeholder="${prevSet?.reps || '0'}"
          onchange="WorkoutModule.updateSet(${exIdx}, ${setIdx}, 'reps', this.value)"
          ${isCompleted ? 'readonly' : ''} />
        <button class="set-complete-btn${isCompleted ? ' done' : ''}"
          onclick="WorkoutModule.completeSet(${exIdx}, ${setIdx})">
          ${isCompleted ? '✓' : '○'}
        </button>
      </div>
      ${prevInfo ? `<div style="grid-column:2/-1;font-size:10px;color:var(--text-dim);padding:0 0 4px;margin-top:-6px">prev: ${prevInfo}</div>` : ''}
    `;
  }

  function renderRestDayView(recovery) {
    return `
      <div class="card card-accent">
        <div class="card-title" style="font-size:20px;font-weight:900;color:var(--text)">Rest Day 😴</div>
        <div style="font-size:14px;color:var(--text-muted);margin-bottom:16px">Recovery is where the gains are made.</div>
        ${recovery ? `
          <div style="font-size:14px">Sleep: <strong>${recovery.sleep}h</strong> · Readiness: <strong>${recovery.readiness}/10</strong></div>
        ` : `<button class="btn btn-ghost btn-full btn-sm" onclick="navigateTo('body')">Log Recovery →</button>`}
      </div>
      <div style="margin-top:12px">
        <button class="btn btn-primary btn-full" onclick="WorkoutModule.startCustomWorkout()">Train Anyway +</button>
      </div>
    `;
  }

  // (comeback mode now inlined in render via _checkComeback())

  // ---- Actions ----

  function updateSet(exIdx, setIdx, field, value) {
    if (!_workout?.exercises?.[exIdx]?.sets?.[setIdx]) return;
    if (field === 'weight') {
      const num = parseFloat(value) || 0;
      // Always store in kg internally
      _workout.exercises[exIdx].sets[setIdx].weight =
        window._unitSystem === 'imperial' ? lbsToKg(num) : num;
    } else {
      _workout.exercises[exIdx].sets[setIdx][field] = parseInt(value);
    }
    saveWorkout();
  }

  async function completeSet(exIdx, setIdx) {
    const ex = _workout?.exercises?.[exIdx];
    const set = ex?.sets?.[setIdx];
    if (!set) return;

    set.completed = !set.completed;
    if (set.completed) {
      // Check 1RM and PR
      if (set.weight && set.reps) {
        const orm = epley1RM(set.weight, set.reps);
        const prs = await DB.getPRs();
        const prevPR = prs[ex.name]?.orm || 0;
        if (orm > prevPR) {
          set.isPR = true;
          toast(`🏆 NEW PR on ${ex.name}! 1RM ~${orm}kg`, 'gold', 4000);
          await Gamification.checkPRBadge();
        }
        // Check strength badges (bodyweight milestones, load milestones)
        await Gamification.checkStrengthBadges(ex.name, set.weight, set.reps, _profile);
        // Award XP
        for (const muscle of (ex.targetMuscles || [])) {
          await Gamification.awardMuscleXP(muscle, 15);
        }
      }

      // Start rest timer
      startRestTimer();
    }

    // Re-render set row
    const rowEl = document.getElementById(`set-row-${exIdx}-${setIdx}`);
    if (rowEl) {
      const prevSet = ex.previousSets?.[setIdx];
      rowEl.outerHTML = renderSetRow(ex, exIdx, set, setIdx, prevSet);
    }

    await saveWorkout();
  }

  function addSet(exIdx) {
    if (!_workout?.exercises?.[exIdx]) return;
    const ex = _workout.exercises[exIdx];
    const lastSet = ex.sets[ex.sets.length - 1] || {};
    ex.sets.push({ weight: lastSet.weight || '', reps: lastSet.reps || '', rpe: '', completed: false });

    const table = document.getElementById(`set-table-${exIdx}`);
    if (table) {
      const newIdx = ex.sets.length - 1;
      const div = document.createElement('div');
      div.innerHTML = renderSetRow(ex, exIdx, ex.sets[newIdx], newIdx, ex.previousSets?.[newIdx]);
      table.appendChild(div.firstChild);
    }
    saveWorkout();
  }

  function removeExercise(idx) {
    if (!_workout?.exercises) return;
    _workout.exercises.splice(idx, 1);
    render();
    saveWorkout();
  }

  function setRating(n) {
    if (_workout) {
      _workout.rating = n;
      document.querySelectorAll('.pill-rating').forEach(p => {
        const val = parseInt(p.textContent);
        p.classList.toggle('selected', val === n);
        if (val === n) {
          const col = n >= 7 ? 'var(--green)' : n >= 5 ? 'var(--yellow)' : 'var(--accent)';
          p.style.background = col;
          p.style.borderColor = col;
          p.style.color = '#000';
        } else {
          p.style.background = '';
          p.style.borderColor = '';
          p.style.color = '';
        }
      });
    }
  }

  async function finishWorkout() {
    if (!_workout) return;
    _workout.completed = true;
    _workout.notes = document.getElementById('workout-notes')?.value || '';
    _workout.endTime = Date.now();
    const durationMin = _workout.startTime
      ? Math.round((_workout.endTime - _workout.startTime) / 60000) : 0;
    _workout.durationMin = durationMin;
    _stopSessionTimer();
    await saveWorkout();
    await Gamification.processWorkoutXP(_workout);
    await Gamification.updateChallengeProgress('workout');
    await refreshStreakHeader();
    if (window.AI) AI.invalidateContext?.(); // refresh AI context after workout
    toast(`Workout logged! ${durationMin ? durationMin + ' min' : ''} 💪`, 'success', 3000);
    await render();
  }

  async function saveWorkout() {
    if (!_workout) return;
    await DB.saveWorkoutLog(_workout);
  }

  function startCustomWorkout() {
    _workout = {
      splitDay: 'Custom',
      exercises: [],
      completed: false,
      startTime: Date.now(),
    };
    saveWorkout();
    render();
  }

  async function discardWorkout() {
    if (!confirm('Discard this workout? All logged sets will be lost.')) return;
    _stopSessionTimer();
    _workout = null;
    // Delete today's workout log from DB
    try {
      const todayStr = today();
      await DB.del('workoutLogs', todayStr);
    } catch(e) {}
    toast('Workout discarded', '', 2000);
    render();
  }

  // ---- Rest Timer ----

  function startRestTimer(seconds = 90) {
    _restSeconds = seconds;
    stopRestTimer();
    const timerEl = document.getElementById('rest-timer');
    if (timerEl) timerEl.classList.add('visible');
    updateRestDisplay();
    _restTimerInterval = setInterval(() => {
      _restSeconds--;
      updateRestDisplay();
      if (_restSeconds <= 0) {
        stopRestTimer();
        toast('Rest done — next set! 💪', 'success', 3000);
      }
    }, 1000);
  }

  function updateRestDisplay() {
    const el = document.getElementById('rest-timer-count');
    if (el) {
      const m = Math.floor(Math.abs(_restSeconds) / 60);
      const s = Math.abs(_restSeconds) % 60;
      el.textContent = `${m}:${s.toString().padStart(2, '0')}`;
      el.style.color = _restSeconds <= 10 ? 'var(--accent)' : 'var(--accent)';
    }
  }

  function stopRestTimer() {
    if (_restTimerInterval) { clearInterval(_restTimerInterval); _restTimerInterval = null; }
    const timerEl = document.getElementById('rest-timer');
    if (timerEl) timerEl.classList.remove('visible');
  }

  function addRestTime(secs) { _restSeconds += secs; updateRestDisplay(); }
  function skipRest() { stopRestTimer(); }

  // ---- AI Features ----

  async function loadWarmup() {
    const el = document.getElementById('warmup-content');
    if (!el) return;
    el.innerHTML = '<div class="ai-loading"><div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div></div>';
    if (!AI.isAvailable()) { el.innerHTML = AI.unavailableHTML(); return; }
    const muscles = [...new Set((_workout?.exercises || []).flatMap(e => e.targetMuscles || []))];
    const plan = await AI.getWarmupPlan(muscles.length ? muscles : ['General']);
    el.innerHTML = `<div style="font-size:13px;line-height:1.7;white-space:pre-line;color:var(--text-muted)">${plan}</div>`;
  }

  async function loadFormCues(exIdx) {
    const ex = _workout?.exercises?.[exIdx];
    if (!ex) return;
    const el = document.getElementById(`ai-next-${exIdx}`);
    if (!el) return;
    el.innerHTML = '<div class="ai-loading"><div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div></div>';
    if (!AI.isAvailable()) { el.innerHTML = 'Connect AI in Settings for form cues.'; return; }
    const cues = await AI.getFormCues(ex.name);
    el.innerHTML = `<strong>Form Cues:</strong><br><div style="white-space:pre-line">${cues}</div>`;
  }

  async function loadNextTarget(exIdx) {
    const ex = _workout?.exercises?.[exIdx];
    if (!ex) return;
    const el = document.getElementById(`ai-next-${exIdx}`);
    if (!el) return;
    el.innerHTML = '<div class="ai-loading"><div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div></div>';
    if (!AI.isAvailable()) { el.innerHTML = 'Connect AI for next-set recommendations.'; return; }
    const completedSets = ex.sets.filter(s => s.completed && s.weight && s.reps);
    if (!completedSets.length) { el.innerHTML = 'Complete some sets first.'; return; }
    const rec = await AI.getNextSetRecommendation(ex.name, completedSets, _profile?.goal || 'strength');
    el.innerHTML = `<span style="color:var(--green);font-weight:700">⬆️ Next:</span> ${rec}`;
  }

  async function toggleTravel() {
    _travelMode = !_travelMode;
    if (_travelMode && AI.isAvailable()) {
      toast('Travel mode: generating bodyweight workout...', '', 3000);
      const plan = await AI.getTravelWorkout();
      // Parse exercises from AI response
      toast('Travel workout ready!', 'success');
    }
    render();
  }

  // ---- Exercise search ----

  function searchExercise(query) {
    const results = document.getElementById('exercise-search-results');
    if (!results) return;
    const q = query.toLowerCase().trim();
    const matches = q ? EXERCISE_DB.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.muscles.some(m => m.toLowerCase().includes(q))
    ) : EXERCISE_DB.slice(0, 20);

    results.innerHTML = `<div class="search-results">
      ${matches.map(ex => `
        <button type="button" class="search-result-item" onclick="WorkoutModule.addExercise('${ex.name.replace(/'/g, "\\'")}')">
          <div class="search-result-name">${ex.name}</div>
          <div class="search-result-meta">${ex.muscles.join(' · ')} · ${ex.type}</div>
        </button>
      `).join('')}
      ${!matches.length ? '<div style="padding:16px;color:var(--text-muted);font-size:14px">No exercises found</div>' : ''}
      <button type="button" class="search-result-item" onclick="WorkoutModule.addCustomExercise('${(q||'').replace(/'/g,'\\'')}')">
        <div class="search-result-name">+ Add "${q || 'Custom'}"</div>
        <div class="search-result-meta">Custom exercise</div>
      </button>
    </div>`;
  }

  function addExercise(name) {
    if (!_workout) _workout = { splitDay: 'Custom', exercises: [], completed: false, startTime: Date.now() };
    const exDef = EXERCISE_DB.find(e => e.name === name) || { name, muscles: [], type: 'other', cues: '' };
    _workout.exercises = _workout.exercises || [];
    _workout.exercises.push({
      name: exDef.name,
      targetMuscles: exDef.muscles,
      cues: exDef.cues,
      sets: [{ weight: '', reps: '', rpe: '', completed: false }],
    });
    closeSheet('sheet-exercise-search');
    document.getElementById('exercise-search-input').value = '';
    render();
    saveWorkout();
  }

  function addCustomExercise(name) {
    if (!name) return;
    addExercise(name.trim() || 'Custom Exercise');
  }

  function openExerciseSearch() {
    openSheet('sheet-exercise-search');
    // Clear previous search and populate full list immediately
    const inp = document.getElementById('exercise-search-input');
    if (inp) inp.value = '';
    searchExercise('');
  }

  // ---- Volume landmarks ----

  async function updateVolumeLandmarks() {
    const el = document.getElementById('volume-landmarks');
    if (!el) return;

    const weekAgo = (() => { const d = new Date(); d.setDate(d.getDate()-7); return d.toISOString().split('T')[0]; })();
    const recent = await DB.getLogsRange('workoutLogs', weekAgo, today());

    const muscleWeeklySets = {};
    for (const w of recent) {
      for (const ex of (w.exercises || [])) {
        const doneSets = (ex.sets || []).filter(s => s.completed).length;
        for (const m of (ex.targetMuscles || [])) {
          muscleWeeklySets[m] = (muscleWeeklySets[m] || 0) + doneSets;
        }
      }
    }

    const landmarks = Object.entries(VOLUME_LANDMARKS).slice(0, 6);
    el.innerHTML = landmarks.map(([muscle, lm]) => {
      const sets = muscleWeeklySets[muscle] || 0;
      const maxSets = lm.mrv + 2;
      const pct = Math.min(100, Math.round(sets / maxSets * 100));
      let color = 'var(--text-dim)';
      let status = 'Below MEV';
      if (sets >= lm.mrv) { color = 'var(--accent)'; status = 'At MRV'; }
      else if (sets >= lm.mav) { color = 'var(--green)'; status = 'In MAV'; }
      else if (sets >= lm.mev) { color = 'var(--yellow)'; status = 'Above MEV'; }

      return `
        <div class="volume-bar-wrap" style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <div style="width:80px;font-size:12px;font-weight:700;flex-shrink:0">${muscle}</div>
          <div style="flex:1">
            <div class="progress-bar-track" style="height:6px">
              <div class="progress-bar-fill" style="width:${pct}%;background:${color}"></div>
            </div>
          </div>
          <div style="font-size:11px;color:${color};min-width:60px;text-align:right">${sets} sets · ${status}</div>
        </div>
      `;
    }).join('');
  }

  // ---- Plate calculator ----

  function calcPlates() {
    const val = parseFloat(document.getElementById('plate-calc-input')?.value);
    const el = document.getElementById('plate-calc-result');
    if (!el) return;
    if (!val || val < 20) { el.innerHTML = ''; return; }

    const plates = window.calcPlates(val, 20);
    if (!plates) { el.innerHTML = '<div style="color:var(--accent);font-size:13px">Below bar weight (20kg)</div>'; return; }

    const colors = { 25:'#2563eb', 20:'#16a34a', 15:'#7c3aed', 10:'#fff', 5:'#d97706', 2.5:'#9333ea', 1.25:'#888' };

    el.innerHTML = `
      <div style="font-size:14px;font-weight:700;margin-bottom:10px">${val}kg total</div>
      <div class="plate-visual">
        ${plates.map(p => Array(p.count).fill(0).map(() => `
          <div style="width:18px;height:${32+p.weight}px;background:${colors[p.weight]||'#888'};border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:900;color:#000;writing-mode:vertical-lr">${p.weight}</div>
        `).join('')).join('')}
        <div class="bar"></div>
        ${plates.map(p => Array(p.count).fill(0).map(() => `
          <div style="width:18px;height:${32+p.weight}px;background:${colors[p.weight]||'#888'};border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:900;color:#000;writing-mode:vertical-lr">${p.weight}</div>
        `).join('')).join('')}
      </div>
      <div style="font-size:12px;color:var(--text-muted)">Per side: ${plates.map(p => `${p.count}×${p.weight}kg`).join(', ') || 'bar only'}</div>
    `;
  }

  // ---- Helpers ----

  function getExerciseMuscles(name) {
    const found = EXERCISE_DB.find(e => e.name === name);
    return found?.muscles || [];
  }

  // Section refresh
  window.addEventListener('sectionShown', async (e) => {
    if (e.detail === 'workout') {
      _workout = await DB.getTodayWorkout();
      await render();
    }
  });

  return {
    init, render, startWorkout, startCustomWorkout, discardWorkout,
    updateSet, completeSet, addSet, removeExercise, setRating, finishWorkout,
    addRestTime, skipRest, loadWarmup, loadFormCues, loadNextTarget,
    toggleTravel, searchExercise, addExercise, addCustomExercise, openExerciseSearch, calcPlates,
    EXERCISE_DB,
  };
})();
