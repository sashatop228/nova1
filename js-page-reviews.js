(function(){
  UI.injectLayout();

  const reviewForm = document.getElementById('reviewForm');
  const ratingInput = document.getElementById('review-rating');
  const ratingStars = Array.from(document.querySelectorAll('.rating-star'));

  function setRating(value){
    const rating = Math.max(1, Math.min(5, Number(value) || 5));
    if(ratingInput) ratingInput.value = String(rating);
    ratingStars.forEach((star, index)=>{
      const active = index < rating;
      star.classList.toggle('active', active);
      star.setAttribute('aria-checked', active ? 'true' : 'false');
    });
  }

  ratingStars.forEach(star=>{
    star.addEventListener('click', ()=> setRating(star.getAttribute('data-rating')));
  });
  setRating(5);

  if(reviewForm){
    reviewForm.addEventListener('submit', function(e){
      e.preventDefault();
      const name = (document.getElementById('review-name')?.value || 'Гость').trim().replace(/[<>]/g, '');
      const rating = Number(ratingInput?.value || 5);
      const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
      UI.showModal('Спасибо за отзыв!', `<p>Спасибо, <b>${name || 'Гость'}</b>! Ваш отзыв с оценкой <b>${stars}</b> принят и отправлен на модерацию.</p>`);
      reviewForm.reset();
      setRating(5);
    });
  }
})();
