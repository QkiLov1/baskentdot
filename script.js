document.addEventListener('DOMContentLoaded', () => {
    
    const galleryGrid = document.getElementById('gallery-grid');
    const lightboxModal = document.getElementById('lightbox-modal');
    const lightboxImg = document.getElementById('lightbox-img');
    const closeLightboxBtn = document.getElementById('close-lightbox');

    const podium = document.querySelector('.podium');

    function openLightbox(e) {
        if (e.target.tagName === 'IMG') {
            lightboxImg.src = e.target.src;
            lightboxModal.classList.remove('hidden');
        }
    }

    if (galleryGrid) {
        galleryGrid.addEventListener('click', openLightbox);
    }

    if (podium) {
        podium.addEventListener('click', openLightbox);
    }

    function closeLightbox() {
        lightboxModal.classList.add('hidden');
    }

    if (closeLightboxBtn) {
        closeLightboxBtn.addEventListener('click', closeLightbox);
    }

    if (lightboxModal) {
        lightboxModal.addEventListener('click', (e) => {
            if (e.target === lightboxModal) {
                closeLightbox();
            }
        });
    }

});