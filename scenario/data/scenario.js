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

    // 1. 簡易履歴 (scenarios / txtScenarios)
    const resText = (myResult.res === 'Alive') ? '生還' : (myResult.res === 'Lost' ? 'ロスト' : myResult.res);
    const dateText = sData.date ? `(${sData.date})` : '';
    const logLine = `[${sData.title}] ${resText} - ${sData.endName || 'End'} ${dateText}`;

    if (!newChar.scenarios) newChar.scenarios = "";
    // 重複追記防止
    if (!newChar.scenarios.includes(`[${sData.title}]`)) {
        newChar.scenarios = logLine + "\n" + newChar.scenarios;
    }

    // 2. 詳細データリスト (JSON形式)
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
        newChar.scenarioList[listIdx] = listItem; // 更新
    } else {
        newChar.scenarioList.push(listItem); // 新規
    }

    // 3. テキスト項目への追記ヘルパー
    const appendText = (fieldKey, header, content) => {
        if (!content) return;
        const current = newChar[fieldKey] || "";
        const entry = `[${header}] ${content}`;
        if (!current.includes(entry)) {
            newChar[fieldKey] = current + (current ? "\n\n" : "") + entry;
        }
    };

    // 4. 各項目への反映
    if (myResult.grow) appendText('growth', sData.title, myResult.grow); // 技能成長
    if (myResult.memo) appendText('memo', sData.title, myResult.memo);   // 感想/メモ
    
    // AF (spells欄)
    if (myResult.art && myResult.art.name) {
        appendText('spells', `AF:${sData.title}`, `${myResult.art.name}: ${myResult.art.desc}`);
    }
    // 後遺症 (memo欄に統合)
    if (myResult.seq && myResult.seq.name) {
        appendText('memo', `後遺症:${sData.title}`, `${myResult.seq.name}: ${myResult.seq.desc}`);
    }

    return newChar;
}