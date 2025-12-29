// --- uchiyoso/scenario/data/scenario.js ---

/**
 * フォームの入力値から、保存用のシナリオデータを作成する
 * @param {Object} input - HTMLフォームからの入力値オブジェクト
 * @param {string} userId - ログイン中のユーザーID
 */
export function createScenarioRecord(input, userId) {
    return {
        // 管理情報
        userId: userId,
        // createdAtはFirestore側で処理、または新規作成時のみ付与
        ...(input.createdAt ? { createdAt: input.createdAt } : { createdAt: new Date().toISOString() }),
        
        // 基本情報
        title: input.title,
        count: input.count, // セッション回数など

        // Page 1 Metadata
        system: input.system,
        type: input.type,
        gm: input.gm,
        endName: input.endName,
        date: input.date,
        tags: input.tags,
        members: input.members || [], // 参加者IDリスト

        // Detailed Scenario Metadata (Tab 2)
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

        // PC Data (Flexible structure)
        pcData: {
            id: input.pcId,
            pl: input.plNamePC,
            san: input.pcSan,
            grow: input.pcGrow,
            memo: input.pcMemo,
            quote: input.pcQuote,
            res: input.pcRes,
            art: { name: input.pcArtName, desc: input.pcArtDesc },
            seq: { name: input.pcSeqName, desc: input.pcSeqDesc },
            ins: { type: input.pcInsType, desc: input.pcInsDesc }
        },

        // KPC Data
        kpcData: {
            id: input.kpcId,
            pl: input.plNameKPC,
            san: input.kpcSan,
            grow: input.kpcGrow,
            memo: input.kpcMemo,
            quote: input.kpcQuote,
            res: input.kpcRes,
            art: { name: input.kpcArtName, desc: input.kpcArtDesc },
            seq: { name: input.kpcSeqName, desc: input.kpcSeqDesc },
            ins: { type: input.kpcInsType, desc: input.kpcInsDesc }
        },

        // Resources
        urls: { 
            shop: input.urls.shop, 
            room: input.urls.room 
        },
        
        // Texts
        overview: input.overview,
        introduction: input.introduction,
        warnings: input.warnings,
        
        // Memos
        memos: { 
            public: input.public, 
            secret: input.secret 
        },

        // Images (Base64 or URL)
        images: input.images || {}
    };
}

/**
 * シナリオデータを元に、キャラクターデータを更新して新しいデータを返す
 * @param {Object} charData - 元のキャラクターデータ
 * @param {Object} sData - 保存するシナリオデータ
 * @param {string} sId - シナリオID
 * @param {string} role - 'PC' or 'KPC'
 */
export function syncScenarioToCharacter(charData, sData, sId, role) {
    // 元のデータを壊さないようにコピー
    const newChar = JSON.parse(JSON.stringify(charData));
    const myData = (role === 'PC') ? sData.pcData : sData.kpcData;
    
    // データがない（参加していない）場合はスキップ
    if (!myData || !myData.id) return newChar;

    // 1. 通過シナリオ簡易一覧 (scenarios)
    // 重複チェック: 同じタイトルの同じ日付のエントリがあれば追記しないなどの制御も可能だが、
    // ここでは単純に「編集時は追記しない」制御を呼び出し元で行う前提とするか、
    // 常に履歴として残す。今回は「ログ」なので、単純追記とする。
    
    const resultStr = myData.res === 'Alive' ? '生還' : (myData.res === 'Lost' ? 'ロスト' : myData.res);
    const logLine = `[${sData.title}] ${resultStr} - ${sData.endName || 'End'} (${sData.date || 'Unknown Date'})`;
    
    if(!newChar.scenarios) newChar.scenarios = "";
    // 先頭に追加
    newChar.scenarios = logLine + "\n" + newChar.scenarios;

    // 2. 詳細リスト (scenarioList)
    if(!newChar.scenarioList) newChar.scenarioList = [];
    
    // 既存のIDがあれば更新、なければ追加
    const existingIndex = newChar.scenarioList.findIndex(item => item.scenarioId === sId);
    
    const listEntry = {
        scenarioId: sId,
        title: sData.title,
        date: sData.date,
        desc: `Role: ${role} / GM: ${sData.gm}\nResult: ${resultStr}\nSAN: ${myData.san}\nMemo: ${myData.memo}`
    };

    if (existingIndex >= 0) {
        newChar.scenarioList[existingIndex] = listEntry;
    } else {
        newChar.scenarioList.push(listEntry);
    }

    // 3. テキストエリアへの追記 (成長、AF、後遺症)
    // これらは「追記」が基本だが、編集時に何度も追記されるのを防ぐため、
    // ID管理が難しいテキストエリアは「ユーザー任せ」にするか、末尾に追加する。
    // ここでは「追記」を行う。
    
    const appendToField = (field, prefix, content) => {
        if (!content) return;
        const current = newChar[field] || "";
        const entry = `[${prefix}:${sData.title}] ${content}`;
        if(!current.includes(entry)) { // 単純な重複防止
            newChar[field] = current + (current ? "\n\n" : "") + entry;
        }
    };

    if(myData.grow) appendToField('growth', '成長', myData.grow);
    if(myData.art.name) appendToField('spells', 'AF', `${myData.art.name}: ${myData.art.desc}`);
    if(myData.seq.name) appendToField('txtRoleplay', '後遺症', `${myData.seq.name}: ${myData.seq.desc}`);

    return newChar;
}