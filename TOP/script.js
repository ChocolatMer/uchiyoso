// --- 背景パーティクル ---
function createParticles() {
    const colors = ['#ff9ebb', '#a8cce8', '#ffffff'];
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
        span.style.animationDuration = (Math.random() * 10 + 15) + 's';
        span.style.animationDelay = '-' + (Math.random() * 10) + 's';
        fragment.appendChild(span);
    }
    document.body.appendChild(fragment);
}
createParticles();

// --- ドット絵キャラ & ニュース制御 ---
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. キャラクターの歩行制御 (パフォーマンス改善版)
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
        const targetX = fromRight 
            ? (w - (isMobile ? 60 : 120)) 
            : (isMobile ? 20 : 80);

        walker.style.transition = 'none';
        walker.style.transform = `translate3d(${startX}px, 0, 0)`;
        walker.setAttribute('data-facing', fromRight ? 'left' : 'right');
        
        void walker.offsetWidth;
        
        walker.style.transition = `transform ${walkSpeed}ms linear`;
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
        const nextTime = minInterval + Math.random() * randomInterval;
        setTimeout(startWalkerSequence, nextTime);
    }
    setTimeout(scheduleNextWalk, 2000);

    // 2. ニュースJSONの読み込み & ランダム表示
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // パス変更: index.htmlから見てTOPフォルダ内のJSONを取得
    fetch('TOP/news.json')
        .then(response => {
            if (!response.ok) throw new Error("JSON not found");
            return response.json();
        })
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
        .catch(error => {
            console.error('Error loading news:', error);
            document.getElementById('news-container').innerHTML = '<span class="news-item">Welcome to Uchiyoso Maker!</span>';
        });
});