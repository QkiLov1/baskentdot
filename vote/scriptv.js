document.addEventListener('DOMContentLoaded', () => {

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

    const voteGrid = document.getElementById('vote-grid');
    const lightboxModal = document.getElementById('lightbox-modal');
    const lightboxImg = document.getElementById('lightbox-img');
    const closeLightboxBtn = document.getElementById('close-lightbox');
    const infoModal = document.getElementById('info-modal');
    const closeInfoModalBtn = document.getElementById('close-info-modal');

    function loadVoteImages() {
        const hasVotedGlobally = localStorage.getItem('baskent_dot_voted');
        const votedImageId = localStorage.getItem('baskent_dot_voted_image_id');

        db.collection('submissions').orderBy('timestamp', 'desc')
          .onSnapshot((snapshot) => {
            
            if (snapshot.empty) {
                voteGrid.innerHTML = 'Henüz hiç resim yüklenmemiş.';
                return;
            }

            voteGrid.innerHTML = ''; 

            snapshot.forEach(doc => {
                const data = doc.data();
                const docId = doc.id;
                const voteCount = data.voteCount || 0; 

                const card = document.createElement('div');
                card.className = 'vote-card';
                card.innerHTML = `
                    <img src="${data.imageUrl}" alt="Yarışma Resmi" data-id="${docId}">
                    <div class="vote-section">
                        <button class="vote-button" data-id="${docId}">Oyla</button>
                        <span class="vote-count" id="count-${docId}">${voteCount}</span>
                    </div>
                `;

                const voteButton = card.querySelector('.vote-button');
                if (hasVotedGlobally) {
                    voteButton.disabled = true;
                    if (votedImageId === docId) {
                        voteButton.textContent = 'Oylandı';
                    } else {
                        voteButton.textContent = 'Oy Verilemez';
                    }
                }

                voteGrid.appendChild(card);
            });
        }, (error) => {
            console.error("Resimler yüklenirken hata oluştu: ", error);
            voteGrid.innerHTML = 'Resimler yüklenirken bir hata oluştu.';
        });
    }

    async function handleVote(imageId, button) {
        
        if (localStorage.getItem('baskent_dot_voted')) {
            alert('Daha önce oy kullanmışsınız. Sadece bir oy hakkınız bulunmaktadır.');
            disableAllButtons();
            return;
        }

        button.disabled = true;
        button.textContent = '...';

        let ipAddress = null;

        try {

            const ipResponse = await fetch('https://api.ipify.org?format=json');
            if (!ipResponse.ok) throw new Error('IP adresi alınamadı.');
            const ipData = await ipResponse.json();
            ipAddress = ipData.ip;
            const ipVoteRef = db.collection('ip_votes').doc(ipAddress);
            const ipVoteDoc = await ipVoteRef.get();

            if (ipVoteDoc.exists) {
                const existingVoteData = ipVoteDoc.data();
                localStorage.setItem('baskent_dot_voted', 'true');
                if (existingVoteData.imageId) {
                    localStorage.setItem('baskent_dot_voted_image_id', existingVoteData.imageId);
                }
                throw new Error('Sadece bir resim için oy kullanabilirsiniz.');
            }

            await db.runTransaction(async (transaction) => {
                transaction.set(ipVoteRef, {
                    imageId: imageId,
                    ipAddress: ipAddress,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });

                const imageRef = db.collection('submissions').doc(imageId);
                transaction.update(imageRef, {
                    voteCount: firebase.firestore.FieldValue.increment(1)
                });
            });
            
            localStorage.setItem('baskent_dot_voted', 'true');
            localStorage.setItem('baskent_dot_voted_image_id', imageId);
            
            disableAllButtons();

        } catch (error) {
            console.error(`Oylama hatası (IP: ${ipAddress}):`, error.message);
            alert(`Hata: ${error.message}`);
            
            if (error.message.includes('Sadece bir') || error.code === 'permission-denied') {
                disableAllButtons(); 
            } else {
                button.textContent = 'Oyla';
                button.disabled = false;
            }
        }
    }

    function disableAllButtons() {
        const votedImageId = localStorage.getItem('baskent_dot_voted_image_id');
        const allButtons = document.querySelectorAll('.vote-button');
        
        allButtons.forEach(btn => {
            btn.disabled = true;
            if (btn.dataset.id === votedImageId) {
                btn.textContent = 'Oylandı';
            } else {
                btn.textContent = 'Oy Verilemez';
            }
        });
    }

    function closeLightbox() {
        lightboxModal.classList.add('hidden');
    }

    voteGrid.addEventListener('click', (e) => {
        if (e.target.classList.contains('vote-button')) {
            const imageId = e.target.dataset.id;
            handleVote(imageId, e.target);
        }
        if (e.target.tagName === 'IMG') {
            lightboxModal.classList.remove('hidden');
            lightboxImg.src = e.target.src;
        }
    });

    closeLightboxBtn.addEventListener('click', closeLightbox);
    
    if (infoModal && closeInfoModalBtn) {
        closeInfoModalBtn.addEventListener('click', () => {
            infoModal.classList.add('hidden');
        });
    }

    window.addEventListener('click', (event) => {
        if (event.target === infoModal) {
            infoModal.classList.add('hidden');
        }
        if (event.target === lightboxModal) {
            closeLightbox();
        }
    });

    loadVoteImages();
});
