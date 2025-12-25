// --- firestore.js (サブコレクション対応・修正版) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } 
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
// ★必要な機能を追加しました (collection, getDocs, deleteDoc)
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, deleteDoc } 
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBZVh6NhFA_BSuyUW-sZV2QPSvSzdYJZWU",
  authDomain: "chocolatmer-uchiyoso.firebaseapp.com",
  projectId: "chocolatmer-uchiyoso",
  storageBucket: "chocolatmer-uchiyoso.firebasestorage.app",
  messagingSenderId: "251681036234",
  appId: "1:251681036234:web:be56156da1210d45afe133"
};

// 初期化処理
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

let currentUser = null;

// --- 認証機能 ---

export function login() {
    signInWithPopup(auth, provider)
        .then((result) => {
            console.log("Logged in:", result.user.email);
            alert("ログインしました: " + result.user.displayName);
        }).catch((error) => {
            console.error(error);
            alert("ログインに失敗しました: " + error.message);
        });
}

export function logout() {
    signOut(auth).then(() => {
        alert("ログアウトしました");
    });
}

export function monitorAuth(onLogin, onLogout) {
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        if (user) {
            if(onLogin) onLogin(user);
        } else {
            if(onLogout) onLogout();
        }
    });
}

// --- データベース機能 (サブコレクション方式) ---

const SHARED_COLLECTION = "rooms";
const SHARED_DOC_ID = "couple_shared_data";
// ★重要: ここでフォルダ名を指定します。もし読み込めない場合は "data" などを試してください
const CHAR_SUB_COLLECTION = "characters"; 

// 保存 (SAVE CLOUD)
export async function saveToCloud(charData) {
    if (!currentUser) {
        alert("エラー: データの保存にはログインが必要です。");
        return;
    }
    if (!charData || !charData.name) {
        alert("エラー: 保存するキャラクターデータがありません。");
        return;
    }

    try {
        // キャラクターごとの専用ファイルに保存する方式に戻しました
        const charRef = doc(db, SHARED_COLLECTION, SHARED_DOC_ID, CHAR_SUB_COLLECTION, charData.name);
        
        await setDoc(charRef, charData, { merge: true });
        
        // 日本語で保存完了を表示
        alert("保存が完了しました: " + charData.name);
        
    } catch (e) {
        console.error("Error adding document: ", e);
        alert("保存エラー: " + e.message);
    }
}

// 読み込み (LOAD CLOUD)
export async function loadFromCloud() {
    if (!currentUser) {
        alert("エラー: データの読み込みにはログインが必要です。");
        return null;
    }

    try {
        // フォルダ内の全ファイルを一括取得する方式に戻しました
        const colRef = collection(db, SHARED_COLLECTION, SHARED_DOC_ID, CHAR_SUB_COLLECTION);
        const querySnapshot = await getDocs(colRef);

        const loadedData = {};
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if(data.name) {
                loadedData[data.name] = data;
            }
        });

        // データが空っぽだった場合の確認ログ
        if (Object.keys(loadedData).length === 0) {
            console.log("データが見つかりませんでした。(コレクション名が違う可能性があります)");
        }

        return loadedData;

    } catch (e) {
        console.error("Error loading document: ", e);
        alert("読み込みエラー: " + e.message);
        return null;
    }
}

// 削除機能 (DELETE CLOUD)
export async function deleteFromCloud(charName) {
    if (!currentUser) return;
    if (!charName) return;

    if (!confirm(charName + " を削除しますか？\nこの操作は取り消せません。")) {
        return;
    }

    try {
        const charRef = doc(db, SHARED_COLLECTION, SHARED_DOC_ID, CHAR_SUB_COLLECTION, charName);
        await deleteDoc(charRef);
        
        alert("削除しました: " + charName);
        location.reload(); // 画面更新

    } catch (e) {
        console.error("Delete error:", e);
        alert("削除エラー: " + e.message);
    }
}


// --- シナリオデータ (Scenarios) ---

// シナリオを新規保存 (scenariosコレクション)
export async function saveScenario(scenarioData) {
    if (!currentUser) throw new Error("User not logged in");
    
    // サーバー時間を付与
    const dataToSave = {
        ...scenarioData,
        updatedAt: serverTimestamp()
    };

    try {
        const docRef = await addDoc(collection(db, "scenarios"), dataToSave);
        console.log("Scenario saved ID:", docRef.id);
        return docRef.id;
    } catch (e) {
        console.error("Error adding scenario: ", e);
        throw e;
    }
}

// キャラクターIDからシナリオを取得
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
        // 日付順ソート (新しい順)
        return scenarios.sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (e) {
        console.error(e);
        return [];
    }
}