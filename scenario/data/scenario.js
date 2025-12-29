/**
 * HTMLフォームの入力値から保存用データオブジェクトを生成する
 */
export function createScenarioRecord(input, userId) {
    return {
        userId: userId,
        // createdAtは新規作成時のみFirestore側または呼び出し元で付与推奨だが、ここでは保持
        // update時は上書きされないように注意
        
        title: input.title,
        count: input.count, // 何回目のセッションか

        // Page 1 Metadata
        system: input.system,
        type: input.type,
        gm: input.gm,
        endName: input.endName,
        date: input.date,
        tags: input.tags,
        
        // 検索用メンバーID配列
        members: input.members || [],

        // Page 2 Scenario Metadata (Detailed)
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

        // PC Data structure
        pcData: { 
            id: input.pcData.id, 
            pl: input.pcData.pl, 
            san: input.pcData.san, 
            grow: input.pcData.grow, 
            memo: input.pcData.memo, 
            quote: input.pcData.quote,
            res: input.pcData.res,
            art: input.pcData.art || { name:"", desc:"" },
            seq: input.pcData.seq || { name:"", desc:"" },
            ins: input.pcData.ins || { type:"", desc:"" }
        },
        
        // KPC Data structure
        kpcData: { 
            id: input.kpcData.id, 
            pl: input.kpcData.pl, 
            san: input.kpcData.san, 
            grow: input.kpcData.grow, 
            memo: input.kpcData.memo, 
            quote: input.kpcData.quote,
            res: input.kpcData.res,
            art: input.kpcData.art || { name:"", desc:"" },
            seq: input.kpcData.seq || { name:"", desc:"" },
            ins: input.kpcData.ins || { type:"", desc:"" }
        },

        urls: input.urls || { shop: "", room: "" },
        overview: input.overview, 
        introduction: input.introduction,
        warnings: input.warnings,
        memos: input.memos || { public: "", secret: "" },
        
        images: input.images || { trailer: "", scenTrailer: "" }
    };
}

/**
 * キャラクターシートにシナリオログを追記/同期するためのデータ生成
 * (既存のロジックを踏襲)
 */
export function syncScenarioToCharacter(charData, sData, sId, role) {
    const newChar = JSON.parse(JSON.stringify(charData));
    const myData = (role === 'PC') ? sData.pcData : sData.kpcData;
    
    // 簡易履歴 (TextArea)
    const logLine = `[${sData.title}] ${myData.res} - ${sData.endName || 'End'} (${sData.date})`;
    if(!newChar.scenarios) newChar.scenarios = "";
    
    // 重複チェック: 同じIDのログが既に処理されているか確認するのは難しいが、
    // 単純な追記ロジックとしては「先頭に追加」
    // ※編集保存の場合、重複して追記されるリスクがあるため、
    // 本格的には `scenarioList` を正として再構築するのが望ましいが、
    // ここでは簡易的に「既存リストにあれば更新、なければ追加」とする。

    if(!newChar.scenarioList) newChar.scenarioList = [];
    
    const listIndex = newChar.scenarioList.findIndex(item => item.scenarioId === sId);
    
    const listItem = {
        scenarioId: sId,
        title: sData.title,
        desc: `Role: ${role}\nResult: ${myData.res}\nSAN: ${myData.san}\nGrow: ${myData.grow}\nMemo: ${myData.memo}`
    };

    if (listIndex >= 0) {
        // 更新
        newChar.scenarioList[listIndex] = listItem;
        // テキストエリア系は編集が難しいため、今回は「新規保存時のみ追記」または「追記し続ける」仕様とする
        // (ユーザー要件により、既存項目は消さない)
    } else {
        // 新規追加
        newChar.scenarioList.push(listItem);
        newChar.scenarios = logLine + "\n" + newChar.scenarios;
        
        // テキストエリアへの追記
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
    }

    return newChar;
}