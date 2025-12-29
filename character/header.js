import { login, logout, saveToCloud, loadFromCloud, monitorAuth } from "./firestore.js";

export function initHeader() {
    // 1. CSS自動読み込み
    if (!document.querySelector('link[href*="header.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        const path = window.location.pathname;
        link.href = (path.includes('/detail/') || path.includes('/list/')) ? '../header.css' : 'header.css'; 
        document.head.appendChild(link);
    }

    // 2. タイトルの決定
    const path = window.location.pathname;
    const mainTitle = document.title; 
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

    // --- 機能設定 ---
    const btnLogin = document.getElementById('headerLoginBtn');
    const btnLogout = document.getElementById('headerLogoutBtn');
    const btnSave = document.getElementById('globalSaveBtn');
    const infoSpan = document.getElementById('headerInfo');

    if(btnLogin) btnLogin.addEventListener('click', login);
    if(btnLogout) btnLogout.addEventListener('click', logout);

    if(btnSave) {
        // ★修正箇所: 非同期処理に対応し、戻り値がある場合のみ保存を実行する
        btnSave.addEventListener('click', async () => {
            if (typeof window.prepareSaveData === 'function') {
                // prepareSaveDataが非同期(async)の場合は待機する
                const result = await window.prepareSaveData();
                
                // データそのものが返ってきた場合のみ、ここで保存する
                // (edit.htmlのように内部で保存完結する場合は何もしない)
                if(result && result.id) {
                    saveToCloud(result);
                }
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