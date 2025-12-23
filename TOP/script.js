// --- 背景パーティクル ---
function createParticles() {
    const wrapper = document.createElement('div');
    wrapper.id = 'particle-wrapper';
    document.body.appendChild(wrapper);

    // ★現在のページが ura.html かどうか自動判定
    const isUra = window.location.href.indexOf('ura.html') > -1;

    // 色の設定（裏なら青系、表ならピンク系）
    const colors = isUra 
        ? ['#89c3eb', '#a0d8ef', '#ffffff'] // 水色系
        : ['#ff9ebb', '#a8cce8', '#ffffff']; // ピンク系

    const fragment = document.createDocumentFragment();
    
    for(let i=0; i < 12; i++) {
        const span = document.createElement('span');
        span.classList.add('floating-particle');
        const sizeValue = Math.random() * 60 + 20;
        span.style.width = sizeValue + 'px';
        span.style.height = sizeValue + 'px';
        span.style.left = Math.random() * 100 + '%';
        span.style.top = '110vh'; 
        
        span.style.background = colors[Math.floor(Math.random() * colors.length)];
        span.style.animationDuration = (Math.random() * 10 + 15) + 's';
        span.style.animationDelay = '-' + (Math.random() * 10) + 's';
        fragment.appendChild(span);
    }
    wrapper.appendChild(fragment);
}
createParticles();

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. キャラクターの歩行制御
    const walker = document.getElementById('pixel-walker');
    const walkSpeed = 3500; 
    const stayTime = 1500;  
    const minInterval = 8000; 
    const randomInterval = 15000;

    function startWalkerSequence() {
        const w = window.innerWidth;
        const walkerWidth = walker.offsetWidth;
        const fromRight = Math.random() > 0.5;
        const startX = fromRight ? w + walkerWidth : -walkerWidth * 2;
        const isMobile = w < 768;
        const targetX = fromRight ? (w - (isMobile ? 60 : 120)) : (isMobile ? 20 : 80);

        walker.style.transition = 'none';
        walker.style.transform = `translate3d(${startX}px, 0, 0)`;
        walker.setAttribute('data-facing', fromRight ? 'left' : 'right');
        void walker.offsetWidth;
        
        walker.style.transition = `transform ${walkSpeed}ms linear, bottom 0.5s cubic-bezier(0.4, 0, 0.2, 1)`;
        walker.style.transform = `translate3d(${targetX}px, 0, 0)`;

        setTimeout(() => {
            walker.setAttribute('data-facing', 'front');
            setTimeout(() => {
                walker.setAttribute('data-facing', fromRight ? 'right' : 'left');
                walker.style.transform = `translate3d(${startX}px, 0, 0)`;
                setTimeout(scheduleNextWalk, walkSpeed);
            }, stayTime);
        }, walkSpeed);
    }
    function scheduleNextWalk() {
        setTimeout(startWalkerSequence, minInterval + Math.random() * randomInterval);
    }
    setTimeout(scheduleNextWalk, 2000);

    // 2. 時計の更新
    function updateClock() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const clockEl = document.getElementById('digital-clock');
        if(clockEl) {
            clockEl.textContent = `${hours}:${minutes}`;
        }
    }
    setInterval(updateClock, 1000);
    updateClock();

    // 3. ニュースJSON
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
    fetch('TOP/news.json')
        .then(res => res.json())
        .then(data => {
            const container = document.getElementById('news-container');
            container.innerHTML = ''; 
            const shuffledData = shuffleArray(data);
            const createItems = () => {
                shuffledData.forEach(text => {
                    const span = document.createElement('span');
                    span.className = 'news-item';
                    span.textContent = text;
                    container.appendChild(span);
                });
            };
            createItems();
            createItems();
        })
        .catch(err => console.error('News Error:', err));

    // 4. キャラクターレポート
    fetch('TOP/report.json')
        .then(res => res.json())
        .then(data => {
            const reportEl = document.getElementById('report-text');
            if (!data || data.length === 0) return;

            const updateReport = () => {
                const text = data[Math.floor(Math.random() * data.length)];
                
                reportEl.style.animation = 'none';
                reportEl.offsetHeight; 
                reportEl.style.animation = 'fadeReport 15s infinite';
                
                reportEl.textContent = text;
            };

            updateReport();
            setInterval(updateReport, 15000);
        })
        .catch(err => console.error('Report Error:', err));

    // 5. リボン収納
    const ribbonToggle = document.getElementById('ribbon-toggle');
    const bottomRibbon = document.getElementById('bottom-ribbon');
    
    if (ribbonToggle && bottomRibbon) {
        ribbonToggle.addEventListener('click', () => {
            bottomRibbon.classList.toggle('hidden');
            document.body.classList.toggle('ribbon-hidden');
            
            const isHidden = bottomRibbon.classList.contains('hidden');
            if (isHidden) {
                walker.style.bottom = '5px'; 
            } else {
                walker.style.bottom = '35px';
            }
        });
    }
});