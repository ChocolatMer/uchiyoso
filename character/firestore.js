// --- uchiyoso/character/firestore.js ---

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } 
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, doc, setDoc, getDoc, collection, getDocs, deleteDoc, addDoc, updateDoc, query, where, serverTimestamp, orderBy 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 設定
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
        .then((result) => alert("Login: " + result.user.displayName))
        .catch((error) => alert("Error: " + error.message));
}

export function logout() {
    signOut(auth).then(() => alert("Logout"));
}

export function monitorAuth(onLogin, onLogout) {
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        if (user) { if(onLogin) onLogin(user); }
        else { if(onLogout) onLogout(); }
    });
}

// --- キャラクター操作 ---
const SHARED_COLLECTION = "rooms";
const SHARED_DOC_ID = "couple_shared_data";
const CHAR_SUB_COLLECTION = "characters"; 

export async function saveToCloud(charData) {
    if (!currentUser) return alert("保存にはログインが必要です。");
    if (!charData || !charData.id) return alert("データエラー: IDがありません。");

    try {
        const charRef = doc(db, SHARED_COLLECTION, SHARED_DOC_ID, CHAR_SUB_COLLECTION, charData.id);
        await setDoc(charRef, charData, { merge: true });
        console.log("Char Saved:", charData.name);
    } catch (e) {
        console.error("Save Error:", e);
        alert("保存エラー: " + e.message);
    }
}

export async function loadFromCloud() {
    if (!currentUser) return alert("読み込みにはログインが必要です。");
    try {
        const colRef = collection(db, SHARED_COLLECTION, SHARED_DOC_ID, CHAR_SUB_COLLECTION);
        const querySnapshot = await getDocs(colRef);
        const loadedData = {};
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (!data.id) data.id = docSnap.id;
            loadedData[data.id] = data;
        });
        return loadedData;
    } catch (e) {
        console.error("Load Error:", e);
        return null;
    }
}

// --- シナリオ機能 (拡張) ---

// 新規作成
export async function saveScenario(scenarioData) {
    if (!currentUser) throw new Error("User not logged in");
    const dataToSave = {
        ...scenarioData,
        updatedAt: serverTimestamp()
    };
    try {
        // ID指定がない場合はaddDoc、ある場合はsetDoc(上書き)だが、
        // ここでは新規作成として扱う
        const docRef = await addDoc(collection(db, "scenarios"), dataToSave);
        return docRef.id;
    } catch (e) {
        console.error("Error adding scenario: ", e);
        throw e;
    }
}

// 更新 (NEW)
export async function updateScenario(scenarioId, scenarioData) {
    if (!currentUser) throw new Error("User not logged in");
    if (!scenarioId) throw new Error("No Scenario ID provided");
    
    const dataToSave = {
        ...scenarioData,
        updatedAt: serverTimestamp()
    };
    
    try {
        const docRef = doc(db, "scenarios", scenarioId);
        await setDoc(docRef, dataToSave, { merge: true });
        return scenarioId;
    } catch (e) {
        console.error("Error updating scenario: ", e);
        throw e;
    }
}

// 削除 (NEW)
export async function deleteScenario(scenarioId) {
    if (!currentUser) throw new Error("User not logged in");
    try {
        await deleteDoc(doc(db, "scenarios", scenarioId));
    } catch (e) {
        console.error("Error deleting scenario: ", e);
        throw e;
    }
}

// 取得 (クエリ強化)
export async function getScenariosForCharacter(charId) {
    if (!currentUser) return [];
    if (!charId) return [];

    try {
        // members配列にcharIdが含まれるものを検索
        const q = query(
            collection(db, "scenarios"),
            where("members", "array-contains", charId),
            orderBy("date", "desc") // 日付順
        );
        const querySnapshot = await getDocs(q);
        const scenarios = [];
        querySnapshot.forEach((doc) => {
            scenarios.push({ id: doc.id, ...doc.data() });
        });
        return scenarios;
    } catch (e) {
        // インデックス未作成エラーが出る場合があるため、クライアントサイドソートにフォールバック
        console.warn("Index warning or fetch error:", e);
        try {
            const q2 = query(
                collection(db, "scenarios"),
                where("members", "array-contains", charId)
            );
            const snap = await getDocs(q2);
            const list = [];
            snap.forEach(d => list.push({id: d.id, ...d.data()}));
            // 日付降順ソート
            return list.sort((a,b) => (b.date || "").localeCompare(a.date || ""));
        } catch(ex) {
            console.error(ex);
            return [];
        }
    }
}