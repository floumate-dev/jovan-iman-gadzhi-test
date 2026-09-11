// Slajder u sekciji "What You'll Learn" (radi na tabletu i mobilnom).
// Dugmad pomeraju listu za jednu karticu; strelica se sakrije na početku i na kraju.
document.querySelectorAll('.learn__slider').forEach((slider) => {
  const track = slider.querySelector('.learn__track');
  const prev = slider.querySelector('.learn__nav--prev');
  const next = slider.querySelector('.learn__nav--next');

  // Jedan korak = širina kartice + razmak između kartica
  const step = () => {
    const card = track.querySelector('.learn-card');
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    return card.offsetWidth + gap;
  };

  // Sakrij "Previous" na početku i "Next" na kraju liste
  const update = () => {
    const max = track.scrollWidth - track.clientWidth - 1;
    prev.classList.toggle('is-hidden', track.scrollLeft <= 1);
    next.classList.toggle('is-hidden', track.scrollLeft >= max);
  };

  prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
  next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
  track.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
});
