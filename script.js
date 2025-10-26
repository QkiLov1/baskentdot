document.addEventListener('DOMContentLoaded', () => {
    
    const localImageFiles = [
        "1.jpg",
        "2.jpg",
        "3.jpg",
        "4.jpg",
        "5.jpeg",
        "6.jpeg"
    ];
    const imageUrls = localImageFiles.map(file => `images/${file}`);
    const galleryContainer = document.getElementById('gallery-container');
    let currentImageIndex = -1;

    function showRandomImage() {
        if (imageUrls.length === 0) return;
        let randomIndex;
        do {
            randomIndex = Math.floor(Math.random() * imageUrls.length);
        } while (randomIndex === currentImageIndex && imageUrls.length > 1);
        currentImageIndex = randomIndex;
        const imgElement = document.createElement('img');
        imgElement.className = 'background-image';
        imgElement.src = imageUrls[currentImageIndex];
        imgElement.onload = () => {
            const oldImage = galleryContainer.querySelector('.background-image.visible');
            if (oldImage) {
                oldImage.classList.remove('visible');
                setTimeout(() => {
                    if (oldImage.parentElement) oldImage.parentElement.removeChild(oldImage);
                }, 1500);
            }
            galleryContainer.appendChild(imgElement);
            setTimeout(() => imgElement.classList.add('visible'), 50); 
        };
    }
    if (imageUrls.length > 0) {
        showRandomImage();
        setInterval(showRandomImage, 6000);
    }

    const firebaseConfig = {
      apiKey: "AIzaSyAG-nWIuxEIyQ5yM226tRg5x8pFLGiTPjk",
      authDomain: "baskentdot-aad29.firebaseapp.com",
      projectId: "baskentdot-aad29",
      storageBucket: "baskentdot-aad29.firebasestorage.app",
      messagingSenderId: "1016848309143",
      appId: "1:1016848309143:web:6afa1cd3b72c64ea7902d2",
      measurementId: "G-DPRTEGXTKL"
    };

    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    const storage = firebase.storage();

    const infoModal = document.getElementById('info-modal');
    const uploadModal = document.getElementById('upload-modal');
    const cropModal = document.getElementById('crop-modal');
    const termsModal = document.getElementById('terms-modal');
    const galleryModal = document.getElementById('gallery-modal');
    const closeInfoModalBtn = document.getElementById('close-info-modal');
    const closeUploadModalBtn = document.getElementById('close-upload-modal');
    const closeTermsModalBtn = document.getElementById('close-terms-modal');
    const closeGalleryModalBtn = document.getElementById('close-gallery-modal');
    const termsAccepted = document.getElementById('terms-agree').checked;
    const joinBtn = document.getElementById('join-btn');
    const termsBtn = document.getElementById('terms-btn');
    const uploadForm = document.getElementById('upload-form');
    const uploadStatus = document.getElementById('upload-status');
    const fileInput = document.getElementById('file-input');
    const imageToCrop = document.getElementById('image-to-crop');
    const cropAndSaveBtn = document.getElementById('crop-and-save-btn');
    const galleryBtn = document.getElementById('gallery-btn'); 
    const galleryGrid = document.getElementById('gallery-grid');
    const lightboxModal = document.getElementById('lightbox-modal');
    const lightboxImg = document.getElementById('lightbox-img');
    const closeLightboxBtn = document.getElementById('close-lightbox');

    let cropper;
    let processedFileBlob = null;
    let originalFileName = '';
    
    termsBtn.addEventListener('click', (event) => {
        termsModal.classList.remove('hidden');
        event.currentTarget.classList.add('spotlight');
    });

    closeTermsModalBtn.addEventListener('click', () => {
        termsModal.classList.add('hidden');
        termsBtn.classList.remove('spotlight');
    });

    galleryBtn.addEventListener('click', () => {
        loadImagesIntoGallery();
        galleryModal.classList.remove('hidden');
    });

    closeGalleryModalBtn.addEventListener('click', () => {
        galleryModal.classList.add('hidden');
    });

    window.addEventListener('click', (event) => {
        if (event.target === infoModal) infoModal.classList.add('hidden');
        if (event.target === uploadModal) uploadModal.classList.add('hidden');
        if (event.target === cropModal) cropModal.classList.add('hidden');
        if (event.target === termsModal) {
            termsModal.classList.add('hidden');
            termsBtn.classList.remove('spotlight');
        }
        if (event.target === galleryModal) {
            galleryModal.classList.add('hidden');
        }
    });
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        originalFileName = file.name;
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const aspectRatio = img.naturalWidth / img.naturalHeight;
                if (Math.abs(aspectRatio - (16/9)) > 0.01) {
                    imageToCrop.src = img.src;
                    cropModal.classList.remove('hidden');
                    if (cropper) cropper.destroy();
                    cropper = new Cropper(imageToCrop, { aspectRatio: 16/9, viewMode: 1 });
                } else {
                    processImage(img);
                    alert("Fotoğraf 16:9 oranında, kırpma gerekmiyor.");
                }
            };
        };
        reader.readAsDataURL(file);
    });
    cropAndSaveBtn.addEventListener('click', () => {
        const canvas = cropper.getCroppedCanvas({ maxWidth: 1920, maxHeight: 1080 });
        canvas.toBlob((blob) => {
            processedFileBlob = blob;
            cropModal.classList.add('hidden');
            alert("Fotoğraf başarıyla kırpıldı!");
        }, 'image/jpeg', 0.9);
    });
    function processImage(img) {
        const canvas = document.createElement('canvas');
        let { naturalWidth: width, naturalHeight: height } = img;
        if (width > 1920 || height > 1080) {
            const ratio = Math.min(1920 / width, 1080 / height);
            width *= ratio;
            height *= ratio;
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        canvas.toBlob(blob => { processedFileBlob = blob; }, 'image/jpeg', 0.9);
    }
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!processedFileBlob) {
            uploadStatus.textContent = 'Lütfen bir dosya seçin!';
            return;
        }
        const submitBtn = document.getElementById('submit-btn');
        submitBtn.disabled = true;
        uploadStatus.textContent = 'Yükleniyor...';
        try {

            const ipResponse = await fetch('https://api.ipify.org?format=json');
            const ipData = await ipResponse.json();
            const ipAddress = ipData.ip;

            const ipQuery = await db.collection('submissions').where('ipAddress', '==', ipAddress).get();
            if (!ipQuery.empty) {
                throw new Error('Bu IP adresi ile daha önce katılım yapılmış.');
            }

            const timestamp = Date.now();
            const fileName = `${timestamp}-${originalFileName}`;
            const storageRef = storage.ref(`images/${fileName}`);
            const uploadTask = await storageRef.put(processedFileBlob);
            const downloadURL = await uploadTask.ref.getDownloadURL();
            const termsAccepted = document.getElementById('terms-agree').checked;

            await db.collection('submissions').add({
                name: document.getElementById('name-input').value,
                surname: document.getElementById('surname-input').value,
                department: document.getElementById('department-input').value,
                studentClass: document.getElementById('class-input').value,
                studentNumber: document.getElementById('number-input').value,
                imageUrl: downloadURL,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                termsAccepted: termsAccepted,
                ipAddress: ipAddress,
            });

            uploadStatus.textContent = 'Başarıyla yüklendi!';
            uploadForm.reset();
            processedFileBlob = null;
            setTimeout(() => {
                uploadModal.classList.add('hidden');
                uploadStatus.textContent = '';
            }, 2000);
        } catch (error) {
            uploadStatus.textContent = `Hata: ${error.message}`;
        } finally {
            submitBtn.disabled = false;
        }
    });

    async function loadImagesIntoGallery() {
        galleryGrid.innerHTML = 'Yükleniyor...';
        try {
            const snapshot = await db.collection('submissions').orderBy('timestamp', 'desc').get();
            galleryGrid.innerHTML = ''; 
            
            if (snapshot.empty) {
                galleryGrid.innerHTML = 'Henüz hiç resim yüklenmemiş.';
                return;
            }

            snapshot.forEach(doc => {
                const data = doc.data();
                const img = document.createElement('img');
                img.src = data.imageUrl;
                img.alt = 'Galeri Resmi';
                galleryGrid.appendChild(img);
            });
        } catch (error) {
            console.error("Galerideki resimler yüklenirken hata oluştu: ", error);
            galleryGrid.innerHTML = 'Resimler yüklenirken bir hata oluştu.';
        }
    }
    galleryGrid.addEventListener('click', (e) => {
        if (e.target.tagName === 'IMG') {
            lightboxModal.classList.remove('hidden');
            lightboxImg.src = e.target.src;
        }
    });
    function closeLightbox() {
        lightboxModal.classList.add('hidden');
    }
    closeLightboxBtn.addEventListener('click', closeLightbox);
    lightboxModal.addEventListener('click', (e) => {
        if (e.target === lightboxModal) {
            closeLightbox();
        }
    });
});
