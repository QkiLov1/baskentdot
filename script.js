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
const closeInfoModalBtn = document.getElementById('close-info-modal');
const closeUploadModalBtn = document.getElementById('close-upload-modal');
const joinBtn = document.getElementById('join-btn');
const cropAndSaveBtn = document.getElementById('crop-and-save-btn');
const galleryContainer = document.getElementById('gallery-container');
const uploadForm = document.getElementById('upload-form');
const uploadStatus = document.getElementById('upload-status');
const fileInput = document.getElementById('file-input');
const imageToCrop = document.getElementById('image-to-crop');

let cropper;
let processedFileBlob = null;
let originalFileName = '';
let imageUrls = [];
let currentImageIndex = -1;

closeInfoModalBtn.addEventListener('click', () => infoModal.classList.add('hidden'));
joinBtn.addEventListener('click', () => uploadModal.classList.remove('hidden'));
closeUploadModalBtn.addEventListener('click', () => uploadModal.classList.add('hidden'));
window.addEventListener('click', (event) => {
    if (event.target === infoModal) infoModal.classList.add('hidden');
    if (event.target === uploadModal) uploadModal.classList.add('hidden');
    if (event.target === cropModal) cropModal.classList.add('hidden');
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
            const targetRatio = 16 / 9;
            const tolerance = 0.01;

            if (Math.abs(aspectRatio - targetRatio) > tolerance) {
                imageToCrop.src = img.src;
                cropModal.classList.remove('hidden');
                
                if (cropper) cropper.destroy();

                cropper = new Cropper(imageToCrop, {
                    aspectRatio: 16 / 9, viewMode: 1, autoCropArea: 1,
                    movable: false, zoomable: false, rotatable: false, scalable: false
                });
            } else {
                processImage(img);
                alert("Fotoğrafınız 16:9 oranında. Kırpma gerekmiyor.");
            }
        };
    };
    reader.readAsDataURL(file);
});

cropAndSaveBtn.addEventListener('click', () => {
    const canvas = cropper.getCroppedCanvas({
        maxWidth: 1920, maxHeight: 1080, imageSmoothingQuality: 'high',
    });
    canvas.toBlob((blob) => {
        processedFileBlob = blob;
        cropModal.classList.add('hidden');
        alert("Fotoğraf başarıyla kırpıldı ve onaylandı!");
    }, 'image/jpeg', 0.9);
});

function processImage(img) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    let targetWidth = img.naturalWidth;
    let targetHeight = img.naturalHeight;
    if (targetWidth > 1920 || targetHeight > 1080) {
        const ratio = Math.min(1920 / targetWidth, 1080 / targetHeight);
        targetWidth *= ratio;
        targetHeight *= ratio;
    }
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
    canvas.toBlob((blob) => {
        processedFileBlob = blob;
    }, 'image/jpeg', 0.9);
}

uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!processedFileBlob) {
        uploadStatus.textContent = 'Lütfen bir dosya seçin ve gerekiyorsa kırpın!';
        uploadStatus.style.color = 'red';
        return;
    }

    const name = document.getElementById('name-input').value;
    const surname = document.getElementById('surname-input').value;
    const department = document.getElementById('department-input').value;
    const studentClass = document.getElementById('class-input').value;
    const studentNumber = document.getElementById('number-input').value;
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = true;
    uploadStatus.textContent = 'Yükleniyor, lütfen bekleyin...';
    uploadStatus.style.color = 'orange';

    try {
        const timestamp = Date.now();
        const fileName = `${timestamp}-${originalFileName}`;
        const storageRef = storage.ref(`images/${fileName}`);
        const uploadTask = await storageRef.put(processedFileBlob);
        const downloadURL = await uploadTask.ref.getDownloadURL();

        await db.collection('submissions').add({
            name, surname, department, studentClass, studentNumber,
            imageUrl: downloadURL,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        uploadStatus.textContent = 'Tasarımınız başarıyla yüklendi!';
        uploadStatus.style.color = 'green';
        uploadForm.reset();
        processedFileBlob = null;
        
        setTimeout(() => {
            uploadModal.classList.add('hidden');
            uploadStatus.textContent = '';
            imageUrls.push(downloadURL); 
        }, 2000);

    } catch (error) {
        console.error("Yükleme sırasında hata oluştu: ", error);
        uploadStatus.textContent = `Bir hata oluştu: ${error.message}`;
        uploadStatus.style.color = 'red';
    } finally {
        submitBtn.disabled = false;
    }
});

async function loadImages() {
    try {
        const snapshot = await db.collection('submissions').get();
        if (snapshot.empty) {
            console.log('Gösterilecek bir resim bulunamadı.');
            return;
        }
        snapshot.forEach(doc => imageUrls.push(doc.data().imageUrl));

        if (imageUrls.length > 0) {
            showRandomImage();
            setInterval(showRandomImage, 6000);
        }
    } catch (error) {
        console.error("Resim URL'leri yüklenirken hata oluştu: ", error);
    }
}

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
                if (oldImage.parentElement) {
                    oldImage.parentElement.removeChild(oldImage);
                }
            }, 1500);
        }
        galleryContainer.appendChild(imgElement);
        setTimeout(() => imgElement.classList.add('visible'), 50); 
    };
}

document.addEventListener('DOMContentLoaded', loadImages);