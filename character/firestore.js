// --- firestore.js (共有設定・分割保存対応版) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } 
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
// 【修正】 importに collection, getDocs, deleteDoc を追加しました
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, deleteDoc } 
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBZVh6NhFA_BSuyUW-sZV2QPSvSzdYJZWU",
  authDomain: "chocolatmer-uchiyoso.firebaseapp.com",
  projectId: "chocolatmer-uchiyoso",
  storageBucket: "chocolatmer-uchiyoso.firebasestorage.app",
  messagingSenderId: "251681036234",
  appId: "1:251681036234:web:be56156da1210d45afe133"
};

// 初期化処理
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

let currentUser = null;

// --- 認証機能 ---

// ログイン処理
export function login() {
    signInWithPopup(auth, provider)
        .then((result) => {
            console.log("Logged in:", result.user.email);
            alert("NETWORK CONNECTED: " + result.user.displayName);
        }).catch((error) => {
            console.error(error);
            alert("CONNECTION FAILED: " + error.message);
        });
}

// ログアウト処理
export function logout() {
    signOut(auth).then(() => {
        alert("DISCONNECTED");
    });
}

// ログイン状態の監視
export function monitorAuth(onLogin, onLogout) {
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        if (user) {
            if(onLogin) onLogin(user);
        } else {
            if(onLogout) onLogout();
        }
    });
}

// --- データベース機能 (共有設定・分割保存) ---

const SHARED_COLLECTION = "rooms";
const SHARED_DOC_ID = "couple_shared_data"; 
// 【修正】 分割保存用のサブコレクション名を定義
const CHAR_SUB_COLLECTION = "characters"; 

// 保存 (SAVE CLOUD)
export async function saveToCloud(charData) {
    if (!currentUser) {
        alert("ERROR: Login required to access cloud storage.");
        return;
    }
    if (!charData || !charData.name) {
        alert("ERROR: No character data to save.");
        return;
    }

    try {
        // 【修正】 保存先を「個別のドキュメント」に変更
        // rooms > couple_shared_data > characters > [キャラクター名]
        const charRef = doc(db, SHARED_COLLECTION, SHARED_DOC_ID, CHAR_SUB_COLLECTION, charData.name);
        
        // 上書き保存
        await setDoc(charRef, charData);
        alert("SHARED UPLOAD COMPLETE (Split Mode): " + charData.name);
        
    } catch (e) {
        console.error("Error adding document: ", e);
        alert("UPLOAD ERROR: " + e.message);
    }
}

// 読み込み (LOAD CLOUD)
export async function loadFromCloud() {
    if (!currentUser) {
        alert("ERROR: Login required.");
        return null;
    }

    try {
        const store = {};

        // 【修正】 読み込み処理を「サブコレクション内の全ファイル取得」に変更
        const subColRef = collection(db, SHARED_COLLECTION, SHARED_DOC_ID, CHAR_SUB_COLLECTION);
        const querySnapshot = await getDocs(subColRef);

        // 取得した個別のキャラデータを store オブジェクトにまとめる
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.name) {
                store[data.name] = data;
            }
        });

        // 【修正】 移行期間用の処理 (旧データがあれば読み込んでマージ)
        // ※以前のデータを読み込めなくならないようにするための保険です
        try {
            const oldRef = doc(db, SHARED_COLLECTION, SHARED_DOC_ID);
            const oldSnap = await getDoc(oldRef);
            if (oldSnap.exists()) {
                const oldStore = oldSnap.data().store || {};
                for (const key in oldStore) {
                    // 新しい保存先にまだないキャラだけ、旧データから読み込む
                    if (!store[key]) {
                        store[key] = oldStore[key];
                    }
                }
            }
        } catch(e) {
            console.warn("Old data load skip:", e);
        }

        return store;

    } catch (e) {
        console.error("Error loading document: ", e);
        alert("LOAD ERROR: " + e.message);
        return null;
    }
}

// 【新規追加】 削除機能
// 分割保存されたデータを個別に削除するための関数です
export async function deleteFromCloud(charName) {
    if (!currentUser || !charName) return;
    try {
        const charRef = doc(db, SHARED_COLLECTION, SHARED_DOC_ID, CHAR_SUB_COLLECTION, charName);
        await deleteDoc(charRef);
        alert("DELETED: " + charName);
    } catch (e) {
        console.error("Delete error:", e);
        alert("DELETE ERROR: " + e.message);
    }
}