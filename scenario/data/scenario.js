// --- START OF FILE scenario/data/scenario.js ---

/**
 * フォームの入力値から、保存用のシナリオデータオブジェクトを作成する
 */
export function createScenarioRecord(input, userId) {
    return {
        userId: userId,
        // 日付情報はFirestore側でServerTimestampも使うが、表示用に保持
        title: input.title,
        count: input.count, // 何回目のセッションか

        // Page 1 Metadata
        system: input.system,
        type: input.type,
        gm: input.gm,
        endName: input.endName,
        date: input.date,
        tags: input.tags,
        
        // 検索用メンバーIDリスト
        members: input.members || [],

        // Page 2: Meta Details
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

        // 参加キャラクターごとの詳細データ (PC/KPC)
        // IDをキーにするのではなく、役割(PC/KPC)固定で保存するスタイル
        pcData: {
            id: input.pcId,
            pl: input.plNamePC,
            res: input.pcRes,
            san: input.pcSan,
            grow: input.pcGrow,
            memo: input.pcMemo,
            quote: input.pcQuote,
            art: { name: input.pcArtName, desc: input.pcArtDesc },
            seq: { name: input.pcSeqName, desc: input.pcSeqDesc },
            ins: { type: input.pcInsType, desc: input.pcInsDesc }
        },
        kpcData: {
            id: input.kpcId,
            pl: input.plNameKPC,
            res: input.kpcRes,
            san: input.kpcSan,
            grow: input.kpcGrow,
            memo: input.kpcMemo,
            quote: input.kpcQuote,
            art: { name: input.kpcArtName, desc: input.kpcArtDesc },
            seq: { name: input.kpcSeqName, desc: input.kpcSeqDesc },
            ins: { type: input.kpcInsType, desc: input.kpcInsDesc }
        },

        // その他
        urls: { shop: input.urls.shop, room: input.urls.room },
        overview: input.overview,
        introduction: input.introduction,
        warnings: input.warnings,
        memos: { public: input.public, secret: input.secret },
        images: {
            trailer: input.images.trailer,
            scenTrailer: input.images.scenTrailer
        }
    };
}

/**
 * キャラクターデータにシナリオ履歴を追記する
 * ※編集(上書き)の場合は二重登録を防ぐ簡易チェックを入れる
 */
export function syncScenarioToCharacter(charData, sData, sId, role) {
    const newChar = JSON.parse(JSON.stringify(charData));
    const myData = (role === 'PC') ? sData.pcData : sData.kpcData;
    
    // ログ一行テキスト
    const logLine = `[${sData.title}] ${myData.res} - ${sData.endName || 'End'} (${sData.date})`;
    
    // 1. 簡易リスト (scenarios string)
    // 重複チェック: 完全一致する行があれば追加しない
    if (!newChar.scenarios) newChar.scenarios = "";
    if (!newChar.scenarios.includes(logLine)) {
        newChar.scenarios = logLine + "\n" + newChar.scenarios;
    }

    // 2. 詳細リスト (scenarioList array)
    if (!newChar.scenarioList) newChar.scenarioList = [];
    // IDで検索して、既存なら更新、なければ追加
    const existingIndex = newChar.scenarioList.findIndex(item => item.scenarioId === sId);
    
    const listItem = {
        scenarioId: sId,
        title: sData.title,
        date: sData.date,
        desc: `Role: ${role} / Result: ${myData.res}\nSAN: ${myData.san}\nGrow: ${myData.grow}\nMemo: ${myData.memo}`
    };

    if (existingIndex >= 0) {
        newChar.scenarioList[existingIndex] = listItem;
    } else {
        newChar.scenarioList.push(listItem);
    }

    // 3. 呪文/AF/後遺症/成長 (これらは追記型なので、編集時は注意が必要だが、今回は単純追記とする)
    // ※高度な制御が必要ならUUID等を各項目に振る必要がある
    const appendIfNew = (field, prefix, content) => {
        if(!content) return;
        const entry = `[${prefix}:${sData.title}] ${content}`;
        const current = newChar[field] || "";
        // 単純な文字列チェックでの重複排除
        if(!current.includes(entry)) {
            newChar[field] = current + (current ? "\n" : "") + entry;
        }
    };

    if(myData.grow) appendIfNew('growth', '成長', myData.grow);
    if(myData.art.name) appendIfNew('spells', 'AF', `${myData.art.name}: ${myData.art.desc}`);
    if(myData.seq.name) appendIfNew('txtRoleplay', '後遺症', `${myData.seq.name}: ${myData.seq.desc}`);

    return newChar;
}