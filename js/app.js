import { weddingConfig as fallback } from './config.js';
import { loadWeddingConfig } from './sanity.js';

let cfg = fallback;
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const setText = (id, value) => {
  const element = document.getElementById(id);
  if (element && value != null) element.textContent = value;
};
const setAttr = (id, attribute, value) => {
  const element = document.getElementById(id);
  if (element && value) element.setAttribute(attribute, value);
};
const dateVN = (iso) => {
  if (!iso) return '';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh',
  }).format(date);
};

function render() {
  document.title = `${cfg.groom.shortName} & ${cfg.bride.shortName} — Thiệp cưới`;
  const groomDisplayName = cfg.groom.fullName || cfg.groom.shortName || '';
  const brideDisplayName = cfg.bride.fullName || cfg.bride.shortName || '';
  const firstInitial = (name) => String(name || '').trim().replace(/^[^\p{L}\p{N}]*/u, '').charAt(0).toLocaleUpperCase('vi-VN');
  const values = {
    'opening-groom-name': groomDisplayName,
    'opening-bride-name': brideDisplayName,
    'seal-groom-initial': firstInitial(groomDisplayName),
    'seal-bride-initial': firstInitial(brideDisplayName),
    'closing-groom-name': groomDisplayName,
    'closing-bride-name': brideDisplayName,
    'groom-name': cfg.groom.shortName,
    'bride-name': cfg.bride.shortName,
    'groom-full-name': cfg.groom.fullName,
    'bride-full-name': cfg.bride.fullName,
    'groom-father': cfg.groom.father,
    'groom-mother': cfg.groom.mother,
    'groom-address': cfg.groom.address,
    'bride-father': cfg.bride.father,
    'bride-mother': cfg.bride.mother,
    'wedding-date': dateVN(cfg.event.datetime),
    'event-date': dateVN(cfg.event.datetime),
    'closing-date': dateVN(cfg.event.datetime),
    'opening-date': dateVN(cfg.event.datetime),
    'event-time': cfg.event.displayTime,
    'event-time-note': cfg.event.timeNote,
    'venue-name': cfg.event.venueName,
    'hero-venue': cfg.event.venueShort || cfg.event.venueName,
    'venue-address': cfg.event.venueAddress,
    'lunar-date': cfg.event.lunarDate ? `Âm lịch: ${cfg.event.lunarDate}` : '',
    'hero-quote': cfg.copy.heroQuote,
    'story-text': cfg.copy.story,
    'closing-line': cfg.copy.closing,
    'rsvp-deadline': cfg.rsvp.deadline,
  };
  Object.entries(values).forEach(([id, value]) => setText(id, value));
  const hero = $('#hero-image');
  if (hero) {
    hero.loading = 'eager';
    hero.decoding = 'async';
    hero.onerror = () => console.error('[Wedding] Không tải được ảnh hero:', hero.currentSrc || hero.src);
    setAttr('hero-image', 'src', cfg.heroImage);
  }
  setAttr('directions-button', 'href', cfg.event.mapsDirections);
  setAttr('map-frame', 'src', cfg.event.mapEmbed);
  document.documentElement.dataset.theme = cfg.theme || 'burgundy';
}

function setupBanking() {
  const toggle = $('#banking-toggle');
  const panel = $('#banking-panel');
  if (!toggle || !panel) return;

  setText('banking-bank', cfg.banking?.bankName || '');
  setText('banking-account', cfg.banking?.accountNumber || '');
  setText('banking-holder', cfg.banking?.accountName || '');
  setText('banking-message', cfg.banking?.message || 'Trân trọng cảm ơn tình cảm của bạn!');

  const holderRow = $('#banking-holder-row');
  if (holderRow) holderRow.hidden = !cfg.banking?.accountName;

  const qrWrap = $('#banking-qr-wrap');
  const qr = $('#banking-qr');
  if (qrWrap && qr && cfg.banking?.qrCodeUrl) {
    qr.src = cfg.banking.qrCodeUrl;
    qrWrap.hidden = false;
    qr.addEventListener('error', () => { qrWrap.hidden = true; }, { once: true });
  }

  const closeModal = () => {
    panel.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('banking-modal-open');
    toggle.focus();
  };
  toggle.addEventListener('click', () => {
    panel.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    document.body.classList.add('banking-modal-open');
    panel.querySelector('.banking-modal__close')?.focus();
  });
  panel.querySelectorAll('[data-banking-close]').forEach((button) => {
    button.addEventListener('click', closeModal);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.hidden) closeModal();
  });

  $('#banking-copy')?.addEventListener('click', async () => {
    const account = String(cfg.banking?.accountNumber || '').trim();
    if (!account) return;
    const copyButton = $('#banking-copy');
    try {
      await navigator.clipboard.writeText(account);
      if (copyButton) {
        copyButton.textContent = 'Đã sao chép';
        window.setTimeout(() => { copyButton.textContent = 'Sao chép'; }, 1600);
      }
    } catch (error) {
      console.warn('Không thể sao chép số tài khoản trong trình duyệt này.', error);
    }
  });
}

function observe() {
  const elements = $$('.reveal:not(.is-observed)');
  if (!('IntersectionObserver' in window)) {
    elements.forEach((element) => element.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  }), { threshold: 0.12 });
  elements.forEach((element) => {
    element.classList.add('is-observed');
    observer.observe(element);
  });
}

function gallery() {
  const wrapper = $('#gallery');
  if (!wrapper) return;
  const items = Array.isArray(cfg.gallery) ? cfg.gallery : [];
  wrapper.innerHTML = items.map((item, index) => `
    <button class="gallery-item reveal" type="button" data-i="${index}" aria-label="Mở ảnh ${index + 1}">
      <img src="${item.src}" alt="${escapeHtml(item.alt || '')}" loading="${index === 0 ? 'eager' : 'lazy'}" decoding="async" fetchpriority="${index === 0 ? 'high' : 'auto'}" onerror="this.closest('.gallery-item')?.classList.add('image-error')">
      <span class="gallery-item__caption">${escapeHtml(item.caption || '')}</span>
    </button>`).join('');
  observe();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function countdown() {
  const target = new Date(cfg.event.datetime).getTime();
  const tick = () => {
    const remaining = Math.max(0, target - Date.now());
    setText('days', String(Math.floor(remaining / 86400000)).padStart(2, '0'));
    setText('hours', String(Math.floor(remaining / 3600000) % 24).padStart(2, '0'));
    setText('minutes', String(Math.floor(remaining / 60000) % 60).padStart(2, '0'));
    setText('seconds', String(Math.floor(remaining / 1000) % 60).padStart(2, '0'));
  };
  tick();
  window.setInterval(tick, 1000);
}

function normalizeAudioUrl(rawUrl) {
  const value = String(rawUrl || '').trim();
  if (!value) return '';
  // A Google Drive /file/d/ID/view URL is an HTML preview page, not an audio stream.
  const driveMatch = value.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:[^#]*&)?id=)([\w-]+)/i);
  if (driveMatch) return `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
  return value;
}

function music() {
  const audio = $('#wedding-audio');
  const button = $('#music-toggle');
  const openButton = $('#open-invitation');
  // Prefer the MP3 uploaded as a Sanity file asset; fall back to music.url/config.
  const primaryMusicUrl = cfg.music?.fileUrl || cfg.music?.url;
  if (!audio || !button || !openButton || !primaryMusicUrl) {
    console.warn('[Wedding] Chưa có file nhạc trong music.file hoặc URL dự phòng music.url.');
    return;
  }
  audio.src = normalizeAudioUrl(primaryMusicUrl);
  console.info('[Wedding] Audio source configured:', audio.src);
  audio.load();
  audio.addEventListener('error', () => {
    const fallbackUrl = normalizeAudioUrl(fallback.music?.url);
    const currentUrl = audio.currentSrc || audio.src;
    if (!audio.dataset.fallbackTried && fallbackUrl && currentUrl !== fallbackUrl) {
      audio.dataset.fallbackTried = 'true';
      console.warn('[Wedding] music.url từ Sanity không phát được; thử đường dẫn nhạc dự phòng trong config.js.');
      audio.src = fallbackUrl;
      audio.load();
      // Retry after swapping to the fallback source. If browser policy blocks this,
      // the floating music button remains available for a second explicit click.
      audio.play().then(() => {
        button.setAttribute('aria-pressed', 'true');
        fadeIn();
      }).catch((playError) => {
        console.warn('[Wedding] Cần bấm nút nhạc để bắt đầu phát sau khi đổi nguồn.', playError);
      });
      return;
    }
    console.error('[Wedding] Không tải/phát được nhạc. Trong Sanity, hãy dùng URL âm thanh trực tiếp hoặc tải file âm thanh vào trường File của music.', audio.error);
  });
  const fadeIn = () => {
    const startVolume = Math.max(0, Math.min(1, Number(cfg.music.startVolume ?? 0.5)));
    const targetVolume = Math.max(0, Math.min(1, Number(cfg.music.targetVolume ?? 1)));
    const duration = Math.max(500, Number(cfg.music.fadeDurationMs ?? 8000));
    audio.volume = startVolume;
    const started = performance.now();
    const step = (now) => {
      const progress = Math.min(1, (now - started) / duration);
      audio.volume = startVolume + (targetVolume - startVolume) * progress;
      if (progress < 1 && !audio.paused) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const play = async () => {
    try {
      await audio.play();
      button.setAttribute('aria-pressed', 'true');
      fadeIn();
    } catch (error) {
      console.warn('Trình duyệt chưa cho phát nhạc tự động.', error);
      button.setAttribute('aria-pressed', 'false');
    }
  };
  openButton.addEventListener('click', () => {
    // This is a real user gesture, so browsers can allow playback here.
    play();
  }, { once: true });
  button.addEventListener('click', () => {
    if (audio.paused) play();
    else {
      audio.pause();
      button.setAttribute('aria-pressed', 'false');
    }
  });
}

function calendar() {
  const start = new Date(cfg.event.datetime);
  const end = new Date(start.getTime() + Number(cfg.event.durationMinutes || 240) * 60000);
  const format = (date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const escapeIcs = (value) => String(value || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Luxury Vietnamese Wedding Editorial//VN',
    'CALSCALE:GREGORIAN', 'BEGIN:VEVENT', `UID:wedding-${Date.now()}@local`,
    `DTSTAMP:${format(new Date())}`, `DTSTART:${format(start)}`, `DTEND:${format(end)}`,
    `SUMMARY:${escapeIcs(`Lễ cưới ${cfg.groom.shortName} & ${cfg.bride.shortName}`)}`,
    `LOCATION:${escapeIcs(`${cfg.event.venueName}, ${cfg.event.venueAddress}`)}`,
    `DESCRIPTION:${escapeIcs(cfg.copy.calendarDescription)}`, 'END:VEVENT', 'END:VCALENDAR', '',
  ];
  const objectUrl = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = `thiep-cuoi-${cfg.groom.shortName}-${cfg.bride.shortName}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

function lightbox() {
  const galleryElement = $('#gallery');
  const box = $('#lightbox');
  const image = $('#lightbox-image');
  if (!galleryElement || !box || !image) return;
  let index = 0;
  const items = () => Array.isArray(cfg.gallery) ? cfg.gallery : [];
  const open = (nextIndex) => {
    const list = items();
    if (!list.length) return;
    index = (nextIndex + list.length) % list.length;
    image.src = list[index].src;
    image.alt = list[index].alt || '';
    box.hidden = false;
    document.body.classList.add('is-locked');
  };
  const close = () => { box.hidden = true; document.body.classList.remove('is-locked'); };
  galleryElement.addEventListener('click', (event) => {
    const item = event.target.closest('[data-i]');
    if (item) open(Number(item.dataset.i));
  });
  $('#gallery-more')?.addEventListener('click', () => open(0));
  $('#lightbox-close')?.addEventListener('click', close);
  $('#lightbox-prev')?.addEventListener('click', () => open(index - 1));
  $('#lightbox-next')?.addEventListener('click', () => open(index + 1));
  document.addEventListener('keydown', (event) => {
    if (box.hidden) return;
    if (event.key === 'Escape') close();
    if (event.key === 'ArrowLeft') open(index - 1);
    if (event.key === 'ArrowRight') open(index + 1);
  });
}

async function rsvp() {
  const form = $('#rsvp-form');
  const status = $('#form-status');
  if (!form || !status) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const fields = Object.fromEntries(new FormData(form));
    const endpoint = cfg.rsvp?.endpoint;
    if (!endpoint) {
      status.textContent = 'Biểu mẫu chưa được cấu hình endpoint Google Apps Script.';
      return;
    }
    const payload = {
      wedding: `${cfg.groom.shortName} & ${cfg.bride.shortName}`,
      name: fields.name || '',
      relationship: fields.relationship || '',
      attendance: fields.attendance || '',
      guests: fields.guests || '',
    };
    status.textContent = 'Đang gửi xác nhận…';
    const submitButton = form.querySelector('[type="submit"]');
    if (submitButton) submitButton.disabled = true;
    try {
      // Apps Script cross-origin requests commonly require no-cors; opaque responses cannot confirm sheet writes.
      await fetch(endpoint, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });
      form.reset();
      status.textContent = 'Đã gửi yêu cầu xác nhận. Cảm ơn bạn! Nếu cần kiểm tra, vui lòng đối chiếu dữ liệu trong Google Sheets.';
    } catch (error) {
      console.error('RSVP submit failed:', error);
      status.textContent = 'Chưa gửi được xác nhận. Vui lòng kiểm tra kết nối và thử lại.';
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}

function opening() {
  const openButton = $('#open-invitation');
  const overlay = $('#opening');
  if (!openButton || !overlay) return;
  document.body.classList.add('is-locked');
  openButton.addEventListener('click', () => {
    const content = $('#wedding-content');
    if (content) content.hidden = false;
    document.body.classList.remove('is-locked');
    // The content was hidden while the page initialized. Re-observe reveal items
    // only after it becomes visible so the hero and gallery cannot remain transparent.
    $$('.reveal').forEach((element) => element.classList.remove('is-observed'));
    requestAnimationFrame(() => observe());
    overlay.classList.add('is-opening');
    window.setTimeout(() => { if (overlay.isConnected) overlay.remove(); }, 1000);
  }, { once: true });
}

async function init() {
  cfg = await loadWeddingConfig();
  render();
  setupBanking();
  gallery();
  observe();
  countdown();
  music();
  lightbox();
  await rsvp();
  opening();
  $('#calendar-button')?.addEventListener('click', calendar);
}

init().catch((error) => console.error('Wedding website initialization failed:', error));
