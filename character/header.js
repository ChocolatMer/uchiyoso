import { login, logout, saveToCloud, loadFromCloud, monitorAuth } from "./firestore.js";

export function initHeader() {
    // 1. CSS自動読み込み
    // (detail.htmlなどのフォルダ内ページからは ../css/header.css を、ルートからは css/header.css を探す)
    // ※今回はCSSのパス問題を防ぐため、HTML側で読み込んでいる前提の書き方にします

    // 2. ページタイトルを自動判定するロジック
    const path = window.location.pathname;
    let pageTitle = "SYSTEM"; // デフォルト

    if (path.includes("list.html")) {
        pageTitle = "SQUAD SELECTION"; // リスト画面
    } else if (path.includes("detail.html")) {
        pageTitle = "PERSONAL DATA";   // 詳細画面
    } else if (path.includes("edit.html")) {
        pageTitle = "DATA EDITOR";     // 編集画面
    }

    // 3. ヘッダーHTML生成
    const headerHTML = `
        <header id="sys-header">
            <a href="${path.includes('/detail/') ? '../list.html' : 'list.html'}">
                <div class="header-logo">
                    <span>CYBER_OS <span class="header-version">// ${pageTitle}</span></span>
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

    // --- 機能設定 ---
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