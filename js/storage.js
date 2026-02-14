const STORAGE_KEYS = {
  PROFILE: 'rh_profile',
  PROGRESS: 'rh_progress',
  SKILLS: 'rh_skills',
  COMPLETED: 'rh_completed',
  DAILY: 'rh_daily',
  BADGES: 'rh_badges',
  CERT: 'rh_cert'
};

export function getProfile() {
  const d = localStorage.getItem(STORAGE_KEYS.PROFILE);
  return d ? JSON.parse(d) : null;
}

export function setProfile(p) {
  localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(p));
}

export function getProgress() {
  const d = localStorage.getItem(STORAGE_KEYS.PROGRESS);
  return d ? JSON.parse(d) : { xp: 0, level: 1, textsCompleted: 0, totalCorrect: 0, totalAnswered: 0 };
}

export function setProgress(p) {
  localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(p));
}

export function getSkillData() {
  const d = localStorage.getItem(STORAGE_KEYS.SKILLS);
  if (d) return JSON.parse(d);
  const initial = {};
  for (let i = 1; i <= 15; i++) {
    initial[i] = { attempts: [], mastery: 0 };
  }
  return initial;
}

export function setSkillData(s) {
  localStorage.setItem(STORAGE_KEYS.SKILLS, JSON.stringify(s));
}

export function getCompletedTexts() {
  const d = localStorage.getItem(STORAGE_KEYS.COMPLETED);
  return d ? JSON.parse(d) : [];
}

export function addCompletedText(textId, score) {
  const arr = getCompletedTexts();
  const existing = arr.find(c => c.id === textId);
  if (existing) {
    existing.score = Math.max(existing.score, score);
    existing.attempts = (existing.attempts || 1) + 1;
    existing.lastDate = new Date().toISOString();
  } else {
    arr.push({ id: textId, score, attempts: 1, lastDate: new Date().toISOString() });
  }
  localStorage.setItem(STORAGE_KEYS.COMPLETED, JSON.stringify(arr));
}

export function getDailyData() {
  const d = localStorage.getItem(STORAGE_KEYS.DAILY);
  return d ? JSON.parse(d) : { lastDate: null, streak: 0, todayDone: false, todayTextId: null };
}

export function setDailyData(d) {
  localStorage.setItem(STORAGE_KEYS.DAILY, JSON.stringify(d));
}

export function getBadges() {
  const d = localStorage.getItem(STORAGE_KEYS.BADGES);
  return d ? JSON.parse(d) : [];
}

export function setBadges(b) {
  localStorage.setItem(STORAGE_KEYS.BADGES, JSON.stringify(b));
}

export function getCertData() {
  const d = localStorage.getItem(STORAGE_KEYS.CERT);
  return d ? JSON.parse(d) : null;
}

export function setCertData(c) {
  localStorage.setItem(STORAGE_KEYS.CERT, JSON.stringify(c));
}

export function clearAllData() {
  Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
}
