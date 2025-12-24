// --- firestore.js (共有設定版) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } 
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } 
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

// --- データベース機能 (共有設定) ---

// 2人で共有するための固定された場所を指定
// ※セキュリティルールで許可した "rooms" コレクションを使用します
const SHARED_COLLECTION = "rooms";
const SHARED_DOC_ID = "couple_shared_data"; 

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
        // 【修正】個人のUIDではなく、共有用の固定IDを指定
        const sharedRef = doc(db, SHARED_COLLECTION, SHARED_DOC_ID);
        
        // 既存データを取得してマージ
        const docSnap = await getDoc(sharedRef);
        let currentStore = {};
        if (docSnap.exists()) {
            currentStore = docSnap.data().store || {};
        }
        
        currentStore[charData.name] = charData;

        await setDoc(sharedRef, { store: currentStore }, { merge: true });
        alert("SHARED UPLOAD COMPLETE: " + charData.name);
        
    } catch (e) {
        console.error("Error adding document: ", e);
        // エラー詳細：権限がない場合はここに引っかかります
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
        // 【修正】読み込みも共有用の固定IDから取得
        const sharedRef = doc(db, SHARED_COLLECTION, SHARED_DOC_ID);
        const docSnap = await getDoc(sharedRef);

        if (docSnap.exists()) {
            return docSnap.data().store || {};
        } else {
            // まだデータがひとつもない場合
            return {};
        }
    } catch (e) {
        console.error("Error loading document: ", e);
        alert("LOAD ERROR: " + e.message);
        return null;
    }
}