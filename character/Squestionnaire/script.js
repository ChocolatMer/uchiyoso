import { QUESTIONS_DATA } from "./questions.js";
// ルートにある firestore.js を読み込む
import { loadFromCloud, login, monitorAuth } from "../firestore.js";

const { createApp, ref, reactive, onMounted } = Vue;

// クリック外判定
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
            name: '', icon: 'https://placehold.co/100x100/png?text=?', description: 'Enter name or Load', isGuest: true, uid: null
        });
        const characterList = ref([]);
        const allQuestions = ref(QUESTIONS_DATA);
        
        // --- UI状態 ---
        const isDropdownOpen = ref(false);
        const loadingChars = ref(false);
        const showStamp = ref(false);
        const showQuestionSelector = ref(false);
        const tempSelectedIds = ref([]); // 選択モーダル用の一時保存

        const displayedQuestions = ref([]);
        const answers = reactive({});
        const currentDate = new Date().toLocaleDateString('ja-JP');

        // --- アイテム位置調整 (指示通りに移動 & 画像サイズはCSSで管理) ---
        const deskItems = ref([
            { src: '../images/icons/desk1.png', x: 20, y: 120, name: 'Item 1' }, // Down 1 unit
            { src: '../images/icons/desk2.png', x: 120, y: 400, name: 'Item 2' }, // Up 2, Right 1
            { src: '../images/icons/desk3.png', x: window.innerWidth - 500, y: 50, name: 'Item 3' }, // Left 2, Down small
            { src: '../images/icons/desk4.png', x: window.innerWidth - 320, y: 650, name: 'Item 4' }, // Same
            { src: '../images/icons/desk5.png', x: 150, y: 550, name: 'Item 5' }, // Down 2, Right small
            { src: '../images/icons/desk6.png', x: window.innerWidth - 450, y: 700, name: 'Item 6' }, // Down 3, Left 2
            { src: '../images/icons/desk7.png', x: 150, y: 850, name: 'Item 7' }, // Down small
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
                    characterList.value = Object.values(data).map(char => ({
                        name: char.name,
                        icon: char.inpImageIcon || char.icon || 'https://placehold.co/100x100/png?text=' + char.name.charAt(0),
                        job: char.inpJob || char.job || '',
                        desc: char.inpJob || char.job || 'No description',
                        ...char
                    }));
                } else {
                    characterList.value = [];
                }
            } catch (e) {
                console.error("Load Error:", e);
                alert("Failed to load data.");
            } finally {
                loadingChars.value = false;
            }
        };

        const selectCharacter = (char) => {
            currentUser.name = char.name;
            currentUser.icon = char.icon;
            currentUser.description = char.desc;
            currentUser.isGuest = false;
            isDropdownOpen.value = false;
            
            history.value = [
                { timestamp: new Date().toISOString(), summary: 'Previous session data loaded.' }
            ];
        };

        const closeDropdown = () => isDropdownOpen.value = false;

        // --- 機能：質問の更新・選択 ---
        const refreshQuestions = () => {
            // ランダムに10個選ぶ
            displayedQuestions.value = [...allQuestions.value].sort(() => 0.5 - Math.random()).slice(0, 10);
            // 回答をリセット
            Object.keys(answers).forEach(k => delete answers[k]);
        };

        const openQuestionSelector = () => {
            // 現在表示されている質問のIDを初期選択状態にする
            tempSelectedIds.value = displayedQuestions.value.map(q => q.id);
            showQuestionSelector.value = true;
        };

        const toggleQuestionSelection = (q) => {
            const idx = tempSelectedIds.value.indexOf(q.id);
            if (idx >= 0) {
                tempSelectedIds.value.splice(idx, 1);
            } else {
                tempSelectedIds.value.push(q.id);
            }
        };

        const confirmQuestionSelection = () => {
            // 選択されたIDに基づいて質問リストを再構築（元の順序を維持）
            displayedQuestions.value = allQuestions.value.filter(q => tempSelectedIds.value.includes(q.id));
            showQuestionSelector.value = false;
        };

        // --- 機能：ドラッグ ---
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

        // --- 機能：保存など ---
        const submitSurvey = () => {
            if(!currentUser.name) return alert("Please enter a name.");
            showStamp.value = true;
            setTimeout(() => showStamp.value = false, 2500);
            
            history.value.unshift({
                timestamp: new Date().toISOString(),
                summary: Object.values(answers)[0] || 'No answer recorded'
            });
        };

        const resetForm = () => {
            if(confirm("Discard changes?")) Object.keys(answers).forEach(k => delete answers[k]);
        };

        const showGlobalAnswers = (q) => {
            selectedGlobalQuestion.value = q;
            globalAnswers.value = [
                { user: 'Guest A', icon: 'https://placehold.co/50x50/png?text=A', text: '秘密です。' },
                { user: 'Guest B', icon: 'https://placehold.co/50x50/png?text=B', text: '効率を重視します。' }
            ];
        };

        onMounted(() => {
            refreshQuestions(); // 初回ランダム
            monitorAuth((user) => {
                if (user) currentUser.uid = user.uid;
            });
        });

        return {
            currentUser, characterList, displayedQuestions, answers, currentDate,
            deskItems, startDrag, 
            loadAndShowCharacters, selectCharacter, isDropdownOpen, closeDropdown, loadingChars,
            submitSurvey, resetForm, showStamp,
            history, selectedGlobalQuestion, globalAnswers, showGlobalAnswers,
            formatDate: (iso) => new Date(iso).toLocaleDateString(),
            // New Features
            allQuestions, refreshQuestions,
            showQuestionSelector, openQuestionSelector, toggleQuestionSelection, confirmQuestionSelection, tempSelectedIds
        };
    }
}).mount('#app');