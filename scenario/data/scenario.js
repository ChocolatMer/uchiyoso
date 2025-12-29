// --- uchiyoso/character/data/scenario.js ---

/**
 * フォームの入力値から、保存用のシナリオデータを作成する
 * @param {Object} input - HTMLフォームからの入力値オブジェクト
 * @param {string} userId - ログイン中のユーザーID
 * @param {string|null} existingId - 編集時のシナリオID (新規ならnull)
 */
export function createScenarioRecord(input, userId, existingId = null) {
    const record = {
        // 管理情報
        userId: userId,
        // 新規作成時のみ作成日を設定、編集時は既存のcreatedAtがあれば維持したいが
        // ここでは新規生成データとして返し、保存側でマージまたは上書き処理に任せる
        // ※Firestore側でmerge:trueにする場合、createdAtを送らなければ維持される
        
        // 基本情報
        title: input.title,
        count: input.count, // nth session

        // Page 1 Metadata
        system: input.system,
        type: input.type,
        gm: input.gm,
        endName: input.endName,
        date: input.date,
        tags: input.tags,
        
        // 検索用
        members: input.members || [],

        // Detailed Metadata (Tab 2)
        meta: {
            system: input.meta.system,
            type: input.meta.type,
            duration: input.meta.duration,
            stage: input.meta.stage,
            charRel: input.meta.charRel,
            lostRate: input.meta.lostRate,
            skills: input.meta.skills,
            scenType: input.meta.scenType
        },

        // PC Data
        pcData: { 
            id: input.pcId, pl: input.plNamePC, 
            san: input.pcSan, grow: input.pcGrow, memo: input.pcMemo, quote: input.pcQuote,
            res: input.pcRes,
            art: { name: input.pcArtName, desc: input.pcArtDesc },
            seq: { name: input.pcSeqName, desc: input.pcSeqDesc },
            ins: { type: input.pcInsType, desc: input.pcInsDesc }
        },
        
        // KPC Data
        kpcData: { 
            id: input.kpcId, pl: input.plNameKPC, 
            san: input.kpcSan, grow: input.kpcGrow, memo: input.kpcMemo, quote: input.kpcQuote,
            res: input.kpcRes,
            art: { name: input.kpcArtName, desc: input.kpcArtDesc },
            seq: { name: input.kpcSeqName, desc: input.kpcSeqDesc },
            ins: { type: input.kpcInsType, desc: input.kpcInsDesc }
        },

        // URLs & Text
        urls: { shop: input.urls.shop, room: input.urls.room },
        overview: input.overview, 
        introduction: input.introduction,
        warnings: input.warnings,
        memos: { public: input.public, secret: input.secret },
        
        // Images
        images: input.images || {}
    };

    // 新規作成時のみ createdAt を入れる（undefinedならFirestoreで無視または消えるのを防ぐためロジック側で制御）
    if (!existingId) {
        record.createdAt = new Date().toISOString();
    }
    
    return record;
}

/**
 * シナリオデータを元に、キャラクターデータを更新して新しいデータを返す
 * (既存ロジック維持)
 */
export function syncScenarioToCharacter(charData, sData, sId, role) {
    const newChar = JSON.parse(JSON.stringify(charData));
    const myData = (role === 'PC') ? sData.pcData : sData.kpcData;
    
    // 参加していなければ何もしない
    if (!myData || !myData.id) return newChar;

    // 1. 通過シナリオ簡易一覧 (scenarios)
    // 重複防止: 全く同じ文字列が既に先頭付近にあれば追加しない等の制御を入れるのが望ましいが
    // ここでは単純追記とする（ユーザーが後で手修正可能）
    const resultStr = myData.res === 'Alive' ? '生還' : (myData.res === 'Lost' ? 'ロスト' : myData.res);
    const endStr = sData.endName ? ` - ${sData.endName}` : '';
    const dateStr = sData.date ? `(${sData.date})` : '';
    
    const newHistoryLine = `[${sData.title}] ${resultStr}${endStr} ${dateStr}`;
    
    if (!newChar.scenarios) newChar.scenarios = "";
    // 単純な重複チェック
    if (!newChar.scenarios.includes(newHistoryLine)) {
        newChar.scenarios = newHistoryLine + "\n" + newChar.scenarios;
    }

    // 2. 詳細リスト
    if (!newChar.scenarioList) newChar.scenarioList = [];
    // IDでの重複チェック（更新時の多重追加防止）
    const existingIdx = newChar.scenarioList.findIndex(item => item.scenarioId === sId);
    
    const listItem = {
        scenarioId: sId,
        title: sData.title,
        desc: `Role: ${role}\nResult: ${resultStr}\nSAN: ${myData.san || '-'}\nGrow: ${myData.grow || '-'}`
    };

    if (existingIdx >= 0) {
        newChar.scenarioList[existingIdx] = listItem; // 更新
    } else {
        newChar.scenarioList.push(listItem); // 新規
    }

    // ヘルパー: テキスト追記 (更新時は重複しやすいので、簡易的に「含まれていなければ追記」)
    const appendToField = (fieldKey, content) => {
        if (!content) return;
        const current = newChar[fieldKey] || "";
        // 厳密なチェックは難しいが、本文が含まれていなければ追加
        if(!current.includes(content)) {
            const entry = `[${sData.title}] ${content}`;
            newChar[fieldKey] = current + (current ? "\n\n" : "") + entry;
        }
    };

    appendToField('growth', myData.grow);
    
    if (myData.art && myData.art.name) {
        appendToField('spells', `${myData.art.name}: ${myData.art.desc}`);
    }
    if (myData.seq && myData.seq.name) {
        appendToField('txtRoleplay', `[後遺症] ${myData.seq.name}: ${myData.seq.desc}`);
    }

    // 報酬(Items)
    // アイテムは構造体なので、タイトルで重複チェックして追加
    if(sData.endName && !newChar.items?.some(i => i.desc?.includes(sData.title))) {
         // ここは自動追加しないほうが安全（手動入力のほうが確実）だが、
         // 要件に従い、特定の報酬欄があれば追加するロジックがあればここに書く
    }

    return newChar;
}