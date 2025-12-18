// --- 背景パーティクル ---
function createParticles() {
    const colors = ['#ff9ebb', '#a8cce8', '#ffffff'];
    // DOM操作回数を減らすためDocumentFragmentを使用
    const fragment = document.createDocumentFragment();
    
    for(let i=0; i < 12; i++) {
        const span = document.createElement('span');
        span.classList.add('floating-particle');
        const sizeValue = Math.random() * 60 + 20;
        span.style.width = sizeValue + 'px';
        span.style.height = sizeValue + 'px';
        span.style.left = Math.random() * 100 + '%';
        span.style.top = Math.random() * 100 + 'vh';
        span.style.background = colors[Math.floor(Math.random() * colors.length)];
        // アニメーション時間をランダムに
        span.style.animationDuration = (Math.random() * 10 + 15) + 's';
        span.style.animationDelay = '-' + (Math.random() * 10) + 's';
        fragment.appendChild(span);
    }
    document.body.appendChild(fragment);
}
createParticles();

// --- ドット絵キャラ & ニュース制御 ---
document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // 1. キャラクターの歩行制御 (パフォーマンス改善版)
    // ==========================================
    const walker = document.getElementById('pixel-walker');
    const walkSpeed = 3500; 
    const stayTime = 1500;  
    const minInterval = 8000; 
    const randomInterval = 15000;

    function startWalkerSequence() {
        const w = window.innerWidth;
        const walkerWidth = walker.offsetWidth;
        
        // どちらから歩いてくるか (trueなら右から左へ)
        const fromRight = Math.random() > 0.5;
        
        // 開始位置と終了位置の計算
        // transform: translate3d(x, 0, 0) で動かすため、画面左端からの相対座標を計算
        // 初期CSSで left: 0 になっているので、translateXの値がそのまま画面上のX座標になります
        
        const startX = fromRight ? w + walkerWidth : -walkerWidth * 2;
        
        // 目的地（スマホとPCで調整）
        const isMobile = w < 768;
        // 右から来るなら画面右端付近、左から来るなら画面左端付近へ
        const targetX = fromRight 
            ? (w - (isMobile ? 60 : 120)) 
            : (isMobile ? 20 : 80);

        // 1. 初期位置へセット (アニメーションなし)
        walker.style.transition = 'none';
        walker.style.transform = `translate3d(${startX}px, 0, 0)`;
        walker.setAttribute('data-facing', fromRight ? 'left' : 'right');
        
        // ブラウザにレイアウト適用を強制 (Reflow)
        void walker.offsetWidth;
        
        // 2. 歩行開始 (アニメーションあり)
        walker.style.transition = `transform ${walkSpeed}ms linear`;
        walker.style.transform = `translate3d(${targetX}px, 0, 0)`;

        // 3. 目的地に到着後
        setTimeout(() => {
            // 正面を向いて止まる
            walker.setAttribute('data-facing', 'front');

            // 4. 帰り道
            setTimeout(() => {
                walker.setAttribute('data-facing', fromRight ? 'right' : 'left');
                
                // 元の場所へ戻る
                walker.style.transform = `translate3d(${startX}px, 0, 0)`;

                // 戻り終わったら次のスケジュールを設定
                setTimeout(scheduleNextWalk, walkSpeed);
            }, stayTime);

        }, walkSpeed);
    }

    function scheduleNextWalk() {
        const nextTime = minInterval + Math.random() * randomInterval;
        setTimeout(startWalkerSequence, nextTime);
    }

    // 初回起動
    setTimeout(scheduleNextWalk, 2000);

    // ==========================================
    // 2. ニュースJSONの読み込み & ランダム表示
    // ==========================================
    
    // 配列をシャッフルする関数 (Fisher-Yates shuffle)
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    fetch('news.json')
        .then(response => {
            if (!response.ok) throw new Error("JSON not found");
            return response.json();
        })
        .then(data => {
            const container = document.getElementById('news-container');
            container.innerHTML = ''; 
            
            // データをランダムに並び替え
            const shuffledData = shuffleArray(data);

            // ループ表示用に関数を定義
            const createItems = () => {
                shuffledData.forEach(text => {
                    const span = document.createElement('span');
                    span.className = 'news-item';
                    span.textContent = text;
                    container.appendChild(span);
                });
            };

            // スムーズなループのために2セット生成
            createItems();
            createItems();
        })
        .catch(error => {
            console.error('Error loading news:', error);
            document.getElementById('news-container').innerHTML = '<span class="news-item">Welcome to Uchiyoso Maker!</span>';
        });
});