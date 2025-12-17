/* --- 設定とデータ --- */
const CONFIG = {
    // 画像パス (指定のものに更新)
    charSrc: '../images/hoko/mahiru.png', 
    
    // キャラクター設定
    charSize: 48,  // 表示サイズ
    walkSpeed: 4,  // 少し速くしました
    
    // 障害物 (x, y, w, h) - 960x540のキャンバスに対する座標
    // ここに入るとキャラクターは止まります
    obstacles: [
        { x: 0, y: 0, w: 260, h: 220 },     // 左上の棚周辺
        { x: 170, y: 250, w: 320, h: 100 }, // 中央のショーケース
        { x: 550, y: 0, w: 300, h: 180 },   // 右上のキッチンカウンター（右端の階段への通路を空けるために幅を縮小）
        { x: 600, y: 320, w: 180, h: 220 }, // 右下のレジ・テーブル
        // 画面端の壁判定（少し内側まで行けないように）
        { x: -50, y: 0, w: 70, h: 540 },    // 左壁
        { x: 940, y: 0, w: 50, h: 540 },    // 右壁
        { x: 0, y: -50, w: 960, h: 70 },    // 上壁
        { x: 0, y: 520, w: 960, h: 50 }     // 下壁
    ],

    // 初期出現位置 (階段の下あたり、安全な場所)
    spawnX: 880,
    spawnY: 220
};

const RECIPES = [
    { id: 'simple', name: '定番チョコ', cost: 1, energy: 10, xp: 10, price: 40, minLv: 1 },
    { id: 'white', name: 'ホワイトチョコ', cost: 2, energy: 15, xp: 20, price: 70, minLv: 2 },
    { id: 'truffle', name: '高級トリュフ', cost: 3, energy: 25, xp: 50, price: 150, minLv: 4 },
];

/* --- ゲームエンジン --- */
class Game {
    constructor() {
        this.container = document.getElementById('game-container');
        this.stage = document.getElementById('game-stage');
        this.entityLayer = document.getElementById('entities-layer');
        
        // 状態
        this.state = {
            money: 900,
            ingredients: 5,
            stock: 0,
            display: 0,
            energy: 100,
            xp: 0,
            level: 1,
            isNight: false
        };

        this.audioCtx = null;
        this.isPlaying = false;
        
        this.player = null;
        this.customers = [];
        this.ui = new UI(this);
        this.logic = new GameLogic(this);
        
        this.lastTime = 0;
        this.customerTimer = 0;

        // リサイズ監視
        window.addEventListener('resize', () => this.resize());
        this.resize();
    }

    // 画面サイズに合わせてゲーム画面を拡大縮小
    resize() {
        const winW = window.innerWidth;
        const winH = window.innerHeight;
        const baseW = 960;
        const baseH = 540;

        // 比率を計算（画面に収まるように）
        const scale = Math.min(winW / baseW, winH / baseH);
        
        this.container.style.transform = `scale(${scale})`;
    }

    start() {
        document.getElementById('start-screen').style.display = 'none';
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.isPlaying = true;

        // プレイヤー生成（修正した安全な位置に出現）
        this.player = new Actor(this, 'player', CONFIG.charSrc, CONFIG.spawnX, CONFIG.spawnY);
        
        this.ui.updateAll();
        
        // クリック移動
        this.stage.addEventListener('pointerdown', (e) => this.handleClick(e));
        
        requestAnimationFrame((t) => this.loop(t));
    }

    handleClick(e) {
        if (!this.isPlaying || this.player.isBusy) return;

        // 拡大縮小されているため、getBoundingClientRectで正確な座標を取得
        const rect = this.stage.getBoundingClientRect();
        // scaleの影響を打ち消すために比率で計算
        const scaleX = 960 / rect.width;
        const scaleY = 540 / rect.height;

        const clickX = (e.clientX - rect.left) * scaleX;
        const clickY = (e.clientY - rect.top) * scaleY;

        this.playSound('click');

        if (e.target.classList.contains('hotspot')) {
            const id = e.target.id;
            const targetPos = this.getTargetPosition(e.target, scaleX, scaleY);
            
            this.player.walkTo(targetPos.x, targetPos.y, () => {
                this.logic.interact(id);
            });
        } else {
            this.player.walkTo(clickX, clickY);
            this.ui.createSparkle(clickX, clickY);
        }
    }

    getTargetPosition(el, sx, sy) {
        // ホットスポットの手前(下方向)の座標を計算
        const elRect = el.getBoundingClientRect();
        const stageRect = this.stage.getBoundingClientRect();
        
        // stage内での相対座標を元の960x540スケールに戻して計算
        const centerX = ((elRect.left - stageRect.left) + elRect.width / 2) * sx;
        const bottomY = ((elRect.bottom - stageRect.top)) * sy + 10; // 少し下
        
        return { x: centerX, y: bottomY };
    }

    loop(timestamp) {
        if (!this.isPlaying) return;
        const dt = timestamp - this.lastTime;
        this.lastTime = timestamp;

        this.player.update(dt);

        // お客さん
        for (let i = this.customers.length - 1; i >= 0; i--) {
            const c = this.customers[i];
            c.update(dt);
            if (c.isDead) {
                c.element.remove();
                this.customers.splice(i, 1);
            }
        }

        // 来店ロジック
        if (this.state.display > 0 && !this.state.isNight) {
            this.customerTimer += dt;
            if (this.customerTimer > 4000 + Math.random() * 4000) {
                this.spawnCustomer();
                this.customerTimer = 0;
            }
        }

        requestAnimationFrame((t) => this.loop(t));
    }

    spawnCustomer() {
        if(this.customers.length >= 3) return;
        
        // 入り口（下中央）から出現
        const customer = new Actor(this, 'customer', null, 480, 550);
        // 色をランダムに
        customer.element.style.filter = `hue-rotate(${Math.random()*360}deg)`;
        
        // レジへ向かう
        customer.walkTo(580, 450, () => {
            setTimeout(() => {
                if(this.state.display > 0) {
                    this.logic.sellItem();
                    customer.showBubble("おいしい！");
                    this.playSound('money');
                } else {
                    customer.showBubble("売り切れ...");
                }
                // 帰る
                setTimeout(() => {
                    customer.walkTo(480, 600, () => customer.isDead = true);
                }, 1000);
            }, 800);
        });
        
        this.customers.push(customer);
    }

    toggleNight() {
        this.state.isNight = !this.state.isNight;
        this.stage.classList.toggle('night', this.state.isNight);
        this.playSound('click');
    }
    
    toggleAudio() {
        if(this.audioCtx.state === 'suspended') this.audioCtx.resume();
        else this.audioCtx.suspend();
    }

    playSound(type) {
        if (!this.audioCtx || this.audioCtx.state === 'suspended') return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        const now = this.audioCtx.currentTime;

        if (type === 'click') {
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            osc.start(now); osc.stop(now + 0.1);
        } else if (type === 'money') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(1000, now);
            osc.frequency.setValueAtTime(2000, now + 0.1);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.3);
            osc.start(now); osc.stop(now + 0.3);
        }
    }
}

/* --- アクター（キャラ） --- */
class Actor {
    constructor(game, type, imgSrc, x, y) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.targetX = x;
        this.targetY = y;
        this.isMoving = false;
        this.isBusy = false;
        this.speed = CONFIG.walkSpeed;
        this.frame = 1;
        this.dir = 0; // 0:下, 1:左, 2:右, 3:上
        this.animTimer = 0;
        this.isDead = false;

        this.element = document.createElement('div');
        this.element.className = 'entity';
        this.element.style.width = CONFIG.charSize + 'px';
        this.element.style.height = CONFIG.charSize + 'px';
        
        if (type === 'player' && imgSrc) {
            this.element.style.backgroundImage = `url(${imgSrc})`;
            // 3列4行の画像を想定してサイズ調整
            this.element.style.backgroundSize = `${CONFIG.charSize * 3}px ${CONFIG.charSize * 4}px`;
        } else {
            // 客 (簡易シルエット)
            this.element.style.background = '#5D4037';
            this.element.style.borderRadius = '50% 50% 10% 10%';
            this.element.style.width = '32px';
            this.element.style.height = '48px';
            this.element.style.border = '2px solid #fff';
            this.element.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';
        }
        
        this.game.entityLayer.appendChild(this.element);
        this.updatePos();
    }

    walkTo(x, y, callback) {
        this.targetX = x;
        this.targetY = y;
        this.isMoving = true;
        this.onArrive = callback || null;
    }

    update(dt) {
        if (this.isMoving) {
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > this.speed) {
                let vx = (dx / dist) * this.speed;
                let vy = (dy / dist) * this.speed;

                // 衝突判定: X軸移動チェック
                if (!this.checkCollision(this.x + vx, this.y)) {
                    this.x += vx;
                }
                // 衝突判定: Y軸移動チェック
                if (!this.checkCollision(this.x, this.y + vy)) {
                    this.y += vy;
                }

                // 向き決定
                const angle = Math.atan2(dy, dx) * 180 / Math.PI;
                if (angle > -45 && angle <= 45) this.dir = 2; // 右
                else if (angle > 45 && angle <= 135) this.dir = 0; // 下
                else if (angle > 135 || angle <= -135) this.dir = 1; // 左
                else this.dir = 3; // 上

                // アニメーション
                this.animTimer += dt;
                if (this.animTimer > 150) {
                    this.frame = (this.frame + 1) % 3;
                    this.animTimer = 0;
                }
            } else {
                // 到着
                this.x = this.targetX;
                this.y = this.targetY;
                this.isMoving = false;
                this.frame = 1; 
                if (this.onArrive) {
                    const cb = this.onArrive;
                    this.onArrive = null;
                    cb();
                }
            }
            this.updatePos();
        }
    }

    checkCollision(x, y) {
        // 画像は足元が基準座標なので、足元の1点をチェック
        for (let obs of CONFIG.obstacles) {
            if (x > obs.x && x < obs.x + obs.w &&
                y > obs.y && y < obs.y + obs.h) {
                return true;
            }
        }
        return false;
    }

    updatePos() {
        this.element.style.left = (this.x - CONFIG.charSize/2) + 'px';
        this.element.style.top = (this.y - CONFIG.charSize) + 'px'; 
        this.element.style.zIndex = Math.floor(this.y);
        
        const bx = this.frame * CONFIG.charSize;
        const by = this.dir * CONFIG.charSize;
        this.element.style.backgroundPosition = `-${bx}px -${by}px`;
    }

    showBubble(text) {
        const b = document.createElement('div');
        b.className = 'bubble';
        b.innerText = text;
        b.style.left = this.x + 'px';
        b.style.top = (this.y - 60) + 'px';
        this.game.stage.appendChild(b);
        setTimeout(() => b.remove(), 2000);
    }
}

/* --- ロジック & UI --- */
class GameLogic {
    constructor(game) { this.game = game; }

    interact(zoneId) {
        this.game.player.dir = 3; 
        this.game.player.updatePos();

        if (zoneId === 'zone-kitchen') {
            this.openKitchen();
        } else if (zoneId === 'zone-shelf') {
            this.game.ui.openModal('modal-shelf');
        } else if (zoneId === 'zone-display') {
            this.game.ui.openModal('modal-display');
            document.getElementById('mod-stock').innerText = this.game.state.stock;
        } else if (zoneId === 'zone-register') {
            this.game.player.showBubble("いらっしゃいませ！");
        }
    }

    openKitchen() {
        const list = document.getElementById('recipe-list');
        list.innerHTML = '';
        RECIPES.forEach(r => {
            const btn = document.createElement('button');
            btn.className = 'action-btn';
            const canMake = this.game.state.ingredients >= r.cost && this.game.state.energy >= r.energy;
            const isLocked = this.game.state.level < r.minLv;
            
            if(isLocked) {
                btn.innerHTML = `<span>🔒 Lv.${r.minLv}〜</span>`;
                btn.disabled = true;
            } else {
                btn.innerHTML = `<span>${r.name}</span><small>-${r.cost}🍫 / -${r.energy}⚡</small>`;
                btn.disabled = !canMake;
                btn.onclick = () => this.cook(r);
            }
            list.appendChild(btn);
        });
        this.game.ui.openModal('modal-kitchen');
    }

    cook(recipe) {
        this.game.ui.closeModals();
        this.game.player.isBusy = true;
        this.game.player.showBubble("調理中...");
        
        setTimeout(() => {
            this.game.state.ingredients -= recipe.cost;
            this.game.state.energy -= recipe.energy;
            this.game.state.stock += 3;
            this.gainXp(recipe.xp);
            
            this.game.player.isBusy = false;
            this.game.player.showBubble("できた！");
            this.game.ui.updateAll();
        }, 1500);
    }

    buyIngredients(amt) {
        const cost = amt === 1 ? 20 : 90;
        if (this.game.state.money >= cost) {
            this.game.state.money -= cost;
            this.game.state.ingredients += amt;
            this.game.playSound('money');
            this.game.ui.updateAll();
            this.game.player.showBubble("仕入れ完了");
        } else {
            alert("お金が足りません");
        }
    }

    stockShowcase() {
        if(this.game.state.stock > 0) {
            this.game.state.display += this.game.state.stock;
            this.game.state.stock = 0;
            this.game.ui.closeModals();
            this.game.ui.updateAll();
            this.game.player.showBubble("並べました！");
        } else {
             this.game.ui.closeModals();
             this.game.player.showBubble("在庫がないよ");
        }
    }

    sellItem() {
        this.game.state.display--;
        const earnings = 50 + (this.game.state.level * 5);
        this.game.state.money += earnings;
        this.game.ui.createSparkle(600, 350); // レジ付近
        this.game.ui.updateAll();
    }

    gainXp(val) {
        this.game.state.xp += val;
        if(this.game.state.xp >= this.game.state.level * 100) {
            this.game.state.xp = 0;
            this.game.state.level++;
            this.game.state.energy = 100;
            this.game.playSound('money');
            this.game.player.showBubble("Level Up!!");
        }
    }
}

class UI {
    constructor(game) { this.game = game; }

    updateAll() {
        const s = this.game.state;
        document.getElementById('ui-money').innerText = s.money;
        document.getElementById('ui-level').innerText = s.level;
        document.getElementById('ui-ing').innerText = s.ingredients;
        document.getElementById('ui-stock').innerText = s.stock;
        document.getElementById('ui-display').innerText = s.display;
        document.getElementById('ui-energy').innerText = s.energy;
    }

    openModal(id) {
        document.getElementById('modal-overlay').classList.remove('hidden');
        document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
        document.getElementById(id).classList.remove('hidden');
    }

    closeModals() {
        document.getElementById('modal-overlay').classList.add('hidden');
        this.game.playSound('click');
    }

    createSparkle(x, y) {
        const d = document.createElement('div');
        d.innerText = '✦';
        d.style.position = 'absolute';
        d.style.left = x + 'px';
        d.style.top = y + 'px';
        d.style.color = '#FFD54F';
        d.style.fontSize = '20px';
        d.style.fontWeight = 'bold';
        d.style.pointerEvents = 'none';
        d.style.zIndex = 100;
        d.animate([
            { transform: 'translate(0,0) scale(0.5)', opacity: 1 },
            { transform: 'translate(0,-30px) scale(1.5)', opacity: 0 }
        ], { duration: 600 });
        this.game.stage.appendChild(d);
        setTimeout(() => d.remove(), 600);
    }
}

const game = new Game();