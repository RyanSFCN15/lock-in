/* ============================================================
   LOCK IN — Dual AI Engine (Gemini + Ollama)
   ============================================================ */

window.AI = (() => {
  let _ollamaAvailable = false;
  let _ollamaChecked = false;

  const OLLAMA_URL = () => window._settings?.ollamaEndpoint || 'http://localhost:11434';
  const OLLAMA_MODEL = 'llama3.2';
  const GEMINI_MODEL = 'gemini-1.5-flash'; // stable, free-tier compatible

  // --- Detect Ollama ---

  async function detectOllama() {
    if (_ollamaChecked) return _ollamaAvailable;
    _ollamaChecked = true;
    try {
      const res = await Promise.race([
        fetch(OLLAMA_URL() + '/api/tags', { signal: AbortSignal.timeout(2000) }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 2000)),
      ]);
      _ollamaAvailable = res.ok;
    } catch {
      _ollamaAvailable = false;
    }
    return _ollamaAvailable;
  }

  function resetOllamaCheck() {
    _ollamaChecked = false;
  }

  function isAvailable() {
    const geminiKey = window._settings?.geminiKey;
    return _ollamaAvailable || !!geminiKey;
  }

  function engineName() {
    if (_ollamaAvailable) return 'Ollama';
    if (window._settings?.geminiKey) return 'Gemini';
    return 'None';
  }

  // --- Build full user context ---

  async function buildContext() {
    try {
      const ctx = await DB.buildAIContext();
      const p = ctx.profile;
      if (!p) return '';

      const lines = [
        `User: ${p.name}, ${p.age}yo ${p.sex}, ${p.heightCm}cm, ${p.weightKg}kg`,
        `Goal: ${p.goal} | Target: ${p.targetWeightKg}kg in ${p.weeksToGoal} weeks`,
        `Activity: ${p.activityLevel} | Diet: ${p.dietPreference}`,
        `Split: ${p.split?.type || 'custom'}`,
        `Current streak: ${ctx.streak} days`,
      ];

      if (ctx.latestMeasurement) {
        const m = ctx.latestMeasurement;
        lines.push(`Body fat: ${m.bodyFatPct?.toFixed(1)}% | Weight: ${m.weight}kg`);
      }

      if (ctx.todayRecovery) {
        const r = ctx.todayRecovery;
        lines.push(`Today's readiness: ${r.readiness}/10, sleep: ${r.sleep}h, soreness: ${r.soreness}/10`);
      }

      if (ctx.todayNutrition) {
        const n = ctx.todayNutrition;
        const macros = calcTodayMacros(n);
        lines.push(`Today's nutrition — calories: ${macros.calories}, protein: ${macros.protein}g, carbs: ${macros.carbs}g, fat: ${macros.fat}g`);
        lines.push(`Water: ${(n.water || 0) / 1000}L`);
      }

      if (ctx.todayWorkout) {
        const w = ctx.todayWorkout;
        const exNames = (w.exercises || []).map(e => e.name).join(', ');
        lines.push(`Today's workout: ${exNames || 'In progress'} | Rating: ${w.rating || 'N/A'}`);
      }

      if (ctx.last7Workouts?.length) {
        lines.push(`Last 7 days workouts: ${ctx.last7Workouts.length} sessions`);
      }

      if (p.injuries) lines.push(`Injuries/limitations: ${p.injuries}`);
      if (p.weeklyBudget) lines.push(`Weekly grocery budget: $${p.weeklyBudget} CAD`);

      return lines.join('\n');
    } catch (e) {
      return '';
    }
  }

  // Handles both nested {name, foods:[...]} and flat {calories,...} meal items
  function calcTodayMacros(n) {
    let cal = 0, prot = 0, carbs = 0, fat = 0;
    for (const item of (n?.meals || [])) {
      if (Array.isArray(item.foods)) {
        // Nested structure from addFood: {name:'Lunch', foods:[{calories,...}]}
        for (const food of item.foods) {
          cal   += food.calories || 0;
          prot  += food.protein  || 0;
          carbs += food.carbs    || 0;
          fat   += food.fat      || 0;
        }
      } else {
        // Flat structure: {name:'Chicken sandwich', calories:...}
        cal   += item.calories || 0;
        prot  += item.protein  || 0;
        carbs += item.carbs    || 0;
        fat   += item.fat      || 0;
      }
    }
    return { calories: Math.round(cal), protein: Math.round(prot), carbs: Math.round(carbs), fat: Math.round(fat) };
  }

  // Context cache — rebuilt max once per 90 seconds
  let _ctxCache = null;
  let _ctxCacheTime = 0;

  async function getContext() {
    const now = Date.now();
    if (_ctxCache && (now - _ctxCacheTime) < 90000) return _ctxCache;
    _ctxCache = await buildContext();
    _ctxCacheTime = now;
    return _ctxCache;
  }

  function invalidateContext() {
    _ctxCache = null;
    _ctxCacheTime = 0;
  }

  // --- Gemini ---

  const SYSTEM_PROMPT = 'You are LOCK IN, a brutally honest personal fitness coach. Be direct and specific. No fluff. Short punchy responses. Always give actionable advice. Use the user context data when relevant.';

  async function geminiGenerate(prompt, systemCtx, maxTokens = 300) {
    const key = window._settings?.geminiKey;
    if (!key) throw new Error('No Gemini key saved. Go to Settings → AI Settings to add your key.');

    // Build the full prompt — prepend system instructions and context into the user message
    // (avoids systemInstruction field which some API keys reject)
    const parts = [];
    parts.push(SYSTEM_PROMPT);
    if (systemCtx) parts.push(`USER FITNESS DATA:\n${systemCtx}`);
    parts.push(prompt);
    const fullPrompt = parts.join('\n\n');

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
    const body = {
      contents: [{ parts: [{ text: fullPrompt }] }],
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.8 },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const msg = errData.error?.message || `HTTP ${res.status}`;
      if (res.status === 400) throw new Error(`Bad request — ${msg}`);
      if (res.status === 403) throw new Error(`Key rejected — ${msg}`);
      if (res.status === 429) throw new Error('Rate limited — wait a moment and try again');
      throw new Error(`Gemini ${res.status}: ${msg}`);
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  }

  // --- Ollama ---

  async function ollamaGenerate(prompt, systemCtx) {
    const systemPrompt = 'You are LOCK IN, a brutally honest, no-nonsense personal fitness coach. You are direct, aggressive, and real. No fluff. Short, punchy responses. Use data to be specific. Motivate hard but stay practical. Never be preachy. Always give actionable advice.';

    const fullSystem = systemCtx
      ? `${systemPrompt}\n\nUSER FITNESS DATA:\n${systemCtx}`
      : systemPrompt;

    const body = {
      model: OLLAMA_MODEL,
      prompt: prompt,
      system: fullSystem,
      stream: false,
      options: { temperature: 0.85, num_predict: 400 },
    };

    const res = await fetch(OLLAMA_URL() + '/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) throw new Error(`Ollama error ${res.status}`);
    const data = await res.json();
    return data.response || '';
  }

  // --- Main generate function ---
  // opts: { withContext, maxLen, maxTokens, onError }

  async function generate(prompt, opts = {}) {
    const { withContext = true, maxLen = null, maxTokens = 250, onError = null } = opts;
    // Use cached context — avoids 300-500ms DB overhead on every call
    const systemCtx = withContext ? await getContext() : '';

    let text = '';
    let lastError = null;

    if (_ollamaAvailable) {
      try {
        text = await ollamaGenerate(prompt, systemCtx);
      } catch (e) {
        console.warn('Ollama failed, falling back to Gemini:', e.message);
        _ollamaAvailable = false;
        try { text = await geminiGenerate(prompt, systemCtx, maxTokens); }
        catch (e2) { lastError = e2; }
      }
    } else {
      try { text = await geminiGenerate(prompt, systemCtx, maxTokens); }
      catch (e) { lastError = e; }
    }

    if (lastError) {
      console.warn('AI generate error:', lastError.message);
      if (onError) onError(lastError.message);
      // Show error in toast for key/quota issues
      if (lastError.message.includes('API key') || lastError.message.includes('quota') || lastError.message.includes('invalid')) {
        toast('AI error: ' + lastError.message, 'error', 4000);
      }
      return '';
    }

    if (maxLen && text.length > maxLen) {
      text = text.slice(0, maxLen).replace(/[^.!?]*$/, '').trim() || text.slice(0, maxLen);
    }

    return text;
  }

  // --- Pre-built prompts ---

  async function getDailyBrief() {
    return generate(
      'Short punchy daily message. 2 sentences max. Based on my stats, one specific thing to focus on today. Direct, no fluff.',
      { maxLen: 200, maxTokens: 100 }
    );
  }

  async function getLockedInAnalysis(pct) {
    return generate(
      `My Locked In score is ${pct}%. Give me a brutally honest 2-3 sentence analysis of exactly why I'm at this percentage and the 2 most impactful things I can do RIGHT NOW to raise it today. Be specific and aggressive.`,
      { maxLen: 400 }
    );
  }

  async function getDailyTasks() {
    return generate(
      'Generate 5 specific, actionable tasks for today based on my split, macros, and goals. Format as a simple numbered list. Be concrete — weights, amounts, times.',
      { maxLen: 500 }
    );
  }

  async function getNextSetRecommendation(exerciseName, lastSets, goal) {
    const setsStr = lastSets.map(s => `${s.weight}kg x ${s.reps} @ RPE ${s.rpe || '?'}`).join(', ');
    return generate(
      `Exercise: ${exerciseName}. Last session sets: ${setsStr}. Training goal: ${goal}. Give me EXACTLY what weight and reps to hit next set/next session. One sentence. Specific number.`,
      { maxLen: 150 }
    );
  }

  async function getFormCues(exerciseName) {
    return generate(
      `Give me 3 specific form cues for ${exerciseName}. Number them. Short and technical. No fluff.`,
      { withContext: false, maxLen: 300 }
    );
  }

  async function getMindMuscleConnection(exerciseName, targetMuscle) {
    return generate(
      `One sentence mind-muscle connection tip for ${exerciseName} targeting ${targetMuscle}. Sensory and specific.`,
      { withContext: false, maxLen: 120 }
    );
  }

  async function getMealPlan(macroTargets, budget = null) {
    const budgetStr = budget ? ` Weekly grocery budget: $${budget} CAD. Prioritize cheap high-protein foods (eggs, canned tuna, chicken thighs, cottage cheese, lentils, canned beans, ground beef).` : '';
    return generate(
      `Create a full day meal plan hitting: ${macroTargets.calories} cal, ${macroTargets.protein}g protein, ${macroTargets.carbs}g carbs, ${macroTargets.fat}g fat.${budgetStr} Format: Meal name, foods with amounts, macros. Practical and specific.`,
      { maxLen: 800 }
    );
  }

  async function getGroceryList(mealPlan, budget = null) {
    const budgetStr = budget ? ` Budget: $${budget} CAD/week. Include estimated CAD prices.` : '';
    return generate(
      `Based on this meal plan, generate an itemized weekly grocery list with quantities.${budgetStr} Be specific.\n\n${mealPlan}`,
      { withContext: false, maxLen: 600 }
    );
  }

  async function getPlateauFix(exerciseName, weeksStuck) {
    return generate(
      `I've been stuck on ${exerciseName} for ${weeksStuck} weeks. Give me a specific protocol to break the plateau. What exactly should I do differently next session?`,
      { maxLen: 300 }
    );
  }

  async function getWeeklyCheckIn(weekData) {
    const dataStr = JSON.stringify(weekData);
    return generate(
      `Here's my week data: ${dataStr}. Give me a brutally honest weekly review. Score my week 1-10 and explain why. Then give me 3 specific adjustments for next week.`,
      { maxLen: 600 }
    );
  }

  async function getComingBackPlan(daysOff) {
    return generate(
      `I've been off for ${daysOff} days. Generate a comeback week — scaled re-entry training plan. Be specific about reducing volume/intensity percentages.`,
      { maxLen: 400 }
    );
  }

  async function getPeriodization(weeksToGoal, goal) {
    return generate(
      `I have ${weeksToGoal} weeks until my goal (${goal}). Outline a periodization plan broken into phases. Be specific about what each phase focuses on and roughly how many weeks.`,
      { maxLen: 500 }
    );
  }

  async function getFoodAnalysis(foodName, macros) {
    return generate(
      `Quick take on ${foodName} (${macros.calories}cal, ${macros.protein}g protein, ${macros.carbs}g carbs, ${macros.fat}g fat). Is it good for my goal? 1-2 sentences.`,
      { maxLen: 200 }
    );
  }

  async function getSupplementTiming(supplements) {
    const supList = supplements.join(', ');
    return generate(
      `I take: ${supList}. What's the optimal timing for each based on my training and current time of day? Be specific.`,
      { maxLen: 300 }
    );
  }

  async function getLevelUpMessage(muscle, level) {
    return generate(
      `My ${muscle} just hit level ${level} (${DB.levelName(level)})! Hype me up in 2 sentences. Be aggressive and specific about what this means.`,
      { maxLen: 200 }
    );
  }

  async function getBadgeMessage(badgeName) {
    return generate(
      `I just earned the "${badgeName}" badge! Hype message, 1-2 sentences. Aggressive and real.`,
      { maxLen: 150 }
    );
  }

  async function getStreakMessage(days) {
    return generate(
      `${days}-day streak! Give me a hype message matching the magnitude — get progressively more insane the longer the streak.`,
      { maxLen: 200 }
    );
  }

  async function getLifetimeLegacy(stats) {
    return generate(
      `Here are my all-time fitness stats: ${JSON.stringify(stats)}. Write a personal "legacy reflection" — 3-4 sentences about my fitness journey and what these numbers mean. Inspirational but real.`,
      { withContext: false, maxLen: 500 }
    );
  }

  async function getWarmupPlan(muscleGroups) {
    return generate(
      `Generate a 5-7 minute warm-up for training: ${muscleGroups.join(', ')}. Include mobility, activation, and ramp-up sets. Be specific.`,
      { withContext: false, maxLen: 400 }
    );
  }

  async function getTravelWorkout() {
    return generate(
      'I\'m in travel/hotel mode. Generate a bodyweight workout for today\'s split. Specific exercises, sets, reps. Make it hard.',
      { maxLen: 400 }
    );
  }

  async function getRefeedRecommendation() {
    return generate(
      'Based on my cut duration and recent data, should I do a refeed day or diet break? Give specific macros for the refeed if recommended.',
      { maxLen: 300 }
    );
  }

  async function getChallenges() {
    return generate(
      'Generate 3 specific weekly micro-challenges based on my current stats and weak points. Format: Challenge name, exact target, why it matters. Make them hard but achievable.',
      { maxLen: 400 }
    );
  }

  async function getCardioAdvice(type, duration, intensity) {
    return generate(
      `Cardio session: ${type}, ${duration} minutes, intensity ${intensity}/10. Quick assessment and advice for my goal. 2 sentences max.`,
      { maxLen: 200 }
    );
  }

  async function getInjuryAdvice(bodyPart, severity) {
    return generate(
      `I have pain/injury in my ${bodyPart}, severity ${severity}/10. What exercises to avoid and what to modify? Be specific. Note: this is general fitness advice, not medical advice.`,
      { maxLen: 300 }
    );
  }

  async function getBudgetMealPlan(weeklyBudget, macroTargets) {
    return generate(
      `Generate a FULL WEEK meal plan for $${weeklyBudget} CAD budget. Hit ${macroTargets.calories} cal/day, ${macroTargets.protein}g protein minimum. Prioritize: eggs, canned tuna, chicken thighs, cottage cheese, lentils, canned beans, ground beef, rice, oats. Get brutally practical — taste is secondary, hitting protein is the mission. Include rough CAD prices and a shopping list.`,
      { maxLen: 1000 }
    );
  }

  // Show "AI not configured" UI fallback
  function unavailableHTML(msg = null) {
    return `<div class="ai-card"><div class="ai-card-label">⚡ AI COACH</div><div class="ai-card-text" style="color:var(--text-muted)">${msg || 'Connect AI in Settings to unlock coach insights.'}</div></div>`;
  }

  return {
    detectOllama,
    resetOllamaCheck,
    isAvailable,
    engineName,
    generate,
    getDailyBrief,
    getLockedInAnalysis,
    getDailyTasks,
    getNextSetRecommendation,
    getFormCues,
    getMindMuscleConnection,
    getMealPlan,
    getGroceryList,
    getPlateauFix,
    getWeeklyCheckIn,
    getComingBackPlan,
    getPeriodization,
    getFoodAnalysis,
    getSupplementTiming,
    getLevelUpMessage,
    getBadgeMessage,
    getStreakMessage,
    getLifetimeLegacy,
    getWarmupPlan,
    getTravelWorkout,
    getRefeedRecommendation,
    getChallenges,
    getCardioAdvice,
    getInjuryAdvice,
    getBudgetMealPlan,
    unavailableHTML,
    buildContext,
    invalidateContext,
  };
})();
