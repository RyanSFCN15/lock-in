/* ============================================================
   LOCK IN — App Controller, Router, Global Utilities
   ============================================================ */

window._settings = {};

// ---- Toast notifications ----

window.toast = function(msg, type = '', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast${type ? ' ' + type : ''}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(-10px)';
    el.style.transition = 'all 0.3s';
    setTimeout(() => el.remove(), 300);
  }, duration);
};

// ---- XP Float animation ----

window.showXPFloat = function(amount, targetEl) {
  const el = document.createElement('div');
  el.className = 'xp-float';
  el.textContent = `+${amount} XP`;
  const rect = targetEl?.getBoundingClientRect() || { left: window.innerWidth / 2, top: window.innerHeight / 2 };
  el.style.left = (rect.left + (rect.width || 0) / 2) + 'px';
  el.style.top = (rect.top - 20) + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1600);
};

// ---- Navigation ----

const SECTIONS = ['dashboard', 'workout', 'nutrition', 'body', 'more'];

let currentSection = 'dashboard';

window.navigateTo = function(section) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const el = document.getElementById('section-' + section);
  if (el) el.classList.add('active');

  const nav = document.querySelector(`.nav-item[data-section="${section}"]`);
  if (nav) nav.classList.add('active');

  currentSection = section;

  // Trigger section refresh
  window.dispatchEvent(new CustomEvent('sectionShown', { detail: section }));
};

// ---- Modals / Sheets ----

window.openSheet = function(sheetId) {
  const sheet = document.getElementById(sheetId);
  const backdrop = document.getElementById('modal-backdrop');
  if (!sheet || !backdrop) return;
  backdrop.classList.add('open');
  sheet.classList.add('open');
  backdrop.onclick = () => closeSheet(sheetId);
};

window.closeSheet = function(sheetId) {
  const sheet = document.getElementById(sheetId);
  const backdrop = document.getElementById('modal-backdrop');
  if (sheet) sheet.classList.remove('open');
  if (backdrop) backdrop.classList.remove('open');
};

// ---- Number helpers ----

window.round1 = x => Math.round(x * 10) / 10;
window.round  = x => Math.round(x);

window.fmtWeight = (kg, unit = 'kg') => {
  if (unit === 'lbs') return round1(kg * 2.20462) + ' lbs';
  return round1(kg) + ' kg';
};

// ---- Date helpers ----

window.today = () => new Date().toISOString().split('T')[0];

window.dayName = (dateStr) => {
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  return days[new Date(dateStr + 'T12:00:00').getDay()];
};

window.formatDate = (dateStr) => {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
};

// ---- Navy Body Fat Formula ----

window.calcNavyBF = function(sex, heightCm, neckCm, waistCm, hipsCm = 0) {
  if (!heightCm || !neckCm || !waistCm) return null;
  if (sex === 'male') {
    const bf = 495 / (1.0324 - 0.19077 * Math.log10(waistCm - neckCm) + 0.15456 * Math.log10(heightCm)) - 450;
    return Math.max(0, round1(bf));
  } else {
    if (!hipsCm) return null;
    const bf = 495 / (1.29579 - 0.35004 * Math.log10(waistCm + hipsCm - neckCm) + 0.22100 * Math.log10(heightCm)) - 450;
    return Math.max(0, round1(bf));
  }
};

// ---- TDEE Calculator ----

window.calcTDEE = function(profile) {
  const { sex, age, heightCm, weightKg, activityLevel } = profile;
  if (!sex || !age || !heightCm || !weightKg) return 2000;

  let bmr;
  if (sex === 'male') {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  }

  const multipliers = {
    sedentary:         1.2,
    lightly_active:    1.375,
    moderately_active: 1.55,
    very_active:       1.725,
  };

  const mult = multipliers[activityLevel] || 1.55;
  return Math.round(bmr * mult);
};

// ---- Macro targets ----

window.calcMacroTargets = function(profile, isTrainingDay = true) {
  const tdee = calcTDEE(profile);
  const goal = profile.goal;
  const weightKg = profile.weightKg;

  let calorieTarget = tdee;
  if (goal === 'bulk') {
    calorieTarget = isTrainingDay ? Math.round(tdee * 1.15) : Math.round(tdee * 1.05);
  } else if (goal === 'cut') {
    calorieTarget = isTrainingDay ? Math.round(tdee * 1.05) : Math.round(tdee * 0.8);
  } else if (goal === 'recomp') {
    calorieTarget = isTrainingDay ? Math.round(tdee * 1.05) : Math.round(tdee * 0.95);
  } else {
    calorieTarget = isTrainingDay ? Math.round(tdee * 1.15) : Math.round(tdee * 0.9);
  }

  // Protein: 2.2g/kg for strength, 2g/kg for bulk/cut, 1.8g/kg for endurance
  const proteinPerKg = goal === 'strength' ? 2.2 : goal === 'endurance' ? 1.8 : 2.0;
  const protein = Math.round(weightKg * proteinPerKg);

  const proteinCals = protein * 4;
  const fatCals = Math.round(calorieTarget * 0.25);
  const fat = Math.round(fatCals / 9);
  const carbs = Math.round((calorieTarget - proteinCals - fatCals) / 4);

  // Water target: 35ml/kg
  const waterMl = Math.round(weightKg * 35);

  return { calories: calorieTarget, protein, carbs, fat, waterMl };
};

// ---- Epley 1RM formula ----

window.epley1RM = (weight, reps) => {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
};

// ---- Locked In Score ----

window.calcLockedInScore = async function() {
  const [todayWorkout, todayNutrition, todayRecovery, todayCardio, profile, challenges] = await Promise.all([
    DB.getTodayWorkout(),
    DB.getTodayNutrition(),
    DB.getTodayRecovery(),
    DB.getTodayCardio(),
    DB.getProfile(),
    DB.getActiveChallenges(),
  ]);

  if (!profile) return { total: 0, breakdown: [] };

  const macroTargets = calcMacroTargets(profile, !!todayWorkout);
  const breakdown = [];
  let total = 0;

  // Protein (20pts)
  const todayMacros = calcTodayMacros(todayNutrition);
  const proteinHit = todayMacros.protein >= macroTargets.protein * 0.9;
  breakdown.push({
    label: 'Daily protein', pts: proteinHit ? 20 : Math.round(20 * todayMacros.protein / macroTargets.protein),
    max: 20, done: proteinHit, icon: '🥩',
    tip: proteinHit ? 'Protein target hit!' : `Need ${macroTargets.protein - todayMacros.protein}g more protein`,
  });
  if (proteinHit) total += 20;
  else total += Math.round(20 * Math.min(todayMacros.protein / macroTargets.protein, 1));

  // All macros (10pts bonus)
  const allMacros = proteinHit &&
    todayMacros.carbs >= macroTargets.carbs * 0.85 && todayMacros.carbs <= macroTargets.carbs * 1.15 &&
    todayMacros.fat >= macroTargets.fat * 0.85 && todayMacros.fat <= macroTargets.fat * 1.15 &&
    todayMacros.calories >= macroTargets.calories * 0.9 && todayMacros.calories <= macroTargets.calories * 1.1;
  breakdown.push({ label: 'All macros on target', pts: allMacros ? 10 : 0, max: 10, done: allMacros, icon: '🎯',
    tip: allMacros ? 'Perfect macros!' : 'Hit all macro targets for bonus points' });
  if (allMacros) total += 10;

  // Workout (20pts)
  const workoutDone = todayWorkout && (todayWorkout.exercises || []).length > 0 && todayWorkout.completed;
  breakdown.push({ label: 'Workout completed', pts: workoutDone ? 20 : 0, max: 20, done: workoutDone, icon: '🏋️',
    tip: workoutDone ? 'Workout done!' : 'Complete today\'s workout' });
  if (workoutDone) total += 20;

  // Sleep (10pts)
  const sleepHit = todayRecovery && todayRecovery.sleep >= 7;
  breakdown.push({ label: 'Sleep 7h+', pts: sleepHit ? 10 : 0, max: 10, done: sleepHit, icon: '😴',
    tip: sleepHit ? `${todayRecovery.sleep}h sleep logged` : 'Log 7+ hours of sleep' });
  if (sleepHit) total += 10;

  // Water (10pts)
  const waterHit = todayNutrition && (todayNutrition.water || 0) >= macroTargets.waterMl * 0.9;
  const waterPct = todayNutrition ? Math.min((todayNutrition.water || 0) / macroTargets.waterMl, 1) : 0;
  breakdown.push({ label: 'Water target', pts: waterHit ? 10 : Math.round(10 * waterPct), max: 10, done: waterHit, icon: '💧',
    tip: waterHit ? 'Water target hit!' : `Drink ${Math.round((macroTargets.waterMl - (todayNutrition?.water || 0)) / 1000 * 10) / 10}L more` });
  total += waterHit ? 10 : Math.round(10 * waterPct);

  // Fasting (10pts)
  let fastingPts = 0;
  if (profile.fastingProtocol?.type && profile.fastingProtocol.type !== 'none') {
    const fastingDone = todayNutrition?.fastingCompleted;
    fastingPts = fastingDone ? 10 : 0;
    breakdown.push({ label: 'Fasting adherence', pts: fastingPts, max: 10, done: fastingDone, icon: '⏱️',
      tip: fastingDone ? 'Fasting window completed!' : 'Complete your fasting window' });
    total += fastingPts;
  }

  // Cardio (5pts)
  const cardioDone = todayCardio && (todayCardio.entries || []).length > 0;
  breakdown.push({ label: 'Cardio done', pts: cardioDone ? 5 : 0, max: 5, done: cardioDone, icon: '🏃',
    tip: cardioDone ? 'Cardio logged!' : 'Log a cardio session' });
  if (cardioDone) total += 5;

  // Recovery (5pts)
  const recoveryLogged = !!todayRecovery;
  breakdown.push({ label: 'Recovery logged', pts: recoveryLogged ? 5 : 0, max: 5, done: recoveryLogged, icon: '🔄',
    tip: recoveryLogged ? 'Recovery logged!' : 'Log your morning recovery check-in' });
  if (recoveryLogged) total += 5;

  // Readiness (5pts)
  const readinessLogged = todayRecovery && todayRecovery.readiness;
  breakdown.push({ label: 'Readiness logged', pts: readinessLogged ? 5 : 0, max: 5, done: readinessLogged, icon: '💪',
    tip: readinessLogged ? `Readiness: ${todayRecovery.readiness}/10` : 'Log your readiness score' });
  if (readinessLogged) total += 5;

  // Mini challenge (5pts)
  const challengeProgress = challenges.some(c => c.progress >= c.target * 0.5);
  breakdown.push({ label: 'Challenge progress', pts: challengeProgress ? 5 : 0, max: 5, done: challengeProgress, icon: '⚡',
    tip: challengeProgress ? 'Challenge on track!' : 'Make progress on weekly challenge' });
  if (challengeProgress) total += 5;

  return { total: Math.min(100, total), breakdown };
};

function calcTodayMacros(n) {
  let cal = 0, prot = 0, carbs = 0, fat = 0;
  for (const meal of (n?.meals || [])) {
    for (const food of (meal.foods || [])) {
      cal   += food.calories || 0;
      prot  += food.protein  || 0;
      carbs += food.carbs    || 0;
      fat   += food.fat      || 0;
    }
  }
  return { calories: Math.round(cal), protein: Math.round(prot), carbs: Math.round(carbs), fat: Math.round(fat) };
}
window.calcTodayMacros = calcTodayMacros;

// ---- Strength standards ----

window.STRENGTH_STANDARDS = {
  bench: [
    { level: 'Beginner',     mult: 0.5 },
    { level: 'Novice',       mult: 0.75 },
    { level: 'Intermediate', mult: 1.0 },
    { level: 'Advanced',     mult: 1.5 },
    { level: 'Elite',        mult: 1.75 },
  ],
  squat: [
    { level: 'Beginner',     mult: 0.75 },
    { level: 'Novice',       mult: 1.0 },
    { level: 'Intermediate', mult: 1.5 },
    { level: 'Advanced',     mult: 2.0 },
    { level: 'Elite',        mult: 2.5 },
  ],
  deadlift: [
    { level: 'Beginner',     mult: 1.0 },
    { level: 'Novice',       mult: 1.5 },
    { level: 'Intermediate', mult: 2.0 },
    { level: 'Advanced',     mult: 2.5 },
    { level: 'Elite',        mult: 3.0 },
  ],
  ohp: [
    { level: 'Beginner',     mult: 0.35 },
    { level: 'Novice',       mult: 0.5 },
    { level: 'Intermediate', mult: 0.65 },
    { level: 'Advanced',     mult: 0.9 },
    { level: 'Elite',        mult: 1.1 },
  ],
};

window.getLiftStandard = function(lift, weightKg, currentORM) {
  const standards = STRENGTH_STANDARDS[lift];
  if (!standards || !weightKg || !currentORM) return null;
  const bodyMultiples = currentORM / weightKg;
  let level = 'Below Beginner';
  for (const s of standards) {
    if (bodyMultiples >= s.mult) level = s.level;
  }
  return { level, bodyMultiples: round1(bodyMultiples), standards };
};

// ---- Volume landmarks (weekly sets per muscle) ----

window.VOLUME_LANDMARKS = {
  chest:     { mv: 8,  mev: 10, mav: 20, mrv: 22 },
  back:      { mv: 10, mev: 14, mav: 22, mrv: 25 },
  quads:     { mv: 8,  mev: 12, mav: 20, mrv: 24 },
  hamstrings:{ mv: 6,  mev: 10, mav: 16, mrv: 20 },
  shoulders: { mv: 8,  mev: 12, mav: 20, mrv: 22 },
  biceps:    { mv: 6,  mev: 10, mav: 18, mrv: 26 },
  triceps:   { mv: 6,  mev: 10, mav: 18, mrv: 22 },
  glutes:    { mv: 6,  mev: 12, mav: 20, mrv: 24 },
  calves:    { mv: 8,  mev: 12, mav: 16, mrv: 20 },
  core:      { mv: 8,  mev: 12, mav: 20, mrv: 25 },
};

// ---- Plate calculator ----

window.calcPlates = function(targetKg, barKg = 20) {
  const sideKg = (targetKg - barKg) / 2;
  if (sideKg < 0) return null;
  const plateWeights = [25, 20, 15, 10, 5, 2.5, 1.25];
  const plates = [];
  let remaining = sideKg;
  for (const p of plateWeights) {
    const count = Math.floor(remaining / p);
    if (count > 0) {
      plates.push({ weight: p, count });
      remaining -= p * count;
      remaining = Math.round(remaining * 100) / 100;
    }
  }
  return plates;
};

// ---- App boot ----

window.addEventListener('DOMContentLoaded', async () => {
  // Load settings
  try {
    const allSettings = await DB.getAllSettings();
    window._settings = allSettings;
  } catch (e) { window._settings = {}; }

  // Detect Ollama
  AI.detectOllama().then(found => {
    if (found) toast('Ollama detected — local AI active', 'success');
  });

  // Check onboarding
  const profile = await DB.getProfile().catch(() => null);

  const splash = document.getElementById('splash');
  const onboarding = document.getElementById('onboarding');

  if (!profile || !profile.onboarded) {
    if (splash) { splash.style.opacity = '0'; setTimeout(() => splash.remove(), 400); }
    if (onboarding) { onboarding.style.display = 'flex'; }
    Onboarding.init();
  } else {
    // Update streak
    await DB.updateStreak();

    // Show main app
    if (splash) { splash.style.opacity = '0'; setTimeout(() => splash.remove(), 400); }

    document.getElementById('app').style.display = 'flex';

    // Init all modules
    await initApp(profile);

    // Navigate based on hash
    const hash = window.location.hash.replace('#', '');
    navigateTo(['workout','nutrition','body','more'].includes(hash) ? hash : 'dashboard');
  }
});

async function initApp(profile) {
  // Update header
  const streakBadge = document.getElementById('streak-count');
  if (streakBadge) {
    const streak = await DB.getStreak();
    streakBadge.textContent = streak.current;
  }

  // Init each module
  try { Dashboard.init(profile); } catch(e) { console.error('Dashboard init:', e); }
  try { WorkoutModule.init(profile); } catch(e) { console.error('Workout init:', e); }
  try { NutritionModule.init(profile); } catch(e) { console.error('Nutrition init:', e); }
  try { BodyModule.init(profile); } catch(e) { console.error('Body init:', e); }
  try { MoreModule.init(profile); } catch(e) { console.error('More init:', e); }
  try { SettingsModule.init(profile); } catch(e) { console.error('Settings init:', e); }

  // PWA install prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window._installPrompt = e;
    const installBtn = document.getElementById('install-pwa-btn');
    if (installBtn) installBtn.style.display = 'flex';
  });
}

// Refresh streak in header when anything is logged
window.refreshStreakHeader = async function() {
  try {
    await DB.updateStreak();
    const streak = await DB.getStreak();
    const el = document.getElementById('streak-count');
    if (el) el.textContent = streak.current;
  } catch(e) {}
};
