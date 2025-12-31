// js/data/scenario.js

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

        // ★神話生物
        entities: input.entities || "",

        // ★追加: ログ解析データの生データ（グラフ描画用）
        analysisData: input.analysisData || null,

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

    // 1. 簡易履歴 (シナリオ一覧文字列)
    const resText = (myResult.res === 'Alive') ? '生還' : (myResult.res === 'Lost' ? 'ロスト' : myResult.res);
    const dateText = sData.date ? `(${sData.date})` : '';
    const logLine = `[${sData.title}] ${resText} - ${sData.endName || 'End'} ${dateText}`;

    if (!newChar.scenarios) newChar.scenarios = "";
    // 既存の履歴に同じタイトルの行があれば置換、なければ先頭に追加
    // (簡易的なチェックのため、タイトルが含まれているかだけで判定していますが必要に応じて調整してください)
    if (!newChar.scenarios.includes(`[${sData.title}]`)) {
        newChar.scenarios = logLine + "\n" + newChar.scenarios;
    }

    // 2. 詳細データリスト (構造化データ)
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

    // 3. テキスト項目への追記・更新 (重複防止ロジック強化版)
    const updateOrAppendText = (fieldKey, header, content) => {
        if (!content) return;
        let current = newChar[fieldKey] || "";
        const headerTag = `[${header}]`;
        const newEntry = `${headerTag} ${content}`;

        // 正規表現で [ヘッダー] から始まるブロックを探す
        // (次の [ヘッダー] が来るか、末尾までを範囲とする)
        // エスケープ処理: タイトルに含まれる記号が正規表現を壊さないようにする
        const escapedHeader = header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\[${escapedHeader}\\][\\s\\S]*?(?=(\\n\\n\\[|$))`, 'g');

        if (current.match(regex)) {
            // 既に同じヘッダーが存在する場合は、その部分を新しい内容で置換する
            newChar[fieldKey] = current.replace(regex, newEntry);
        } else {
            // 存在しない場合は追記する
            newChar[fieldKey] = current + (current ? "\n\n" : "") + newEntry;
        }
    };

    if (myResult.grow) updateOrAppendText('growth', sData.title, myResult.grow);
    if (myResult.memo) updateOrAppendText('memo', sData.title, myResult.memo);
    
    if (myResult.art && myResult.art.name) {
        updateOrAppendText('spells', `AF:${sData.title}`, `${myResult.art.name}: ${myResult.art.desc}`);
    }
    if (myResult.seq && myResult.seq.name) {
        updateOrAppendText('memo', `後遺症:${sData.title}`, `${myResult.seq.name}: ${myResult.seq.desc}`);
    }
    // 遭遇情報はPC/KPCで共通の場合が多いですが、ここではキャラシ毎に書き込みます
    if (sData.entities) updateOrAppendText('spells', `遭遇:${sData.title}`, sData.entities);

    return newChar;
}