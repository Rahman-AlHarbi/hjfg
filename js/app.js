import { initRouter } from './router.js';
import * as storage from './storage.js';
import * as engine from './engine.js';
import * as cert from './cert.js';
import * as ui from './ui.js';

let CONFIG = {};
let TEXTS = [];
let currentGame = null;

async function loadData() {
  try {
    const [configRes, textsRes] = await Promise.all([
      fetch('data/config.json'),
      fetch('data/texts.json')
    ]);
    CONFIG = await configRes.json();
    TEXTS = await textsRes.json();

    try {
      const extraRes = await fetch('data/texts_extra.json');
      const extraTexts = await extraRes.json();
      TEXTS = TEXTS.concat(extraTexts);
    } catch (e) {}
  } catch (e) {
    CONFIG = {};
    TEXTS = [];
  }
}

function applyBranding() {
  const slogan = CONFIG.slogans ? CONFIG.slogans.primary : 'أبطال القراءة: من نصٍّ إلى إنجاز';
  const heroSlogan = document.getElementById('hero-slogan');
  if (heroSlogan) heroSlogan.textContent = slogan;

  const footerRights = document.getElementById('footer-rights');
  if (footerRights) footerRights.textContent = CONFIG.rights_text || 'جميع الحقوق محفوظة © 2026 - أبطال القراءة';

  if (CONFIG.theme_colors) {
    const root = document.documentElement;
    if (CONFIG.theme_colors.primary) root.style.setProperty('--primary', CONFIG.theme_colors.primary);
    if (CONFIG.theme_colors.navy) root.style.setProperty('--navy', CONFIG.theme_colors.navy);
    if (CONFIG.theme_colors.sky) root.style.setProperty('--sky', CONFIG.theme_colors.sky);
    if (CONFIG.theme_colors.gold) root.style.setProperty('--gold', CONFIG.theme_colors.gold);
  }
}

function updateHeaderXP() {
  const progress = storage.getProgress();
  document.getElementById('header-xp-val').textContent = progress.xp;
  document.getElementById('header-level').textContent = 'مستوى ' + progress.level;
}

function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById('page-' + pageId);
  if (page) page.classList.add('active');

  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.toggle('active', n.getAttribute('data-page') === pageId);
  });
}

function renderHeroStats() {
  const container = document.getElementById('hero-stats');
  if (!container) return;
  container.innerHTML = `
    <div class="hero-stat"><span class="stat-val">${TEXTS.length}</span><span class="stat-label">نص قرائي</span></div>
    <div class="hero-stat"><span class="stat-val">${TEXTS.length * 15}</span><span class="stat-label">سؤال</span></div>
    <div class="hero-stat"><span class="stat-val">15</span><span class="stat-label">مهارة</span></div>
  `;
}

function renderDashboard() {
  const profile = storage.getProfile();
  if (!profile) { window.location.hash = '#home'; return; }

  const progress = storage.getProgress();
  const skills = storage.getSkillData();

  document.getElementById('dash-welcome').innerHTML = `
    <h2>مرحبًا ${profile.name} 👋</h2>
    <p>أكملت ${progress.textsCompleted} نصًا | ${progress.xp} XP | مستوى ${progress.level}</p>
  `;

  const daily = storage.getDailyData();
  const streakEl = document.getElementById('streak-display');
  if (streakEl) {
    streakEl.textContent = daily.streak > 0 ? '🔥 ' + daily.streak + ' يوم متتالي' : '';
  }

  renderSidebar(profile, progress, skills);
  renderTextsGrid();
}


function renderSidebar(profile, progress, skills) {
  const sp = document.getElementById('sidebar-profile');
  sp.innerHTML = `
    <div class="sp-name">${profile.name}</div>
    <div class="sp-class">${profile.className}</div>
    <div class="sp-xp">⭐ ${progress.xp} XP</div>
  `;

  const ss = document.getElementById('sidebar-skills');
  let skillsHTML = '<h4>المهارات</h4>';
  const skillArray = [];

  for (let i = 1; i <= 15; i++) {
    const m = skills[i] ? skills[i].mastery : 0;
    skillArray.push({ id: i, mastery: m });
    skillsHTML += `
      <div class="mini-skill-row">
        <span class="ms-num">${i}</span>
        <div class="ms-bar">
          <div class="ms-bar-fill"
               style="width:${m}%;background:${ui.getMasteryColor(m)}"></div>
        </div>
        <span class="ms-val">${m}%</span>
      </div>
    `;
  }

  // إبراز أضعف ٣ مهارات بعد أن يبدأ الطالب بالإجابة
  if (progress.totalAnswered > 0) {
    skillArray.sort((a, b) => a.mastery - b.mastery);
    const weakest = skillArray.slice(0, 3);

    skillsHTML += '<div class="weak-skills-box"><div class="weak-title">بحاجة إلى تعزيز:</div>';
    weakest.forEach(w => {
      skillsHTML += `
        <div class="weak-pill">
          <span class="ws-num">${w.id}</span>
          <span class="ws-name">${ui.getSkillShortName(w.id)}</span>
          <span class="ws-percent">${w.mastery}%</span>
        </div>
      `;
    });
    skillsHTML += '</div>';
  }

  ss.innerHTML = skillsHTML;

  const sb = document.getElementById('sidebar-badges');
  const earnedBadges = storage.getBadges();
  const allBadges = engine.getBadgeDefinitions();
  let badgesHTML = '<h4>الشارات</h4><div class="badges-grid">';
  allBadges.forEach(b => {
    const earned = earnedBadges.includes(b.id);
    badgesHTML += `
      <div class="badge-item ${earned ? 'earned' : 'locked'}">
        <span class="badge-icon">${b.icon}</span>
        <span class="badge-name">${b.name}</span>
      </div>
    `;
  });
  badgesHTML += '</div>';
  sb.innerHTML = badgesHTML;
}
function renderTextsGrid() {
  const grid = document.getElementById('texts-grid');
  const completed = storage.getCompletedTexts();
  const diffFilter = document.getElementById('filter-difficulty').value;
  const genreFilter = document.getElementById('filter-genre').value;

  let filtered = TEXTS;
  if (diffFilter) filtered = filtered.filter(t => t.difficulty === diffFilter);
  if (genreFilter) filtered = filtered.filter(t => t.genre === genreFilter);

  grid.innerHTML = filtered.map(t => {
    const comp = completed.find(c => c.id === t.id);
    return `
      <div class="text-card ${comp ? 'completed' : ''}" onclick="window.location.hash='#play/practice/${t.id}'">
        <div class="text-card-info">
          <h4>${t.title}</h4>
          <div class="meta">
            <span class="diff-badge ${ui.getDiffClass(t.difficulty)}">${t.difficulty}</span>
            <span>${t.genre}</span>
          </div>
        </div>
        <div class="text-card-score">
          ${comp ? '<span class="score-val">' + comp.score + '%</span><span class="score-label">أفضل نتيجة</span>' : '<span class="score-label">جديد</span>'}
        </div>
      </div>
    `;
  }).join('');
}

function startGame(mode, textId) {
  let text;
  if (mode === 'daily') {
    text = engine.getDailyText(TEXTS);
  } else if (textId) {
    text = TEXTS.find(t => t.id === parseInt(textId));
  }
  if (!text) {
    text = engine.getNextText(TEXTS);
  }
  if (!text) return;

  currentGame = {
    mode,
    text,
    questions: text.questions.map(q => engine.shuffleQuestion(q)),
    currentQ: 0,
    answers: [],
    score: 0,
    startTime: Date.now(),
    timer: null,
    timerSeconds: 0
  };

  showPage('play');
  renderPlayScreen();

  if (mode === 'nafs') {
    const totalSec = (CONFIG.nafs_total_minutes || 30) * 60;
    currentGame.timerSeconds = totalSec;
    document.getElementById('play-timer').style.display = 'block';
    updateTimerDisplay();
    currentGame.timer = setInterval(() => {
      currentGame.timerSeconds--;
      updateTimerDisplay();
      if (currentGame.timerSeconds <= 0) {
        clearInterval(currentGame.timer);
        finishGame();
      }
    }, 1000);
  } else {
    document.getElementById('play-timer').style.display = 'none';
  }
}

function updateTimerDisplay() {
  const el = document.getElementById('play-timer');
  const m = Math.floor(currentGame.timerSeconds / 60);
  const s = currentGame.timerSeconds % 60;
  el.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  if (currentGame.timerSeconds < 60) {
    el.style.background = '#EF4444';
  }
}

function renderPlayScreen() {
  const g = currentGame;
  const q = g.questions[g.currentQ];
  const total = g.questions.length;

  document.getElementById('play-text-title').textContent = g.text.title;
  document.getElementById('play-text-body').textContent = g.text.text;
  document.getElementById('play-progress-fill').style.width = ((g.currentQ) / total * 100) + '%';
  document.getElementById('play-progress-text').textContent = (g.currentQ + 1) + '/' + total;

  const skillTag = document.getElementById('play-skill-tag');
  if (g.mode === 'practice') {
    skillTag.textContent = 'مهارة ' + q.skill_id + ': ' + ui.getSkillShortName(q.skill_id);
    skillTag.style.display = 'inline-block';
  } else {
    skillTag.style.display = 'none';
  }

  document.getElementById('play-stem').textContent = q.stem;
  document.getElementById('play-explanation').style.display = 'none';
  document.getElementById('btn-next-q').style.display = 'none';

  const optContainer = document.getElementById('play-options');
  optContainer.innerHTML = q.options.map((opt, i) => `
    <button class="option-btn" data-index="${i}">
      <span class="opt-letter">${ui.letterFromIndex(i)}</span>
      <span>${opt}</span>
    </button>
  `).join('');

  optContainer.querySelectorAll('.option-btn').forEach(btn => {
    btn.addEventListener('click', () => handleAnswer(parseInt(btn.dataset.index)));
  });

  const textPanel = document.getElementById('play-text-panel');
  textPanel.classList.remove('text-collapsed');
  const toggleBtn = document.getElementById('toggle-text-btn');
  toggleBtn.textContent = 'إخفاء النص';
}

function handleAnswer(selectedIndex) {
  const g = currentGame;
  const q = g.questions[g.currentQ];
  const isCorrect = selectedIndex === q.correct_index;

  g.answers.push({ skillId: q.skill_id, selected: selectedIndex, correct: q.correct_index, isCorrect });
  if (isCorrect) g.score++;

  engine.processAnswer(q.skill_id, isCorrect, CONFIG);
  updateHeaderXP();

  const buttons = document.querySelectorAll('.option-btn');
  buttons.forEach(btn => {
    const idx = parseInt(btn.dataset.index);
    btn.classList.add('disabled');
    if (idx === q.correct_index) btn.classList.add('correct');
    if (idx === selectedIndex && !isCorrect) btn.classList.add('wrong');
  });

  if (g.mode === 'practice') {
    const expEl = document.getElementById('play-explanation');
    expEl.innerHTML = '<strong>' + (isCorrect ? '✅ إجابة صحيحة!' : '❌ إجابة خاطئة') + '</strong><br>' + q.explanation;
    expEl.style.display = 'block';
  }

  if (isCorrect && g.mode === 'practice') {
    ui.showToast('+' + (CONFIG.xp_per_correct || 10) + ' XP', 'success');
  }

  document.getElementById('btn-next-q').style.display = 'block';
  document.getElementById('btn-next-q').textContent = g.currentQ < g.questions.length - 1 ? 'السؤال التالي' : 'عرض النتيجة';
}

function nextQuestion() {
  const g = currentGame;
  g.currentQ++;
  if (g.currentQ >= g.questions.length) {
    finishGame();
  } else {
    renderPlayScreen();
  }
}

function finishGame() {
  if (currentGame.timer) clearInterval(currentGame.timer);

  const g = currentGame;
  const totalQ = g.questions.length;
  const pct = Math.round((g.score / totalQ) * 100);

  engine.completeText(g.text.id, pct, CONFIG);

  if (g.mode === 'daily') {
    const daily = storage.getDailyData();
    daily.todayDone = true;
    storage.setDailyData(daily);
  }

  const newBadges = engine.checkBadges();
  if (newBadges.length > 0) {
    ui.showConfetti();
    const allBadges = engine.getBadgeDefinitions();
    newBadges.forEach(bId => {
      const bd = allBadges.find(b => b.id === bId);
      if (bd) ui.showToast('🏆 حصلت على شارة: ' + bd.name, 'gold');
    });
  }

  if (pct >= 80) ui.showConfetti();

  updateHeaderXP();
  showReport(g, pct);
}

function showReport(game, pct) {
  showPage('report');
  const container = document.getElementById('report-container');
  const scoreColor = ui.getScoreColor(pct);

  let skillRows = '';
  const answers = game.answers;
  for (let i = 1; i <= 15; i++) {
    const a = answers.find(ans => ans.skillId === i);
    const correct = a ? a.isCorrect : false;
    skillRows += `
      <div class="report-skill-row">
        <div class="skill-num" style="background:${correct ? '#10B981' : '#EF4444'}">${i}</div>
        <div class="skill-info">
          <div class="skill-name">${ui.getSkillShortName(i)}</div>
        </div>
        <div class="skill-result" style="color:${correct ? '#10B981' : '#EF4444'}">${correct ? '✅' : '❌'}</div>
      </div>
    `;
  }

  let explanationsHTML = '';
  if (game.mode === 'nafs') {
    explanationsHTML = '<div style="margin-top:20px"><h3 style="color:var(--navy);margin-bottom:12px">الشرح التفصيلي</h3>';
    game.questions.forEach((q, i) => {
      const a = game.answers[i];
      explanationsHTML += `
        <div style="background:var(--white);padding:12px;border-radius:8px;margin-bottom:8px;box-shadow:var(--shadow)">
          <p style="font-weight:600;color:var(--navy);font-size:0.9rem">س${i + 1}: ${q.stem}</p>
          <p style="color:${a && a.isCorrect ? '#10B981' : '#EF4444'};font-size:0.85rem">${a && a.isCorrect ? '✅ صحيح' : '❌ خطأ | الصحيح: ' + q.options[q.correct_index]}</p>
          <p style="font-size:0.82rem;color:#78350F;margin-top:4px">${q.explanation}</p>
        </div>
      `;
    });
    explanationsHTML += '</div>';
  }

  container.innerHTML = `
    <div class="report-header">
      <h2>تقرير النتيجة - ${game.text.title}</h2>
      <div class="report-score-circle" style="background:${scoreColor}">${pct}%</div>
      <p style="color:var(--muted)">${game.score} من ${game.questions.length} إجابة صحيحة | التقدير: ${ui.getGrade(pct)}</p>
    </div>
    <div class="report-skills">${skillRows}</div>
    ${explanationsHTML}
    <div style="text-align:center;margin-top:20px">
      <button class="btn btn-primary btn-lg" onclick="window.location.hash='#dashboard'">العودة للرئيسية</button>
    </div>
  `;
}

function renderProfile() {
  const profile = storage.getProfile();
  if (!profile) { window.location.hash = '#home'; return; }

  const progress = storage.getProgress();
  const skills = storage.getSkillData();
  const earnedBadges = storage.getBadges();
  const allBadges = engine.getBadgeDefinitions();

  let skillRows = '';
  for (let i = 1; i <= 15; i++) {
    const m = skills[i] ? skills[i].mastery : 0;
    skillRows += `
      <div class="skill-mastery-row">
        <span class="sm-num">${i}</span>
        <div class="sm-bar-wrap">
          <div style="font-size:0.75rem;margin-bottom:2px">${ui.getSkillShortName(i)}</div>
          <div class="sm-bar"><div class="sm-bar-fill" style="width:${m}%;background:${ui.getMasteryColor(m)}"></div></div>
        </div>
        <span class="sm-val" style="color:${ui.getMasteryColor(m)}">${m}%</span>
      </div>
    `;
  }

  let badgesHTML = '';
  allBadges.forEach(b => {
    const earned = earnedBadges.includes(b.id);
    badgesHTML += `
      <div class="badge-item ${earned ? 'earned' : 'locked'}">
        <span class="badge-icon">${b.icon}</span>
        <span class="badge-name">${b.name}</span>
      </div>
    `;
  });

  const avgPct = progress.totalAnswered > 0 ? Math.round((progress.totalCorrect / progress.totalAnswered) * 100) : 0;

  const container = document.getElementById('profile-container');
  container.innerHTML = `
    <div class="profile-card" style="text-align:center">
      <h2 style="color:var(--navy)">${profile.name}</h2>
      <p style="color:var(--muted)">${profile.className}</p>
      <div style="display:flex;justify-content:center;gap:24px;margin-top:16px;flex-wrap:wrap">
        <div><span style="font-size:1.5rem;font-weight:800;color:var(--gold)">⭐ ${progress.xp}</span><br><span style="font-size:0.75rem;color:var(--muted)">XP</span></div>
        <div><span style="font-size:1.5rem;font-weight:800;color:var(--primary)">📖 ${progress.textsCompleted}</span><br><span style="font-size:0.75rem;color:var(--muted)">نص مكتمل</span></div>
        <div><span style="font-size:1.5rem;font-weight:800;color:${ui.getScoreColor(avgPct)}">📊 ${avgPct}%</span><br><span style="font-size:0.75rem;color:var(--muted)">المعدل</span></div>
        <div><span style="font-size:1.5rem;font-weight:800;color:var(--navy)">🏅 ${progress.level}</span><br><span style="font-size:0.75rem;color:var(--muted)">المستوى</span></div>
      </div>
    </div>
    <div class="profile-card">
      <h3>مستوى إتقان المهارات</h3>
      ${skillRows}
    </div>
    <div class="profile-card">
      <h3>الشارات</h3>
      <div class="badges-grid">${badgesHTML}</div>
    </div>
    <div class="profile-card" style="text-align:center">
      <button class="btn btn-danger" id="btn-clear-data">مسح جميع بياناتي</button>
    </div>
  `;

  document.getElementById('btn-clear-data').addEventListener('click', () => {
    if (confirm('هل أنت متأكد من مسح جميع بياناتك؟ لا يمكن التراجع!')) {
      storage.clearAllData();
      window.location.hash = '#home';
      window.location.reload();
    }
  });
}

function renderCertificate() {
  const container = document.getElementById('cert-container');
  const eligibility = engine.checkCertificateEligibility(CONFIG);

  if (eligibility.eligible) {
    let certData = storage.getCertData();
    if (!certData) {
      certData = cert.generateCertificate(CONFIG);
      ui.showConfetti();
    }
    container.innerHTML = cert.renderCertificateHTML(certData, CONFIG);

    setTimeout(() => {
      const dlBtn = document.getElementById('btn-download-cert');
      if (dlBtn) {
        dlBtn.addEventListener('click', () => cert.downloadCertAsPNG());
      }
    }, 100);
  } else {
    const checks = [
      { label: 'إتقان جميع المهارات (80% لكل مهارة)', done: eligibility.allMastered },
      { label: 'إكمال ' + eligibility.minTexts + ' نصًا على الأقل (حاليًا: ' + eligibility.textsCompleted + ')', done: eligibility.enoughTexts },
      { label: 'معدل عام ≥' + eligibility.minAvg + '% (حاليًا: ' + eligibility.avgPercent + '%)', done: eligibility.goodAvg }
    ];

    container.innerHTML = `
      <div class="cert-not-ready">
        <h3>🎓 شهادة الإنجاز</h3>
        <p style="color:var(--muted);margin-bottom:16px">أكمل المتطلبات التالية للحصول على شهادتك:</p>
        <ul class="cert-checklist">
          ${checks.map(c => '<li><span class="check-icon">' + (c.done ? '✅' : '⬜') + '</span>' + c.label + '</li>').join('')}
        </ul>
        <div style="text-align:center;margin-top:20px">
          <button class="btn btn-primary" onclick="window.location.hash='#dashboard'">واصل التدريب</button>
        </div>
      </div>
    `;
  }
}

function renderVerify() {
  const btn = document.getElementById('btn-verify');
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);
  newBtn.addEventListener('click', () => {
    const vid = document.getElementById('verify-id').value.trim();
    const certData = storage.getCertData();
    const resultEl = document.getElementById('verify-result');

    if (certData && certData.verificationId === vid) {
      resultEl.style.background = '#D1FAE5';
      resultEl.innerHTML = '<strong style="color:#065F46">✅ شهادة صحيحة</strong><br>الاسم: ' + certData.name + '<br>التاريخ: ' + ui.formatDate(certData.date) + '<br>المعدل: ' + certData.avgPercent + '%';
    } else {
      resultEl.style.background = '#FEE2E2';
      resultEl.innerHTML = '<strong style="color:#991B1B">❌ رقم التحقق غير صحيح</strong>';
    }
  });
}

function renderAbout() {
  const container = document.getElementById('about-container');
  const slogan2 = CONFIG.slogans ? CONFIG.slogans.secondary : 'نقرأ لنفهم… نفهم لنتميز';

  container.innerHTML = `
    <div class="card">
      <h2>عن مبادرة أبطال القراءة</h2>
      <p style="color:var(--primary);font-weight:600;font-size:1.1rem">${slogan2}</p>
      <p>مبادرة تعليمية تفاعلية تستهدف طلاب الصف السادس الابتدائي لرفع مستوى مهارات القراءة والفهم القرائي استعدادًا لاختبارات نافس الوطنية.</p>
      <p>تتضمن المبادرة ${TEXTS.length} نصًا قرائيًا أصليًا مع ${TEXTS.length * 15} سؤالًا يغطي 15 مهارة قرائية متنوعة.</p>
    </div>
    <div class="card">
      <h2>المهارات الـ 15</h2>
      <ol class="skill-list-about">
        <li>استنتاج مرادفات المفردات من السياق</li>
        <li>تمييز المفردات المتشابهة في المعنى</li>
        <li>تصنيف المترادفات والأضداد</li>
        <li>توظيف المفردات في سياقات مختلفة</li>
        <li>الإجابة عن أسئلة المعلومات المباشرة</li>
        <li>تحديد المعلومات والمقارنة بين المفاهيم</li>
        <li>تمييز الأفكار الرئيسة والفرعية</li>
        <li>وصف الشخصيات والأحداث</li>
        <li>الاستدلال وربط النص بالواقع</li>
        <li>تحديد التعبيرات الجمالية</li>
        <li>إبداء الرأي حول وضوح المعلومات</li>
        <li>إبداء الرأي حول القيم والاتجاهات</li>
        <li>اقتراح عنوان أو خاتمة بديلة</li>
        <li>استخدام الإقناع والتعليل</li>
        <li>توظيف مغزى النص في اقتراح حلول</li>
      </ol>
    </div>
    <div class="card" style="text-align:center">
      ${CONFIG.school_name ? '<p><strong>' + CONFIG.school_name + '</strong></p>' : ''}
      ${CONFIG.teacher_name ? '<p>' + CONFIG.teacher_name + '</p>' : ''}
      <p style="color:var(--muted);font-size:0.8rem">${CONFIG.rights_text || ''}</p>
    </div>
  `;
}

function renderTeacher() {
  const container = document.getElementById('teacher-container');
  const pin = CONFIG.teacher_pin || '1234';
  const isLoggedIn = sessionStorage.getItem('teacher_logged') === 'true';

  if (!isLoggedIn) {
    container.innerHTML = `
      <div class="teacher-login card">
        <h2>🔐 لوحة المعلم</h2>
        <p style="color:var(--muted)">أدخل رمز الدخول</p>
        <div class="form-group">
          <input type="password" id="teacher-pin" class="input-field" placeholder="رمز PIN">
        </div>
        <button class="btn btn-primary btn-block" id="btn-teacher-login">دخول</button>
      </div>
    `;
    document.getElementById('btn-teacher-login').addEventListener('click', () => {
      const entered = document.getElementById('teacher-pin').value;
      if (entered === pin) {
        sessionStorage.setItem('teacher_logged', 'true');
        renderTeacher();
      } else {
        ui.showToast('رمز خاطئ!', '');
      }
    });
    return;
  }

  const progress = storage.getProgress();
  const profile = storage.getProfile();
  const skills = storage.getSkillData();

  container.innerHTML = `
    <div class="teacher-panel">
      <h2>🎓 لوحة المعلم</h2>
      <div class="teacher-section">
        <h3>بيانات الطالب الحالي</h3>
        <p><strong>الاسم:</strong> ${profile ? profile.name : 'لا يوجد'}</p>
        <p><strong>الصف:</strong> ${profile ? profile.className : '-'}</p>
        <p><strong>XP:</strong> ${progress.xp} | <strong>المستوى:</strong> ${progress.level}</p>
        <p><strong>النصوص المكتملة:</strong> ${progress.textsCompleted}</p>
        <p><strong>المعدل:</strong> ${progress.totalAnswered > 0 ? Math.round((progress.totalCorrect / progress.totalAnswered) * 100) : 0}%</p>
      </div>
      <div class="teacher-section">
        <h3>درجات المهارات</h3>
        <table style="width:100%;font-size:0.85rem;border-collapse:collapse">
          <tr style="background:var(--light-blue)"><th style="padding:6px;text-align:right">المهارة</th><th style="padding:6px">الإتقان</th></tr>
          ${Array.from({length:15}, (_, i) => {
            const m = skills[i+1] ? skills[i+1].mastery : 0;
            return '<tr style="border-bottom:1px solid #f0f0f0"><td style="padding:6px">' + (i+1) + '. ' + ui.getSkillShortName(i+1) + '</td><td style="padding:6px;color:' + ui.getMasteryColor(m) + ';font-weight:700">' + m + '%</td></tr>';
          }).join('')}
        </table>
      </div>
      <div class="teacher-section" style="text-align:center">
        <button class="btn btn-primary" id="btn-export-csv">تصدير CSV</button>
        <button class="btn btn-danger" id="btn-reset-student" style="margin-right:8px">إعادة تعيين الطالب</button>
        <button class="btn btn-outline" style="color:var(--navy);border-color:var(--navy);margin-right:8px" onclick="window.location.hash='#dashboard'">العودة</button>
      </div>
    </div>
  `;

  document.getElementById('btn-export-csv').addEventListener('click', exportCSV);
  document.getElementById('btn-reset-student').addEventListener('click', () => {
    if (confirm('هل أنت متأكد من مسح بيانات الطالب؟')) {
      storage.clearAllData();
      ui.showToast('تم مسح البيانات', 'success');
      renderTeacher();
    }
  });
}

function exportCSV() {
  const profile = storage.getProfile();
  const progress = storage.getProgress();
  const skills = storage.getSkillData();
  const avgPct = progress.totalAnswered > 0 ? Math.round((progress.totalCorrect / progress.totalAnswered) * 100) : 0;

  let csv = 'الاسم,الصف,التاريخ,';
  for (let i = 1; i <= 15; i++) csv += 'مهارة ' + i + ',';
  csv += 'المعدل,XP,النصوص المكتملة\n';

  csv += (profile ? profile.name : '') + ',' + (profile ? profile.className : '') + ',' + new Date().toLocaleDateString('ar-SA') + ',';
  for (let i = 1; i <= 15; i++) csv += (skills[i] ? skills[i].mastery : 0) + '%,';
  csv += avgPct + '%,' + progress.xp + ',' + progress.textsCompleted + '\n';

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'reading_heroes_report.csv';
  link.click();
}

function handleRoute(route) {
  const profile = storage.getProfile();

  switch (route.page) {
    case 'home':
      showPage('home');
      renderHeroStats();
      break;
    case 'onboarding':
      showPage('onboarding');
      break;
    case 'dashboard':
      if (!profile) { window.location.hash = '#home'; return; }
      showPage('dashboard');
      renderDashboard();
      break;
    case 'play':
      if (!profile) { window.location.hash = '#home'; return; }
      startGame(route.param || 'practice', route.sub);
      break;
    case 'report':
      showPage('report');
      break;
    case 'profile':
      if (!profile) { window.location.hash = '#home'; return; }
      showPage('profile');
      renderProfile();
      break;
    case 'certificate':
      if (!profile) { window.location.hash = '#home'; return; }
      showPage('certificate');
      renderCertificate();
      break;
    case 'verify':
      showPage('verify');
      renderVerify();
      break;
    case 'teacher':
      showPage('teacher');
      renderTeacher();
      break;
    case 'about':
      showPage('about');
      renderAbout();
      break;
    default:
      showPage('home');
  }
}

async function init() {
  await loadData();
  applyBranding();
  updateHeaderXP();

  document.getElementById('btn-start-journey').addEventListener('click', () => {
    const name = document.getElementById('inp-name').value.trim();
    const cls = document.getElementById('inp-class').value.trim();
    if (!name) { ui.showToast('أدخل اسمك أولًا', ''); return; }
    storage.setProfile({ name, className: cls || 'غير محدد' });
    window.location.hash = '#dashboard';
  });

  document.getElementById('btn-next-q').addEventListener('click', nextQuestion);

  document.getElementById('toggle-text-btn').addEventListener('click', () => {
    const panel = document.getElementById('play-text-panel');
    const btn = document.getElementById('toggle-text-btn');
    panel.classList.toggle('text-collapsed');
    btn.textContent = panel.classList.contains('text-collapsed') ? 'إظهار النص' : 'إخفاء النص';
  });

  document.getElementById('filter-difficulty').addEventListener('change', renderTextsGrid);
  document.getElementById('filter-genre').addEventListener('change', renderTextsGrid);

  const profile = storage.getProfile();
  if (profile && window.location.hash === '#home') {
    window.location.hash = '#dashboard';
  }

  initRouter(handleRoute);
}

init();
