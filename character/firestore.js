import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } 
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, doc, setDoc, getDoc, collection, getDocs, deleteDoc, addDoc, query, where, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
// const db = getFirestore(app); // ←これを消して、以下に書き換え
const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true, 
  useFetchStreams: false
});
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

// --- キャラクター操作 ---
export async function saveToCloud(charData) {
    // ログインチェック
    if (!currentUser) {
        alert("保存にはログインが必要です。");
        throw new Error("Login required");
    }
    
    // IDチェック (ここがエラーの原因だった箇所への対策)
    if (!charData || !charData.id) {
        console.error("ID Missing Data:", charData); // コンソールに詳細を出す
        alert(`データエラー: IDがありません。\n(対象: ${charData ? charData.name : '不明'})`);
        throw new Error("ID is missing"); // 処理を確実に止める
    }

    try {
        const charRef = doc(db, SHARED_COLLECTION, SHARED_DOC_ID, CHAR_SUB_COLLECTION, charData.id);
        // IDを含めて保存
        await setDoc(charRef, charData, { merge: true });
        console.log("保存完了: " + charData.name);
    } catch (e) {
        console.error("Save Error:", e);
        throw e;
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
            // データ内にIDが無い場合、ファイル名(doc.id)をIDとしてセットする
            if (!data.id) {
                data.id = docSnap.id;
            }
            loadedData[data.id] = data;
        });
        return loadedData;

    } catch (e) {
        console.error("Load Error:", e);
        throw e;
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

// --- シナリオ機能 ---
export async function saveScenario(scenarioData, scenarioId = null) {
    if (!currentUser) throw new Error("User not logged in");
    const dataToSave = { ...scenarioData, updatedAt: serverTimestamp() };
    try {
        if (scenarioId) {
            const docRef = doc(db, "scenarios", scenarioId);
            await setDoc(docRef, dataToSave, { merge: true });
            return scenarioId;
        } else {
            const docRef = await addDoc(collection(db, "scenarios"), dataToSave);
            return docRef.id;
        }
    } catch (e) {
        console.error("Error saving scenario: ", e);
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
        return scenarios.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    } catch (e) {
        console.error(e);
        return [];
    }
}