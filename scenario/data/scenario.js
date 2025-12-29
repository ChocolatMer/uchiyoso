// --- uchiyoso/character/data/scenario.js ---

/**
 * フォームの入力値から、保存用のシナリオデータを作成する
 * @param {Object} input - HTMLフォームからの入力値オブジェクト
 * @param {string} userId - ログイン中のユーザーID
 */
export function createScenarioRecord(input, userId) {
    return {
        // 管理情報
        userId: userId,
        createdAt: new Date().toISOString(),

        // 基本情報
        title: input.title,
        system: input.system,
        date: input.date,
        duration: input.duration,
        stage: input.stage,
        type: input.type,
        gm: input.gm,
        players: input.players,
        format: input.format,
        public: input.public,

        // 検索用: 参加キャラクターIDリスト
        members: input.members || [],

        // 結果・状態
        charStatus: input.charStatus,
        result: input.result,
        lostDetail: input.lostDetail,

        // 詳細データ
        images: input.images || {}, 
        urls: input.urls || {},     
        trailerText: input.trailerText || "",
        
        details: input.details || {}, 
        
        // 報酬・成長
        endName: input.endName,
        rewards: input.rewards || {}, 
        entities: input.entities,
        spells: input.spells,
        growth: input.growth,

        // メモ
        memos: input.memos || {}
    };
}

/**
 * シナリオデータを元に、キャラクターデータを更新して新しいデータを返す
 * ※ここは計算のみで、保存は行いません
 * 
 * @param {Object} charData - 元のキャラクターデータ
 * @param {Object} scenarioData - 保存するシナリオデータ
 * @param {string} scenarioId - 発行されたシナリオID
 */
export function syncScenarioToCharacter(charData, scenarioData, scenarioId) {
    // 元のデータを壊さないようにコピー
    const newChar = JSON.parse(JSON.stringify(charData));

    // 1. 通過シナリオ簡易一覧 (scenarios) の作成
    // 書式: [タイトル] 生還 - End名 (日付)
    const resultStr = scenarioData.result === 'Cleared' ? '生還' : scenarioData.result;
    const endStr = scenarioData.endName ? ` - ${scenarioData.endName}` : '';
    const dateStr = scenarioData.date ? `(${scenarioData.date})` : '';
    
    const newHistoryLine = `[${scenarioData.title}] ${resultStr}${endStr} ${dateStr}`;
    
    // 既存データになければ追記 (先頭に追加)
    if (!newChar.scenarios) newChar.scenarios = "";
    if (!newChar.scenarios.includes(newHistoryLine)) {
        newChar.scenarios = newHistoryLine + "\n" + newChar.scenarios;
    }

    // 2. 詳細シナリオログ (配列) への追加
    if (!newChar.scenarioList) newChar.scenarioList = [];
    newChar.scenarioList.push({
        scenarioId: scenarioId,
        title: scenarioData.title,
        desc: `GM: ${scenarioData.gm}\n結果: ${resultStr}${endStr}\nSAN推移: ${scenarioData.rewards.san || '-'}\n成長: ${scenarioData.growth || 'なし'}`
    });

    // テキストエリアへの追記用ヘルパー関数
    const appendToField = (fieldKey, header, content) => {
        if (!content) return;
        const current = newChar[fieldKey] || "";
        const entry = `[${header}] ${content}`;
        // 既存になければ改行して追記
        if(!current.includes(entry)) {
            newChar[fieldKey] = current + (current ? "\n\n" : "") + entry;
        }
    };

    // 3. 各種テキストフィールドへの追記
    appendToField('encountered', scenarioData.title, scenarioData.entities); // 遭遇
    appendToField('spells', scenarioData.title, scenarioData.spells);        // 魔術・AF
    appendToField('growth', scenarioData.title, scenarioData.growth);        // 成長

    // 4. 報酬(所持品)
    if (scenarioData.rewards.items) {
        if (!newChar.items) newChar.items = [];
        newChar.items.push({
            name: "獲得報酬", 
            desc: `[${scenarioData.title}] ${scenarioData.rewards.items}`
        });
    }

    return newChar;
}