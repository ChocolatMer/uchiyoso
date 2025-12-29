// --- uchiyoso/character/firestore.js ---

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } 
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, doc, setDoc, getDoc, collection, getDocs, deleteDoc, addDoc, updateDoc, query, where, serverTimestamp, orderBy 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 設定 (変更なし)
const firebaseConfig = {
  apiKey: "AIzaSyBZVh6NhFA_BSuyUW-sZV2QPSvSzdYJZWU",
  authDomain: "chocolatmer-uchiyoso.firebaseapp.com",
  projectId: "chocolatmer-uchiyoso",
  storageBucket: "chocolatmer-uchiyoso.firebasestorage.app",
  messagingSenderId: "251681036234",
  appId: "1:251681036234:web:be56156da1210d45afe133"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

let currentUser = null;

// --- 認証 ---
export function login() {
    signInWithPopup(auth, provider)
        .then((result) => alert("ログインしました: " + result.user.displayName))
        .catch((error) => alert("ログイン失敗: " + error.message));
}

export function logout() {
    signOut(auth).then(() => alert("ログアウトしました"));
}

export function monitorAuth(onLogin, onLogout) {
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        if (user) { if(onLogin) onLogin(user); }
        else { if(onLogout) onLogout(); }
    });
}

// --- データベース設定 ---
const SHARED_COLLECTION = "rooms";
const SHARED_DOC_ID = "couple_shared_data";
const CHAR_SUB_COLLECTION = "characters"; 
const SCENARIO_COLLECTION = "scenarios";

// --- キャラクター操作 (ID管理版) ---

// 保存
export async function saveToCloud(charData) {
    if (!currentUser) return alert("保存にはログインが必要です。");
    if (!charData || !charData.id) return alert("データエラー: IDがありません。");

    try {
        const charRef = doc(db, SHARED_COLLECTION, SHARED_DOC_ID, CHAR_SUB_COLLECTION, charData.id);
        await setDoc(charRef, charData, { merge: true });
        console.log("Character Updated:", charData.name);
    } catch (e) {
        console.error("Save Error:", e);
        alert("保存エラー: " + e.message);
    }
}

// 読み込み
export async function loadFromCloud() {
    if (!currentUser) return alert("読み込みにはログインが必要です。");

    try {
        const colRef = collection(db, SHARED_COLLECTION, SHARED_DOC_ID, CHAR_SUB_COLLECTION);
        const querySnapshot = await getDocs(colRef);

        const loadedData = {};
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (!data.id) { data.id = docSnap.id; }
            loadedData[data.id] = data;
        });
        
        return loadedData;

    } catch (e) {
        console.error("Load Error:", e);
        alert("読み込みエラー: " + e.message);
        return null;
    }
}

// 削除
export async function deleteFromCloud(charId) {
    if (!currentUser || !charId) return;
    try {
        const charRef = doc(db, SHARED_COLLECTION, SHARED_DOC_ID, CHAR_SUB_COLLECTION, charId);
        await deleteDoc(charRef);
        alert("削除しました。");
        location.reload(); 
    } catch (e) {
        console.error("Delete Error:", e);
        alert("削除エラー: " + e.message);
    }
}

// --- シナリオ機能 ---

// 新規保存
export async function saveScenario(scenarioData) {
    if (!currentUser) throw new Error("User not logged in");
    const dataToSave = {
        ...scenarioData,
        updatedAt: serverTimestamp()
    };
    try {
        const docRef = await addDoc(collection(db, SCENARIO_COLLECTION), dataToSave);
        return docRef.id;
    } catch (e) {
        console.error("Error adding scenario: ", e);
        throw e;
    }
}

// 更新（編集用）
export async function updateScenario(scenarioId, scenarioData) {
    if (!currentUser) throw new Error("User not logged in");
    if (!scenarioId) throw new Error("No Scenario ID provided");
    
    const dataToSave = {
        ...scenarioData,
        updatedAt: serverTimestamp()
    };
    
    try {
        const docRef = doc(db, SCENARIO_COLLECTION, scenarioId);
        await updateDoc(docRef, dataToSave);
        return scenarioId;
    } catch (e) {
        console.error("Error updating scenario: ", e);
        throw e;
    }
}

// キャラクターIDに基づくシナリオ取得（履歴表示用）
export async function getScenariosForCharacter(charId) {
    if (!currentUser) return [];
    try {
        // members 配列に charId が含まれているものを探す
        const q = query(
            collection(db, SCENARIO_COLLECTION),
            where("members", "array-contains", charId)
        );
        const querySnapshot = await getDocs(q);
        const scenarios = [];
        querySnapshot.forEach((doc) => {
            scenarios.push({ id: doc.id, ...doc.data() });
        });
        // 日付順にソート (新しい順)
        return scenarios.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    } catch (e) {
        console.error(e);
        return [];
    }
}

// 特定のシナリオをIDで取得
export async function getScenarioById(scenarioId) {
    if (!currentUser) return null;
    try {
        const docRef = doc(db, SCENARIO_COLLECTION, scenarioId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        } else {
            return null;
        }
    } catch (e) {
        console.error(e);
        return null;
    }
}