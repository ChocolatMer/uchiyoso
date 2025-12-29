// --- uchiyoso/character/firestore.js ---

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } 
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, doc, setDoc, getDoc, collection, getDocs, deleteDoc, addDoc, updateDoc, query, where, orderBy, serverTimestamp 
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

// --- キャラクター操作 ---

export async function saveToCloud(charData) {
    if (!currentUser) return alert("保存にはログインが必要です。");
    if (!charData || !charData.id) return alert("データエラー: IDがありません。");

    try {
        const charRef = doc(db, SHARED_COLLECTION, SHARED_DOC_ID, CHAR_SUB_COLLECTION, charData.id);
        await setDoc(charRef, charData, { merge: true });
        console.log("Character Saved:", charData.name);
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
        alert("読み込みエラー: " + e.message);
        return null;
    }
}

// --- シナリオ機能 (追加・編集) ---

// 新規作成
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

// 更新 (上書き)
export async function updateScenario(scenarioId, scenarioData) {
    if (!currentUser) throw new Error("User not logged in");
    const dataToSave = {
        ...scenarioData,
        updatedAt: serverTimestamp()
    };
    try {
        const docRef = doc(db, SCENARIO_COLLECTION, scenarioId);
        await setDoc(docRef, dataToSave, { merge: true }); // merge trueで部分更新も許容
        return scenarioId;
    } catch (e) {
        console.error("Error updating scenario: ", e);
        throw e;
    }
}

// 履歴取得 (ペア検索)
export async function getScenariosForPair(pcId, kpcId) {
    if (!currentUser) return [];
    try {
        // Firestoreの仕様上、array-containsは1つの値しか使えないため、
        // クライアントサイドでフィルタリングするか、複合クエリを工夫する必要がある。
        // ここでは「PCが含まれるもの」を取得し、その中で「KPCも含まれるもの」をフィルタする方式をとる
        // ※データ量が増えた場合はインデックス設計が必要
        
        const q = query(
            collection(db, SCENARIO_COLLECTION),
            where("userId", "==", currentUser.uid),
            where("members", "array-contains", pcId),
            orderBy("createdAt", "desc") // 作成日順
        );

        const querySnapshot = await getDocs(q);
        const scenarios = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // KPCが含まれているか、またはソロ・KPCレスの場合の考慮
            if (!kpcId || (data.members && data.members.includes(kpcId))) {
                scenarios.push({ id: doc.id, ...data });
            }
        });
        return scenarios;
    } catch (e) {
        console.error("History Load Error:", e);
        return [];
    }
}