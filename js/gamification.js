/* ============================================================
   LOCK IN — Gamification: XP, Levels, Badges, Challenges, Streaks
   ============================================================ */

window.Gamification = (() => {

  // ---- Badge definitions ----
  const BADGE_DEFS = {
    // ---- Getting Started ----
    first_login:      { cat:'Getting Started', name: 'Day One',           icon: '🔑', desc: 'Started the journey',                    how: 'Complete onboarding'              },
    first_workout:    { cat:'Getting Started', name: 'First Rep',          icon: '💪', desc: 'Completed your first workout',           how: 'Log and finish any workout'       },
    measurement_log:  { cat:'Getting Started', name: 'Self Aware',         icon: '📏', desc: 'Logged your first measurements',         how: 'Log measurements in Body tab'     },
    // ---- Streaks ----
    streak_7:         { cat:'Streaks', name: 'Week Warrior',       icon: '🔥', desc: '7-day logging streak',                  how: 'Log activity 7 days in a row'     },
    streak_14:        { cat:'Streaks', name: 'Two Weeks Strong',   icon: '⚡', desc: '14-day streak',                         how: 'Log activity 14 days in a row'    },
    streak_30:        { cat:'Streaks', name: 'Month Locked In',    icon: '💎', desc: '30-day streak',                         how: 'Log activity 30 days in a row'    },
    streak_60:        { cat:'Streaks', name: 'Two Month Beast',    icon: '👑', desc: '60-day streak',                         how: 'Log activity 60 days in a row'    },
    streak_90:        { cat:'Streaks', name: '90 Day Legend',      icon: '🌟', desc: '90-day streak',                         how: 'Log activity 90 days in a row'    },
    streak_180:       { cat:'Streaks', name: 'Half Year',          icon: '🌙', desc: '180-day streak',                        how: 'Log activity 180 days in a row'   },
    streak_365:       { cat:'Streaks', name: 'Full Year',          icon: '☀️', desc: '365-day streak',                        how: 'Log activity every day for a year'},
    // ---- Volume ----
    workout_10:       { cat:'Volume', name: '10 Workouts',        icon: '🔟', desc: 'Completed 10 workouts',                  how: 'Finish 10 logged workouts'        },
    workout_50:       { cat:'Volume', name: '50 Workouts',        icon: '5️⃣0️⃣', desc: 'Completed 50 workouts',              how: 'Finish 50 logged workouts'        },
    workout_100:      { cat:'Volume', name: 'Century',            icon: '💯', desc: 'Completed 100 workouts',                 how: 'Finish 100 logged workouts'       },
    macro_week:       { cat:'Volume', name: 'Macro Machine',      icon: '🎯', desc: 'Hit protein target 7 days in a row',    how: 'Track nutrition daily for a week' },
    budget_week:      { cat:'Volume', name: 'Budget Beast',       icon: '💰', desc: 'Completed a full budget meal week',     how: 'Stay in budget mode for 7 days'   },
    challenge_done:   { cat:'Volume', name: 'Challenge Complete', icon: '⚡', desc: 'Completed a weekly challenge',          how: 'Finish any active weekly challenge'},
    perfect_day:      { cat:'Volume', name: 'Perfect Day',        icon: '✅', desc: 'Hit 100% Locked In score',              how: 'Complete all daily goals in one day'},
    // ---- Strength ----
    first_pr:         { cat:'Strength', name: 'Personal Record',  icon: '🏆', desc: 'Hit your first PR',                    how: 'Beat your best 1RM on any lift'   },
    pr_10:            { cat:'Strength', name: 'PR Collector',     icon: '🥇', desc: 'Logged 10 personal records',           how: 'Hit 10 PRs across any exercises'  },
    pr_50:            { cat:'Strength', name: 'PR Machine',       icon: '🎰', desc: 'Logged 50 personal records',           how: 'Hit 50 PRs across any exercises'  },
    bench_100kg:      { cat:'Strength', name: '100kg Bench',      icon: '💪', desc: 'Benched 100kg',                        how: 'Complete a bench set at 100kg+'   },
    bench_140kg:      { cat:'Strength', name: '140kg Bench',      icon: '🦍', desc: 'Benched 140kg — absolute unit',        how: 'Complete a bench set at 140kg+'   },
    bw_bench:         { cat:'Strength', name: 'Bodyweight Bench', icon: '⚖️', desc: 'Benched your own bodyweight',          how: 'Bench ≥ your current bodyweight'  },
    bw2_squat:        { cat:'Strength', name: '2× BW Squat',      icon: '🦵', desc: 'Squatted 2× your bodyweight',          how: 'Squat ≥ 2× your current bodyweight'},
    bw3_deadlift:     { cat:'Strength', name: '3× BW Deadlift',   icon: '🔱', desc: 'Deadlifted 3× your bodyweight',        how: 'Deadlift ≥ 3× your current bodyweight'},
    elite_bench:      { cat:'Strength', name: 'Bench Elite',      icon: '🏋️', desc: 'Reached elite bench press standard',  how: 'Bench 1.5× bodyweight (elite level)'},
    elite_squat:      { cat:'Strength', name: 'Squat Elite',      icon: '🏅', desc: 'Reached elite squat standard',        how: 'Squat 2× bodyweight (elite level)'},
    elite_deadlift:   { cat:'Strength', name: 'Deadlift Elite',   icon: '🥈', desc: 'Reached elite deadlift standard',     how: 'Deadlift 2.5× bodyweight (elite)' },
    // ---- Muscle Levels ----
    muscle_level_3:   { cat:'Muscle Levels', name: 'Intermediate',   icon: '📈', desc: 'Reached Intermediate on a muscle', how: 'Earn 500+ XP on any muscle group' },
    muscle_level_5:   { cat:'Muscle Levels', name: 'Elite Muscle',   icon: '💥', desc: 'Hit Elite level on a muscle',      how: 'Earn 2000+ XP on any muscle group'},
    muscle_level_7:   { cat:'Muscle Levels', name: 'Swole God',      icon: '⚜️', desc: 'Reached Swole God tier',           how: 'Earn 5000+ XP on any muscle group'},
  };

  // ---- Award badge ----
  async function awardBadge(id, name, icon, desc) {
    const awarded = await DB.awardBadge(id, name || BADGE_DEFS[id]?.name, icon || BADGE_DEFS[id]?.icon, desc || BADGE_DEFS[id]?.desc);
    if (awarded) {
      const badgeDef = BADGE_DEFS[id] || { name, icon, desc };
      showBadgePopup(badgeDef);
      if (AI.isAvailable()) {
        AI.getBadgeMessage(badgeDef.name).then(msg => {
          if (msg) toast(`${badgeDef.icon} ${msg.slice(0, 100)}`, 'gold', 5000);
        });
      }
    }
    return awarded;
  }

  function showBadgePopup(badge) {
    toast(`${badge.icon} BADGE UNLOCKED: ${badge.name}`, 'gold', 4000);
  }

  // ---- Award XP to muscle ----
  async function awardMuscleXP(muscle, amount, sourceEl = null) {
    const result = await DB.addMuscleXP(muscle, amount);
    if (sourceEl) showXPFloat(amount, sourceEl);
    else {
      const floatEl = document.querySelector('#section-workout') || document.body;
      showXPFloat(amount, floatEl);
    }

    if (result.leveled) {
      toast(`${muscle} leveled up! ${DB.levelName(result.level)} 🎉`, 'gold', 4000);
      await awardBadge(`muscle_level_${result.level}`);
      if (AI.isAvailable()) {
        AI.getLevelUpMessage(muscle, result.level).then(msg => {
          if (msg) toast(msg.slice(0, 120), 'gold', 5000);
        });
      }
    }
    return result;
  }

  // ---- Check streak badges ----
  async function checkStreakBadges(streakDays) {
    const milestones = [7, 14, 30, 60, 90, 180, 365];
    for (const m of milestones) {
      if (streakDays >= m) {
        await awardBadge(`streak_${m}`);
      }
    }
  }

  // ---- Check workout badges ----
  async function checkWorkoutBadges() {
    const workouts = await DB.getAllWorkouts();
    const count = workouts.length;
    if (count >= 1)   await awardBadge('first_workout');
    if (count >= 10)  await awardBadge('workout_10');
    if (count >= 50)  await awardBadge('workout_50');
    if (count >= 100) await awardBadge('workout_100');
  }

  // ---- Check PR badges ----
  async function checkPRBadge() {
    await awardBadge('first_pr');
    // Track PR count
    const prs = await DB.getPRs();
    const totalPRs = Object.keys(prs).length;
    if (totalPRs >= 10) await awardBadge('pr_10');
    if (totalPRs >= 50) await awardBadge('pr_50');
  }

  // ---- Check strength badges against set ----
  async function checkStrengthBadges(exerciseName, weightKg, reps, profile) {
    const orm = epley1RM ? epley1RM(weightKg, reps) : weightKg * (1 + reps / 30);
    const bw = profile?.weightKg || 80;
    const liftLower = exerciseName.toLowerCase();

    if (liftLower.includes('bench')) {
      if (weightKg >= 100) await awardBadge('bench_100kg');
      if (weightKg >= 140) await awardBadge('bench_140kg');
      if (orm >= bw)       await awardBadge('bw_bench');
      if (orm >= bw * 1.5) await awardBadge('elite_bench');
    }
    if (liftLower.includes('squat') && !liftLower.includes('front')) {
      if (orm >= bw * 2)   await awardBadge('bw2_squat');
      if (orm >= bw * 2)   await awardBadge('elite_squat');
    }
    if (liftLower.includes('deadlift') && !liftLower.includes('romanian')) {
      if (orm >= bw * 3)   await awardBadge('bw3_deadlift');
      if (orm >= bw * 2.5) await awardBadge('elite_deadlift');
    }
  }

  // ---- After logging workout: award XP to trained muscles ----
  async function processWorkoutXP(workout) {
    const MUSCLE_XP_PER_SET = 15;
    const COMPLETION_BONUS = 50;

    const muscleVolume = {};
    for (const ex of (workout.exercises || [])) {
      for (const muscle of (ex.targetMuscles || ['Unknown'])) {
        muscleVolume[muscle] = (muscleVolume[muscle] || 0) + (ex.sets || []).filter(s => s.completed).length;
      }
    }

    for (const [muscle, sets] of Object.entries(muscleVolume)) {
      await awardMuscleXP(muscle, sets * MUSCLE_XP_PER_SET);
    }

    // Completion bonus
    await awardMuscleXP('Overall', COMPLETION_BONUS);
    await checkWorkoutBadges();
  }

  // ---- Generate AI weekly challenges ----
  async function generateChallenges() {
    if (!AI.isAvailable()) {
      // Fallback hardcoded challenges
      const defaults = [
        { id: 'c-' + Date.now() + '-1', title: 'Protein Push', desc: 'Hit your protein target 5 days this week', target: 5, progress: 0, unit: 'days', reward: '200 XP', endDate: getEndOfWeek() },
        { id: 'c-' + Date.now() + '-2', title: 'Cardio Commitment', desc: 'Complete 3 cardio sessions this week', target: 3, progress: 0, unit: 'sessions', reward: '150 XP', endDate: getEndOfWeek() },
        { id: 'c-' + Date.now() + '-3', title: 'Show Up', desc: 'Log 4 workouts this week', target: 4, progress: 0, unit: 'workouts', reward: '300 XP', endDate: getEndOfWeek() },
      ];
      for (const c of defaults) await DB.saveChallenge(c);
      return defaults;
    }

    try {
      const text = await AI.getChallenges();
      // Parse numbered list into challenges
      const lines = text.split('\n').filter(l => /^\d\./.test(l.trim()));
      const challenges = lines.map((line, i) => {
        const clean = line.replace(/^\d\.\s*/, '').trim();
        const [title, ...rest] = clean.split(':');
        return {
          id: 'c-' + Date.now() + '-' + i,
          title: title.trim(),
          desc: rest.join(':').trim(),
          target: 5,
          progress: 0,
          unit: 'completions',
          reward: `${100 + i * 50} XP`,
          endDate: getEndOfWeek(),
          aiGenerated: true,
        };
      });
      if (challenges.length) {
        for (const c of challenges) await DB.saveChallenge(c);
        return challenges;
      }
    } catch(e) {}

    return [];
  }

  function getEndOfWeek() {
    const d = new Date();
    const daysUntilSunday = 7 - d.getDay();
    d.setDate(d.getDate() + daysUntilSunday);
    return d.toISOString().split('T')[0];
  }

  // ---- Update challenge progress ----
  async function updateChallengeProgress(type, amount = 1) {
    const challenges = await DB.getActiveChallenges();
    for (const c of challenges) {
      let matches = false;
      if (type === 'protein'  && c.title.toLowerCase().includes('protein'))  matches = true;
      if (type === 'cardio'   && c.title.toLowerCase().includes('cardio'))   matches = true;
      if (type === 'workout'  && (c.title.toLowerCase().includes('workout') || c.title.toLowerCase().includes('show up'))) matches = true;
      if (type === 'water'    && c.title.toLowerCase().includes('water'))    matches = true;

      if (matches) {
        c.progress = Math.min((c.progress || 0) + amount, c.target);
        await DB.saveChallenge(c);
        if (c.progress >= c.target) {
          toast(`⚡ Challenge Complete: ${c.title}!`, 'gold', 4000);
          await awardBadge('challenge_done');
          await awardMuscleXP('Overall', parseInt(c.reward) || 100);
        }
      }
    }
  }

  // ---- Render badges grid (compact, for dashboard/stats) ----
  async function renderBadgesGrid(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const earned = await DB.getAllBadges();
    const earnedIds = new Set(earned.map(b => b.id));

    const allBadges = Object.entries(BADGE_DEFS);
    container.innerHTML = `<div class="badge-grid">
      ${allBadges.map(([id, def]) => {
        const isEarned = earnedIds.has(id);
        const earnedBadge = earned.find(b => b.id === id);
        return `
          <div class="badge-item" title="${def.desc}">
            <div class="badge-icon ${isEarned ? 'earned' : ''}">${isEarned ? def.icon : '🔒'}</div>
            <div class="badge-label ${isEarned ? 'earned' : ''}">${def.name}</div>
            ${isEarned && earnedBadge ? `<div style="font-size:9px;color:var(--text-dim)">${earnedBadge.earnedAt?.split('T')[0] || ''}</div>` : ''}
          </div>
        `;
      }).join('')}
    </div>`;
  }

  // ---- Render full Achievements page ----
  async function renderAchievementsPage(containerId, filterCategory = 'all') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const earned = await DB.getAllBadges();
    const earnedIds = new Set(earned.map(b => b.id));
    const earnedCount = earnedIds.size;
    const totalCount = Object.keys(BADGE_DEFS).length;

    // Group by category
    const categories = [...new Set(Object.values(BADGE_DEFS).map(d => d.cat))];

    const filtered = Object.entries(BADGE_DEFS).filter(([id, def]) => {
      if (filterCategory === 'all') return true;
      if (filterCategory === 'earned') return earnedIds.has(id);
      if (filterCategory === 'locked') return !earnedIds.has(id);
      return def.cat === filterCategory;
    });

    container.innerHTML = `
      <!-- Progress overview -->
      <div class="card card-accent" style="text-align:center;margin-bottom:12px">
        <div style="font-size:36px;font-weight:900;color:var(--green)">${earnedCount}<span style="font-size:18px;color:var(--text-muted)"> / ${totalCount}</span></div>
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:10px">Achievements Unlocked</div>
        <div class="progress-bar-track">
          <div class="progress-bar-fill" style="width:${Math.round(earnedCount/totalCount*100)}%;background:var(--green)"></div>
        </div>
      </div>

      <!-- Filter tabs -->
      <div class="filter-tabs" style="margin-bottom:12px">
        <button type="button" class="filter-tab ${filterCategory==='all'?'active':''}" onclick="Gamification.filterAchievements('all')">All</button>
        <button type="button" class="filter-tab ${filterCategory==='earned'?'active':''}" onclick="Gamification.filterAchievements('earned')">Earned</button>
        <button type="button" class="filter-tab ${filterCategory==='locked'?'active':''}" onclick="Gamification.filterAchievements('locked')">Locked</button>
        ${categories.map(cat => `
          <button type="button" class="filter-tab ${filterCategory===cat?'active':''}" onclick="Gamification.filterAchievements('${cat}')">${cat}</button>
        `).join('')}
      </div>

      <!-- Achievement list -->
      <div style="display:flex;flex-direction:column;gap:8px">
        ${filtered.map(([id, def]) => {
          const isEarned = earnedIds.has(id);
          const earnedBadge = earned.find(b => b.id === id);
          const dateStr = earnedBadge?.earnedAt ? earnedBadge.earnedAt.split('T')[0] : '';
          return `
            <div class="achievement-item ${isEarned ? 'earned' : 'locked'}">
              <div class="achievement-icon-wrap ${isEarned ? 'earned' : ''}">
                ${isEarned ? def.icon : '🔒'}
              </div>
              <div class="achievement-info">
                <div class="achievement-category">${def.cat}</div>
                <div class="achievement-name ${isEarned ? '' : 'locked'}">${def.name}</div>
                <div class="achievement-desc">${def.desc}</div>
                ${!isEarned ? `<div class="achievement-unlock">How to unlock: ${def.how}</div>` : ''}
                ${isEarned && dateStr ? `<div class="achievement-earned-date">✓ Earned ${dateStr}</div>` : ''}
              </div>
              <div class="achievement-status ${isEarned ? 'earned' : 'locked'}">
                ${isEarned ? '✓' : ''}
              </div>
            </div>
          `;
        }).join('')}
        ${filtered.length === 0 ? '<div style="text-align:center;color:var(--text-muted);padding:24px;font-size:14px">No achievements in this category</div>' : ''}
      </div>
    `;
  }

  // ---- Render muscle levels ----
  async function renderMuscleLeaderboard(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const muscles = await DB.getAllMuscleXP();
    const MUSCLE_NAMES = ['Chest','Back','Shoulders','Biceps','Triceps','Quads','Hamstrings','Glutes','Calves','Core'];

    const all = MUSCLE_NAMES.map(name => {
      const found = muscles.find(m => m.muscle === name);
      return found || { muscle: name, xp: 0, level: 1 };
    }).sort((a, b) => b.xp - a.xp);

    container.innerHTML = all.map(m => {
      const nextXP = DB.nextLevelXP(m.level);
      const currXP = DB.levelXPThreshold(m.level);
      const progress = nextXP > currXP ? Math.min(100, Math.round((m.xp - currXP) / (nextXP - currXP) * 100)) : 100;
      return `
        <div class="muscle-level-card">
          <div>
            <div class="muscle-name">${m.muscle}</div>
            <div class="xp-bar-wrap" style="width:120px">
              <div class="xp-bar-track"><div class="xp-bar-fill" style="width:${progress}%"></div></div>
            </div>
          </div>
          <div style="text-align:right">
            <div class="muscle-level-badge">Lv.${m.level} ${DB.levelName(m.level)}</div>
            <div style="font-size:11px;color:var(--text-dim)">${m.xp} XP</div>
          </div>
        </div>
      `;
    }).join('');
  }

  // ---- Render challenges ----
  async function renderChallenges(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let challenges = await DB.getActiveChallenges();

    if (!challenges.length) {
      container.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-muted)">Generating challenges...</div>`;
      challenges = await generateChallenges();
    }

    if (!challenges.length) {
      container.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-muted)">No active challenges</div>`;
      return;
    }

    container.innerHTML = challenges.map(c => {
      const progress = c.progress || 0;
      const pct = c.target > 0 ? Math.min(100, Math.round(progress / c.target * 100)) : 0;
      return `
        <div class="challenge-card">
          <div class="challenge-title">⚡ ${c.title}</div>
          <div class="challenge-desc">${c.desc}</div>
          <div class="progress-bar-wrap" style="margin-bottom:8px">
            <div class="progress-bar-header">
              <span style="font-size:12px;color:var(--text-muted)">${progress} / ${c.target} ${c.unit}</span>
              <span style="font-size:12px;font-weight:700;color:${pct>=100?'var(--green)':'var(--text-muted)'}">${pct}%</span>
            </div>
            <div class="progress-bar-track">
              <div class="progress-bar-fill green" style="width:${pct}%"></div>
            </div>
          </div>
          <div class="challenge-reward">🏆 Reward: ${c.reward}</div>
          ${pct >= 100 ? '<div style="color:var(--green);font-weight:800;font-size:13px;margin-top:6px">✓ COMPLETED</div>' : ''}
        </div>
      `;
    }).join('');
  }

  let _achievementFilter = 'all';

  function filterAchievements(cat) {
    _achievementFilter = cat;
    renderAchievementsPage('more-content', cat);
  }

  return {
    awardBadge,
    awardMuscleXP,
    checkStreakBadges,
    checkWorkoutBadges,
    checkPRBadge,
    checkStrengthBadges,
    processWorkoutXP,
    generateChallenges,
    updateChallengeProgress,
    renderBadgesGrid,
    renderAchievementsPage,
    filterAchievements,
    renderMuscleLeaderboard,
    renderChallenges,
    BADGE_DEFS,
  };
})();
