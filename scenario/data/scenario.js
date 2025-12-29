/**
 * HTMLフォームの入力値から、保存用のシナリオデータ構造を作成する
 */
export function createScenarioRecord(input, userId) {
    return {
        userId: userId,
        // 基本メタデータ
        title: input.title,
        count: input.count || "1",
        system: input.system,
        type: input.type,
        gm: input.gm,
        endName: input.endName,
        date: input.date,
        tags: input.tags,
        
        // 詳細メタデータ
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

        // 参加メンバーID配列（検索用）
        members: input.members || [],

        // キャラクター別リザルトデータ (Map構造)
        // input.pcData / input.kpcData は HTML側で整形して渡される想定
        characters: {
            pc: input.pcData || {},
            kpc: input.kpcData || {}
        },

        // シナリオ詳細テキスト
        overview: input.overview,
        introduction: input.introduction,
        warnings: input.warnings,
        
        // URL & 画像
        urls: input.urls || {},
        images: input.images || {},

        // メモ
        memos: input.memos || {}
    };
}

/**
 * シナリオデータを元に、キャラクターデータの各フィールド（経歴、呪文、AFなど）を更新する
 * 
 * @param {Object} charData - 現在のキャラクターデータ
 * @param {Object} sData - 保存されたシナリオデータ
 * @param {string} sId - シナリオID
 * @param {string} roleKey - 'pc' または 'kpc' (sData.characters内のキー)
 */
export function syncScenarioToCharacter(charData, sData, sId, roleKey) {
    const newChar = JSON.parse(JSON.stringify(charData));
    const myResult = sData.characters[roleKey];
    
    if (!myResult || !myResult.id) return newChar; // データがない場合はスキップ

    // 1. 簡易履歴 (scenarios)
    // 書式: [タイトル] 生還 - End名 (日付)
    const resText = (myResult.res === 'Alive') ? '生還' : (myResult.res === 'Lost' ? 'ロスト' : myResult.res);
    const dateText = sData.date ? `(${sData.date})` : '';
    const logLine = `[${sData.title}] ${resText} - ${sData.endName || 'End'} ${dateText}`;

    if (!newChar.scenarios) newChar.scenarios = "";
    // 重複防止（編集時用）: 既に同じIDのログがあれば置換、なければ先頭に追加したいが、
    // テキスト形式だとID管理が難しいため、単純な文字列チェックで重複を防ぐ
    if (!newChar.scenarios.includes(`[${sData.title}]`)) {
        newChar.scenarios = logLine + "\n" + newChar.scenarios;
    }

    // 2. 詳細データリスト (scenarioList) - こちらはID管理可能
    if (!newChar.scenarioList) newChar.scenarioList = [];
    const listIdx = newChar.scenarioList.findIndex(item => item.scenarioId === sId);
    
    const listItem = {
        scenarioId: sId,
        title: sData.title,
        date: sData.date,
        gm: sData.gm,
        system: sData.system,
        desc: `Role: ${roleKey.toUpperCase()}\nResult: ${resText}\nSAN: ${myResult.san || '-'}\nGrow: ${myResult.grow || '-'}\nMemo: ${myResult.memo || ''}`
    };

    if (listIdx >= 0) {
        newChar.scenarioList[listIdx] = listItem; // 更新
    } else {
        newChar.scenarioList.push(listItem); // 追加
    }

    // 3. テキスト追記ヘルパー
    const appendText = (field, header, content) => {
        if (!content) return;
        const current = newChar[field] || "";
        const entry = `[${header}] ${content}`;
        // 簡易的な重複チェック
        if (!current.includes(content)) {
            newChar[field] = current + (current ? "\n\n" : "") + entry;
        }
    };

    // 4. 各種項目への反映
    // 成長
    if (myResult.grow) appendText('growth', sData.title, myResult.grow);
    
    // AF (呪文欄に追記)
    if (myResult.art && myResult.art.name) {
        appendText('spells', `AF:${sData.title}`, `${myResult.art.name}: ${myResult.art.desc}`);
    }
    
    // 後遺症 (設定・メモ欄等に追記。ここでは roleplay(設定) 欄を想定)
    if (myResult.seq && myResult.seq.name) {
        appendText('txtRoleplay', `後遺症:${sData.title}`, `${myResult.seq.name}: ${myResult.seq.desc}`);
    }

    return newChar;
}