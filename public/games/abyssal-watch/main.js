// ============================================================================
// ABYSSAL WATCH - ENHANCED EDITION v2.0
// A FNAF-inspired deep-sea survival horror game
// ============================================================================

const MAX_POWER = 100;
const GAME_DURATION = 120000;

const CREATURE_TYPES = {
    LURKER: { name: 'Lurker', speed: 1, color: 0x00ff00, behavior: 'steady' },
    STALKER: { name: 'Stalker', speed: 1.5, color: 0xff0000, behavior: 'aggressive' },
    PHANTOM: { name: 'Phantom', speed: 0.8, color: 0x8800ff, behavior: 'teleport' },
    SIREN: { name: 'Siren', speed: 1.2, color: 0xff00ff, behavior: 'drain' }
};

const DIFFICULTIES = {
    easy: { powerDrain: 0.008, sonarDrain: 0.025, spawnRate: 12000, charges: 5, doorCost: 3, label: 'EASY' },
    normal: { powerDrain: 0.012, sonarDrain: 0.035, spawnRate: 8000, charges: 3, doorCost: 5, label: 'NORMAL' },
    hard: { powerDrain: 0.018, sonarDrain: 0.05, spawnRate: 5000, charges: 2, doorCost: 8, label: 'HARD' },
    nightmare: { powerDrain: 0.025, sonarDrain: 0.07, spawnRate: 3500, charges: 1, doorCost: 10, label: 'NIGHTMARE' }
};

class AudioManager {
    constructor() { this.sounds = {}; this.ambient = false; }
    init() {
        ['ambient','sonar','charge','warning','creature','door','camera','flashlight','death','win'].forEach(t => {
            const el = document.getElementById(`sound-${t}`);
            if (el) this.sounds[t] = el;
        });
    }
    play(n, v = 0.5, l = false) {
        const s = this.sounds[n];
        if (s) { s.volume = v; s.loop = l; s.currentTime = 0; s.play().catch(() => {}); }
    }
    stop(n) { if (this.sounds[n]) { this.sounds[n].pause(); this.sounds[n].currentTime = 0; } }
    startAmbient() { if (!this.ambient) { this.play('ambient', 0.3, true); this.ambient = true; } }
    stopAll() { Object.values(this.sounds).forEach(s => { s.pause(); s.currentTime = 0; }); this.ambient = false; }
}

class ScoreManager {
    static async getScores() {
        try { const r = await fetch('/api/games/abyssal-watch/scores'); return r.ok ? await r.json() : []; }
        catch { return []; }
    }
    static async saveScore(d) {
        try { await fetch('/api/games/abyssal-watch/scores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }); }
        catch {}
    }
    static getLocal() { return JSON.parse(localStorage.getItem('abyssal_scores') || '[]'); }
    static saveLocal(d) {
        const s = this.getLocal(); s.push({ ...d, date: new Date().toISOString() });
        s.sort((a, b) => b.score - a.score);
        localStorage.setItem('abyssal_scores', JSON.stringify(s.slice(0, 10)));
    }
}

class BootScene extends Phaser.Scene {
    constructor() { super({ key: 'BootScene' }); }
    create() {
        const g = (w, h) => this.make.graphics({ x: 0, y: 0, add: false });

        // Radar
        let gfx = g(); gfx.fillStyle(0x001515, 1); gfx.fillCircle(150, 150, 150);
        gfx.lineStyle(2, 0x00ffff, 0.5);
        [150, 110, 70, 30].forEach(r => gfx.strokeCircle(150, 150, r));
        gfx.lineStyle(1, 0x00ffff, 0.3);
        for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; gfx.lineBetween(150, 150, 150 + Math.cos(a) * 150, 150 + Math.sin(a) * 150); }
        gfx.generateTexture('radar', 300, 300);

        // Station
        gfx = g(); gfx.fillStyle(0x00ffff, 1); gfx.fillCircle(15, 15, 8);
        gfx.lineStyle(2, 0x00ffff, 0.5); gfx.strokeCircle(15, 15, 12);
        gfx.generateTexture('station', 30, 30);

        // Sweep
        gfx = g(); gfx.fillStyle(0x00ffff, 0.3); gfx.slice(150, 150, 150, 0, 0.5, true); gfx.fillPath();
        gfx.generateTexture('sweep', 300, 300);

        // Creatures
        Object.entries(CREATURE_TYPES).forEach(([k, t]) => {
            for (let s = 1; s <= 4; s++) {
                gfx = g(); const sz = 8 + s * 4;
                gfx.fillStyle(t.color, 0.4 + s * 0.15); gfx.fillCircle(20, 20, sz);
                if (s >= 3) { gfx.lineStyle(2, t.color, 0.8); gfx.strokeCircle(20, 20, sz + 4); }
                if (s === 4) { gfx.lineStyle(1, 0xff0000, 0.6); gfx.strokeCircle(20, 20, sz + 8); }
                gfx.generateTexture(`creature_${k}_${s}`, 40, 40);
            }
        });

        // Button, Charge, Doors
        gfx = g(); gfx.fillStyle(0x002233, 1); gfx.fillRoundedRect(0, 0, 200, 50, 5);
        gfx.lineStyle(2, 0x00ffff, 0.8); gfx.strokeRoundedRect(0, 0, 200, 50, 5);
        gfx.generateTexture('button', 200, 50);

        gfx = g(); gfx.fillStyle(0xff6600, 1); gfx.fillRoundedRect(0, 0, 40, 50, 5);
        gfx.fillStyle(0xffaa00, 1); gfx.fillCircle(20, 15, 8);
        gfx.generateTexture('charge', 40, 50);

        gfx = g(); gfx.fillStyle(0x333333, 1); gfx.fillRect(0, 0, 60, 100);
        gfx.lineStyle(3, 0x666666, 1); gfx.strokeRect(0, 0, 60, 100);
        gfx.generateTexture('door_closed', 60, 100);

        gfx = g(); gfx.lineStyle(3, 0x00ff00, 0.5); gfx.strokeRect(0, 0, 60, 100);
        gfx.generateTexture('door_open', 60, 100);

        gfx = g(); gfx.fillStyle(0x00ffff, 1); gfx.fillCircle(4, 4, 4);
        gfx.generateTexture('particle', 8, 8);

        this.scene.start('MenuScene');
    }
}

class MenuScene extends Phaser.Scene {
    constructor() { super({ key: 'MenuScene' }); }
    create() {
        const { width: w, height: h } = this.cameras.main;
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x000510, 0x000510, 0x001530, 0x001530, 1);
        bg.fillRect(0, 0, w, h);

        this.add.text(w/2, 100, '◈ ABYSSAL WATCH ◈', {
            font: 'bold 48px Courier New', fill: '#00ffff',
            shadow: { offsetX: 0, offsetY: 0, color: '#00ffff', blur: 30, fill: true }
        }).setOrigin(0.5);
        this.add.text(w/2, 160, 'ENHANCED EDITION', { font: '18px Courier New', fill: '#888' }).setOrigin(0.5);
        this.add.text(w/2, 200, 'Survive the depths. Watch the abyss.', { font: 'italic 14px Courier New', fill: '#0aa' }).setOrigin(0.5);

        this.btn(w/2, 300, '[ START GAME ]', () => this.scene.start('DifficultyScene'));
        this.btn(w/2, 370, '[ LEADERBOARD ]', () => this.showLB());
        this.btn(w/2, 440, '[ HOW TO PLAY ]', () => { document.getElementById('instructions').style.display = 'block'; });

        this.add.text(w/2, h - 30, 'v2.0 - Night Shift Update', { font: '12px Courier New', fill: '#444' }).setOrigin(0.5);
        this.add.particles(0, 0, 'particle', { x: { min: 0, max: w }, y: { min: 0, max: h }, scale: { start: 0.2, end: 0 }, alpha: { start: 0.2, end: 0 }, speed: 10, lifespan: 5000, frequency: 300, blendMode: 'ADD' });
    }
    btn(x, y, t, cb) {
        const b = this.add.image(x, y, 'button').setInteractive({ useHandCursor: true });
        const tx = this.add.text(x, y, t, { font: 'bold 18px Courier New', fill: '#00ffff' }).setOrigin(0.5);
        b.on('pointerover', () => { b.setTint(0x00ffff); tx.setColor('#fff'); });
        b.on('pointerout', () => { b.clearTint(); tx.setColor('#00ffff'); });
        b.on('pointerdown', cb);
    }
    async showLB() {
        const s = [...await ScoreManager.getScores(), ...ScoreManager.getLocal()].sort((a, b) => b.score - a.score).slice(0, 10);
        let t = '═══ LEADERBOARD ═══\n\n';
        if (!s.length) t += 'No scores yet!';
        else s.forEach((x, i) => { t += `${i + 1}. ${(x.username || 'Anonymous').padEnd(12)} ${x.score} pts (N${x.night || 1})\n`; });
        alert(t);
    }
}

class DifficultyScene extends Phaser.Scene {
    constructor() { super({ key: 'DifficultyScene' }); }
    create() {
        const { width: w, height: h } = this.cameras.main;
        this.add.text(w/2, 80, 'SELECT DIFFICULTY', { font: 'bold 32px Courier New', fill: '#00ffff' }).setOrigin(0.5);
        const cols = { easy: '#0f0', normal: '#ff0', hard: '#f60', nightmare: '#f00' };
        ['easy', 'normal', 'hard', 'nightmare'].forEach((d, i) => {
            const y = 180 + i * 90, s = DIFFICULTIES[d];
            const b = this.add.image(w/2, y, 'button').setInteractive({ useHandCursor: true });
            this.add.text(w/2, y, `[ ${s.label} ]`, { font: 'bold 20px Courier New', fill: cols[d] }).setOrigin(0.5);
            this.add.text(w/2, y + 25, `Charges: ${s.charges} | Spawn: ${s.spawnRate/1000}s`, { font: '11px Courier New', fill: '#666' }).setOrigin(0.5);
            b.on('pointerover', () => b.setTint(parseInt(cols[d].replace('#', '0x'))));
            b.on('pointerout', () => b.clearTint());
            b.on('pointerdown', () => this.scene.start('GameScene', { difficulty: d, night: 1 }));
        });
        const back = this.add.image(w/2, h - 60, 'button').setInteractive({ useHandCursor: true });
        this.add.text(w/2, h - 60, '[ BACK ]', { font: 'bold 16px Courier New', fill: '#888' }).setOrigin(0.5);
        back.on('pointerdown', () => this.scene.start('MenuScene'));
    }
}

class GameScene extends Phaser.Scene {
    constructor() { super({ key: 'GameScene' }); }

    init(d) {
        this.difficulty = d.difficulty || 'normal';
        this.night = d.night || 1;
        this.settings = { ...DIFFICULTIES[this.difficulty] };
        const ns = 1 + (this.night - 1) * 0.15;
        this.settings.powerDrain *= ns;
        this.settings.spawnRate = Math.max(2000, this.settings.spawnRate / ns);
    }

    create() {
        this.power = MAX_POWER; this.depthCharges = this.settings.charges;
        this.creatures = []; this.creaturesKilled = 0; this.sonarActive = false;
        this.isGameOver = false; this.gameTime = 0; this.score = 0;
        this.leftDoorClosed = false; this.rightDoorClosed = false;
        this.cameraActive = false; this.currentCamera = 0;
        this.flashlightActive = false; this.flashlightCharge = 100;

        this.audio = new AudioManager(); this.audio.init(); this.audio.startAmbient();

        this.createBG(); this.createRadar(); this.createUI();
        this.createDoors(); this.createControls(); this.createMobile();

        this.time.addEvent({ delay: this.settings.spawnRate, callback: this.spawn, callbackScope: this, loop: true });
        this.time.delayedCall(2000, () => this.spawn());
        this.gameStartTime = this.time.now;
        this.cameras.main.fadeIn(1000);

        this.add.particles(0, 0, 'particle', { x: { min: 0, max: 800 }, y: { min: 0, max: 600 }, scale: { start: 0.3, end: 0 }, alpha: { start: 0.3, end: 0 }, speed: 20, lifespan: 4000, frequency: 500, blendMode: 'ADD' });
    }

    createBG() {
        const { width: w, height: h } = this.cameras.main;
        const g = this.add.graphics();
        g.fillGradientStyle(0x000810, 0x000810, 0x001020, 0x001020, 1); g.fillRect(0, 0, w, h);
        g.lineStyle(1, 0x002233, 0.3);
        for (let x = 0; x < w; x += 50) g.lineBetween(x, 0, x, h);
        for (let y = 0; y < h; y += 50) g.lineBetween(0, y, w, y);
        g.lineStyle(3, 0x00ffff, 0.5); g.strokeRect(10, 10, w - 20, h - 20);
    }

    createRadar() {
        const { width: w, height: h } = this.cameras.main;
        const rx = w / 2, ry = h / 2 + 20;
        this.radarContainer = this.add.container(rx, ry);
        this.radar = this.add.image(0, 0, 'radar');
        this.station = this.add.image(0, 0, 'station');
        this.sweep = this.add.image(0, 0, 'sweep').setAlpha(0);
        this.radarContainer.add([this.radar, this.station, this.sweep]);
        this.creatureContainer = this.add.container(rx, ry);
        this.add.text(rx, ry - 170, '◢ SONAR ARRAY ◣', { font: 'bold 14px Courier New', fill: '#00ffff' }).setOrigin(0.5);
    }

    createUI() {
        const { width: w, height: h } = this.cameras.main;
        this.add.text(w/2, 20, `NIGHT ${this.night}`, { font: 'bold 16px Courier New', fill: '#f60' }).setOrigin(0.5);
        this.add.text(20, 45, 'TIME:', { font: 'bold 12px Courier New', fill: '#0ff' });
        this.timeText = this.add.text(70, 45, '12:00 AM', { font: 'bold 18px Courier New', fill: '#0f0' });
        this.add.text(w - 180, 45, 'POWER:', { font: 'bold 12px Courier New', fill: '#0ff' });
        this.powerText = this.add.text(w - 120, 45, '100%', { font: 'bold 18px Courier New', fill: '#0f0' });
        this.powerBarBg = this.add.graphics(); this.powerBarBg.fillStyle(0x333333, 1); this.powerBarBg.fillRect(w - 180, 70, 160, 12);
        this.powerBar = this.add.graphics(); this.updatePowerBar();
        this.add.text(20, h - 90, 'CHARGES:', { font: '11px Courier New', fill: '#f60' });
        this.chargeIcons = [];
        for (let i = 0; i < this.settings.charges; i++) this.chargeIcons.push(this.add.image(30 + i * 30, h - 55, 'charge').setScale(0.4));
        this.add.text(w - 180, h - 90, 'FLASHLIGHT:', { font: '11px Courier New', fill: '#ff0' });
        this.flashBar = this.add.graphics(); this.updateFlashBar();
        this.statusText = this.add.text(w/2, h - 25, '', { font: '13px Courier New', fill: '#ff0' }).setOrigin(0.5);
        this.sonarStatus = this.add.text(w/2, 90, '[ SONAR: OFFLINE ]', { font: 'bold 12px Courier New', fill: '#666' }).setOrigin(0.5);
        this.warnPanel = this.add.container(w/2, h/2).setVisible(false);
        const wb = this.add.graphics(); wb.fillStyle(0x330000, 0.9); wb.fillRect(-140, -35, 280, 70);
        wb.lineStyle(2, 0xff0000, 1); wb.strokeRect(-140, -35, 280, 70);
        this.warnPanel.add([wb, this.add.text(0, 0, '⚠ CREATURE CRITICAL ⚠', { font: 'bold 16px Courier New', fill: '#f00' }).setOrigin(0.5)]);
    }

    createDoors() {
        const { height: h } = this.cameras.main;
        this.leftDoor = this.add.image(35, h/2, 'door_open').setScale(0.6);
        this.leftDoorTxt = this.add.text(35, h/2 + 45, '[1] OPEN', { font: '10px Courier New', fill: '#0f0' }).setOrigin(0.5);
        this.rightDoor = this.add.image(765, h/2, 'door_open').setScale(0.6);
        this.rightDoorTxt = this.add.text(765, h/2 + 45, '[2] OPEN', { font: '10px Courier New', fill: '#0f0' }).setOrigin(0.5);
    }

    createControls() {
        const k = this.input.keyboard.addKeys({ space: 32, d: 68, h: 72, c: 67, f: 70, one: 49, two: 50 });
        k.space.on('down', () => this.toggleSonar());
        k.d.on('down', () => this.fireCharge());
        k.h.on('down', () => { const i = document.getElementById('instructions'); i.style.display = i.style.display === 'block' ? 'none' : 'block'; });
        k.f.on('down', () => this.toggleFlash());
        k.one.on('down', () => this.toggleDoor('left'));
        k.two.on('down', () => this.toggleDoor('right'));
    }

    createMobile() {
        const mc = document.getElementById('mobile-controls');
        if (mc) mc.style.display = 'flex';
        const map = { sonar: () => this.toggleSonar(), charge: () => this.fireCharge(), flash: () => this.toggleFlash(), 'door-l': () => this.toggleDoor('left'), 'door-r': () => this.toggleDoor('right') };
        Object.entries(map).forEach(([id, fn]) => {
            const b = document.getElementById(`btn-${id}`);
            if (b) b.addEventListener('touchstart', e => { e.preventDefault(); fn(); });
        });
    }

    toggleSonar() {
        if (this.isGameOver) return;
        this.sonarActive = !this.sonarActive; this.audio.play('sonar', 0.4);
        if (this.sonarActive) {
            this.sonarStatus.setText('[ SONAR: ACTIVE ]').setColor('#0f0');
            this.sweep.setAlpha(0.5);
            this.tweens.add({ targets: this.sweep, angle: 360, duration: 2000, repeat: -1 });
            this.status('SONAR ACTIVATED');
        } else {
            this.sonarStatus.setText('[ SONAR: OFFLINE ]').setColor('#666');
            this.sweep.setAlpha(0); this.tweens.killTweensOf(this.sweep);
        }
    }

    fireCharge() {
        if (this.isGameOver) return;
        if (this.depthCharges <= 0) return this.status('NO CHARGES!', '#f00');
        if (this.power < 15) return this.status('LOW POWER!', '#f00');
        this.audio.play('charge', 0.6);
        const near = this.creatures.filter(c => c.stage >= 3);
        if (near.length) {
            near.forEach(c => { this.destroyCreature(c); this.creaturesKilled++; this.score += 100; });
            this.status(`${near.length} ELIMINATED!`, '#0f0');
        } else this.status('NO TARGETS!', '#fa0');
        this.depthCharges--; this.power -= 15; this.updateCharges();
        this.cameras.main.shake(300, 0.02); this.cameras.main.flash(200, 255, 100, 0, true);
    }

    toggleDoor(side) {
        if (this.isGameOver) return; this.audio.play('door', 0.5);
        if (side === 'left') {
            this.leftDoorClosed = !this.leftDoorClosed;
            this.leftDoor.setTexture(this.leftDoorClosed ? 'door_closed' : 'door_open');
            this.leftDoorTxt.setText(this.leftDoorClosed ? '[1] CLOSED' : '[1] OPEN').setColor(this.leftDoorClosed ? '#f00' : '#0f0');
        } else {
            this.rightDoorClosed = !this.rightDoorClosed;
            this.rightDoor.setTexture(this.rightDoorClosed ? 'door_closed' : 'door_open');
            this.rightDoorTxt.setText(this.rightDoorClosed ? '[2] CLOSED' : '[2] OPEN').setColor(this.rightDoorClosed ? '#f00' : '#0f0');
        }
    }

    toggleFlash() {
        if (this.isGameOver || this.flashlightCharge <= 0) return;
        this.flashlightActive = !this.flashlightActive;
        this.audio.play('flashlight', 0.3);
        if (this.flashlightActive) {
            this.creatures.forEach(c => {
                if (c.stage >= 2 && Math.random() > 0.5) { c.stage = Math.max(1, c.stage - 1); this.status('CREATURE RETREATED!', '#0f0'); }
            });
        }
    }

    spawn() {
        if (this.isGameOver || this.creatures.length >= 4 + Math.floor(this.night / 2)) return;
        const types = Object.keys(CREATURE_TYPES);
        const tk = types[Math.floor(Math.random() * Math.min(types.length, 1 + this.night))];
        const t = CREATURE_TYPES[tk], angle = Math.random() * Math.PI * 2;
        const c = { type: tk, typeData: t, angle, stage: 1, sprite: null, timer: null, side: angle > Math.PI ? 'left' : 'right' };
        c.sprite = this.add.image(Math.cos(angle) * 140, Math.sin(angle) * 140, `creature_${tk}_1`).setAlpha(0.3);
        this.creatureContainer.add(c.sprite);
        c.timer = this.time.addEvent({ delay: 4000 / t.speed - this.night * 200, callback: () => this.advance(c), callbackScope: this, loop: true });
        this.creatures.push(c);
        this.audio.play('creature', 0.2);
        this.status(`${t.name.toUpperCase()} DETECTED`, '#fa0');
    }

    advance(c) {
        if (this.isGameOver) return;
        if (c.stage === 3) {
            if ((c.side === 'left' && this.leftDoorClosed) || (c.side === 'right' && this.rightDoorClosed)) {
                this.status('DOOR BLOCKED!', '#0f0'); return;
            }
        }
        if (c.typeData.behavior === 'teleport' && Math.random() > 0.7) c.stage = Math.min(4, c.stage + 2);
        else c.stage++;
        if (c.typeData.behavior === 'drain') { this.power -= 3; this.status('SIREN DRAIN!', '#f0f'); }
        if (c.stage > 4) { this.gameOver('BREACH'); return; }
        const d = [140, 100, 60, 25][c.stage - 1];
        c.sprite.destroy();
        c.sprite = this.add.image(Math.cos(c.angle) * d, Math.sin(c.angle) * d, `creature_${c.type}_${c.stage}`).setAlpha(this.sonarActive ? 0.8 : 0.3);
        this.creatureContainer.add(c.sprite);
        if (c.stage === 4) { this.showWarn(); this.audio.play('warning', 0.7); }
    }

    destroyCreature(c) {
        if (c.timer) c.timer.destroy();
        if (c.sprite) { this.tweens.add({ targets: c.sprite, alpha: 0, scale: 2, duration: 300, onComplete: () => c.sprite.destroy() }); }
        const i = this.creatures.indexOf(c); if (i > -1) this.creatures.splice(i, 1);
    }

    showWarn() {
        this.warnPanel.setVisible(true);
        this.tweens.add({ targets: this.warnPanel, alpha: { from: 0, to: 1 }, duration: 100, yoyo: true, repeat: 5, onComplete: () => this.warnPanel.setVisible(false) });
        this.cameras.main.shake(200, 0.01);
    }

    status(m, c = '#ff0') {
        this.statusText.setText(m).setColor(c);
        this.time.delayedCall(3000, () => { if (this.statusText.text === m) this.statusText.setText(''); });
    }

    updatePowerBar() {
        this.powerBar.clear();
        const p = this.power / MAX_POWER;
        this.powerBar.fillStyle(p < 0.3 ? 0xff0000 : p < 0.5 ? 0xffaa00 : 0x00ff00, 1);
        this.powerBar.fillRect(this.cameras.main.width - 180, 70, 160 * p, 12);
        this.powerText.setText(Math.floor(this.power) + '%').setColor(p < 0.3 ? '#f00' : '#0f0');
    }

    updateFlashBar() {
        this.flashBar.clear();
        this.flashBar.fillStyle(0x333333, 1); this.flashBar.fillRect(this.cameras.main.width - 180, this.cameras.main.height - 70, 100, 8);
        this.flashBar.fillStyle(0xffff00, 1); this.flashBar.fillRect(this.cameras.main.width - 180, this.cameras.main.height - 70, this.flashlightCharge, 8);
    }

    updateCharges() { this.chargeIcons.forEach((ic, i) => ic.setAlpha(i < this.depthCharges ? 1 : 0.2)); }

    updateTime() {
        const e = this.time.now - this.gameStartTime;
        this.gameTime = Math.min(e / GAME_DURATION, 1);
        const m = this.gameTime * 360, h = Math.floor(m / 60), mi = Math.floor(m % 60);
        this.timeText.setText(`${h === 0 ? 12 : h}:${mi.toString().padStart(2, '0')} AM`);
        if (this.gameTime > 0.8) this.timeText.setColor('#ff0');
        if (this.gameTime >= 1) this.win();
    }

    update() {
        if (this.isGameOver) return;
        let drain = this.settings.powerDrain;
        if (this.sonarActive) drain += this.settings.sonarDrain;
        if (this.leftDoorClosed) drain += this.settings.doorCost * 0.001;
        if (this.rightDoorClosed) drain += this.settings.doorCost * 0.001;
        this.power -= drain;
        if (this.flashlightActive) { this.flashlightCharge -= 0.2; if (this.flashlightCharge <= 0) this.flashlightActive = false; this.updateFlashBar(); }
        if (this.power <= 0) { this.power = 0; this.gameOver('POWER DEPLETED'); return; }
        this.updatePowerBar(); this.updateTime();
        this.creatures.forEach(c => { if (c.sprite) c.sprite.setAlpha(this.sonarActive ? 0.8 : 0.3); });
        this.station.setScale(0.8 + Math.sin(this.time.now / 200) * 0.2);
    }

    gameOver(r) {
        this.isGameOver = true; this.audio.stopAll(); this.audio.play('death', 0.6);
        this.cameras.main.fade(2000, 0, 0, 0);
        this.creatures.forEach(c => { if (c.timer) c.timer.destroy(); });
        const s = this.score + Math.floor(this.power) + this.creaturesKilled * 50;
        ScoreManager.saveLocal({ score: s, night: this.night, killed: this.creaturesKilled, difficulty: this.difficulty });
        this.time.delayedCall(2000, () => this.scene.start('GameOverScene', { reason: r, time: this.timeText.text, killed: this.creaturesKilled, night: this.night, score: s, difficulty: this.difficulty }));
    }

    win() {
        this.isGameOver = true; this.audio.stopAll(); this.audio.play('win', 0.6);
        this.cameras.main.flash(1000, 255, 255, 200, true);
        const s = this.score + Math.floor(this.power) * 2 + this.creaturesKilled * 100 + this.night * 500;
        this.time.delayedCall(1500, () => this.scene.start('WinScene', { power: Math.floor(this.power), killed: this.creaturesKilled, night: this.night, score: s, difficulty: this.difficulty }));
    }
}

class GameOverScene extends Phaser.Scene {
    constructor() { super({ key: 'GameOverScene' }); }
    create(d) {
        const { width: w, height: h } = this.cameras.main;
        this.gfx = this.add.graphics();
        this.add.text(w/2, 120, 'CONNECTION LOST', { font: 'bold 42px Courier New', fill: '#f00', shadow: { offsetX: 0, offsetY: 0, color: '#f00', blur: 30, fill: true } }).setOrigin(0.5);
        this.add.text(w/2, 180, d.reason || 'ERROR', { font: '16px Courier New', fill: '#f66' }).setOrigin(0.5);
        this.add.text(w/2, 240, `Night ${d.night || 1} | ${d.time || '??:??'}`, { font: '14px Courier New', fill: '#888' }).setOrigin(0.5);
        this.add.text(w/2, 270, `Kills: ${d.killed || 0}`, { font: '14px Courier New', fill: '#888' }).setOrigin(0.5);
        this.add.text(w/2, 310, `SCORE: ${d.score || 0}`, { font: 'bold 24px Courier New', fill: '#fa0' }).setOrigin(0.5);
        this.btn(w/2, 420, '[ TRY AGAIN ]', () => this.scene.start('GameScene', { difficulty: d.difficulty || 'normal', night: 1 }));
        this.btn(w/2, 490, '[ MENU ]', () => this.scene.start('MenuScene'));
        this.time.addEvent({ delay: 100, loop: true, callback: () => { this.gfx.clear(); if (Math.random() > 0.7) { this.gfx.fillStyle(0xff0000, 0.1); this.gfx.fillRect(0, Math.random() * h, w, 5 + Math.random() * 20); } } });
    }
    btn(x, y, t, cb) {
        const b = this.add.image(x, y, 'button').setInteractive({ useHandCursor: true });
        this.add.text(x, y, t, { font: 'bold 16px Courier New', fill: '#0ff' }).setOrigin(0.5);
        b.on('pointerover', () => b.setTint(0xff0000)); b.on('pointerout', () => b.clearTint()); b.on('pointerdown', cb);
    }
}

class WinScene extends Phaser.Scene {
    constructor() { super({ key: 'WinScene' }); }
    create(d) {
        const { width: w, height: h } = this.cameras.main;
        const bg = this.add.graphics(); bg.fillGradientStyle(0x001030, 0x001030, 0x203060, 0x405090, 1); bg.fillRect(0, 0, w, h);
        this.add.text(w/2, 80, '☀ DAWN BREAKS ☀', { font: 'bold 36px Courier New', fill: '#fd4', shadow: { offsetX: 0, offsetY: 0, color: '#fd4', blur: 30, fill: true } }).setOrigin(0.5);
        this.add.text(w/2, 130, `NIGHT ${d.night} SURVIVED`, { font: '20px Courier New', fill: '#0ff' }).setOrigin(0.5);
        this.add.text(w/2, 200, `Power: ${d.power}% | Kills: ${d.killed}`, { font: '16px Courier New', fill: '#0f0' }).setOrigin(0.5);
        this.add.text(w/2, 250, `SCORE: ${d.score}`, { font: 'bold 28px Courier New', fill: '#fd0' }).setOrigin(0.5);
        let r = 'C'; if (d.score > 2000) r = 'S'; else if (d.score > 1500) r = 'A'; else if (d.score > 1000) r = 'B';
        this.add.text(w/2, 300, `RATING: ${r}`, { font: 'bold 32px Courier New', fill: r === 'S' ? '#fd0' : r === 'A' ? '#0f0' : '#0aa' }).setOrigin(0.5);
        ScoreManager.saveLocal({ score: d.score, night: d.night, killed: d.killed, difficulty: d.difficulty });
        if (d.night < 5) this.btn(w/2, 400, `[ NIGHT ${d.night + 1} ]`, () => this.scene.start('GameScene', { difficulty: d.difficulty, night: d.night + 1 }));
        else this.add.text(w/2, 400, '★ ALL NIGHTS COMPLETE ★', { font: 'bold 18px Courier New', fill: '#fd0' }).setOrigin(0.5);
        this.btn(w/2, 470, '[ MENU ]', () => this.scene.start('MenuScene'));
        this.add.particles(w/2, 0, 'particle', { x: { min: -400, max: 400 }, y: { min: 0, max: 100 }, speed: { min: 50, max: 150 }, angle: { min: 80, max: 100 }, scale: { start: 0.5, end: 0 }, alpha: { start: 0.8, end: 0 }, tint: [0xffdd44, 0x00ffff, 0xffffff], lifespan: 3000, frequency: 100, blendMode: 'ADD' });
    }
    btn(x, y, t, cb) {
        const b = this.add.image(x, y, 'button').setInteractive({ useHandCursor: true });
        this.add.text(x, y, t, { font: 'bold 16px Courier New', fill: '#0ff' }).setOrigin(0.5);
        b.on('pointerover', () => b.setTint(0xffdd44)); b.on('pointerout', () => b.clearTint()); b.on('pointerdown', cb);
    }
}

// Config must be defined after all scene classes
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    backgroundColor: '#000810',
    scene: [BootScene, MenuScene, DifficultyScene, GameScene, GameOverScene, WinScene]
};

const game = new Phaser.Game(config);
