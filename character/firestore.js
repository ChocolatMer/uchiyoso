// --- START OF FILE firestore.js ---

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } 
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, doc, setDoc, getDoc, collection, getDocs, deleteDoc, addDoc, updateDoc, query, where, orderBy, serverTimestamp 
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

// 保存: IDをファイル名として保存
export async function saveToCloud(charData) {
    if (!currentUser) return; // サイレントリターンまたはアラート
    if (!charData || !charData.id) return alert("データエラー: IDがありません。");

    try {
        const charRef = doc(db, SHARED_COLLECTION, SHARED_DOC_ID, CHAR_SUB_COLLECTION, charData.id);
        await setDoc(charRef, charData, { merge: true });
        // 成功時のアラートはUI側で制御するか、ここで出すか。今回は頻繁な同期を考慮しコンソールのみ
        console.log("Saved char: " + charData.name);
    } catch (e) {
        console.error("Save Error:", e);
        alert("保存エラー: " + e.message);
    }
}

// 読み込み: 全データを取得し、IDで整理
export async function loadFromCloud() {
    if (!currentUser) return null;

    try {
        const colRef = collection(db, SHARED_COLLECTION, SHARED_DOC_ID, CHAR_SUB_COLLECTION);
        const querySnapshot = await getDocs(colRef);

        const loadedData = {};
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (!data.id) { data.id = docSnap.id; } // ID補完
            loadedData[data.id] = data;
        });
        return loadedData;

    } catch (e) {
        console.error("Load Error:", e);
        return null;
    }
}

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

// --- シナリオ機能 (拡張) ---

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

// 更新 (New!)
export async function updateScenario(docId, scenarioData) {
    if (!currentUser) throw new Error("User not logged in");
    if (!docId) throw new Error("No Doc ID provided");
    
    const dataToSave = {
        ...scenarioData,
        updatedAt: serverTimestamp()
    };
    // createdAtは上書きしないように除外するか、scenarioData側で制御する
    
    try {
        const docRef = doc(db, SCENARIO_COLLECTION, docId);
        await updateDoc(docRef, dataToSave);
        return docId;
    } catch (e) {
        console.error("Error updating scenario: ", e);
        throw e;
    }
}

// 特定のペア（または片方）に関連するシナリオを取得
export async function getScenariosForPair(pcId, kpcId) {
    if (!currentUser) return [];
    
    // Firestoreの制限: array-contains は1つの値しか検索できない
    // そのため、「members配列に pcId が含まれるか」で検索し、
    // クライアント側で kpcId の有無などでフィルタリング・ソートを行うのが確実
    
    const searchId = pcId || kpcId;
    if (!searchId) return [];

    try {
        const q = query(
            collection(db, SCENARIO_COLLECTION),
            where("members", "array-contains", searchId)
        );
        const querySnapshot = await getDocs(q);
        let scenarios = [];
        querySnapshot.forEach((doc) => {
            const d = doc.data();
            // IDもデータに含める
            scenarios.push({ id: doc.id, ...d });
        });

        // KPCも指定されている場合、membersに両方含まれているかチェック
        if (pcId && kpcId) {
            scenarios = scenarios.filter(s => 
                s.members && s.members.includes(pcId) && s.members.includes(kpcId)
            );
        }

        // 日付順にソート (新しい順)
        return scenarios.sort((a, b) => {
            const dateA = new Date(a.date || 0);
            const dateB = new Date(b.date || 0);
            return dateB - dateA;
        });

    } catch (e) {
        console.error(e);
        return [];
    }
}