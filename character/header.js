// --- header.js ---
import { login, logout, saveToCloud, monitorAuth } from "./firestore.js";

// ヘッダーを表示して機能を有効にする関数
export function initHeader() {
    // 1. ヘッダーのHTML（見た目）を作成
    const headerHTML = `
        <header style="background:#111; padding:10px 20px; display:flex; justify-content:space-between; align-items:center; color:#fff; border-bottom:1px solid #333; position:sticky; top:0; z-index:1000;">
            <div style="font-family:'Orbitron', sans-serif; font-weight:bold; color:#fff;">
                CYBER_OS <span style="font-size:0.8em; color:#00f3ff;">// SYSTEM_V6.0</span>
            </div>
            <div style="display:flex; gap:10px;">
                <button id="globalSaveBtn" class="cyber-btn" style="padding:5px 15px; width:auto; font-size:0.9rem;">SAVE DATA</button>
                
                <button id="headerLoginBtn" class="cyber-btn" style="padding:5px 15px; width:auto; font-size:0.9rem;">LOGIN</button>
                <button id="headerLogoutBtn" class="cyber-btn hidden" style="padding:5px 15px; width:auto; font-size:0.9rem; display:none;">LOGOUT</button>
            </div>
        </header>
    `;

    // 2. ページの一番上に挿入する
    document.body.insertAdjacentHTML('afterbegin', headerHTML);

    // 3. ボタンの機能をつける
    const btnLogin = document.getElementById('headerLoginBtn');
    const btnLogout = document.getElementById('headerLogoutBtn');
    const btnSave = document.getElementById('globalSaveBtn');

    if(btnLogin) btnLogin.addEventListener('click', login);
    if(btnLogout) btnLogout.addEventListener('click', logout);

    // ★重要：保存ボタンが押された時の動き
    if(btnSave) {
        btnSave.addEventListener('click', () => {
            // 各ページの「データ準備係（window.prepareSaveData）」を呼び出す
            if (typeof window.prepareSaveData === 'function') {
                const dataToSave = window.prepareSaveData(); 
                if(dataToSave) {
                    saveToCloud(dataToSave); // firestore.jsの保存機能を実行
                }
            } else {
                alert("このページでは保存機能は使えません（準備関数が見つかりません）");
            }
        });
    }

    // 4. ログイン状態の表示切り替え
    monitorAuth(
        (user) => {
            if(btnLogin) btnLogin.style.display = 'none';
            if(btnLogout) {
                btnLogout.style.display = 'block';
                btnLogout.textContent = "LOGOUT (" + user.displayName + ")";
            }
        },
        () => {
            if(btnLogin) btnLogin.style.display = 'block';
            if(btnLogout) btnLogout.style.display = 'none';
        }
    );
}