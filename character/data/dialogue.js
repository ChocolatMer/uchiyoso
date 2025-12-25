// uchiyoso/character/data/dialogue.js

// =============================================
// ■ 1. 編集画面 (Editor) 用の設定
// =============================================

// 台詞項目の定義マップ
export const DIALOGUE_MAPPING = [
    // --- BASIC ---
    { key: 'dialogue_default', id: 'txtDialogueDefault', label: '自己紹介・デフォルト', category: 'BASIC / 基本' },

    // --- TIME ---
    { key: 'dialogue_morning', id: 'txtDialogueMorning', label: '朝 (Morning)', category: 'TIME / 時間帯' },
    { key: 'dialogue_day',     id: 'txtDialogueDay',     label: '昼 (Day)',     category: 'TIME / 時間帯' },
    { key: 'dialogue_night',   id: 'txtDialogueNight',   label: '夜 (Night)',   category: 'TIME / 時間帯' },

    // --- ACTION & STATUS ---
    { key: 'dialogue_wait',    id: 'txtDialogueWait',    label: '待機中 (Waiting)',    category: 'ACTION / 行動' },
    { key: 'dialogue_afk',     id: 'txtDialogueAfk',     label: '放置中 (AFK/Sleep)', category: 'ACTION / 行動' },

    // --- RELATION ---
    { key: 'dialogue_about_others', id: 'txtDialogueAboutOthers', label: '誰かについて (噂話)', category: 'RELATION / 関係性' },
    { key: 'dialogue_duo_generic',  id: 'txtDialogueDuo',         label: '汎用DUO反応',        category: 'RELATION / 関係性' },

    // --- EMOTION ---
    { key: 'dialogue_thanks',  id: 'txtDialogueThanks',  label: '感謝 (Thanks)', category: 'EMOTION / 感情' },
    { key: 'dialogue_apology', id: 'txtDialogueApology', label: '謝罪 (Sorry)',  category: 'EMOTION / 感情' },
    { key: 'dialogue_love',    id: 'txtDialogueLove',    label: '好意・愛 (Love)',category: 'EMOTION / 感情' },

    // --- BATTLE ---
    { key: 'dialogue_battle_start',  id: 'txtDialogueBattleStart',  label: '戦闘開始',   category: 'BATTLE / 戦闘' },
    { key: 'dialogue_battle_crit',   id: 'txtDialogueBattleCrit',   label: 'クリティカル', category: 'BATTLE / 戦闘' },
    { key: 'dialogue_battle_fumble', id: 'txtDialogueBattleFumble', label: 'ファンブル',   category: 'BATTLE / 戦闘' },
    { key: 'dialogue_lowsan',        id: 'txtDialogueLowSan',       label: '低SAN値 (Low Sanity)', category: 'BATTLE / 戦闘' },
    { key: 'dialogue_insanity',      id: 'txtDialogueInsanity',     label: '発狂・狂気 (Insanity)', category: 'BATTLE / 戦闘' }
];

// ■ DUO会話のシチュエーションタグ候補
export const DUO_SITUATIONS = [
    "日常 (Normal)",
    "買い物 (Shopping)",
    "喧嘩 (Quarrel)",
    "共闘 (Battle)",
    "秘密の話 (Secret)",
    "ギャグ (Comedy)"
];

// =========================================================
// ▼ 表示用ロジック (Topページなどで使用)
// =========================================================

/**
 * テキストからランダムに1行を取得 (修正版)
 * [NEXT] という合言葉で区切ります。なければ改行で区切ります。
 */
export function pickRandomLine(text) {
    if (!text) return null;

    // 1. 新しい形式 ([NEXT]区切り) かチェック
    if (text.includes('[NEXT]')) {
        const patterns = text.split('[NEXT]').map(l => l.trim()).filter(l => l !== "");
        if (patterns.length === 0) return null;
        return patterns[Math.floor(Math.random() * patterns.length)];
    }
    
    // 2. 古い形式 (改行区切り) の場合の救済措置
    // 削除：改行を「表示上の改行」として扱うため、ここでは分割しない
    /*
    if (text.includes('\n')) {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l !== "");
        return lines[Math.floor(Math.random() * lines.length)];
    }
    */

    // 3. 1行だけの場合
    return text;
}

/**
 * 状況に応じたホーム画面用セリフを取得
 * @param {Object} charData - キャラクターデータ
 * @param {Object} statusOpts - { isAfk: boolean, isWaiting: boolean, ... }
 */
export function getHomeDialogue(charData, statusOpts = {}) {
    if (!charData) return "...";
    
    // 1. 放置中 (AFK)
    if (statusOpts.isAfk) {
        const afk = pickRandomLine(charData.dialogue_afk);
        if (afk) return afk;
    }

    // 2. SAN値ピンチ (30以下)
    const currentSan = (charData.vitals && charData.vitals.san) ? parseInt(charData.vitals.san) : 99;
    if (currentSan <= 30) {
        const lowSan = pickRandomLine(charData.dialogue_lowsan);
        if (lowSan) return lowSan;
    }

    // 3. 待機 (クリック連打された時などに使用)
    if (statusOpts.isWaiting) {
        const wait = pickRandomLine(charData.dialogue_wait);
        if (wait) return wait;
    }

    // 4. 時間帯
    const hour = new Date().getHours();
    let timeLine = null;
    if (hour >= 5 && hour < 11) timeLine = pickRandomLine(charData.dialogue_morning);
    else if (hour >= 11 && hour < 18) timeLine = pickRandomLine(charData.dialogue_day);
    else timeLine = pickRandomLine(charData.dialogue_night);

    if (timeLine) return timeLine;

    // 5. デフォルト (なければremarks等にフォールバック)
    return pickRandomLine(charData.dialogue_default) || 
           pickRandomLine(charData.remarks) || 
           pickRandomLine(charData.txtRoleplay) || 
           "……。";
}

// =========================================================
// ▼ データ保存・更新用ロジック
// =========================================================

export function createDuoConversationRecord(partnerName, scriptList) {
    // 空のスクリプトを除去してクリーンアップ
    const cleanScripts = scriptList.filter(s => s.a.trim() !== "" || s.b.trim() !== "");
    
    return {
        partner: partnerName,
        updatedAt: new Date().toISOString(),
        scripts: cleanScripts // [{ a: "...", b: "...", situation: "..." }, ...]
    };
}

export function updateDuoConversation(charData, duoRecord) {
    const updatedData = { ...charData };
    
    if (!updatedData.duo_conversations) {
        updatedData.duo_conversations = [];
    }

    // 既存の相手データがあれば削除（上書きのため）
    updatedData.duo_conversations = updatedData.duo_conversations.filter(d => d.partner !== duoRecord.partner);

    // スクリプトが存在する場合のみ追加
    if (duoRecord.scripts && duoRecord.scripts.length > 0) {
        updatedData.duo_conversations.push(duoRecord);
    }

    return updatedData;
}