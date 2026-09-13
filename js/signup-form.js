// Popup forma "Enter your details": otvara se na svako dugme "SAVE MY FREE SPOT".
// Tri polja sa validacijom: ime i prezime, email, telefon (intl-tel-input biblioteka).
const dialog = document.querySelector('.signup');
const form = dialog.querySelector('.signup__form');
const submitBtn = form.querySelector('.signup__submit');
const submitText = submitBtn.querySelector('span');
const formError = form.querySelector('.signup__form-error');

const nameInput = form.querySelector('#signup-name');
const emailInput = form.querySelector('#signup-email');
const phoneInput = form.querySelector('#signup-phone');


// ---------- Telefon: zastava + pozivni broj ----------
// Država se bira po IP adresi posetioca (ipapi.co vraća npr. { country_code: "HR" }).
// Ako servis ne odgovori, podrazumevana je Srbija.
const iti = window.intlTelInput(phoneInput, {
  initialCountry: '',
  initialCountryLookup: async () => {
    try {
      const res = await fetch('https://ipapi.co/json/');
      const data = await res.json();
      console.log('Država po IP adresi:', data.country_code);
      return (data.country_code || 'rs').toLowerCase();
    } catch {
      return 'rs';
    }
  },
  separateDialCode: true,          // pozivni broj (+381) stoji levo, ne kuca se
  countrySelectorMode: 'DROPDOWN', // lista država se otvara unutar popup-a (i na mobilnom)
  countrySearch: true,
});


// ---------- Pravila za svako polje ----------
// Svaka funkcija vraća tekst greške, ili prazan string ako je polje ispravno.
const WORD = /^\p{L}+(?:['-]\p{L}+)*$/u;   // slova (i š, ć, đ...), dozvoljeno Ana-Marija, O'Neil

function checkName() {
  const words = nameInput.value.trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return 'Please enter your first and last name';
  if (!words.every((w) => WORD.test(w))) return 'Name can only contain letters';
  if (words.some((w) => w.length < 2)) return 'Please enter your full first and last name';
  return '';
}

function checkEmail() {
  const value = emailInput.value.trim();
  if (!value) return 'Please enter your email address';
  // nesto@domen.ekstenzija (ekstenzija najmanje 2 slova: .com, .net, .rs, .co.uk...)
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(value)) return 'Please enter a valid email address';
  return '';
}

const PHONE_ERRORS = {
  TOO_SHORT: 'Phone number is too short',
  TOO_LONG: 'Phone number is too long',
  INVALID_COUNTRY_CODE: 'Please select your country',
};

function checkPhone() {
  if (!phoneInput.value.trim()) return 'Please enter your phone number';
  // Biblioteka zna tačna pravila (dužinu i format) za svaku državu
  if (iti.isValidNumber()) return '';
  return PHONE_ERRORS[iti.getValidationError()] || 'Invalid phone number for this country';
}

const fields = [
  { input: nameInput, check: checkName },
  { input: emailInput, check: checkEmail },
  { input: phoneInput, check: checkPhone },
];


// ---------- Prikaz greške ispod polja ----------
function validate(field) {
  const message = field.check();
  const box = field.input.closest('.signup__field');
  box.classList.toggle('is-invalid', Boolean(message));
  box.querySelector('.signup__error').textContent = message;
  field.input.setAttribute('aria-invalid', message ? 'true' : 'false');
  return !message;
}

fields.forEach((field) => {
  // Kad korisnik napusti polje, proveri ga (ali ne ako je prazno i još ga nije dirao)
  field.input.addEventListener('blur', () => {
    if (field.input.value.trim()) validate(field);
  });
  // Ako polje već ima grešku, proveravaj dok kuca, pa greška nestane čim bude ispravno
  field.input.addEventListener('input', () => {
    if (field.input.closest('.signup__field').classList.contains('is-invalid')) validate(field);
  });
});

// Promena države menja pravila, pa se broj proverava ponovo
phoneInput.addEventListener('countrychange', () => {
  if (phoneInput.value.trim()) validate(fields[2]);
});


// ---------- Slanje ----------
// Podaci idu na make.com webhook, a scenario ih upisuje kao novi red u Google Sheets.
const MAKE_WEBHOOK_URL = 'https://hook.eu2.make.com/xctuv8u6jdvwut6wskmexji79lq26j5y';

async function sendLead(lead) {
  console.log('Lead:', lead);

  const res = await fetch(MAKE_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(lead),
  });
  // Ako Make ne primi podatke (npr. scenario je obrisan), prikazuje se poruka o grešci
  if (!res.ok) throw new Error('Webhook error ' + res.status);
}

// Današnji datum po beogradskom vremenu u formatu DD_MM_YYYY ("13/09/2026" -> "13_09_2026").
// Na thank you stranici tajmer računa rok ponude od ovog datuma.
function todayOptinTime() {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Belgrade', day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date()).replaceAll('/', '_');
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  formError.hidden = true;

  // Proveri sva polja; fokus ide na prvo pogrešno
  const results = fields.map(validate);
  const firstBad = fields[results.indexOf(false)];
  if (firstBad) {
    firstBad.input.focus();
    return;
  }

  const words = nameInput.value.trim().split(/\s+/);
  const optinTime = todayOptinTime();
  const lead = {
    fullName: words.join(' '),
    firstName: words[0],
    lastName: words.slice(1).join(' '),
    email: emailInput.value.trim(),
    phone: iti.getNumber(),                          // npr. +385911234567
    country: iti.getSelectedCountry().iso2,      // npr. "hr"
    source: form.elements.source.value,              // iz linka reklame (js/tracking.js), npr. "instagram"
    specific_source: form.elements.specific_source.value,  // npr. "video_10_09_26"
    optin_time: optinTime,                           // npr. "13_09_2026"
    submittedAt: new Date().toISOString(),
    page: location.href,
  };

  // Dok se šalje, dugme je isključeno (nema duplih klikova)
  submitBtn.disabled = true;
  submitText.textContent = 'Sending…';
  try {
    await sendLead(lead);
    // Uspeh: idi na thank you stranicu, tajmer ponude kreće od današnjeg datuma
    location.href = `thank-you.html?optin_time=${optinTime}`;
  } catch (err) {
    console.error(err);
    formError.hidden = false;       // podaci ostaju u poljima
  } finally {
    submitBtn.disabled = false;
    submitText.textContent = 'Get my free ticket';
  }
});


// ---------- Otvaranje i zatvaranje ----------
document.querySelectorAll('[data-open-signup]').forEach((btn) => {
  btn.addEventListener('click', (event) => {
    event.preventDefault();
    dialog.showModal();
    document.body.classList.add('is-locked');
  });
});

// Klik na tamnu pozadinu (van kartice) zatvara popup; Esc ga zatvara sam od sebe
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) dialog.close();
});
dialog.addEventListener('close', () => document.body.classList.remove('is-locked'));
