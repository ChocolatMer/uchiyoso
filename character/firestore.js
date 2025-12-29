import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } 
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, doc, setDoc, getDoc, collection, getDocs, deleteDoc, addDoc, updateDoc, query, where, orderBy, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- (既存の設定・認証・キャラクター操作部分は変更なし) ---

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

// --- キャラクター操作 (既存維持) ---
const SHARED_COLLECTION = "rooms";
const SHARED_DOC_ID = "couple_shared_data";
const CHAR_SUB_COLLECTION = "characters"; 

export async function saveToCloud(charData) {
    if (!currentUser) return alert("保存にはログインが必要です。");
    if (!charData || !charData.id) return alert("データエラー: IDがありません。");
    try {
        const charRef = doc(db, SHARED_COLLECTION, SHARED_DOC_ID, CHAR_SUB_COLLECTION, charData.id);
        await setDoc(charRef, charData, { merge: true });
        console.log("Character Updated: " + charData.name);
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

export async function deleteFromCloud(charId) {
    // (既存実装維持)
}

// --- シナリオ機能 (追加・更新) ---

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

// 更新 (New Function)
export async function updateScenario(scenarioId, scenarioData) {
    if (!currentUser) throw new Error("User not logged in");
    if (!scenarioId) throw new Error("Scenario ID is missing");
    
    const dataToSave = {
        ...scenarioData,
        updatedAt: serverTimestamp()
    };
    try {
        const docRef = doc(db, "scenarios", scenarioId);
        await updateDoc(docRef, dataToSave);
        return scenarioId;
    } catch (e) {
        console.error("Error updating scenario: ", e);
        throw e;
    }
}

// 特定のペア（またはPC単体）の履歴を取得 (New Function)
export async function getScenariosForPair(pcId, kpcId = null) {
    if (!currentUser || !pcId) return [];
    try {
        // Firestoreの制約上、複合条件はインデックスが必要になるため、
        // ここでは「PCが含まれているもの」を取得し、JS側でKPC（またはソロ）をフィルタリングします。
        const q = query(
            collection(db, "scenarios"),
            where("members", "array-contains", pcId),
            orderBy("date", "desc") // 日付順
        );
        const querySnapshot = await getDocs(q);
        const scenarios = [];
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // KPC指定がある場合は、メンバーに含まれているか確認
            if (kpcId) {
                if (data.members && data.members.includes(kpcId)) {
                    scenarios.push({ id: doc.id, ...data });
                }
            } else {
                // KPC指定がない（PCのみ選択中）場合は全て
                scenarios.push({ id: doc.id, ...data });
            }
        });
        
        // 日付降順ソートを確実にする
        return scenarios.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    } catch (e) {
        // インデックス未作成エラーが出た場合などは日付ソートを外して再試行などのケアが必要ですが
        // 一旦コンソールに出す
        console.error("Fetch Error:", e);
        return [];
    }
}