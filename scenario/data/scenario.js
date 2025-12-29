// --- START OF FILE data/scenario.js ---

/**
 * フォーム入力値(input)から、Firestore保存用のシナリオオブジェクトを作成
 */
export function createScenarioRecord(input, userId) {
    // 参加メンバーID配列作成（検索用）
    const members = [];
    if (input.pcId) members.push(input.pcId);
    if (input.kpcId) members.push(input.kpcId);

    return {
        userId: userId,
        title: input.title,
        count: parseInt(input.count) || 1,
        system: input.system,
        date: input.date,
        endName: input.endName,
        tags: input.tags,
        
        // 検索用インデックス
        members: members,
        
        // メタデータ
        gm: input.gm,
        type: input.type,
        meta: {
            duration: input.duration,
        },
        
        // PC詳細
        pcData: {
            id: input.pcId,
            pl: input.pcName,
            res: input.pcRes,
            san: input.pcSan,
            grow: input.pcGrow,
            quote: input.pcQuote
        },
        
        // KPC詳細
        kpcData: {
            id: input.kpcId,
            pl: input.kpcName,
            res: input.kpcRes,
            san: input.kpcSan,
            grow: input.kpcGrow,
            quote: input.kpcQuote
        },

        // 共通・詳細
        overview: input.overview,
        urls: {
            shop: input.url
        },
        memos: {
            public: input.publicMemo,
            secret: input.secretMemo
        },
        images: {
            trailer: input.image
        }
    };
}

/**
 * キャラクターデータにシナリオ履歴を追記した新しいオブジェクトを返す
 * @param {Object} charData 元のキャラクターデータ
 * @param {Object} sData シナリオデータ(createScenarioRecordの結果+α)
 * @param {String} sId シナリオID
 */
export function syncScenarioToCharacter(charData, sData, sId) {
    const newChar = JSON.parse(JSON.stringify(charData));

    // 1. 簡易履歴 (scenarios: string)
    // 書式: [タイトル] 生還 - End名 (日付)
    const resStr = (sData.result === 'Alive') ? '生還' : (sData.result === 'Lost' ? 'ロスト' : sData.result);
    const endStr = sData.endName ? ` - ${sData.endName}` : '';
    const dateStr = sData.date ? `(${sData.date})` : '';
    const logLine = `[${sData.title}] ${resStr}${endStr} ${dateStr}`;

    if (!newChar.scenarios) newChar.scenarios = "";
    // 二重追加防止のため、単純な文字列チェックを行う（完全ではないが実用的）
    if (!newChar.scenarios.includes(`[${sData.title}]`)) {
        newChar.scenarios = logLine + "\n" + newChar.scenarios;
    }

    // 2. 詳細リスト (scenarioList: array)
    if (!newChar.scenarioList) newChar.scenarioList = [];
    const exists = newChar.scenarioList.find(i => i.scenarioId === sId);
    if (!exists) {
        newChar.scenarioList.push({
            scenarioId: sId,
            title: sData.title,
            desc: `GM: ${sData.gm || '-'}\n結果: ${resStr}\nSAN: ${sData.pcData?.san || sData.kpcData?.san || '-'}\n成長: ${sData.growth || 'なし'}`
        });
    }

    // 3. 成長・呪文・AFなどのテキスト追記 (改行区切り)
    // input.grow が渡ってくることを想定
    if (sData.growth && sData.growth.trim() !== "") {
        const currentGrow = newChar.growth || "";
        const growEntry = `[${sData.title}] ${sData.growth}`;
        if (!currentGrow.includes(growEntry)) {
            newChar.growth = currentGrow + (currentGrow ? "\n" : "") + growEntry;
        }
    }

    // 4. SAN値の更新 (簡易実装)
    // フォーマット "50 -> 40" などの右側を取得して更新したい場合があるが
    // 誤作動を防ぐため、ここでは文字列としての記録にとどめ、Vitalsの自動更新は行わない
    // (必要であればここに newChar.vitals.san = newValue を実装する)

    return newChar;
}