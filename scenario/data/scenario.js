// --- ChocolatMer/uchiyoso/scenario/data/scenario.js ---

/**
 * フォーム入力値からFirestore保存用オブジェクトを生成
 */
export function createScenarioRecord(input, userId) {
    return {
        userId: userId,
        updatedAt: new Date().toISOString(),
        // 新規作成時はcreatedAtが必要だが、register.html側で制御またはFirestoreのサーバタイムスタンプを利用推奨
        // ここでは単純化のため現在時刻を入れる運用とする（更新時は既存のcreatedAtを維持するロジックが必要だが、今回は上書き更新前提）
        createdAt: input.createdAt || new Date().toISOString(),

        title: input.title,
        count: input.count,
        system: input.system,
        type: input.type,
        gm: input.gm,
        endName: input.endName,
        date: input.date,
        tags: input.tags,
        
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

        members: input.members || [],
        
        pcData: input.pcData,   
        kpcData: input.kpcData,
        
        urls: input.urls,
        overview: input.overview, 
        introduction: input.introduction,
        warnings: input.warnings,
        memos: {
            public: input.public,
            secret: input.secret
        },
        images: input.images
    };
}

/**
 * Firestoreデータをフォーム用オブジェクトに変換 (編集用)
 */
export function mapScenarioToForm(sData) {
    return {
        // 管理用
        id: sData.id,
        createdAt: sData.createdAt,

        title: sData.title || "",
        count: sData.count || 1,
        system: sData.system || "CoC6",
        type: sData.type || "タイマン",
        gm: sData.gm || "",
        endName: sData.endName || "",
        date: sData.date || "",
        tags: sData.tags || "",

        metaSystem: sData.meta?.system || "CoC6",
        metaType: sData.meta?.type || "タイマン",
        duration: sData.meta?.duration || "",
        stage: sData.meta?.stage || "",
        charRel: sData.meta?.charRel || "",
        lostRate: sData.meta?.lostRate || "",
        recSkills: sData.meta?.skills || "",
        scenType: sData.meta?.scenType || "",

        // PC
        pcId: sData.pcData?.id || "",
        plNamePC: sData.pcData?.pl || "",
        resPC: sData.pcData?.res || "Alive",
        sanPC: sData.pcData?.san || "",
        quotePC: sData.pcData?.quote || "",
        growPC: sData.pcData?.grow || "",
        memoPC: sData.pcData?.memo || "",
        artNamePC: sData.pcData?.art?.name || "",
        artDescPC: sData.pcData?.art?.desc || "",
        seqNamePC: sData.pcData?.seq?.name || "",
        seqDescPC: sData.pcData?.seq?.desc || "",
        insTypePC: sData.pcData?.ins?.type || "",
        insDescPC: sData.pcData?.ins?.desc || "",

        // KPC
        kpcId: sData.kpcData?.id || "",
        plNameKPC: sData.kpcData?.pl || "",
        resKPC: sData.kpcData?.res || "Alive",
        sanKPC: sData.kpcData?.san || "",
        quoteKPC: sData.kpcData?.quote || "",
        growKPC: sData.kpcData?.grow || "",
        memoKPC: sData.kpcData?.memo || "",
        artNameKPC: sData.kpcData?.art?.name || "",
        artDescKPC: sData.kpcData?.art?.desc || "",
        seqNameKPC: sData.kpcData?.seq?.name || "",
        seqDescKPC: sData.kpcData?.seq?.desc || "",
        insTypeKPC: sData.kpcData?.ins?.type || "",
        insDescKPC: sData.kpcData?.ins?.desc || "",

        urlShop: sData.urls?.shop || "",
        urlRoom: sData.urls?.room || "",
        synopsis: sData.overview || "",
        intro: sData.introduction || "",
        warnings: sData.warnings || "",
        publicMemo: sData.memos?.public || "",
        secretMemo: sData.memos?.secret || "",
        
        imgTrailer: sData.images?.trailer || "",
        imgScnTrailer: sData.images?.scenTrailer || ""
    };
}

/**
 * キャラクターシートへのデータ同期（追記）
 */
export function syncScenarioToCharacter(charData, sData, sId, role) {
    // 既存データを破壊しないようディープコピー
    const newChar = JSON.parse(JSON.stringify(charData));
    const myData = (role === 'PC') ? sData.pcData : sData.kpcData;
    
    if (!myData || !myData.id) return newChar;

    const resText = (myData.res === 'Alive') ? '生還' : (myData.res === 'Lost' ? 'ロスト' : myData.res);
    const endStr = sData.endName ? ` - ${sData.endName}` : '';
    const dateStr = sData.date ? `(${sData.date})` : '';

    // 1. 簡易履歴 (scenarios string)
    // 重複チェックを行い、存在しなければ追記
    const logLine = `[${sData.title}] ${resText}${endStr} ${dateStr}`;
    if (!newChar.scenarios) newChar.scenarios = "";
    if (!newChar.scenarios.includes(logLine)) {
        newChar.scenarios = logLine + "\n" + newChar.scenarios;
    }

    // 2. 詳細履歴リスト (scenarioList array)
    if (!newChar.scenarioList) newChar.scenarioList = [];
    const listItem = {
        scenarioId: sId,
        title: sData.title,
        role: role,
        date: sData.date,
        system: sData.system,
        gm: sData.gm,
        result: resText,
        san: myData.san,
        memo: myData.memo
    };

    // IDで既存エントリを探して更新、なければ追加
    const existingIndex = newChar.scenarioList.findIndex(item => item.scenarioId === sId);
    if (existingIndex >= 0) {
        newChar.scenarioList[existingIndex] = listItem;
    } else {
        newChar.scenarioList.push(listItem);
    }

    // 3. テキストフィールドへの追記 (Growth, Spells, etc)
    // 単純追記（重複チェック付き）
    const appendUnique = (field, text) => {
        if (!text) return;
        const current = newChar[field] || "";
        if (!current.includes(text)) {
            newChar[field] = current + (current ? "\n" : "") + text;
        }
    };

    if (myData.grow) appendUnique('growth', `[${sData.title}] ${myData.grow}`);
    
    if (myData.art && myData.art.name) {
        appendUnique('spells', `[AF:${sData.title}] ${myData.art.name}: ${myData.art.desc}`);
    }
    
    if (myData.seq && myData.seq.name) {
        // 後遺症はメモあるいはロールプレイ指針欄へ
        appendUnique('txtRoleplay', `[後遺症:${sData.title}] ${myData.seq.name}: ${myData.seq.desc}`);
    }

    if (myData.ins && myData.ins.type) {
        appendUnique('memo', `[狂気:${sData.title}] ${myData.ins.type}: ${myData.ins.desc}`);
    }

    return newChar;
}