import { login, logout, saveToCloud, loadFromCloud, monitorAuth } from "./firestore.js";

export function initHeader() {
    // 1. CSS自動読み込み
    if (!document.querySelector('link[href*="header.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        // パス判定：detailフォルダ等の中にいる場合は親階層を見に行く
        const path = window.location.pathname;
        link.href = (path.includes('/detail/') || path.includes('/list/')) ? '../header.css' : 'header.css'; 
        document.head.appendChild(link);
    }

    // 2. タイトルの決定
    const path = window.location.pathname;
    
    // (A) メインタイトル：HTMLの<title>タグから文字を取得
    // " - SYSTEM_V6" などの共通部分があれば消す処理もここで可能
    const mainTitle = document.title; 

    // (B) サブタイトル（右側の小さい文字）：ファイル名で判定
    let subTitle = "CHARACTER";
    if (path.includes("list.html")) {
        subTitle = "SQUAD SELECTION";
    } else if (path.includes("detail.html")) {
        subTitle = "PERSONAL DATA";
    } else if (path.includes("edit.html")) {
        subTitle = "DATA EDITOR";
    }

    // 3. ヘッダーHTML生成
    const headerHTML = `
        <header id="sys-header">
            <a href="${path.includes('/detail/') ? '../list.html' : 'list.html'}">
                <div class="header-logo">
                    <span>${mainTitle} <span class="header-version">// ${subTitle}</span></span>
                    <span id="headerInfo">OFFLINE</span>
                </div>
            </a>

            <div class="header-controls">
                <button id="globalSaveBtn" class="hdr-btn">SAVE</button>
                <button id="headerLoginBtn" class="hdr-btn">LOGIN</button>
                <button id="headerLogoutBtn" class="hdr-btn hidden">LOGOUT</button>
            </div>
        </header>
        <div class="header-spacer"></div>
    `;

    if(!document.querySelector('header')) {
        document.body.insertAdjacentHTML('afterbegin', headerHTML);
    }

    // --- 以下、機能設定（変更なし） ---
    const btnLogin = document.getElementById('headerLoginBtn');
    const btnLogout = document.getElementById('headerLogoutBtn');
    const btnSave = document.getElementById('globalSaveBtn');
    const infoSpan = document.getElementById('headerInfo');

    if(btnLogin) btnLogin.addEventListener('click', login);
    if(btnLogout) btnLogout.addEventListener('click', logout);

    if(btnSave) {
        btnSave.addEventListener('click', () => {
            if (typeof window.prepareSaveData === 'function') {
                const dataToSave = window.prepareSaveData(); 
                if(dataToSave) saveToCloud(dataToSave);
            } else {
                alert("この画面では保存できません。");
            }
        });
    }

    monitorAuth(
        async (user) => {
            if(btnLogin) btnLogin.classList.add('hidden');
            if(btnLogout) {
                btnLogout.classList.remove('hidden');
                btnLogout.textContent = "LOGOUT";
            }
            if(infoSpan) {
                const data = await loadFromCloud();
                const count = data ? Object.keys(data).length : 0;
                infoSpan.textContent = `STORAGE: ${count}`;
                if(typeof window.renderCharacterList === 'function') window.renderCharacterList(data);
            }
        },
        () => {
            if(btnLogin) btnLogin.classList.remove('hidden');
            if(btnLogout) btnLogout.classList.add('hidden');
            if(infoSpan) infoSpan.textContent = "OFFLINE";
        }
    );
}