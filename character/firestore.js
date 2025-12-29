// --- START OF FILE character/firestore.js ---

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } 
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, doc, setDoc, getDoc, collection, getDocs, deleteDoc, addDoc, query, where, serverTimestamp, orderBy 
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

// --- キャラクター操作 (ID管理版) ---

// 保存: IDをファイル名として保存
export async function saveToCloud(charData) {
    if (!currentUser) return alert("保存にはログインが必要です。");
    if (!charData || !charData.id) return alert("データエラー: IDがありません。");

    try {
        const charRef = doc(db, SHARED_COLLECTION, SHARED_DOC_ID, CHAR_SUB_COLLECTION, charData.id);
        await setDoc(charRef, charData, { merge: true });
        alert("保存完了: " + charData.name);
    } catch (e) {
        console.error("Save Error:", e);
        alert("保存エラー: " + e.message);
    }
}

// 読み込み: 全データを取得し、IDで整理
export async function loadFromCloud() {
    if (!currentUser) return alert("読み込みにはログインが必要です。");

    try {
        const colRef = collection(db, SHARED_COLLECTION, SHARED_DOC_ID, CHAR_SUB_COLLECTION);
        const querySnapshot = await getDocs(colRef);

        const loadedData = {};
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (!data.id) {
                data.id = docSnap.id;
            }
            loadedData[data.id] = data;
        });
        return loadedData;

    } catch (e) {
        console.error("Load Error:", e);
        alert("読み込みエラー: " + e.message);
        return null;
    }
}

// 削除: IDを指定してファイルを消す
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

// --- シナリオ機能 (既存 + 追加分) ---

// 新規作成
export async function saveScenario(scenarioData) {
    if (!currentUser) throw new Error("User not logged in");
    const dataToSave = {
        ...scenarioData,
        updatedAt: serverTimestamp()
    };
    try {
        const docRef = await addDoc(collection(db, "scenarios"), dataToSave);
        return docRef.id;
    } catch (e) {
        console.error("Error adding scenario: ", e);
        throw e;
    }
}

// [追加] 既存シナリオの更新 (ID指定)
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

// [追加] 指定されたペア(または単独)のシナリオ履歴を取得
export async function getScenariosByPair(charId1, charId2 = null) {
    if (!currentUser) return [];
    try {
        // Firestoreの制約上、array-containsは1つの値しか使えないため、
        // 少なくとも1人が含まれているものを取得し、JS側でフィルタリングする方式をとる
        // (データ量が膨大でない前提)
        
        const scenariosRef = collection(db, "scenarios");
        const q = query(
            scenariosRef, 
            where("members", "array-contains", charId1),
            orderBy("date", "desc") // 日付順
        );

        const querySnapshot = await getDocs(q);
        const scenarios = [];
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // 2人目が指定されている場合、そのIDもmembersに含まれているか確認
            if (charId2) {
                if (data.members && data.members.includes(charId2)) {
                    scenarios.push({ id: doc.id, ...data });
                }
            } else {
                scenarios.push({ id: doc.id, ...data });
            }
        });
        
        return scenarios;
    } catch (e) {
        console.error("History Load Error:", e);
        // インデックス未作成エラーなどの場合に空配列を返す
        return [];
    }
}

export async function getScenariosForCharacter(charId) {
    // 既存関数へのラッパーとして機能させる
    return await getScenariosByPair(charId);
}