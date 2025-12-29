import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } 
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, doc, setDoc, getDoc, collection, getDocs, deleteDoc, addDoc, query, where, serverTimestamp 
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
        // IDをキーにして保存（名前が変わってもファイルは同じまま）
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
            
            // 重要: 古いデータ(IDがない)場合、ファイル名をIDとして扱う救済処置
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

// --- シナリオ機能 ---

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

export async function getScenariosForCharacter(charId) {
    if (!currentUser) return [];
    try {
        const q = query(
            collection(db, "scenarios"),
            where("members", "array-contains", charId)
        );
        const querySnapshot = await getDocs(q);
        const scenarios = [];
        querySnapshot.forEach((doc) => {
            scenarios.push({ id: doc.id, ...doc.data() });
        });
        return scenarios.sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (e) {
        console.error(e);
        return [];
    }
}
// --- START OF FILE firestore.js (Append specific section) ---

// ... (既存の import, initializeApp, auth, db 設定などはそのまま維持) ...

// === 追加機能: シナリオログ編集・履歴用 ===

/**
 * 既存のシナリオを更新する
 */
export async function updateScenario(scenarioId, data) {
    if (!currentUser) throw new Error("User not logged in");
    try {
        // 更新日時を追加
        const updateData = {
            ...data,
            updatedAt: serverTimestamp()
        };
        // createdAtは更新しないように除外（必要であれば）
        delete updateData.createdAt;

        const docRef = doc(db, "scenarios", scenarioId);
        await setDoc(docRef, updateData, { merge: true });
        console.log("Scenario updated:", scenarioId);
        return scenarioId;
    } catch (e) {
        console.error("Error updating scenario: ", e);
        throw e;
    }
}

/**
 * 特定のペア（PCとKPC）の過去ログを取得する
 * @param {string} charId1 - PCのID
 * @param {string} charId2 - KPCのID
 */
export async function getHistoryForPair(charId1, charId2) {
    if (!currentUser || !charId1 || !charId2) return [];
    try {
        // 配列検索 (membersに両方のIDが含まれているものを探す)
        // Firestoreの制約上、array-containsは1つの値しか使えないため、
        // 簡易的にクライアントサイドフィルタリング、または「members」フィールドの構造に依存します。
        // ここでは「members array-contains charId1」で取得後、JSでcharId2を含むか判定します。
        
        const q = query(
            collection(db, "scenarios"),
            where("members", "array-contains", charId1)
        );
        
        const querySnapshot = await getDocs(q);
        const scenarios = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // もう片方のIDが含まれているか確認
            if (data.members && data.members.includes(charId2)) {
                scenarios.push({ id: doc.id, ...data });
            }
        });
        
        // 日付順（新しい順）にソート
        return scenarios.sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (e) {
        console.error("History Load Error:", e);
        return [];
    }
}