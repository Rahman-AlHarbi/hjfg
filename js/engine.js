import * as storage from './storage.js';

export function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function shuffleQuestion(q) {
  const indices = [0, 1, 2, 3];
  const shuffled = shuffleArray(indices);
  const newOptions = shuffled.map(i => q.options[i]);
  const newCorrect = shuffled.indexOf(q.correct_index);
  return { ...q, options: newOptions, correct_index: newCorrect, _shuffleMap: shuffled };
}

export function getNextText(texts) {
  const completed = storage.getCompletedTexts();
  const completedIds = completed.map(c => c.id);
  const unseen = texts.filter(t => !completedIds.includes(t.id));
  if (unseen.length > 0) {
    const skills = storage.getSkillData();
    const weakSkills = [];
    for (let i = 1; i <= 15; i++) {
      if (skills[i].mastery < 50) weakSkills.push(i);
    }
    if (weakSkills.length > 0) {
      const shuffledUnseen = shuffleArray(unseen);
      return shuffledUnseen[0];
    }
    return unseen[Math.floor(Math.random() * unseen.length)];
  }
  return texts[Math.floor(Math.random() * texts.length)];
}

export function getDailyText(texts) {
  const daily = storage.getDailyData();
  const today = new Date().toISOString().split('T')[0];

  if (daily.lastDate === today && daily.todayTextId) {
    return texts.find(t => t.id === daily.todayTextId) || texts[0];
  }

  let newStreak = daily.streak;
  if (daily.lastDate) {
    const last = new Date(daily.lastDate);
    const now = new Date(today);
    const diffDays = Math.round((now - last) / (1000 * 60 * 60 * 24));
    if (diffDays === 1 && daily.todayDone) {
      newStreak = daily.streak + 1;
    } else if (diffDays > 1) {
      newStreak = 0;
    }
  }

  const seed = today.replace(new RegExp('-', 'g'), '');
  const idx = parseInt(seed) % texts.length;
  const text = texts[idx];

  storage.setDailyData({
    lastDate: today,
    streak: newStreak,
    todayDone: false,
    todayTextId: text.id
  });

  return text;
}

export function processAnswer(skillId, isCorrect, config) {
  const skills = storage.getSkillData();
  const progress = storage.getProgress();

  skills[skillId].attempts.push(isCorrect ? 1 : 0);
  if (skills[skillId].attempts.length > 10) {
    skills[skillId].attempts = skills[skillId].attempts.slice(-10);
  }

  const last3 = skills[skillId].attempts.slice(-3);
  if (last3.length >= 3) {
    const avg = last3.reduce((a, b) => a + b, 0) / last3.length;
    skills[skillId].mastery = Math.round(avg * 100);
  } else if (last3.length > 0) {
    const avg = last3.reduce((a, b) => a + b, 0) / last3.length;
    skills[skillId].mastery = Math.round(avg * 100);
  }

  if (isCorrect) {
    progress.xp += config.xp_per_correct || 10;
    progress.totalCorrect++;
  }
  progress.totalAnswered++;
  progress.level = Math.floor(progress.xp / (config.xp_per_level || 200)) + 1;

  storage.setSkillData(skills);
  storage.setProgress(progress);

  return { skills, progress };
}

export function completeText(textId, score, config) {
  const progress = storage.getProgress();
  progress.textsCompleted++;
  progress.xp += config.xp_per_text_complete || 50;
  progress.level = Math.floor(progress.xp / (config.xp_per_level || 200)) + 1;
  storage.setProgress(progress);
  storage.addCompletedText(textId, score);
  checkBadges();
  return progress;
}

export function checkBadges() {
  const skills = storage.getSkillData();
  const badges = storage.getBadges();
  const badgeDefs = getBadgeDefinitions();

  const earned = [];
  badgeDefs.forEach(bd => {
    const allMastered = bd.skills.every(s => skills[s] && skills[s].mastery >= 80);
    if (allMastered && !badges.includes(bd.id)) {
      earned.push(bd.id);
    }
  });

  if (earned.length > 0) {
    storage.setBadges([...badges, ...earned]);
  }
  return earned;
}

export function getBadgeDefinitions() {
  return [
    { id: 'vocab', name: 'بطل المفردات', icon: '📚', skills: [1, 2, 3, 4] },
    { id: 'direct', name: 'بطل الفهم المباشر', icon: '🎯', skills: [5] },
    { id: 'analysis', name: 'بطل التحليل والمقارنة', icon: '🔍', skills: [6, 7] },
    { id: 'narrative', name: 'بطل السرد', icon: '📖', skills: [8] },
    { id: 'reality', name: 'بطل الربط بالواقع', icon: '🌍', skills: [9] },
    { id: 'taste', name: 'بطل الذائقة', icon: '✨', skills: [10] },
    { id: 'opinion', name: 'بطل الرأي والنقد', icon: '💬', skills: [11, 12] },
    { id: 'creative', name: 'بطل الإبداع', icon: '🎨', skills: [13] },
    { id: 'persuade', name: 'بطل الإقناع', icon: '🎤', skills: [14] },
    { id: 'solutions', name: 'بطل الحلول', icon: '💡', skills: [15] }
  ];
}

export function checkCertificateEligibility(config) {
  const progress = storage.getProgress();
  const skills = storage.getSkillData();
  const certConfig = config.certificate || {};

  const minTexts = certConfig.min_texts || 25;
  const minAvg = certConfig.min_avg_percent || 80;
  const masteryThreshold = certConfig.mastery_threshold || 80;

  const allMastered = Object.keys(skills).every(k => skills[k].mastery >= masteryThreshold);
  const enoughTexts = progress.textsCompleted >= minTexts;
  const avgPercent = progress.totalAnswered > 0 ? Math.round((progress.totalCorrect / progress.totalAnswered) * 100) : 0;
  const goodAvg = avgPercent >= minAvg;

  return {
    eligible: allMastered && enoughTexts && goodAvg,
    allMastered,
    enoughTexts,
    goodAvg,
    textsCompleted: progress.textsCompleted,
    minTexts,
    avgPercent,
    minAvg,
    masteryDetails: skills
  };
}

export function generateVerificationId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = 'RH-';
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}
