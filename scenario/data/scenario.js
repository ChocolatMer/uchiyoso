// --- uchiyoso/scenario/data/scenario.js ---

/**
 * HTMLフォームの入力値オブジェクトから、保存用のデータ構造を作成する
 */
export function createScenarioRecord(input, userId) {
    return {
        userId: userId,
        createdAt: new Date().toISOString(), // 上書き時は firestore.js で updatedAt が更新される
        
        // 基本情報
        title: input.title,
        count: input.count,
        system: input.system,
        type: input.type,
        gm: input.gm,
        endName: input.endName,
        date: input.date,
        tags: input.tags,
        
        // 検索用メンバーID配列
        members: input.members || [],

        // 詳細設定 (Overview Tab)
        meta: input.meta || {},
        urls: input.urls || {},
        overview: input.overview || "", 
        introduction: input.introduction || "",
        warnings: input.warnings || "",
        memos: { 
            public: input.public, 
            secret: input.secret 
        },
        images: input.images || {},

        // PC個別データ (Result, SAN, Memo etc)
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
        
        // KPC個別データ
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
        }
    };
}

/**
 * シナリオデータを元に、キャラクターデータを更新して新しいデータを返す
 * (テキストエリアへの追記処理)
 */
export function syncScenarioToCharacter(charData, sData, sId, role) {
    const newChar = JSON.parse(JSON.stringify(charData));
    const myData = (role === 'PC') ? sData.pcData : sData.kpcData;
    
    // 簡易履歴の一行を作成
    // Format: [Title] Alive - EndTitle (Date)
    const logLine = `[${sData.title}] ${myData.res} - ${sData.endName || 'End'} (${sData.date})`;
    
    if(!newChar.scenarios) newChar.scenarios = "";
    // 先頭に追加
    newChar.scenarios = logLine + "\n" + newChar.scenarios;

    // 構造化リストへの追加
    if(!newChar.scenarioList) newChar.scenarioList = [];
    newChar.scenarioList.push({
        scenarioId: sId,
        title: sData.title,
        desc: `Role: ${role}\nResult: ${myData.res}\nSAN: ${myData.san}\nGrow: ${myData.grow}\nMemo: ${myData.memo}`
    });

    // 成長、AF、後遺症のテキスト追記
    if(myData.grow) {
        const growth = newChar.growth || "";
        newChar.growth = growth + (growth?"\n":"") + `[${sData.title}] ${myData.grow}`;
    }
    
    if(myData.art && myData.art.name) {
        const sp = newChar.spells || "";
        newChar.spells = sp + (sp?"\n":"") + `[AF:${sData.title}] ${myData.art.name}: ${myData.art.desc}`;
    }
    
    if(myData.seq && myData.seq.name) {
        const rp = newChar.txtRoleplay || "";
        newChar.txtRoleplay = rp + (rp?"\n":"") + `[後遺症:${sData.title}] ${myData.seq.name}: ${myData.seq.desc}`;
    }

    return newChar;
}