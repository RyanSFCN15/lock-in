/* ============================================================
   LOCK IN — Gamification: XP, Levels, Badges, Challenges, Streaks
   ============================================================ */

window.Gamification = (() => {

  // ---- Badge definitions ----
  const BADGE_DEFS = {
    first_login:      { name: 'Day One',           icon: '🔑', desc: 'Started the journey'              },
    first_workout:    { name: 'First Rep',          icon: '💪', desc: 'Completed first workout'          },
    first_pr:         { name: 'Personal Record',   icon: '🏆', desc: 'Hit your first PR'                },
    streak_7:         { name: 'Week Warrior',       icon: '🔥', desc: '7-day streak'                     },
    streak_14:        { name: 'Two Weeks Strong',   icon: '⚡', desc: '14-day streak'                    },
    streak_30:        { name: 'Month Locked In',    icon: '💎', desc: '30-day streak'                    },
    streak_60:        { name: 'Two Month Beast',    icon: '👑', desc: '60-day streak'                    },
    streak_90:        { name: '90 Day Legend',      icon: '🌟', desc: '90-day streak'                    },
    streak_180:       { name: 'Half Year',          icon: '🌙', desc: '180-day streak'                   },
    streak_365:       { name: 'Full Year',          icon: '☀️', desc: '365-day streak'                   },
    muscle_level_3:   { name: 'Intermediate',       icon: '📈', desc: 'Reached Intermediate on a muscle' },
    muscle_level_5:   { name: 'Elite Muscle',       icon: '💥', desc: 'Hit Elite level on a muscle'      },
    muscle_level_7:   { name: 'Swole God',          icon: '⚜️', desc: 'Reached Swole God tier'           },
    perfect_day:      { name: 'Perfect Day',        icon: '✅', desc: 'Hit 100% Locked In score'          },
    challenge_done:   { name: 'Challenge Complete', icon: '⚡', desc: 'Completed a weekly challenge'     },
    elite_bench:      { name: 'Bench Elite',        icon: '🏋️', desc: 'Elite bench press standard'      },
    elite_squat:      { name: 'Squat Elite',        icon: '🦵', desc: 'Elite squat standard'             },
    elite_deadlift:   { name: 'Deadlift Elite',     icon: '🔱', desc: 'Elite deadlift standard'          },
    budget_week:      { name: 'Budget Beast',       icon: '💰', desc: 'Completed a full budget meal week' },
    macro_week:       { name: 'Macro Machine',      icon: '🎯', desc: 'Hit protein target 7 days in a row'},
    workout_10:       { name: '10 Workouts',        icon: '🔟', desc: 'Completed 10 workouts'            },
    workout_50:       { name: '50 Workouts',        icon: '5️⃣0️⃣', desc: 'Completed 50 workouts'          },
    workout_100:      { name: 'Century',            icon: '💯', desc: 'Completed 100 workouts'            },
    measurement_log:  { name: 'Self Aware',         icon: '📏', desc: 'Logged first measurements'        },
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

  // ---- Render badges grid ----
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
            ${isEarned && earnedBadge ? `<div style="font-size:9px;color:var(--text-dim)">${formatDate(earnedBadge.earnedAt.split('T')[0])}</div>` : ''}
          </div>
        `;
      }).join('')}
    </div>`;
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

  return {
    awardBadge,
    awardMuscleXP,
    checkStreakBadges,
    checkWorkoutBadges,
    checkPRBadge,
    processWorkoutXP,
    generateChallenges,
    updateChallengeProgress,
    renderBadgesGrid,
    renderMuscleLeaderboard,
    renderChallenges,
    BADGE_DEFS,
  };
})();
