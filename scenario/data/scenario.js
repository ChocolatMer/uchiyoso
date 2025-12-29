// --- data/scenario.js ---

/**
 * フォームの入力値から、保存用のシナリオデータを作成する
 */
export function createScenarioRecord(input, userId) {
    return {
        userId: userId,
        createdAt: new Date().toISOString(), // 新規作成時はこれを使用、更新時はfirestore側でupdatedAt更新
        
        // --- 1. Report Face (基本情報) ---
        title: input.title,
        count: input.count,
        system: input.system,
        type: input.type,
        gm: input.gm,
        endName: input.endName,
        date: input.date,
        tags: input.tags,
        
        // 検索用インデックス
        members: input.members || [],

        // --- 2. Record (詳細結果) ---
        // PCデータ
        pcData: {
            id: input.pcId,
            pl: input.plNamePC,
            res: input.pcRes,     // Alive/Lost
            san: input.pcSan,     // SAN推移
            quote: input.pcQuote, // 名台詞
            grow: input.pcGrow,   // 成長
            memo: input.pcMemo,   // 感想
            // 詳細(AF/後遺症/狂気)
            art: { name: input.pcArtName, desc: input.pcArtDesc },
            seq: { name: input.pcSeqName, desc: input.pcSeqDesc },
            ins: { type: input.pcInsType, desc: input.pcInsDesc }
        },
        // KPCデータ
        kpcData: {
            id: input.kpcId,
            pl: input.plNameKPC,
            res: input.kpcRes,
            san: input.kpcSan,
            quote: input.kpcQuote,
            grow: input.kpcGrow,
            memo: input.kpcMemo,
            art: { name: input.kpcArtName, desc: input.kpcArtDesc },
            seq: { name: input.kpcSeqName, desc: input.kpcSeqDesc },
            ins: { type: input.kpcInsType, desc: input.kpcInsDesc }
        },

        // --- 3. Scenario Overview (シナリオ詳細) ---
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
        urls: input.urls || {},
        overview: input.overview,      // あらすじ
        introduction: input.introduction, // 導入
        warnings: input.warnings,      // 注意事項
        
        // --- 4. Memos & Images ---
        memos: { 
            public: input.public, 
            secret: input.secret 
        },
        images: input.images || {}
    };
}

/**
 * シナリオデータをキャラクターデータに反映（計算のみ）
 */
export function syncScenarioToCharacter(charData, sData, sId, role) {
    // 元データをコピー
    const newChar = JSON.parse(JSON.stringify(charData));
    const myData = (role === 'PC') ? sData.pcData : sData.kpcData;
    
    // --- 1. 簡易履歴 (Header用) ---
    // 書式: [タイトル] 生還 - End名 (日付)
    const resStr = (myData.res === 'Alive') ? '生還' : (myData.res === 'Lost' ? 'ロスト' : myData.res);
    const logLine = `[${sData.title}] ${resStr} - ${sData.endName || 'End'} (${sData.date})`;
    
    if(!newChar.scenarios) newChar.scenarios = "";
    // 重複防止（簡易チェック）
    if(!newChar.scenarios.includes(`[${sData.title}]`)) {
        newChar.scenarios = logLine + "\n" + newChar.scenarios;
    }

    // --- 2. 構造化リスト (scenarioList) ---
    if(!newChar.scenarioList) newChar.scenarioList = [];
    // 既存のIDがあれば更新、なければ追加
    const existingIdx = newChar.scenarioList.findIndex(item => item.scenarioId === sId);
    
    const listItem = {
        scenarioId: sId,
        title: sData.title,
        date: sData.date,
        gm: sData.gm,
        role: role,
        result: resStr,
        desc: `SAN: ${myData.san}\n成長: ${myData.grow || 'なし'}\n${myData.memo || ''}`
    };

    if(existingIdx >= 0) {
        newChar.scenarioList[existingIdx] = listItem;
    } else {
        newChar.scenarioList.push(listItem);
        // 日付順ソートなどは表示側で行うため、ここでは単純追加
    }

    // --- 3. テキスト追記 (成長/AF/後遺症) ---
    // ここは「追記」が基本だが、編集時の重複を防ぐのは難しいため、
    // 「保存時に毎回追記される」仕様であることをユーザーに意識させるか、
    // 単純な追記に留めるのが安全です。今回は単純追記にします。
    
    if(myData.grow) {
        const growth = newChar.growth || "";
        const entry = `[${sData.title}] ${myData.grow}`;
        if(!growth.includes(entry)) newChar.growth = growth + (growth?"\n":"") + entry;
    }
    
    if(myData.art.name) {
        const sp = newChar.spells || "";
        const entry = `[AF:${sData.title}] ${myData.art.name}: ${myData.art.desc}`;
        if(!sp.includes(myData.art.name)) newChar.spells = sp + (sp?"\n":"") + entry;
    }
    
    if(myData.seq.name) {
        const rp = newChar.txtRoleplay || ""; // 備考欄などを後遺症置き場として利用
        const entry = `[後遺症:${sData.title}] ${myData.seq.name}: ${myData.seq.desc}`;
        if(!rp.includes(myData.seq.name)) newChar.txtRoleplay = rp + (rp?"\n":"") + entry;
    }

    return newChar;
}