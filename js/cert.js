import * as storage from './storage.js';
import { generateVerificationId } from './engine.js';
import { getGrade, formatDate } from './ui.js';

export function generateCertificate(config) {
  const profile = storage.getProfile();
  const progress = storage.getProgress();
  const avgPercent = progress.totalAnswered > 0 ? Math.round((progress.totalCorrect / progress.totalAnswered) * 100) : 0;
  const grade = getGrade(avgPercent);
  const vid = generateVerificationId();
  const date = new Date().toISOString();

  const certData = {
    name: profile.name,
    className: profile.className,
    date,
    avgPercent,
    grade,
    verificationId: vid,
    xp: progress.xp,
    textsCompleted: progress.textsCompleted
  };

  storage.setCertData(certData);
  return certData;
}

export function renderCertificateHTML(certData, config) {
  const slogan = config.slogans ? config.slogans.primary : 'أبطال القراءة: من نصٍّ إلى إنجاز';
  const certTitle = config.certificate ? config.certificate.title : 'شهادة إنجاز';
  const bodyTemplate = config.certificate ? config.certificate.body_template : 'يُشهد بأن الطالب/ة {name} من الصف {class} قد أتمّ بنجاح تحدي أبطال القراءة بتقدير {grade} وبمعدل {avg}%';

  const body = bodyTemplate
    .replace('{name}', certData.name)
    .replace('{class}', certData.className)
    .replace('{grade}', certData.grade)
    .replace('{avg}', certData.avgPercent);

  return `
    <div class="cert-preview" id="cert-printable">
      <div class="cert-logos">
        <img src="${config.logos ? config.logos.school : 'assets/logo-school.png'}" alt="شعار المدرسة" onerror="this.style.display='none'">
        <img src="${config.logos ? config.logos.teacher : 'assets/logo-teacher.png'}" alt="شعار المعلم" onerror="this.style.display='none'">
      </div>
      <h2 class="cert-title">${certTitle}</h2>
      <p class="cert-slogan">${slogan}</p>
      <div class="cert-body">
        <p>${body}</p>
        <p class="cert-name">${certData.name}</p>
      </div>
      <div class="cert-details">
        <p>التاريخ: ${formatDate(certData.date)}</p>
        <p>عدد النصوص المكتملة: ${certData.textsCompleted}</p>
        <p>النقاط: ${certData.xp} XP</p>
        ${config.school_name ? '<p>' + config.school_name + '</p>' : ''}
        ${config.teacher_name ? '<p>' + config.teacher_name + '</p>' : ''}
      </div>
      <div class="cert-vid">رقم التحقق: ${certData.verificationId}</div>
    </div>
    <div class="cert-actions">
      <button class="btn btn-primary" onclick="window.print()">طباعة / PDF</button>
      <button class="btn btn-gold" id="btn-download-cert">تحميل PNG</button>
    </div>
  `;
}

export function downloadCertAsPNG() {
  const el = document.getElementById('cert-printable');
  if (!el) return;

  const canvas = document.createElement('canvas');
  const scale = 2;
  canvas.width = el.offsetWidth * scale;
  canvas.height = el.offsetHeight * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const data = new XMLSerializer().serializeToString(el);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${el.offsetWidth}" height="${el.offsetHeight}">
    <foreignObject width="100%" height="100%">
      <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Tajawal,sans-serif;direction:rtl">${data}</div>
    </foreignObject>
  </svg>`;

  const img = new Image();
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  img.onload = function () {
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    const link = document.createElement('a');
    link.download = 'certificate.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };
  img.onerror = function () {
    window.print();
  };
  img.src = url;
}
