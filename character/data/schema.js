// data/schema.js

// HTMLのIDと保存データのプロパティ名の対応表
export const FIELD_MAPPING = [
    { id: 'inpName', key: 'name' },
    { id: 'inpKana', key: 'kana' },
    { id: 'inpJob', key: 'job' },
    { id: 'inpTags', key: 'tags' },
    { id: 'inpAge', key: 'age' },
    { id: 'inpGender', key: 'gender' },
    { id: 'inpMoney', key: 'money' },
    { id: 'inpDebt', key: 'debt' },
    { id: 'inpBirthday', key: 'birthday' },
    { id: 'inpOrigin', key: 'birthplace' },
    { id: 'inpThemeColor', key: 'color' },
    { id: 'inpPlName', key: 'plName' },
    { id: 'inpHeight', key: 'height' },
    { id: 'inpWeight', key: 'weight' },
    { id: 'inpHair', key: 'colorHair' },
    { id: 'inpEye', key: 'colorEye' },
    { id: 'inpSkin', key: 'colorSkin' },
    { id: 'inpImageBody', key: 'image' },
    { id: 'inpImageIcon', key: 'icon' }
];

// 能力値 (STATS) の対応表
export const STATS_MAPPING = [
    { id: 's_str', key: 'STR' },
    { id: 's_con', key: 'CON' },
    { id: 's_pow', key: 'POW' },
    { id: 's_dex', key: 'DEX' },
    { id: 's_app', key: 'APP' },
    { id: 's_siz', key: 'SIZ' },
    { id: 's_int', key: 'INT' },
    { id: 's_edu', key: 'EDU' }
];

// ステータス (VITALS) の対応表
export const VITALS_MAPPING = [
    { id: 'v_hp', key: 'hp' },
    { id: 'v_mp', key: 'mp' },
    { id: 'v_san', key: 'san' },
    { id: 'v_db', key: 'db' }
];

/**
 * フォーム上のデータを収集してオブジェクト化する関数
 * @param {Object} originalData 元のデータオブジェクト（IDなどを保持するため）
 * @param {boolean} includeMemos メモ欄やテキストエリアを含めるかどうか
 * @returns {Object} 保存用データ
 */
export function collectFormData(originalData = {}, includeMemos = true) {
    const data = { ...originalData };
    
    // 基本フィールドの取得
    FIELD_MAPPING.forEach(field => {
        const el = document.getElementById(field.id);
        if (el) data[field.key] = el.value;
    });

    // 能力値の取得
    if (!data.stats) data.stats = {};
    STATS_MAPPING.forEach(field => {
        const el = document.getElementById(field.id);
        if (el) data.stats[field.key] = parseInt(el.value) || 0;
    });

    // バイタル(HPなど)の取得
    if (!data.vitals) data.vitals = {};
    VITALS_MAPPING.forEach(field => {
        const el = document.getElementById(field.id);
        if (el) {
            // DBは文字列、それ以外は数値
            if (field.key === 'db') data.vitals[field.key] = el.value;
            else data.vitals[field.key] = parseInt(el.value) || 0;
        }
    });

    if (includeMemos) {
        const getVal = (id) => { const e = document.getElementById(id); return e ? e.value : ''; };

        // 分割されているテキストエリアを一つのメモ文字列に統合する
        let memoBuilder = "";
        const appendMemo = (tag, val) => {
            if(val && val.trim()) memoBuilder += `[${tag}]\n${val.trim()}\n\n`;
        };
        
        appendMemo('経歴', getVal('txtBackground'));
        appendMemo('性格', getVal('txtPersonality'));
        appendMemo('人間関係', getVal('txtRelations'));
        appendMemo('外見', getVal('txtAppearance'));
        appendMemo('RP補足', getVal('txtRoleplay'));
        
        // 通常メモ
        const freeMemo = getVal('txtMemo');
        if(freeMemo && freeMemo.trim()) {
            memoBuilder += `[メモ]\n${freeMemo.trim()}\n\n`;
        }
        
        data.memo = memoBuilder.trim();

        // その他のテキストデータ
        data.growth = getVal('txtGrowth'); // 成長履歴
        data.scenarios = getVal('txtScenarios'); // 簡易シナリオ一覧

        // シナリオ詳細（[タイトル] 内容... 形式で保存する場合）
        // ここではテキストエリアそのものを保存するか、パースするか
        // edit.htmlのload側はパースしているが、保存はテキストとして持つことが多い
        // 今回は単純化のため、詳細テキストとして保持する想定であれば以下などが必要ですが
        // edit.html側でリスト構造(d.scenarioList)を持っている場合、そこへ変換が必要かもしれません。
        // とりあえずテキストエリアの内容を保持するキーを決めて保存します。
        // (parser_ia.jsを見る限り scenarioList という配列構造が使われることもあるようです)
        
        // 簡易的に inventory / spells も取得
        data.spells = getVal('txtSpells');
        data.encountered = getVal('txtEncountered');
    }

    return data;
}