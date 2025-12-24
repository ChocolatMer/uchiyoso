import { QUESTIONS_DATA } from "./questions.js";
// ルートにある firestore.js を読み込む
import { createSoloSurveyRecord, addSurveyToCharacter } from "../data/schema.js";
import { loadFromCloud, saveToCloud, login, monitorAuth } from "../firestore.js";

const { createApp, ref, reactive, onMounted, computed } = Vue;

const clickOutside = {
    beforeMount(el, binding) {
        el.clickOutsideEvent = function(event) {
            if (!(el === event.target || el.contains(event.target))) {
                binding.value(event);
            }
        };
        document.body.addEventListener('click', el.clickOutsideEvent);
    },
    unmounted(el) { document.body.removeEventListener('click', el.clickOutsideEvent); }
};

createApp({
    directives: { clickOutside },
    setup() {
        // --- データ状態 ---
        const currentUser = reactive({
            name: '', icon: 'https://placehold.co/100x100/png?text=?', description: 'Enter name or Load', isGuest: true, uid: null,
            originalData: null // サーバー保存用データ保持
        });
        const characterList = ref([]);
        const allQuestions = ref(QUESTIONS_DATA);
        
        // --- UI状態 ---
        const isDropdownOpen = ref(false);
        const loadingChars = ref(false);
        const showStamp = ref(false);
        const showQuestionSelector = ref(false);
        const tempSelectedIds = ref([]);

        const displayedQuestions = ref([]);
        const answers = reactive({});
        const currentDate = new Date().toLocaleDateString('ja-JP');

        // --- アイテム位置調整 (ご指定の座標) ---
        const deskItems = ref([
            { src: '../images/icons/desk1.png', x: 20, y: 550, name: 'Item 1' },
            { src: '../images/icons/desk2.png', x: 250, y: 250, name: 'Item 2' },
            { src: '../images/icons/desk3.png', x: window.innerWidth - 550, y: 100, name: 'Item 3' },
            { src: '../images/icons/desk4.png', x: window.innerWidth - 320, y: 800, name: 'Item 4' },
            { src: '../images/icons/desk5.png', x: 250, y: 700, name: 'Item 5' },
            { src: '../images/icons/desk6.png', x: window.innerWidth - 550, y: 550, name: 'Item 6' },
            { src: '../images/icons/desk7.png', x: 150, y: 900, name: 'Item 7' },
        ]);
        
        const dragging = ref({ index: -1, offsetX: 0, offsetY: 0 });

        const history = ref([]);
        const selectedGlobalQuestion = ref(null);
        const globalAnswers = ref([]);

        // --- 機能：キャラクター読み込み ---
        const loadAndShowCharacters = async () => {
            isDropdownOpen.value = true;
            loadingChars.value = true;

            if (!currentUser.uid) {
                try {
                    login(); 
                    return; 
                } catch (e) {
                    alert("Login Required");
                    loadingChars.value = false;
                    return;
                }
            }

            try {
                const data = await loadFromCloud();
                if (data) {
                    // サーバーのデータをリスト化
                    characterList.value = Object.values(data).map(char => ({
                        name: char.name,
                        icon: char.inpImageIcon || char.icon || 'https://placehold.co/100x100/png?text=' + char.name.charAt(0),
                        job: char.inpJob || char.job || '',
                        desc: char.inpJob || char.job || 'No description',
                        surveys: char.surveys || [], // アンケート履歴を取得
                        ...char
                    }));
                } else {
                    characterList.value = [];
                }
            } catch (e) {
                console.error("Load Error:", e);
            } finally {
                loadingChars.value = false;
            }
        };

        const selectCharacter = (char) => {
            currentUser.name = char.name;
            currentUser.icon = char.icon;
            currentUser.description = char.desc;
            currentUser.isGuest = false;
            currentUser.originalData = char; // 保存用に元データを保持
            isDropdownOpen.value = false;
            
            // 履歴を表示 (新しい順)
            if (char.surveys && char.surveys.length > 0) {
                history.value = [...char.surveys].reverse();
            } else {
                history.value = [];
            }
            
            // 入力欄をリセット
            Object.keys(answers).forEach(k => delete answers[k]);
        };

        const closeDropdown = () => isDropdownOpen.value = false;

        // --- 機能：履歴から再編集 (Re-edit) ---
        const loadSurveyFromHistory = (record) => {
            if(!confirm("この履歴の内容を復元して再編集しますか？\n(現在の入力内容は消えます)")) return;

            // 1. 回答を復元
            Object.keys(answers).forEach(k => delete answers[k]);
            Object.assign(answers, record.answers);

            // 2. 質問リストを復元 (IDに基づいて再構築)
            // 記録されている回答キー(q1, q2...)から、対応する質問文を探し出す
            const questionIds = Object.keys(record.answers);
            const restoredQuestions = allQuestions.value.filter(q => questionIds.includes(q.id));
            
            // もし質問データが見つかればそれを表示、なければ現在の表示を維持
            if (restoredQuestions.length > 0) {
                displayedQuestions.value = restoredQuestions;
            }
        };

        // --- 機能：Global Voices (他キャラの回答) ---
        const showGlobalAnswers = (q) => {
            selectedGlobalQuestion.value = q;
            globalAnswers.value = [];

            // 全キャラクターリストから、この質問(q.id)への回答を探す
            // ※自分自身(currentUser)は除く
            const otherAnswers = [];
            
            characterList.value.forEach(char => {
                if (char.name === currentUser.name) return; // 自分はスキップ
                if (!char.surveys) return;

                char.surveys.forEach(survey => {
                    if (survey.answers && survey.answers[q.id]) {
                        // 重複を避けるため、最新の回答だけ採用するか、すべて出すか
                        // ここでは「回答があれば追加」します
                        otherAnswers.push({
                            user: char.name,
                            icon: char.icon,
                            text: survey.answers[q.id]
                        });
                    }
                });
            });

            // ランダムにシャッフルして表示
            globalAnswers.value = otherAnswers.sort(() => 0.5 - Math.random()).slice(0, 10);
        };

        // --- 機能：保存 (Save to Cloud) ---
        const submitSurvey = async () => {
            if(!currentUser.name) return alert("キャラクターを選択または名前を入力してください。");
            
            showStamp.value = true;
            setTimeout(() => showStamp.value = false, 2500);

            // ★ 1. ルールに従って保存用データを作る
            const newRecord = createSoloSurveyRecord(answers);

            // ローカルの履歴に追加（画面表示用）
            history.value.unshift(newRecord);

            // サーバー保存処理
            if (currentUser.uid && currentUser.originalData) {
                // ★ 2. ルールに従ってキャラデータに履歴を統合
                const charData = addSurveyToCharacter(currentUser.originalData, newRecord);
                
                // サーバーへ送信
                await saveToCloud(charData);
                
                // 次回のために手元のデータも更新
                currentUser.originalData = charData;
            }
        };

        // --- その他：質問更新など ---
        const refreshQuestions = () => {
            displayedQuestions.value = [...allQuestions.value].sort(() => 0.5 - Math.random()).slice(0, 5);
            Object.keys(answers).forEach(k => delete answers[k]);
        };

        const openQuestionSelector = () => {
            tempSelectedIds.value = displayedQuestions.value.map(q => q.id);
            showQuestionSelector.value = true;
        };

        const toggleQuestionSelection = (q) => {
            const idx = tempSelectedIds.value.indexOf(q.id);
            if (idx >= 0) tempSelectedIds.value.splice(idx, 1);
            else tempSelectedIds.value.push(q.id);
        };

        const confirmQuestionSelection = () => {
            displayedQuestions.value = allQuestions.value.filter(q => tempSelectedIds.value.includes(q.id));
            showQuestionSelector.value = false;
        };

        const resetForm = () => {
            if(confirm("入力を破棄しますか？")) Object.keys(answers).forEach(k => delete answers[k]);
        };

        // --- ドラッグ処理 ---
        const startDrag = (e, i) => {
            dragging.value = { index: i, offsetX: e.clientX - deskItems.value[i].x, offsetY: e.clientY - deskItems.value[i].y };
            window.addEventListener('mousemove', onDrag);
            window.addEventListener('mouseup', stopDrag);
        };
        const onDrag = (e) => {
            if(dragging.value.index >= 0) {
                const item = deskItems.value[dragging.value.index];
                item.x = e.clientX - dragging.value.offsetX;
                item.y = e.clientY - dragging.value.offsetY;
            }
        };
        const stopDrag = () => {
            dragging.value.index = -1;
            window.removeEventListener('mousemove', onDrag);
            window.removeEventListener('mouseup', stopDrag);
        };

        // --- 初期化 ---
        onMounted(() => {
            refreshQuestions();
            monitorAuth((user) => {
                if (user) {
                    currentUser.uid = user.uid;
                    // ログインしたら自動でリスト更新しても良いが、負荷軽減のためボタン押下時に任せる
                }
            });
        });

        // 履歴の日付フォーマット
        const formatDate = (iso) => {
            const d = new Date(iso);
            return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
        };

        return {
            currentUser, characterList, displayedQuestions, answers, currentDate,
            deskItems, startDrag, 
            loadAndShowCharacters, selectCharacter, isDropdownOpen, closeDropdown, loadingChars,
            submitSurvey, resetForm, showStamp,
            history, selectedGlobalQuestion, globalAnswers, showGlobalAnswers,
            formatDate, loadSurveyFromHistory, // 追加した関数
            allQuestions, refreshQuestions,
            showQuestionSelector, openQuestionSelector, toggleQuestionSelection, confirmQuestionSelection, tempSelectedIds
        };
    }
}).mount('#app');