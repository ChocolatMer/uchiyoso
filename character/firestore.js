// --- firestore.js ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } 
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } 
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ★あなたのプロジェクト設定（画像から転記済みです）
const firebaseConfig = {
  apiKey: "AIzaSyBZYvH6NhFA_BSuyUW-sZV2QPSvSzdYJZWU",
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

// --- データベース機能 ---

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
        const userRef = doc(db, "users", currentUser.uid);
        
        // 既存データを取得してマージ
        const docSnap = await getDoc(userRef);
        let currentStore = {};
        if (docSnap.exists()) {
            currentStore = docSnap.data().store || {};
        }
        
        currentStore[charData.name] = charData;

        await setDoc(userRef, { store: currentStore }, { merge: true });
        alert("UPLOAD COMPLETE: " + charData.name);
        
    } catch (e) {
        console.error("Error adding document: ", e);
        alert("UPLOAD ERROR: See console.");
    }
}

// 読み込み (LOAD CLOUD)
export async function loadFromCloud() {
    if (!currentUser) {
        alert("ERROR: Login required.");
        return null;
    }

    try {
        const userRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
            return docSnap.data().store || {};
        } else {
            return {};
        }
    } catch (e) {
        console.error("Error loading document: ", e);
        alert("LOAD ERROR: See console.");
        return null;
    }
}