import { RITUAL_STATE } from './config.js';

export class RitualManager {
    constructor(sceneManager, uiManager, onRitualFinished) {
        this.sceneManager = sceneManager;
        this.uiManager = uiManager;
        this.onRitualFinished = onRitualFinished;
        this.currentState = RITUAL_STATE.IDLE;
        
        this.shuffleStartTime = 0;
        this.rotationSpeed = 0;
        this.avgPinchDistance = 0.1;
        this.leftHandActive = false;
        this.rightHandActive = false;
        this.handsDetected = false;
        
        this.inspectingCard = null;
        this.pickedCards = [];
        this.finalPositions = [
            { x: -1.6, y: 0, z: 13.0, angle: -0.1 },
            { x: 0, y: 0, z: 13.1, angle: 0 },
            { x: 1.6, y: 0, z: 13.2, angle: 0.1 }
        ];

        this.holdingPositions = [
            { x: -0.5, y: -3.5, z: 10.0, angle: 0 },
            { x: 0, y: -3.5, z: 10.1, angle: 0 },
            { x: 0.5, y: -3.5, z: 10.2, angle: 0 }
        ];
    }
    
    getPinchDistance(hand) {
        const thumbTip = hand[4];
        const indexTip = hand[8];
        
        const dx = thumbTip.x - indexTip.x;
        const dy = thumbTip.y - indexTip.y;
        const dz = (thumbTip.z || 0) - (indexTip.z || 0);
        
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    isLeftHand(hand) {
        return hand[0].x > 0.5;
    }

    isHandOpen(hand) {
        const wrist = hand[0];
        const tips = [4, 8, 12, 16, 20];
        const joints = [3, 7, 11, 15, 19]; 
        
        let extendedCount = 0;
        
        const thumbTip = hand[tips[0]];
        const thumbJoint = hand[joints[0]];
        const dThumbTip = Math.hypot(thumbTip.x - wrist.x, thumbTip.y - wrist.y);
        const dThumbJoint = Math.hypot(thumbJoint.x - wrist.x, thumbJoint.y - wrist.y);
        
        const thumbRatio = dThumbTip / dThumbJoint;
        const thumbOpen = thumbRatio > 1.1;
        if (thumbOpen) extendedCount++;
        
        for (let i = 1; i < 5; i++) {
            const tip = hand[tips[i]];
            const joint = hand[joints[i]];
            
            const dTip = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
            const dJoint = Math.hypot(joint.x - wrist.x, joint.y - wrist.y);
            
            const ratio = dTip / dJoint;
            const isOpen = ratio > 1.05;
            
            if (isOpen) extendedCount++;
        }
        
        return extendedCount === 5;
    }

    onResults(results) {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const isResetGesture = results.multiHandLandmarks.some(hand => this.isHandOpen(hand));
            if (isResetGesture && this.currentState === RITUAL_STATE.FINISHED) {
                this.resetGame();
                return;
            }
        }

        if (this.currentState === RITUAL_STATE.IDLE || this.currentState === RITUAL_STATE.FINISHED) return;

        this.handsDetected = false;
        let pinchDistances = [];
        this.leftHandActive = false;
        this.rightHandActive = false;

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            this.handsDetected = true;
            
            results.multiHandLandmarks.forEach(hand => {
                const dist = this.getPinchDistance(hand);
                pinchDistances.push(dist);
                
                if (this.isLeftHand(hand)) {
                    this.leftHandActive = true;
                } else {
                    this.rightHandActive = true;
                }
            });

            const rawAvgPinch = pinchDistances.reduce((a, b) => a + b, 0) / pinchDistances.length;
            const smoothingFactor = 0.3;
            this.avgPinchDistance = smoothingFactor * rawAvgPinch + (1 - smoothingFactor) * this.avgPinchDistance;
        }

        const MIN_PINCH_FOR_SHUFFLE = 0.08;
        const MAX_PINCH_FOR_REVEAL = 0.04;

        if (this.avgPinchDistance > MIN_PINCH_FOR_SHUFFLE && this.handsDetected) {
            if (this.pickedCards.length < 3) {
                if (this.currentState === RITUAL_STATE.PREPARING || this.currentState === RITUAL_STATE.WAITING_FOR_NEXT) {
                    this.currentState = RITUAL_STATE.SHUFFLING;
                    this.shuffleStartTime = Date.now();
                }
                this.uiManager.updateGuide(`Đang tráo bài... (${this.pickedCards.length}/3)`, "#fff");
            }
        } else if (this.avgPinchDistance < MAX_PINCH_FOR_REVEAL && this.handsDetected && this.currentState === RITUAL_STATE.SHUFFLING) {
            this.currentState = RITUAL_STATE.STOPPING;
            this.selectCardFromRitual();
        }


        if (this.currentState === RITUAL_STATE.PREPARING) {
            this.uiManager.updateGuide("Tách ngón cái và ngón trỏ (🤏) để bắt đầu tráo bài", "rgba(255,255,255,0.5)");
        }
    }

    resetGame() {
        location.reload(); 
    }

    selectCardFromRitual() {
        if (this.pickedCards.length >= 3) return;

        const availableCards = this.sceneManager.cardGroup.children.filter(c => !c.userData.isPicked);
        if (availableCards.length === 0) return;

        const randomIndex = Math.floor(Math.random() * availableCards.length);
        const card = availableCards.splice(randomIndex, 1)[0];
        
        const index = this.pickedCards.length;
        this.pickedCards.push(card);
        this.uiManager.updateCounter(this.pickedCards.length);

        const holdingPos = this.holdingPositions[index];
        this.uiManager.updateGuide(`Đã rút lá thứ ${index + 1}!`, "#FFD700");

        const isLastCard = this.pickedCards.length === 3;
        
        this.pickCardToHolding(card, holdingPos, () => {
             if (isLastCard) {
                 this.uiManager.updateGuide("Đang lật bài...", "#FFD700");
                 setTimeout(() => this.revealAllCards(), 500);
             } else {
                 this.currentState = RITUAL_STATE.WAITING_FOR_NEXT;
                 this.uiManager.updateGuide("Tiếp tục tráo để rút lá tiếp theo", "#fff");
             }
        });
    }

    pickCardToHolding(card, targetPos, onComplete) {
        card.userData.isPicked = true;
        this.sceneManager.scene.attach(card); 

        new TWEEN.Tween(card.position)
            .to({ x: targetPos.x, y: targetPos.y, z: targetPos.z }, 800)
            .easing(TWEEN.Easing.Cubic.InOut)
            .start();

        new TWEEN.Tween(card.rotation)
            .to({ x: 0, y: 0, z: targetPos.angle || 0 }, 800)
            .easing(TWEEN.Easing.Cubic.InOut)
            .start();
            
        new TWEEN.Tween(card.scale)
            .to({ x: 1.5, y: 1.5, z: 1.5 }, 800)
            .easing(TWEEN.Easing.Cubic.InOut)
            .onComplete(() => {
                if (onComplete) onComplete();
            })
            .start();
    }

    revealAllCards() {
        this.sceneManager.cardGroup.children.forEach(c => {
            if (!c.userData.isPicked) {
                new TWEEN.Tween(c.position)
                    .to({ z: -50 }, 1000) 
                    .easing(TWEEN.Easing.Cubic.In)
                    .start();
                
                new TWEEN.Tween(c.scale)
                    .to({ x: 0, y: 0, z: 0 }, 1000) 
                    .easing(TWEEN.Easing.Cubic.In)
                    .start();
            }
        });

        let arrivedCount = 0;
        this.pickedCards.forEach((card, index) => {
            const finalPos = this.finalPositions[index];
            card.userData.isRevealed = false;
            
            new TWEEN.Tween(card.position)
                .to({ x: finalPos.x, y: finalPos.y, z: finalPos.z }, 1000)
                .easing(TWEEN.Easing.Back.Out)
                .delay(index * 100)
                .start();

            new TWEEN.Tween(card.rotation)
                .to({ x: 0, y: 0, z: finalPos.angle }, 1000)
                .easing(TWEEN.Easing.Back.Out)
                .delay(index * 100)
                .start();

            new TWEEN.Tween(card.scale)
                .to({ x: 1, y: 1, z: 1 }, 1000) 
                .easing(TWEEN.Easing.Back.Out)
                .delay(index * 100)
                .onComplete(() => {
                    arrivedCount++;
                    if (arrivedCount === 3) {
                        this.uiManager.updateGuide("Đã chia bài xong!", "#FFD700");
                        
                        setTimeout(() => {
                            this.pickedCards.forEach((c, i) => {
                                let delay = 0;
                                if (i === 0) delay = 0;
                                else if (i === 1) delay = 1000;
                                else if (i === 2) delay = 3000;

                                setTimeout(() => {
                                    this.revealCard(c, i);
                                }, delay);
                            });
                        }, 1000);
                    }
                })
                .start();
        });
    }

    revealCard(card, index) {
        if (card.userData.isRevealed) return;
        card.userData.isRevealed = true;
        
        const duration = 800;
        
        new TWEEN.Tween(card.rotation)
            .to({ y: Math.PI / 2 }, duration / 2)
            .easing(TWEEN.Easing.Cubic.In)
            .onComplete(() => {
                if (card.children && card.children[1]) {
                    card.children[1].visible = true;
                }
                
                new TWEEN.Tween(card.rotation)
                    .to({ y: 0 }, duration / 2)
                    .easing(TWEEN.Easing.Cubic.Out)
                    .start();
            })
            .start();
            
        new TWEEN.Tween(card.scale)
            .to({ x: 1.2, y: 1.2, z: 1.2 }, duration / 2)
            .yoyo(true)
            .repeat(1)
            .start();

        const allRevealed = this.pickedCards.every(c => c.userData.isRevealed);
        if (allRevealed) {
            this.currentState = RITUAL_STATE.FINISHED;
            if (this.onRitualFinished) this.onRitualFinished();
            
            this.uiManager.updateGuide("Giơ 5 ngón tay để chơi lại", "#FFD700");
        }
    }

    updateAnimation(time) {
        if (this.currentState !== RITUAL_STATE.IDLE && this.currentState !== RITUAL_STATE.FINISHED) {
            let targetRotSpeed = 0;

            if (this.currentState === RITUAL_STATE.SHUFFLING) {
                if (!this.handsDetected) {
                    targetRotSpeed = 0;
                } else {
                    const minDist = 0.08;
                    const maxDist = 0.3;
                    const normalizedDist = Math.min(Math.max(this.avgPinchDistance, minDist), maxDist);
                    const speedMultiplier = ((normalizedDist - minDist) / (maxDist - minDist)) * 0.04 + 0.01;
                    
                    if (this.leftHandActive && !this.rightHandActive) {
                        targetRotSpeed = -speedMultiplier;
                    } else if (this.rightHandActive && !this.leftHandActive) {
                        targetRotSpeed = speedMultiplier;
                    } else if (this.leftHandActive && this.rightHandActive) {
                        targetRotSpeed = speedMultiplier;
                    } else {
                        targetRotSpeed = 0;
                    }
                }
            } else if (this.currentState === RITUAL_STATE.STOPPING) {
                targetRotSpeed = 0;
            }
            
            this.rotationSpeed += (targetRotSpeed - this.rotationSpeed) * 0.08;
            this.sceneManager.cardGroup.rotation.y += this.rotationSpeed;

            this.sceneManager.cardGroup.children.forEach((c, i) => {
                if (!c.userData.isPicked) {
                    const tier = c.userData.tier || 0;
                    const timeOffset = i * 0.1;
                    
                    if (this.currentState === RITUAL_STATE.SHUFFLING) {
                        const orbitRadius = 0.15;
                        const orbitSpeed = 0.002;
                        const orbitAngle = time * orbitSpeed + timeOffset;
                        
                        c.position.x += Math.cos(orbitAngle) * orbitRadius;
                        c.position.z += Math.sin(orbitAngle) * orbitRadius;
                        
                        const waveHeight = 0.4;
                        const waveSpeed = 0.003 + tier * 0.001;
                        c.position.y = Math.sin(time * waveSpeed + timeOffset) * waveHeight;
                        
                        c.rotation.x = Math.sin(time * 0.002 + timeOffset) * 0.3;
                        c.rotation.z = Math.cos(time * 0.0025 + timeOffset) * 0.2;
                        c.rotation.y += Math.sin(time * 0.001 + timeOffset) * 0.02;
                        
                    } else if (this.currentState === RITUAL_STATE.PREPARING) {
                        c.position.y = Math.sin(time * 0.001 + timeOffset) * 0.12;
                        c.rotation.x = Math.sin(time * 0.0008 + timeOffset) * 0.05;
                        c.rotation.z = Math.cos(time * 0.001 + timeOffset) * 0.03;
                    }
                }
            });
        }
    }
}
