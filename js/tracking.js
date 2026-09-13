// Hvatanje parametara iz linka reklame, npr. ?source=instagram&specific_source=video_10_09_26
// Vrednosti se čuvaju u browseru, pa ostaju i kad posetilac pređe na drugu stranicu ili se vrati kasnije.
// Pravilo "last touch": link sa novim parametrima prepisuje stare vrednosti.
(() => {
  const TRACKING_KEYS = ['source', 'specific_source'];
  const STORAGE_KEY = 'lead_tracking';

  const params = new URLSearchParams(location.search);
  const fromUrl = {};
  TRACKING_KEYS.forEach((key) => {
    const value = (params.get(key) || '').trim();
    if (value) fromUrl[key] = value;
  });
  const hasNewValues = Object.keys(fromUrl).length > 0;

  let tracking = fromUrl;
  try {
    if (hasNewValues) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fromUrl));
    } else {
      tracking = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    }
  } catch {
    // localStorage nije dostupan (npr. blokiran u podešavanjima): koristimo samo ono što je u linku
  }

  // Upiši vrednosti u hidden polja forme (prazno ako ih nema)
  TRACKING_KEYS.forEach((key) => {
    document.querySelectorAll(`input[type="hidden"][name="${key}"]`).forEach((input) => {
      input.value = tracking[key] || '';
    });
  });
})();
