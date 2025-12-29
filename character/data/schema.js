// data/schema.js

// ■ データ項目の定義マップ (全ての保存対象データ)
export const FIELD_MAPPING = [
    { key: 'name',      id: 'inpName' },
    { key: 'kana',      id: 'inpKana' },
    { key: 'plName',    id: 'inpPlName' }, 
    
    { key: 'job',       id: 'inpJob' },
    { key: 'tags',      id: 'inpTags' },
    { key: 'age',       id: 'inpAge' },
    { key: 'gender',    id: 'inpGender' },
    { key: 'birthday',  id: 'inpBirthday' },
    { key: 'birthplace',id: 'inpOrigin' },
    { key: 'height',    id: 'inpHeight' },
    { key: 'weight',    id: 'inpWeight' },
    { key: 'colorHair', id: 'inpHair' },       
    { key: 'colorEye',  id: 'inpEye' },        
    { key: 'colorSkin', id: 'inpSkin' },       
    { key: 'color',     id: 'inpThemeColor' }, 
    { key: 'image',     id: 'inpImageBody' },
    { key: 'icon',      id: 'inpImageIcon' },
    { key: 'money',     id: 'inpMoney' },
    { key: 'debt',      id: 'inpDebt' },
    { key: 'db',        id: 'v_db' },
    { key: 'spells',    id: 'txtSpells' },
    { key: 'growth',    id: 'txtGrowth' },         
    { key: 'encountered', id: 'txtEncountered' },  
    { key: 'weapons',   id: 'txtWeapons' },        
    { key: 'skillList', id: 'txtSkillList' },      
    { key: 'scenarios', id: 'txtScenarios' },                
    { key: 'scenarioDetailsText', id: 'txtScenarioDetails' } 
];


export const STATS_MAPPING = [
    { key: 'STR', id: 's_str' }, { key: 'CON', id: 's_con' },
    { key: 'POW', id: 's_pow' }, { key: 'DEX', id: 's_dex' },
    { key: 'APP', id: 's_app' }, { key: 'SIZ', id: 's_siz' },
    { key: 'INT', id: 's_int' }, { key: 'EDU', id: 's_edu' }
];

export const VITALS_MAPPING = [
    { key: 'hp', id: 'v_hp' }, { key: 'mp', id: 'v_mp' }, { key: 'san', id: 'v_san' }
];

// ■ 台詞項目の定義マップ (新規追加)
export const DIALOGUE_MAPPING = [
    { key: 'dialogue_default', id: 'txtDialogueDefault' }, // 常時 (デフォルト)
    { key: 'dialogue_morning', id: 'txtDialogueMorning' }, // 朝
    { key: 'dialogue_day',     id: 'txtDialogueDay' },     // 昼
    { key: 'dialogue_night',   id: 'txtDialogueNight' },   // 夜
    { key: 'dialogue_duo',     id: 'txtDialogueDuo' },     // 2人 (DUOモード)
    { key: 'dialogue_lowsan',  id: 'txtDialogueLowSan' }   // 低SAN値
];



// --- アンケート保存用ルール ---

/**
 * 1人用アンケート (Morning Desk Survey) のレコード作成ルール
 * @param {Object} answers - 回答オブジェクト {q1: "回答...", q2: "..."}
 * @returns {Object} 保存用レコード
 */
export function createSoloSurveyRecord(answers) {
    const timestamp = new Date().toISOString();
    
    // サマリー生成: 最初の回答を抜粋、なければ固定文言
    const firstAnswer = Object.values(answers).find(v => v && v.trim().length > 0);
    const summary = firstAnswer ? firstAnswer : 'No answer';

    return {
        id: Date.now().toString(),      // ユニークID
        type: 'solo_survey',            // データタイプ識別用
        timestamp: timestamp,           // 記録日時
        summary: summary,               // 履歴リスト表示用の短い説明
        answers: { ...answers }         // 回答データのコピー
    };
}

/**
 * 2人用アンケート (Pair Harmony Survey) のレコード作成ルール
 * @param {Object} myAnswers - 自分の回答 {p1: "...", p2: "..."}
 * @param {string} partnerName - 相手の名前
 * @param {Object} partnerAnswers - 相手の回答
 * @returns {Object} 保存用レコード
 */
export function createPairSurveyRecord(myAnswers, partnerName, partnerAnswers) {
    const timestamp = new Date().toISOString();

    return {
        id: Date.now().toString(),
        type: 'pair_survey',
        timestamp: timestamp,
        summary: `Pair Survey with ${partnerName}`, // 履歴リスト表示用
        partner: partnerName,                       // 相手の名前
        answers: { ...myAnswers },                  // 自分の回答
        partnerAnswers: { ...partnerAnswers }       // 相手の回答
    };
}

/**
 * キャラクターデータにアンケート履歴を追加・統合する
 * @param {Object} originalCharData - サーバーから読み込んだ元のキャラクターデータ
 * @param {Object} newRecord - 作成したアンケートレコード
 * @returns {Object} 更新用キャラクターデータ
 */
export function addSurveyToCharacter(originalCharData, newRecord) {
    // 元データのコピーを作成
    const updatedData = { ...originalCharData };

    // surveys配列がなければ作成
    if (!updatedData.surveys) {
        updatedData.surveys = [];
    }

    // 配列の先頭に追加 (新しい順)
    updatedData.surveys.unshift(newRecord);

    // 履歴が増えすぎた場合の制限（例: 最新50件まで）が必要ならここで記述
    // if (updatedData.surveys.length > 50) updatedData.surveys.pop();

    return updatedData;
}

/**
 * 編集画面用: フォームのデータを収集して保存用オブジェクトを作成する
 */
export function collectFormData(currentData = {}, overwriteEmpty = false) {
    const newData = { ...currentData };
    newData.stats = { ...(currentData.stats || {}) };
    newData.vitals = { ...(currentData.vitals || {}) };

    const getVal = (id) => {
        const el = document.getElementById(id);
        return el ? el.value : null; 
    };

    FIELD_MAPPING.forEach(field => {
        const inputVal = getVal(field.id);
        if (inputVal === null) return;

        if (inputVal !== "") {
            newData[field.key] = inputVal;
        } else {
            if (overwriteEmpty) {
                newData[field.key] = "";
            } else {
                if (newData[field.key] === undefined) {
                    newData[field.key] = "";
                }
            }
        }
    });

    const updateNum = (mapping, targetObj) => {
        mapping.forEach(field => {
            const val = getVal(field.id);
            if (val !== null && val !== "") {
                targetObj[field.key] = parseInt(val) || 0;
            }
        });
    };
    updateNum(STATS_MAPPING, newData.stats);
    updateNum(VITALS_MAPPING, newData.vitals);

    const secs = [];
    const getMemo = (id) => getVal(id);
    const add = (t, val) => { if(val) secs.push(`[${t}]\n${val}`); };
    
    add('経歴', getMemo('txtBackground')); 
    add('性格', getMemo('txtPersonality'));
    add('人間関係', getMemo('txtRelations')); 
    add('外見的特徴', getMemo('txtAppearance'));
    add('RP補足', getMemo('txtRoleplay')); 
    add('技能詳細', getMemo('txtSkillDetails'));
    add('メモ', getMemo('txtMemo'));
    
    const newMemo = secs.join('\n\n');
    if (newMemo || overwriteEmpty) {
        newData.memo = newMemo;
    }

    const itemText = getVal('txtItems');
    if (itemText !== null && (itemText !== "" || overwriteEmpty)) {
         const itemLines = itemText.split('\n');
         newData.items = itemLines.filter(l=>l.trim()).map(line => {
            const parts = line.split(/[:：]/);
            if(parts.length > 1) return { name: parts[0].trim(), desc: parts.slice(1).join(':').trim() };
            return { name: line.trim(), desc: '' };
        });
    }

    const scnText = getVal('txtScenarioDetails');
    if (scnText !== null && (scnText !== "" || overwriteEmpty)) {
        const entries = scnText.split(/\n(?=\[)/g);
        newData.scenarioList = entries.map(entry => {
            const match = entry.match(/^\[(.*?)\]([\s\S]*)$/);
            if (match) {
                return { title: match[1].trim(), desc: match[2].trim() };
            }
            const trimmed = entry.trim();
            return trimmed ? { title: trimmed, desc: "" } : null;
        }).filter(e => e);
    }

    return newData;
}

// --- ★ 高画質画像読み出し用ユーティリティ (修正版) ---

export const IMG_CONFIG = {
    charBase: "./images/character/", // 立ち絵用フォルダ
    iconBase: "./images/icon/",      // アイコン用フォルダ (新規)
    default: "https://via.placeholder.com/800x1200?text=NO+IMAGE"
};

/**
 * 高画質画像読み出しメソッド
 * 
 * 指定されたローカルフォルダ(basePath)に画像があるか確認し、あればそれを返します。
 * なければ cloudUrl を返します。
 * 
 * @param {string} charName - キャラクター名（ファイル名に使用）
 * @param {string} cloudUrl - クラウドまたは外部URL (d.icon / d.image)
 * @param {string} type - 'body' (立ち絵) または 'icon' (アイコン)
 * @returns {Promise<string>} - 解決された画像パスまたはURL
 */
export function resolveCharacterImage(charName, cloudUrl, type = 'body') {
    return new Promise((resolve) => {
        if (!charName) {
            resolve(cloudUrl || IMG_CONFIG.default);
            return;
        }

        // タイプに応じて探すフォルダを切り替え
        const basePath = (type === 'icon') ? IMG_CONFIG.iconBase : IMG_CONFIG.charBase;
        const localPath = `${basePath}${charName}.png`;
        
        const img = new Image();
        img.onload = () => resolve(localPath);
        img.onerror = () => {
            // ローカルになければクラウドURLを採用
            resolve(cloudUrl || `https://via.placeholder.com/200x200?text=${encodeURIComponent(charName)}`);
        };
        img.src = localPath;
    });
}