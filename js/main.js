import { TarotScene } from './scene.js';
import { RitualManager } from './ritual.js';
import { UIManager } from './ui.js';
import { HandTracker } from './hand-tracking.js';
import { generateDeck } from './data-loader.js';
import { generateParticleTexture, shuffleArray } from './utils.js';
import { RITUAL_STATE } from './config.js';

class TarotApp {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.particleTexture = generateParticleTexture();
        this.sceneManager = new TarotScene(this.container, this.particleTexture);
        this.uiManager = new UIManager();
        this.ritualManager = new RitualManager(this.sceneManager, this.uiManager, () => {
             // Keep camera running for reset gesture
        });
        this.handTracker = new HandTracker((results) => this.ritualManager.onResults(results));
        
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        window.addEventListener('resize', () => this.sceneManager.onResize());
        
        this.init();
    }

    async init() {
        try {
            const deck = generateDeck();
            shuffleArray(deck);
            
            this.sceneManager.createCards(deck);
            this.sceneManager.createBackgroundStars();
        } catch (error) {
            console.error("Initialization Error:", error);
        }
        
        setTimeout(() => {
            const loading = document.getElementById('loading');
            if (loading) {
                loading.style.opacity = 0;
                setTimeout(() => {
                    loading.style.display = 'none';
                }, 800);
            }
        }, 1500);

        const welcomeScreen = document.getElementById('welcome-screen');
        if (welcomeScreen) welcomeScreen.style.display = 'none';

        try {
            await this.handTracker.init();
            
            const cameraStarted = await this.handTracker.start();
            if (cameraStarted) {
                const uiLayer = document.getElementById('ui-layer');
                if (uiLayer) uiLayer.style.display = 'block';
                
                this.ritualManager.currentState = RITUAL_STATE.PREPARING;
                this.uiManager.updateGuide("Tách ngón cái và ngón trỏ (🤏) để bắt đầu tráo bài", "rgba(255,255,255,0.5)");
                
                this.animate();
            } else {
                alert("Không thể khởi động camera. Vui lòng cấp quyền và tải lại trang.");
            }
        } catch (err) {
            console.error(err);
            alert("Lỗi khởi động: " + err.message);
        }
    }

    animate(time) {
        requestAnimationFrame((t) => this.animate(t));
        TWEEN.update(time);
        
        this.sceneManager.updateExplosions();
        this.ritualManager.updateAnimation(time);
        
        if (this.sceneManager.starFieldMesh) {
            this.sceneManager.starFieldMesh.rotation.y = time * 0.00005;
            if (this.ritualManager.currentState === RITUAL_STATE.SHUFFLING) {
                this.sceneManager.starFieldMesh.rotation.y += 0.001;
            }
            this.sceneManager.starFieldMesh.material.size = Math.sin(time * 0.002) * 0.1 + 0.9;
        }

        this.sceneManager.renderer.render(this.sceneManager.scene, this.sceneManager.camera);
    }
}

new TarotApp();
