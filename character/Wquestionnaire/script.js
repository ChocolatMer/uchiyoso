// Wquestionnaire/script.js

// 新しく作ったペア用質問データをインポート
import { PAIR_QUESTIONS } from "./questions.js";
// ルートにある firestore.js を利用
import { loadFromCloud, saveToCloud, login, monitorAuth } from "../firestore.js";

const { createApp, ref, reactive, computed, onMounted } = Vue;

createApp({
    setup() {
        // Data
        const questions = ref([]);
        const currentIndex = ref(0);
        
        // Characters (A:左, B:右)
        const charA = reactive({ name: '', icon: 'https://placehold.co/150x150/png?text=A', color: '#ff9a9e', uid: null, original: null });
        const charB = reactive({ name: '', icon: 'https://placehold.co/150x150/png?text=B', color: '#a29bfe', uid: null, original: null });
        
        // Answers
        const answersA = reactive({});
        const answersB = reactive({});

        // UI State
        const showModal = ref(false);
        const targetSide = ref('A'); // 'A' or 'B'
        const charList = ref([]);
        const loading = ref(false);
        const saveMessage = ref('');
        const currentUserUid = ref(null);

        // Init
        onMounted(() => {
            // ペア用質問からランダム10問選出
            questions.value = [...PAIR_QUESTIONS].sort(() => 0.5 - Math.random()).slice(0, 10);
            
            // パーティクル生成
            createParticles();

            // 認証監視
            monitorAuth((user) => {
                if (user) currentUserUid.value = user.uid;
            });
        });

        // Computed
        const currentQ = computed(() => questions.value[currentIndex.value] || {});

        // Actions
        const nextQ = () => { if (currentIndex.value < questions.value.length - 1) currentIndex.value++; };
        const prevQ = () => { if (currentIndex.value > 0) currentIndex.value--; };

        // Load Logic
        const openLoader = async (side) => {
            targetSide.value = side;
            showModal.value = true;
            loading.value = true;

            if (!currentUserUid.value) {
                try { await login(); } catch(e) { /* ignore cancel */ }
            }

            if (currentUserUid.value) {
                try {
                    const data = await loadFromCloud();
                    if (data) {
                        charList.value = Object.values(data).map(c => ({
                            name: c.name,
                            icon: c.inpImageIcon || c.icon || 'https://placehold.co/50x50/png?text='+c.name[0],
                            job: c.inpJob || c.job || '',
                            color: c.inpThemeColor || c.color || '#ccc',
                            ...c
                        }));
                    }
                } catch (e) { console.error(e); }
            }
            loading.value = false;
        };

        const selectCharacter = (char) => {
            const target = targetSide.value === 'A' ? charA : charB;
            target.name = char.name;
            target.icon = char.icon;
            target.color = char.color;
            target.original = char; // 保存用に保持
            showModal.value = false;
        };

        // Save Logic
        const savePairData = async () => {
            if (!charA.name || !charB.name) {
                alert("二人とも名前を入力してください。");
                return;
            }

            const timestamp = new Date().toISOString();
            const recordId = Date.now().toString();

            // 共通の記録データを作成
            const pairResultBase = {
                id: recordId,
                type: 'pair_survey',
                timestamp: timestamp,
                // answersは後でセット
            };

            const saveForChar = async (charObj, myAnswers, partnerName, partnerAnswers) => {
                if (currentUserUid.value && charObj.original) {
                    const dataToSave = { ...charObj.original };
                    if (!dataToSave.surveys) dataToSave.surveys = [];
                    
                    // 履歴データ作成 (自分の回答 + 相手の情報)
                    const myRecord = { 
                        ...pairResultBase,
                        summary: `Pair Survey with ${partnerName}`,
                        partner: partnerName,
                        answers: { ...myAnswers },
                        partnerAnswers: { ...partnerAnswers } // 相手の回答も保存
                    };

                    dataToSave.surveys.push(myRecord);
                    await saveToCloud(dataToSave);
                }
            };

            try {
                // 両方のキャラに履歴を追加（サーバー上のキャラなら）
                await saveForChar(charA, answersA, charB.name, answersB);
                await saveForChar(charB, answersB, charA.name, answersA);
                
                saveMessage.value = "Saved Harmony!";
                setTimeout(() => saveMessage.value = '', 3000);
            } catch(e) {
                alert("Save Error: " + e.message);
            }
        };

        // Decorative Particles
        const createParticles = () => {
            const container = document.getElementById('particles');
            for(let i=0; i<15; i++) {
                const p = document.createElement('div');
                p.className = 'particle';
                p.style.width = Math.random() * 10 + 5 + 'px';
                p.style.height = p.style.width;
                p.style.left = Math.random() * 100 + 'vw';
                p.style.animationDuration = Math.random() * 5 + 5 + 's';
                p.style.animationDelay = Math.random() * 5 + 's';
                container.appendChild(p);
            }
        };

        return {
            questions, currentIndex, currentQ,
            charA, charB, answersA, answersB,
            nextQ, prevQ,
            showModal, targetSide, charList, loading,
            openLoader, selectCharacter, savePairData, saveMessage
        };
    }
}).mount('#app');