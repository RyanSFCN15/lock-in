/* ============================================================
   LOCK IN — IndexedDB Layer
   ============================================================ */

const DB_NAME = 'lock-in-db';
const DB_VERSION = 1;

const STORES = {
  profile:      { keyPath: 'id' },
  workoutLogs:  { keyPath: 'id' },
  nutritionLogs:{ keyPath: 'id' },
  cardioLogs:   { keyPath: 'id' },
  recoveryLogs: { keyPath: 'id' },
  measurements: { keyPath: 'id' },
  muscleXP:     { keyPath: 'muscle' },
  badges:       { keyPath: 'id' },
  streaks:      { keyPath: 'id' },
  challenges:   { keyPath: 'id' },
  settings:     { keyPath: 'key' },
  foodCache:    { keyPath: 'id' },
  exercises:    { keyPath: 'name' },
};

window.DB = (() => {
  let _db = null;

  function open() {
    return new Promise((resolve, reject) => {
      if (_db) return resolve(_db);
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        for (const [name, opts] of Object.entries(STORES)) {
          if (!db.objectStoreNames.contains(name)) {
            const store = db.createObjectStore(name, opts);
            if (name === 'workoutLogs' || name === 'nutritionLogs' ||
                name === 'cardioLogs' || name === 'recoveryLogs' ||
                name === 'measurements') {
              store.createIndex('date', 'date', { unique: false });
            }
          }
        }
      };

      req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
      req.onerror   = (e) => reject(e.target.error);
    });
  }

  function tx(storeName, mode = 'readonly') {
    return _db.transaction(storeName, mode).objectStore(storeName);
  }

  // ---- Generic CRUD ----

  async function get(store, key) {
    await open();
    return new Promise((res, rej) => {
      const r = tx(store).get(key);
      r.onsuccess = () => res(r.result);
      r.onerror   = () => rej(r.error);
    });
  }

  async function getAll(store) {
    await open();
    return new Promise((res, rej) => {
      const r = tx(store).getAll();
      r.onsuccess = () => res(r.result);
      r.onerror   = () => rej(r.error);
    });
  }

  async function put(store, value) {
    await open();
    return new Promise((res, rej) => {
      const r = tx(store, 'readwrite').put(value);
      r.onsuccess = () => res(r.result);
      r.onerror   = () => rej(r.error);
    });
  }

  async function del(store, key) {
    await open();
    return new Promise((res, rej) => {
      const r = tx(store, 'readwrite').delete(key);
      r.onsuccess = () => res();
      r.onerror   = () => rej(r.error);
    });
  }

  async function getByIndex(store, indexName, value) {
    await open();
    return new Promise((res, rej) => {
      const r = tx(store).index(indexName).getAll(value);
      r.onsuccess = () => res(r.result);
      r.onerror   = () => rej(r.error);
    });
  }

  async function clear(store) {
    await open();
    return new Promise((res, rej) => {
      const r = tx(store, 'readwrite').clear();
      r.onsuccess = () => res();
      r.onerror   = () => rej(r.error);
    });
  }

  // ---- Profile ----

  async function getProfile() {
    return get('profile', 'main');
  }

  async function saveProfile(data) {
    return put('profile', { ...data, id: 'main' });
  }

  // ---- Settings ----

  async function getSetting(key, defaultVal = null) {
    const row = await get('settings', key);
    return row ? row.value : defaultVal;
  }

  async function setSetting(key, value) {
    return put('settings', { key, value });
  }

  async function getAllSettings() {
    const rows = await getAll('settings');
    return rows.reduce((acc, r) => { acc[r.key] = r.value; return acc; }, {});
  }

  // ---- Dated logs helpers ----

  function todayStr() {
    return new Date().toISOString().split('T')[0];
  }

  async function getLogForDate(store, date) {
    const rows = await getByIndex(store, 'date', date);
    return rows[0] || null;
  }

  async function getLogsRange(store, startDate, endDate) {
    const all = await getAll(store);
    return all.filter(r => r.date >= startDate && r.date <= endDate)
              .sort((a, b) => a.date.localeCompare(b.date));
  }

  async function getLast7Days(store) {
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }
    const all = await getAll(store);
    return all.filter(r => dates.includes(r.date));
  }

  // ---- Workout Logs ----

  async function getTodayWorkout() {
    return getLogForDate('workoutLogs', todayStr());
  }

  async function saveWorkoutLog(log) {
    const existing = await getTodayWorkout();
    const entry = {
      ...log,
      id: existing?.id || ('w-' + Date.now()),
      date: todayStr(),
    };
    return put('workoutLogs', entry);
  }

  async function getAllWorkouts() {
    return getAll('workoutLogs');
  }

  // ---- Nutrition Logs ----

  async function getTodayNutrition() {
    return getLogForDate('nutritionLogs', todayStr());
  }

  async function saveNutritionLog(log) {
    const existing = await getTodayNutrition();
    const entry = {
      ...log,
      id: existing?.id || ('n-' + Date.now()),
      date: todayStr(),
    };
    return put('nutritionLogs', entry);
  }

  // ---- Cardio Logs ----

  async function getTodayCardio() {
    return getLogForDate('cardioLogs', todayStr());
  }

  async function saveCardioLog(log) {
    const existing = await getTodayCardio();
    const entries = existing?.entries || [];
    entries.push({ ...log, id: 'c-' + Date.now() });
    return put('cardioLogs', {
      id: existing?.id || ('cl-' + Date.now()),
      date: todayStr(),
      entries,
    });
  }

  // ---- Recovery Logs ----

  async function getTodayRecovery() {
    return getLogForDate('recoveryLogs', todayStr());
  }

  async function saveRecoveryLog(log) {
    const existing = await getTodayRecovery();
    const entry = {
      ...log,
      id: existing?.id || ('r-' + Date.now()),
      date: todayStr(),
    };
    return put('recoveryLogs', entry);
  }

  // ---- Measurements ----

  async function saveMeasurement(data) {
    const entry = { ...data, id: 'm-' + Date.now(), date: todayStr() };
    return put('measurements', entry);
  }

  async function getAllMeasurements() {
    const all = await getAll('measurements');
    return all.sort((a, b) => a.date.localeCompare(b.date));
  }

  async function getLatestMeasurement() {
    const all = await getAllMeasurements();
    return all.length ? all[all.length - 1] : null;
  }

  // ---- Muscle XP ----

  async function getMuscleXP(muscle) {
    return get('muscleXP', muscle);
  }

  async function getAllMuscleXP() {
    return getAll('muscleXP');
  }

  async function addMuscleXP(muscle, xpToAdd) {
    const existing = await getMuscleXP(muscle) || { muscle, xp: 0, level: 1 };
    const newXP = existing.xp + xpToAdd;
    const newLevel = xpToLevel(newXP);
    const leveled = newLevel > existing.level;
    const updated = { ...existing, xp: newXP, level: newLevel };
    await put('muscleXP', updated);
    return { ...updated, leveled, prevLevel: existing.level };
  }

  function xpToLevel(xp) {
    const thresholds = [0, 500, 1500, 3500, 7000, 12000, 20000];
    let level = 1;
    for (let i = 0; i < thresholds.length; i++) {
      if (xp >= thresholds[i]) level = i + 1;
    }
    return Math.min(level, 7);
  }

  function levelName(level) {
    return ['', 'Novice', 'Trained', 'Intermediate', 'Advanced', 'Elite', 'Swole', 'Swole God'][level] || 'Legend';
  }

  function levelXPThreshold(level) {
    return [0, 0, 500, 1500, 3500, 7000, 12000, 20000][level] || 20000;
  }

  function nextLevelXP(level) {
    return [0, 500, 1500, 3500, 7000, 12000, 20000, 30000][level] || 30000;
  }

  // ---- Badges ----

  async function getAllBadges() {
    return getAll('badges');
  }

  async function awardBadge(id, name, icon, desc) {
    const existing = await get('badges', id);
    if (existing) return false;
    await put('badges', { id, name, icon, desc, earnedAt: new Date().toISOString() });
    return true;
  }

  // ---- Streaks ----

  async function getStreak() {
    const row = await get('streaks', 'main');
    return row || { id: 'main', current: 0, longest: 0, lastDate: null, freezes: 0 };
  }

  async function updateStreak() {
    const streak = await getStreak();
    const today = todayStr();
    const yesterday = (() => {
      const d = new Date(); d.setDate(d.getDate() - 1);
      return d.toISOString().split('T')[0];
    })();

    if (streak.lastDate === today) return streak;

    let newCurrent = streak.current;
    let newFreezes = streak.freezes;

    if (streak.lastDate === yesterday) {
      newCurrent += 1;
    } else if (streak.lastDate && streak.lastDate < yesterday) {
      const daysMissed = Math.floor((new Date(today) - new Date(streak.lastDate)) / 86400000) - 1;
      if (daysMissed >= 1 && newFreezes > 0) {
        newFreezes -= 1;
        newCurrent += 1;
      } else {
        newCurrent = 1;
      }
    } else {
      newCurrent = 1;
    }

    const updated = {
      ...streak,
      current: newCurrent,
      longest: Math.max(newCurrent, streak.longest),
      lastDate: today,
      freezes: newFreezes,
    };
    await put('streaks', updated);
    return updated;
  }

  // ---- Challenges ----

  async function getActiveChallenges() {
    const all = await getAll('challenges');
    const today = todayStr();
    return all.filter(c => c.endDate >= today);
  }

  async function saveChallenge(challenge) {
    return put('challenges', challenge);
  }

  // ---- All-time PRs ----

  async function getPRs() {
    const workouts = await getAllWorkouts();
    const prs = {};
    for (const w of workouts) {
      for (const ex of (w.exercises || [])) {
        for (const set of (ex.sets || [])) {
          if (!set.weight || !set.reps) continue;
          const orm = Math.round(set.weight * (1 + set.reps / 30));
          if (!prs[ex.name] || orm > prs[ex.name].orm) {
            prs[ex.name] = { orm, weight: set.weight, reps: set.reps, date: w.date };
          }
        }
      }
    }
    return prs;
  }

  // ---- Lifetime stats ----

  async function getLifetimeStats() {
    const [workouts, nutrition, cardio, recovery, measurements, streak, badges, muscleXP] = await Promise.all([
      getAllWorkouts(),
      getAll('nutritionLogs'),
      getAll('cardioLogs'),
      getAll('recoveryLogs'),
      getAllMeasurements(),
      getStreak(),
      getAllBadges(),
      getAllMuscleXP(),
    ]);

    let totalSets = 0, totalReps = 0, totalWeight = 0, totalFasts = 0, totalWater = 0, totalMeals = 0;

    for (const w of workouts) {
      for (const ex of (w.exercises || [])) {
        for (const set of (ex.sets || [])) {
          if (set.completed) {
            totalSets++;
            totalReps += set.reps || 0;
            totalWeight += (set.weight || 0) * (set.reps || 0);
          }
        }
      }
    }

    for (const n of nutrition) {
      totalWater += n.water || 0;
      totalMeals += (n.meals || []).reduce((a, m) => a + (m.foods || []).length, 0);
      if (n.fastingCompleted) totalFasts++;
    }

    let totalCalorieBurned = 0, totalDistanceKm = 0;
    for (const c of cardio) {
      for (const e of (c.entries || [])) {
        totalCalorieBurned += e.caloriesBurned || 0;
        totalDistanceKm += e.distanceKm || 0;
      }
    }

    const totalXP = muscleXP.reduce((a, m) => a + m.xp, 0);
    const startDate = workouts.length ? workouts.sort((a,b)=>a.date.localeCompare(b.date))[0].date : todayStr();
    const daysSinceStart = Math.floor((new Date() - new Date(startDate)) / 86400000);

    return {
      totalWorkouts: workouts.length,
      totalSets,
      totalReps,
      totalWeightLbs: Math.round(totalWeight),
      totalWeightKg: Math.round(totalWeight * 0.453592),
      totalFasts,
      totalWaterL: (totalWater / 1000).toFixed(1),
      totalMeals,
      totalCalorieBurned: Math.round(totalCalorieBurned),
      totalDistanceKm: totalDistanceKm.toFixed(1),
      totalXP,
      totalBadges: badges.length,
      longestStreak: streak.longest,
      currentStreak: streak.current,
      daysSinceStart,
      startDate,
    };
  }

  // ---- Export / Import ----

  async function exportAll() {
    const stores = Object.keys(STORES);
    const data = {};
    for (const s of stores) {
      data[s] = await getAll(s);
    }
    return JSON.stringify(data, null, 2);
  }

  async function importAll(jsonStr) {
    const data = JSON.parse(jsonStr);
    for (const [storeName, rows] of Object.entries(data)) {
      if (!STORES[storeName]) continue;
      await clear(storeName);
      for (const row of rows) {
        await put(storeName, row);
      }
    }
  }

  // ---- Context builder for AI ----

  async function buildAIContext() {
    const [profile, streak, todayWorkout, todayNutrition, todayRecovery, last7Workouts, measurements] = await Promise.all([
      getProfile(),
      getStreak(),
      getTodayWorkout(),
      getTodayNutrition(),
      getTodayRecovery(),
      getLast7Days('workoutLogs'),
      getAllMeasurements(),
    ]);

    const latestMeasurement = measurements.length ? measurements[measurements.length - 1] : null;

    return {
      profile,
      streak: streak.current,
      todayWorkout,
      todayNutrition,
      todayRecovery,
      last7Workouts,
      latestMeasurement,
    };
  }

  return {
    open,
    get, getAll, put, del, getByIndex, clear,
    getProfile, saveProfile,
    getSetting, setSetting, getAllSettings,
    todayStr,
    getTodayWorkout, saveWorkoutLog, getAllWorkouts,
    getTodayNutrition, saveNutritionLog,
    getTodayCardio, saveCardioLog,
    getTodayRecovery, saveRecoveryLog,
    saveMeasurement, getAllMeasurements, getLatestMeasurement,
    getMuscleXP, getAllMuscleXP, addMuscleXP,
    xpToLevel, levelName, levelXPThreshold, nextLevelXP,
    getAllBadges, awardBadge,
    getStreak, updateStreak,
    getActiveChallenges, saveChallenge,
    getPRs,
    getLifetimeStats,
    exportAll, importAll,
    buildAIContext,
    getLogsRange, getLast7Days,
  };
})();
