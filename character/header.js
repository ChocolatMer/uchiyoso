import { login, logout, saveToCloud, loadFromCloud, monitorAuth } from "./firestore.js";

export function initHeader() {
    // ★ここがポイント！
    // "header.css" とだけ書くことで、
    // detail.html からは「detail/header.css」を、
    // list.html からは「header.css（ルート）」を探しに行きます。
    if (!document.querySelector('link[href*="header.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'header.css'; 
        document.head.appendChild(link);
    }

    // HTML生成
    const headerHTML = `
        <header id="sys-header">
            <a href="/list.html"> <div class="header-logo">
                    <span>CYBER_OS <span class="header-version">// SYSTEM_V6.0</span></span>
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

    // --- 機能設定（変更なし） ---
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