export function showConfetti() {
  const container = document.getElementById('confetti-container');
  const colors = ['#004AAD', '#FFC857', '#2F6DFF', '#10B981', '#EF4444', '#F59E0B'];
  for (let i = 0; i < 50; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + '%';
    piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDelay = Math.random() * 1 + 's';
    piece.style.animationDuration = (2 + Math.random() * 1.5) + 's';
    piece.style.width = (6 + Math.random() * 8) + 'px';
    piece.style.height = (6 + Math.random() * 8) + 'px';
    piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    container.appendChild(piece);
  }
  setTimeout(() => { container.innerHTML = ''; }, 3500);
}

export function showToast(message, type) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast' + (type ? ' ' + type : '');
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => { toast.remove(); }, 2600);
}

export function getMasteryColor(val) {
  if (val >= 80) return '#10B981';
  if (val >= 50) return '#F59E0B';
  return '#EF4444';
}

export function getScoreColor(pct) {
  if (pct >= 80) return '#10B981';
  if (pct >= 60) return '#F59E0B';
  return '#EF4444';
}

export function getGrade(pct) {
  if (pct >= 90) return 'ممتاز';
  if (pct >= 80) return 'جيد جدًا';
  if (pct >= 70) return 'جيد';
  if (pct >= 60) return 'مقبول';
  return 'يحتاج تحسين';
}

export function getDiffClass(diff) {
  if (diff === 'سهل') return 'diff-easy';
  if (diff === 'متوسط') return 'diff-medium';
  return 'diff-hard';
}

const SKILL_NAMES_SHORT = {
  1: 'مرادفات المفردات',
  2: 'المفردات المتشابهة',
  3: 'المترادفات والأضداد',
  4: 'توظيف المفردات',
  5: 'الفهم المباشر',
  6: 'المقارنة والتحليل',
  7: 'الأفكار الرئيسة والفرعية',
  8: 'الشخصيات والأحداث',
  9: 'الربط بالواقع',
  10: 'التعبيرات الجمالية',
  11: 'وضوح المعلومات',
  12: 'القيم والاتجاهات',
  13: 'العنوان والصياغة البديلة',
  14: 'الإقناع والتعليل',
  15: 'توظيف المغزى'
};

export function getSkillShortName(id) {
  return SKILL_NAMES_SHORT[id] || 'مهارة ' + id;
}

export function formatDate(d) {
  const date = new Date(d);
  return date.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function letterFromIndex(i) {
  const letters = ['أ', 'ب', 'ج', 'د'];
  return letters[i] || '';
}
