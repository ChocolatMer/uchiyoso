/**
 * HTMLフォームの入力値から、保存用のシナリオデータ構造を作成する
 */
export function createScenarioRecord(input, userId) {
    return {
        userId: userId,
        // 基本情報
        title: input.title,
        count: input.count || "1",
        system: input.system,
        type: input.type,
        gm: input.gm,
        endName: input.endName,
        date: input.date,
        tags: input.tags,
        
        // 詳細メタデータ
        meta: input.meta || {},

        // 検索用メンバーID
        members: input.members || [],

        // キャラクター別データ (PC/KPC)
        characters: {
            pc: input.pcData || {},
            kpc: input.kpcData || {}
        },

        // ★修正点: 神話生物を独立したフィールドとして保存
        entities: input.entities || "",

        // テキスト・画像・URL
        overview: input.overview,
        introduction: input.introduction,
        warnings: input.warnings,
        urls: input.urls || {},
        images: input.images || {},
        memos: input.memos || {}
    };
}

/**
 * シナリオデータを元に、キャラクターデータへ追記を行う
 */
export function syncScenarioToCharacter(charData, sData, sId, roleKey) {
    const newChar = JSON.parse(JSON.stringify(charData));
    const myResult = sData.characters[roleKey];
    
    if (!myResult || !myResult.id) return newChar; 

    // 1. 簡易履歴
    const resText = (myResult.res === 'Alive') ? '生還' : (myResult.res === 'Lost' ? 'ロスト' : myResult.res);
    const dateText = sData.date ? `(${sData.date})` : '';
    const logLine = `[${sData.title}] ${resText} - ${sData.endName || 'End'} ${dateText}`;

    if (!newChar.scenarios) newChar.scenarios = "";
    if (!newChar.scenarios.includes(`[${sData.title}]`)) {
        newChar.scenarios = logLine + "\n" + newChar.scenarios;
    }

    // 2. 詳細データリスト
    if (!newChar.scenarioList) newChar.scenarioList = [];
    const listIdx = newChar.scenarioList.findIndex(item => item.scenarioId === sId);
    
    const listItem = {
        scenarioId: sId,
        title: sData.title,
        date: sData.date,
        gm: sData.gm,
        system: sData.system,
        desc: `Role: ${roleKey.toUpperCase()}\nResult: ${resText}\nSAN: ${myResult.san || '-'}`
    };

    if (listIdx >= 0) {
        newChar.scenarioList[listIdx] = listItem;
    } else {
        newChar.scenarioList.push(listItem);
    }

    // 3. テキスト項目への追記
    const appendText = (fieldKey, header, content) => {
        if (!content) return;
        const current = newChar[fieldKey] || "";
        const entry = `[${header}] ${content}`;
        if (!current.includes(entry)) { // 単純な重複チェック
            newChar[fieldKey] = current + (current ? "\n\n" : "") + entry;
        }
    };

    if (myResult.grow) appendText('growth', sData.title, myResult.grow);
    if (myResult.memo) appendText('memo', sData.title, myResult.memo);
    
    if (myResult.art && myResult.art.name) {
        appendText('spells', `AF:${sData.title}`, `${myResult.art.name}: ${myResult.art.desc}`);
    }
    // 後遺症
    if (myResult.seq && myResult.seq.name) {
        appendText('memo', `後遺症:${sData.title}`, `${myResult.seq.name}: ${myResult.seq.desc}`);
    }
    // ★遭遇神話生物もキャラシにメモとして残したい場合はここで追記可能
    if (sData.entities) appendText('spells', `遭遇:${sData.title}`, sData.entities);

    return newChar;
}