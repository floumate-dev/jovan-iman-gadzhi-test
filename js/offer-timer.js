// Tajmer ponude na thank you stranici.
// Rok = datum prijave iz linka (optin_time=DD_MM_YYYY) + 2 dana, u 23:59:59 po beogradskom vremenu.
// Primer: optin_time=10_09_2026 -> ponuda ističe 12.09.2026. u 23:59:59.
const OFFER_DAYS = 2;
const TIME_ZONE = 'Europe/Belgrade';
const STORAGE_KEY = 'optin_time';

const pad = (n) => String(n).padStart(2, '0');


// ---------- Pomoćne funkcije za datum ----------
// "10_09_2026" (ili "10-09-2026") -> { day: 10, month: 9, year: 2026 }; pogrešan format -> null
function parseOptinTime(raw) {
  const match = String(raw || '').trim().match(/^(\d{1,2})[_-](\d{1,2})[_-](\d{4})$/);
  if (!match) return null;
  const [day, month, year] = match.slice(1).map(Number);
  // Odbij datume koji ne postoje, npr. 31_02_2026
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
  return { day, month, year };
}

const formatOptinTime = (date) => `${pad(date.day)}_${pad(date.month)}_${date.year}`;

// Današnji datum po beogradskom vremenu ("13/09/2026" -> "13_09_2026")
function todayInBelgrade() {
  const text = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE, day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date());
  return parseOptinTime(text.replaceAll('/', '_'));
}

// Tačan trenutak kada je u Beogradu dati datum i sat (radi i za letnje i za zimsko vreme).
// Date.UTC sam prebacuje višak dana u sledeći mesec (npr. 30.09. + 2 dana = 02.10.).
function belgradeMoment(year, month, day, hour, minute, second) {
  const guess = Date.UTC(year, month - 1, day, hour, minute, second);
  const parts = {};
  new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(guess)).forEach((p) => { parts[p.type] = Number(p.value); });
  const belgradeAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return guess - (belgradeAsUtc - guess);   // oduzmi razliku Beograd - UTC (1h zimi, 2h leti)
}


// ---------- Datum prijave: link > sačuvan u browseru > danas ----------
function loadSaved() {
  try { return parseOptinTime(localStorage.getItem(STORAGE_KEY)); } catch { return null; }
}
function save(date) {
  try { localStorage.setItem(STORAGE_KEY, formatOptinTime(date)); } catch { /* nije dostupan */ }
}

const params = new URLSearchParams(location.search);
let optin = parseOptinTime(params.get('optin_time'));

if (optin) {
  save(optin);                       // link je glavni izvor: zapamti ga za povratak
} else {
  optin = loadSaved() || todayInBelgrade();
  save(optin);
  // Upiši datum u adresu (bez ponovnog učitavanja), da link uvek pokazuje isti rok
  params.set('optin_time', formatOptinTime(optin));
  history.replaceState(null, '', `${location.pathname}?${params}`);
}

const deadline = belgradeMoment(optin.year, optin.month, optin.day + OFFER_DAYS, 23, 59, 59);

// Datum roka u tekstu "Offer ends 12.09. at 23:59"
const endDate = new Date(Date.UTC(optin.year, optin.month - 1, optin.day + OFFER_DAYS));
const endText = `${pad(endDate.getUTCDate())}.${pad(endDate.getUTCMonth() + 1)}.`;
document.querySelectorAll('[data-offer-deadline]').forEach((el) => { el.textContent = endText; });


// ---------- Popup "ponuda je istekla" ----------
const popup = document.querySelector('.expired');
popup.addEventListener('click', (event) => {
  if (event.target === popup) popup.close();   // klik na tamnu pozadinu
});
popup.querySelector('.expired__close').addEventListener('click', () => popup.close());


// ---------- Odbrojavanje ----------
const timer = document.querySelector('.offer-timer');
const units = {
  days: timer.querySelector('[data-timer="days"]'),
  hours: timer.querySelector('[data-timer="hours"]'),
  minutes: timer.querySelector('[data-timer="minutes"]'),
  seconds: timer.querySelector('[data-timer="seconds"]'),
};

function render(msLeft) {
  const total = Math.max(0, Math.floor(msLeft / 1000));
  units.days.textContent = pad(Math.floor(total / 86400));
  units.hours.textContent = pad(Math.floor((total % 86400) / 3600));
  units.minutes.textContent = pad(Math.floor((total % 3600) / 60));
  units.seconds.textContent = pad(total % 60);
}

// Posle isteka: dugmad postaju siva i ne vode nigde, a iskače poruka
function expire() {
  timer.classList.add('is-expired');
  timer.querySelector('[data-timer-title]').textContent = 'Offer expired';
  document.querySelectorAll('[data-offer-cta]').forEach((cta) => {
    cta.classList.add('is-expired');
    cta.removeAttribute('href');
    cta.setAttribute('aria-disabled', 'true');
    cta.querySelector('[data-offer-cta-text]').textContent = 'Offer expired';
  });
  popup.showModal();
}

let timerId;
function tick() {
  const msLeft = deadline - Date.now();
  render(msLeft);
  if (msLeft <= 0) {
    clearInterval(timerId);
    expire();
  }
}

tick();
if (deadline > Date.now()) timerId = setInterval(tick, 1000);
