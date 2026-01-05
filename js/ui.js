export class UIManager {
    constructor() {
        this.guide = document.getElementById('guide-text');
        this.counter = document.getElementById('counter');
        this.modal = document.getElementById('result-modal');
        this.uiLayer = document.getElementById('ui-layer');
        this.readingContent = document.getElementById('final-reading');
        this.ritualOverlay = document.getElementById('ritual-overlay');
    }

    onStartRitualClick(callback) {
        document.getElementById('start-ritual-btn').onclick = callback;
    }

    onSkipCameraClick(callback) {
        document.getElementById('skip-camera-btn').onclick = callback;
    }

    updateGuide(text, color = "#fff") {
        this.guide.innerText = text;
        this.guide.style.color = color;
    }

    updateCounter(count) {
        this.counter.style.display = 'block';
        this.counter.innerText = `${count} / 3`;
        if (count === 3) {
            this.updateGuide("Đã đủ 3 lá! Chờ kết quả...", "#fff");
        }
    }

    hideOverlay() {
        this.ritualOverlay.style.opacity = 0;
        setTimeout(() => {
            this.ritualOverlay.style.display = 'none';
            this.uiLayer.style.display = 'block';
        }, 1000);
    }

    revealReading(storedCards) {
        this.uiLayer.style.pointerEvents = "auto";
        this.guide.style.opacity = 0;
        
        if (!storedCards || storedCards.length !== 3) {
            console.warn("Need 3 cards to show result.");
            return;
        }

        const datas = storedCards.map(c => c.userData.data);
        
        let cardsHtml = `<div class="poker-hand">`;
        datas.forEach(d => {
            cardsHtml += `
            <div class="ui-card" style="background: none; border: none;">
                <img src="${d.imageUrl}" style="width: 100%; height: 100%; border-radius: 10px; box-shadow: 0 0 10px rgba(255,255,255,0.5);">
            </div>`;
        });
        cardsHtml += `</div>`;

        let html = `
            <div class="reading-section">
                <div class="reading-body">
                    ${cardsHtml}
                    <div class="reading-content" style="text-align: center; margin-top: 20px;">
                        <h2 style="font-size: 2rem; margin-bottom: 10px; color: #FFF;">KẾT QUẢ</h2>
                        <div class="reading-msg" style="color: #aaa; font-style: italic;">
                            (Bạn hãy tự tính điểm nhé!)
                        </div>
                    </div>
                </div>
            </div>`;
        
        this.readingContent.innerHTML = html;
        this.modal.style.display = 'block';
    }
}
