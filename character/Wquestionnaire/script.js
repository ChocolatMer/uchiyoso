import { PAIR_QUESTIONS } from "./questions.js";
import { createPairSurveyRecord, addSurveyToCharacter } from "../data/schema.js";
import { loadFromCloud, saveToCloud, login, monitorAuth } from "../firestore.js";

const { createApp, ref, reactive, computed, onMounted } = Vue;

createApp({
    setup() {
        const questions = ref([]);
        const currentIndex = ref(0);
        
        const charA = reactive({ name: '', icon: 'https://placehold.co/150x150/png?text=A', color: '#ff9a9e', uid: null, original: null });
        const charB = reactive({ name: '', icon: 'https://placehold.co/150x150/png?text=B', color: '#a29bfe', uid: null, original: null });
        
        const answersA = reactive({});
        const answersB = reactive({});

        const showModal = ref(false);
        const targetSide = ref('A');
        const charList = ref([]);
        const loading = ref(false);
        const saveMessage = ref('');
        const currentUserUid = ref(null);

        onMounted(() => {
            questions.value = [...PAIR_QUESTIONS].sort(() => 0.5 - Math.random()).slice(0, 10);
            createParticles();
            monitorAuth((user) => { if (user) currentUserUid.value = user.uid; });
        });

        const currentQ = computed(() => questions.value[currentIndex.value] || {});
        
        // ★プログレスバーの進捗率を計算
        const progressPercentage = computed(() => {
            if (questions.value.length === 0) return 0;
            return ((currentIndex.value + 1) / questions.value.length) * 100;
        });

        const nextQ = () => { if (currentIndex.value < questions.value.length - 1) currentIndex.value++; };
        const prevQ = () => { if (currentIndex.value > 0) currentIndex.value--; };

        const openLoader = async (side) => {
            targetSide.value = side;
            showModal.value = true;
            loading.value = true;

            if (!currentUserUid.value) {
                try { await login(); } catch(e) {}
            }

            if (currentUserUid.value) {
                try {
                    const data = await loadFromCloud();
                    if (data) {
                        charList.value = Object.values(data).map(c => ({
                            name: c.name,
                            icon: c.inpImageIcon || c.icon || 'https://placehold.co/50x50/png?text='+c.name[0],
                            job: c.inpJob || c.job || '',
                            color: c.inpThemeColor || c.color || (side === 'A' ? '#ff9a9e' : '#a29bfe'),
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
            // テーマカラーがあれば適用、なければデフォルト
            target.color = char.color || (targetSide.value === 'A' ? '#ff9a9e' : '#a29bfe');
            target.original = char;
            showModal.value = false;
        };

        const savePairData = async () => {
            if (!charA.name || !charB.name) {
                alert("Please enter both names.");
                return;
            }

            const timestamp = new Date().toISOString();
            const recordId = Date.now().toString();

            const pairResultBase = {
                id: recordId,
                type: 'pair_survey',
                timestamp: timestamp,
            };

            // 保存用ヘルパー関数（書き換え後）
            const saveForChar = async (charObj, myAnswers, partnerName, partnerAnswers) => {
                if (currentUserUid.value && charObj.original) {
                    
                    // ★ 1. ルールに従ってレコード作成
                    const myRecord = createPairSurveyRecord(myAnswers, partnerName, partnerAnswers);

                    // ★ 2. ルールに従ってデータ統合
                    const dataToSave = addSurveyToCharacter(charObj.original, myRecord);

                    // 保存実行
                    await saveToCloud(dataToSave);
                }
            };

            try {
                await saveForChar(charA, answersA, charB.name, answersB);
                await saveForChar(charB, answersB, charA.name, answersA);
                
                saveMessage.value = "Saved Harmony!";
                setTimeout(() => saveMessage.value = '', 3000);
            } catch(e) {
                alert("Save Error: " + e.message);
            }
        };

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
            nextQ, prevQ, progressPercentage,
            showModal, targetSide, charList, loading,
            openLoader, selectCharacter, savePairData, saveMessage
        };
    }
}).mount('#app');