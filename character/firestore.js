import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } 
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, doc, setDoc, getDoc, collection, getDocs, deleteDoc, addDoc, query, where, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { collection, query, where, orderBy, getDocs, doc, addDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

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


/**
 * 【追加機能】特定のキャラクターペアのシナリオ履歴を取得する
 * @param {string} charId1 必須
 * @param {string} charId2 任意
 */
export async function fetchScenarioHistory(charId1, charId2 = null) {
    // authやdbは既存のスコープにあるものを利用想定
    if (!auth.currentUser) return [];
    
    // 複合クエリ: userId と members配列 で検索
    // ※Firestoreで「members array-contains charId1」と「orderBy createdAt」を併用する場合、複合インデックスが必要になることがあります。
    // エラーが出る場合はコンソールのリンクからインデックスを作成してください。
    let q = query(
        collection(db, "scenarios"), 
        where("userId", "==", auth.currentUser.uid),
        where("members", "array-contains", charId1),
        orderBy("createdAt", "desc") 
    );
    
    const snapshot = await getDocs(q);
    let list = [];
    snapshot.forEach(doc => {
        const data = doc.data();
        list.push({ ...data, id: doc.id });
    });

    // ペア相手によるフィルタリング (クライアント側で実施)
    if (charId2) {
        list = list.filter(s => s.members && s.members.includes(charId2));
    }
    return list;
}

/**
 * 【追加機能】シナリオログを保存または更新する
 * @param {Object} scenarioData 保存するデータ
 * @param {string|null} docId 指定がある場合は「更新」、nullの場合は「新規作成」
 */
export async function registerScenarioLog(scenarioData, docId = null) {
    if (!auth.currentUser) throw new Error("Login required");

    if (docId) {
        // 更新モード
        const docRef = doc(db, "scenarios", docId);
        // updated_atなどを更新する場合はここでマージも可能ですが、基本はデータ全体を更新
        await updateDoc(docRef, scenarioData);
        console.log(`Scenario updated: ${docId}`);
        return docId;
    } else {
        // 新規作成モード
        const docRef = await addDoc(collection(db, "scenarios"), scenarioData);
        console.log(`Scenario created: ${docRef.id}`);
        return docRef.id;
    }
}