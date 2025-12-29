import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } 
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, doc, setDoc, getDoc, collection, getDocs, deleteDoc, addDoc, query, where, serverTimestamp 
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
    signInWithPopup(auth, provider).then((r)=>alert("ログインしました: "+r.user.displayName)).catch((e)=>alert(e.message));
}
export function logout() {
    signOut(auth).then(()=>alert("ログアウトしました"));
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
// シナリオ保存先（roomsの中に作ることで権限エラーを回避）
const SCENARIO_SUB_COLLECTION = "scenarios"; 

// --- キャラクター操作 ---
export async function saveToCloud(charData) {
    if (!currentUser) return alert("保存にはログインが必要です");
    if (!charData || !charData.id) return alert("IDエラー: データが不正です");

    try {
        const charRef = doc(db, SHARED_COLLECTION, SHARED_DOC_ID, CHAR_SUB_COLLECTION, charData.id);
        await setDoc(charRef, charData, { merge: true });
        console.log("Character saved: " + charData.name);
    } catch (e) {
        console.error("Save Error:", e);
        throw e;
    }
}

export async function loadFromCloud() {
    if (!currentUser) return alert("読み込みにはログインが必要です");

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
        throw e;
    }
}

// --- シナリオ機能 ---
export async function saveScenario(scenarioData, scenarioId = null) {
    if (!currentUser) throw new Error("ログインが必要です");
    const dataToSave = {
        ...scenarioData,
        updatedAt: serverTimestamp()
    };
    try {
        // 保存先を rooms コレクション内に指定
        const scenariosRef = collection(db, SHARED_COLLECTION, SHARED_DOC_ID, SCENARIO_SUB_COLLECTION);

        if (scenarioId) {
            // 上書き保存 (ID指定あり)
            const docRef = doc(scenariosRef, scenarioId);
            await setDoc(docRef, dataToSave, { merge: true });
            return scenarioId;
        } else {
            // 新規作成
            const docRef = await addDoc(scenariosRef, dataToSave);
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
        const scenariosRef = collection(db, SHARED_COLLECTION, SHARED_DOC_ID, SCENARIO_SUB_COLLECTION);
        
        const q = query(
            scenariosRef,
            where("members", "array-contains", charId)
        );
        const querySnapshot = await getDocs(q);
        const scenarios = [];
        querySnapshot.forEach((doc) => {
            scenarios.push({ id: doc.id, ...doc.data() });
        });
        // 日付が新しい順にソート
        return scenarios.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    } catch (e) {
        console.error(e);
        return [];
    }
}