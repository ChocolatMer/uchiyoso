/* --- 設定とデータ --- */
const CONFIG = {
    // 画像パス
    charSrc: '../images/hoko/mahiru.png', 
    
    // キャラクター設定
    charSize: 48,  // ゲーム上の表示サイズ(px)
    walkSpeed: 3,  // 歩行速度
    
    // スプライトシート設定 (3列 x 4行 を想定)
    spriteW: 32,   // 画像1コマの元の幅
    spriteH: 32,   // 画像1コマの元の高さ
    cols: 3,
    
    // 障害物 (x, y, w, h) - 座標は画像に合わせて調整が必要
    obstacles: [
        { x: 0, y: 0, w: 280, h: 220 },   // 左上の棚エリア
        { x: 180, y: 250, w: 300, h: 100 }, // 中央ショーケース
        { x: 550, y: 0, w: 410, h: 180 },   // 右上キッチン奥
        { x: 600, y: 320, w: 200, h: 200 }, // 右下レジ・テーブル
    ]
};

const RECIPES = [
    { id: 'simple', name: '定番チョコ', cost: 1, energy: 10, xp: 10, price: 40, minLv: 1 },
    { id: 'white', name: 'ホワイトチョコ', cost: 2, energy: 15, xp: 20, price: 70, minLv: 2 },
    { id: 'truffle', name: '高級トリュフ', cost: 3, energy: 25, xp: 50, price: 150, minLv: 4 },
];

/* --- ゲームエンジン --- */
class Game {
    constructor() {
        this.stage = document.getElementById('game-stage');
        this.container = document.getElementById('entities-layer');
        
        // 状態
        this.state = {
            money: 500,
            ingredients: 5,
            stock: 0,     // バックヤード在庫
            display: 0,   // 陳列在庫
            energy: 100,
            xp: 0,
            level: 1,
            isNight: false
        };

        this.audioCtx = null;
        this.isPlaying = false;
        
        // インスタンス
        this.player = null;
        this.customers = [];
        this.ui = new UI(this);
        this.logic = new GameLogic(this);
        
        // ループ
        this.lastTime = 0;
        this.customerTimer = 0;
    }

    start() {
        document.getElementById('start-screen').style.display = 'none';
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.isPlaying = true;

        // プレイヤー生成 (初期位置: 右上階段付近)
        this.player = new Actor(this, 'player', CONFIG.charSrc, 850, 100);
        
        // 初期描画
        this.ui.updateAll();
        
        // クリックイベント
        this.stage.addEventListener('pointerdown', (e) => this.handleClick(e));
        
        // ゲームループ開始
        requestAnimationFrame((t) => this.loop(t));
    }

    handleClick(e) {
        if (!this.isPlaying || this.player.isBusy) return;

        // クリック座標の取得
        const rect = this.stage.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // 音再生
        this.playSound('click');

        // ホットスポットクリック判定
        if (e.target.classList.contains('hotspot')) {
            const id = e.target.id;
            // ターゲット座標はそのエリアの手前あたりに設定
            const targetPos = this.getTargetPosition(e.target);
            this.player.walkTo(targetPos.x, targetPos.y, () => {
                this.logic.interact(id);
            });
        } else {
            // ただの移動
            this.player.walkTo(clickX, clickY);
            // エフェクト
            this.ui.createSparkle(clickX, clickY);
        }
    }

    getTargetPosition(el) {
        // 要素の下端中心より少し手前を計算
        const r = el.getBoundingClientRect();
        const sr = this.stage.getBoundingClientRect();
        return {
            x: (r.left - sr.left) + r.width / 2,
            y: (r.bottom - sr.top) + 10
        };
    }

    loop(timestamp) {
        if (!this.isPlaying) return;
        const dt = timestamp - this.lastTime;
        this.lastTime = timestamp;

        // プレイヤー更新
        this.player.update(dt);

        // お客さん更新
        this.customers.forEach((c, i) => {
            c.update(dt);
            if (c.isDead) {
                c.element.remove();
                this.customers.splice(i, 1);
            }
        });

        // お客さん出現ロジック
        if (this.state.display > 0 && !this.state.isNight) {
            this.customerTimer += dt;
            // 在庫があるほど来店しやすい（最大3秒に1回）
            if (this.customerTimer > 3000 + Math.random() * 5000) {
                this.spawnCustomer();
                this.customerTimer = 0;
            }
        }

        requestAnimationFrame((t) => this.loop(t));
    }

    spawnCustomer() {
        if(this.customers.length >= 3) return; // 同時来店は3人まで
        
        // お客さんは影のようなシルエット（色はランダム）
        const customer = new Actor(this, 'customer', null, 480, 550); // 下中央（入り口）から
        customer.element.style.filter = `hue-rotate(${Math.random()*360}deg)`;
        
        // 行動スクリプト
        customer.walkTo(480, 400, () => { // レジ前へ
            setTimeout(() => {
                if(this.state.display > 0) {
                    this.logic.sellItem();
                    customer.showBubble("おいしい！");
                    this.playSound('money');
                } else {
                    customer.showBubble("売り切れか...");
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

/* --- キャラクター・アクター --- */
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
        
        // DOM生成
        this.element = document.createElement('div');
        this.element.className = 'entity';
        this.element.style.width = CONFIG.charSize + 'px';
        this.element.style.height = CONFIG.charSize + 'px';
        
        if (type === 'player' && imgSrc) {
            this.element.style.backgroundImage = `url(${imgSrc})`;
            this.element.style.backgroundSize = `${CONFIG.charSize * 3}px ${CONFIG.charSize * 4}px`;
        } else {
            // お客さん（簡易表示: 色付きの四角/丸）
            this.element.style.background = '#666';
            this.element.style.borderRadius = '50% 50% 0 0';
            this.element.style.width = '32px';
            this.element.style.height = '48px';
            this.element.style.border = '2px solid #fff';
        }
        
        this.game.container.appendChild(this.element);
        this.updatePos();
    }

    walkTo(x, y, callback) {
        this.targetX = Math.max(20, Math.min(940, x));
        this.targetY = Math.max(20, Math.min(520, y));
        this.isMoving = true;
        this.onArrive = callback || null;
    }

    update(dt) {
        if (this.isMoving) {
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > this.speed) {
                // 移動計算
                let vx = (dx / dist) * this.speed;
                let vy = (dy / dist) * this.speed;

                // 簡易衝突判定 (次の位置が障害物なら止まる or 滑る)
                if (!this.checkCollision(this.x + vx, this.y + vy)) {
                    this.x += vx;
                    this.y += vy;
                } else {
                    // X軸だけなら行ける？
                    if(!this.checkCollision(this.x + vx, this.y)) this.x += vx;
                    // Y軸だけなら行ける？
                    else if(!this.checkCollision(this.x, this.y + vy)) this.y += vy;
                    else this.isMoving = false; // 完全にスタックしたら停止
                }

                // 向きとアニメーション
                const angle = Math.atan2(dy, dx) * 180 / Math.PI;
                if (angle > -45 && angle <= 45) this.dir = 2; // 右
                else if (angle > 45 && angle <= 135) this.dir = 0; // 下
                else if (angle > 135 || angle <= -135) this.dir = 1; // 左
                else this.dir = 3; // 上

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
                this.frame = 1; // 棒立ち
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
        // 足元のポイント(x, y)が障害物矩形に入っているか
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
        this.element.style.top = (this.y - CONFIG.charSize) + 'px'; // 足元基準
        this.element.style.zIndex = Math.floor(this.y); // 奥行き
        
        // スプライト更新
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

/* --- ゲームロジック --- */
class GameLogic {
    constructor(game) { this.game = game; }

    interact(zoneId) {
        this.game.player.dir = 3; // 上を向く
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
        // レシピリスト生成
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
        }
    }

    sellItem() {
        this.game.state.display--;
        // 平均的な売上（簡易）
        const earnings = 50 + (this.game.state.level * 5);
        this.game.state.money += earnings;
        this.game.ui.updateAll();
    }

    gainXp(val) {
        this.game.state.xp += val;
        // レベルアップ簡易計算 (Lv * 100 xp必要)
        if(this.game.state.xp >= this.game.state.level * 100) {
            this.game.state.xp = 0;
            this.game.state.level++;
            this.game.state.energy = 100; // 全回復
            this.game.playSound('money');
            this.game.player.showBubble("Level Up!!");
        }
    }
}

/* --- UI管理 --- */
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
        d.style.pointerEvents = 'none';
        d.animate([
            { transform: 'scale(0.5)', opacity: 1 },
            { transform: 'scale(1.5) rotate(90deg)', opacity: 0 }
        ], { duration: 500 });
        this.game.stage.appendChild(d);
        setTimeout(() => d.remove(), 500);
    }
}

const game = new Game();