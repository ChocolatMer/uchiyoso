
// ■ データ項目の定義マップ
export const FIELD_MAPPING = [
    // 基本情報
    { key: 'name',      id: 'inpName' },
    { key: 'kana',      id: 'inpKana' },
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
    
    // 画像
    { key: 'image',     id: 'inpImageBody' },
    { key: 'icon',      id: 'inpImageIcon' },
    
    // 金銭・戦闘データ
    { key: 'money',     id: 'inpMoney' },
    { key: 'debt',      id: 'inpDebt' },
    { key: 'db',        id: 'v_db' },
    
    // テキスト・長文データ
    { key: 'spells',    id: 'txtSpells' },
    { key: 'growth',    id: 'txtGrowth' },         // 成長履歴
    { key: 'encountered', id: 'txtEncountered' },  // 遭遇した存在
    { key: 'weapons',   id: 'txtWeapons' },        // 武器・防具
    { key: 'skillList', id: 'txtSkillList' },      // 技能表(数値)
    
    // シナリオ (簡易リスト)
    { key: 'scenarios', id: 'txtScenarios' }
];

// ステータス定義
export const STATS_MAPPING = [
    { key: 'STR', id: 's_str' }, { key: 'CON', id: 's_con' },
    { key: 'POW', id: 's_pow' }, { key: 'DEX', id: 's_dex' },
    { key: 'APP', id: 's_app' }, { key: 'SIZ', id: 's_siz' },
    { key: 'INT', id: 's_int' }, { key: 'EDU', id: 's_edu' }
];

// バイタル定義
export const VITALS_MAPPING = [
    { key: 'hp', id: 'v_hp' }, { key: 'mp', id: 'v_mp' }, { key: 'san', id: 'v_san' }
];

/**
 * フォームのデータを収集して保存用オブジェクトを作成する
 * @param {Object} currentData - 既存のデータ（Firebaseから読み込んだもの）
 * @param {boolean} overwriteEmpty - 空欄の場合に上書きするか？ (false=安全モード: 既存データを守る)
 */
export function collectFormData(currentData = {}, overwriteEmpty = false) {
    
    // 既存データをベースにコピー (これにより、画面にない隠しデータも消えずに残る)
    const newData = { ...currentData };
    newData.stats = { ...(currentData.stats || {}) };
    newData.vitals = { ...(currentData.vitals || {}) };

    const getVal = (id) => {
        const el = document.getElementById(id);
        return el ? el.value : null; 
    };

    // 1. 基本フィールド処理
    FIELD_MAPPING.forEach(field => {
        const inputVal = getVal(field.id);
        
        // HTML要素が存在しない場合はスキップ (データ保護)
        if (inputVal === null) return;

        if (inputVal !== "") {
            // 入力があれば更新
            newData[field.key] = inputVal;
        } else {
            // 入力が「空」の場合
            if (overwriteEmpty) {
                // 上書きモードなら空にする (削除)
                newData[field.key] = "";
            } else {
                // ★安全モード (ここが重要)
                // 既存データが undefined (未定義) の場合のみ空文字を入れる。
                // すでにデータが入っている場合は、空欄であっても触らず維持する。
                if (newData[field.key] === undefined) {
                    newData[field.key] = "";
                }
            }
        }
    });

    // 2. ステータス・バイタル (数値系)
    // 数値系は「0」と「空」の区別が難しいため、入力があれば更新する形とします
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

    // 3. メモの結合 (画面に見えている内容を正として再構築)
    // ※メモの結合については、部分的な空欄保護が難しいため、再生成します。
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
    
    // 入力がある場合のみ更新
    const newMemo = secs.join('\n\n');
    if (newMemo || overwriteEmpty) {
        newData.memo = newMemo;
    }

    // 4. アイテム処理
    const itemText = getVal('txtItems');
    if (itemText !== null && (itemText !== "" || overwriteEmpty)) {
         const itemLines = itemText.split('\n');
         newData.items = itemLines.filter(l=>l.trim()).map(line => {
            const parts = line.split(/[:：]/);
            if(parts.length > 1) return { name: parts[0].trim(), desc: parts.slice(1).join(':').trim() };
            return { name: line.trim(), desc: '' };
        });
    }

    // 5. シナリオ詳細リスト (テキストエリア -> オブジェクト配列)
    const scnText = getVal('txtScenarioDetails');
    if (scnText !== null && (scnText !== "" || overwriteEmpty)) {
        // [タイトル] で区切って保存
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