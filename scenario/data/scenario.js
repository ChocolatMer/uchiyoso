// --- START OF FILE data/scenario.js ---

/**
 * HTMLフォームの入力値から、Firestore保存用のオブジェクトを作成する
 * @param {Object} input - フォーム入力値のまとまり
 * @param {string} userId - 保存実行者のUID
 */
export function createScenarioRecord(input, userId) {
    return {
        userId: userId,
        // createdAtは新規作成時のみfirestore.js側か呼び出し元で付与推奨だが、ここではデータ構造として定義
        // update時は削除される想定
        
        title: input.title,
        count: input.count || "", // セッション回数

        // Page 1 Metadata
        system: input.system,
        type: input.type,
        gm: input.gm,
        endName: input.endName,
        date: input.date,
        tags: input.tags,
        
        // 検索用IDリスト
        members: input.members || [],

        // 詳細メタデータ
        meta: {
            system: input.meta?.system || "",
            type: input.meta?.type || "",
            duration: input.meta?.duration || "",
            stage: input.meta?.stage || "",
            charRel: input.meta?.charRel || "",
            lostRate: input.meta?.lostRate || "",
            skills: input.meta?.skills || "",
            scenType: input.meta?.scenType || ""
        },

        // PC Data (Color情報含む)
        pcData: {
            id: input.pcData.id,
            pl: input.pcData.pl,
            color: input.pcData.color, // テーマカラー保存
            san: input.pcData.san,
            grow: input.pcData.grow,
            memo: input.pcData.memo,
            quote: input.pcData.quote,
            res: input.pcData.res,
            art: input.pcData.art || { name: "", desc: "" },
            seq: input.pcData.seq || { name: "", desc: "" },
            ins: input.pcData.ins || { type: "", desc: "" }
        },

        // KPC Data
        kpcData: {
            id: input.kpcData.id,
            pl: input.kpcData.pl,
            color: input.kpcData.color,
            san: input.kpcData.san,
            grow: input.kpcData.grow,
            memo: input.kpcData.memo,
            quote: input.kpcData.quote,
            res: input.kpcData.res,
            art: input.kpcData.art || { name: "", desc: "" },
            seq: input.kpcData.seq || { name: "", desc: "" },
            ins: input.kpcData.ins || { type: "", desc: "" }
        },

        // 共通情報
        urls: input.urls || { shop: "", room: "" },
        overview: input.overview || "",
        introduction: input.introduction || "",
        warnings: input.warnings || "",
        memos: input.memos || { public: "", secret: "" },
        
        images: input.images || { trailer: "", scenTrailer: "" }
    };
}

/**
 * シナリオログの内容をキャラクターデータ（経歴・所持品・成長）に同期させるためのデータを作成する
 * ※ 実際にFirestoreに保存するのは呼び出し元の役割
 */
export function syncScenarioToCharacter(charData, sData, sId, role) {
    const newChar = JSON.parse(JSON.stringify(charData)); // Deep Copy
    const myData = (role === 'PC') ? sData.pcData : sData.kpcData;
    
    // ログ一行生成
    const logLine = `[${sData.title}] ${myData.res} - ${sData.endName || 'End'} (${sData.date})`;
    
    // 1. 簡易履歴 (scenarios string)
    if(!newChar.scenarios) newChar.scenarios = "";
    // 重複防止：既に同じタイトルのログがあるかチェック（簡易的）
    // 編集時は追記しない方が安全なため、呼び出し元で制御推奨だが、ここでは追記ロジックのみ記述
    newChar.scenarios = logLine + "\n" + newChar.scenarios;

    // 2. 詳細リスト (scenarioList array)
    if(!newChar.scenarioList) newChar.scenarioList = [];
    
    // 既存の同じIDのエントリがあれば更新、なければ追加
    const existingIndex = newChar.scenarioList.findIndex(item => item.scenarioId === sId);
    const listEntry = {
        scenarioId: sId,
        title: sData.title,
        date: sData.date,
        desc: `Role: ${role}\nResult: ${myData.res}\nSAN: ${myData.san}\nGrow: ${myData.grow}\nMemo: ${myData.memo}`
    };

    if (existingIndex >= 0) {
        newChar.scenarioList[existingIndex] = listEntry;
    } else {
        newChar.scenarioList.push(listEntry);
    }

    // 3. 成長・AF・後遺症 (追記型)
    // 編集モードの場合、これらを二重に追加してしまうリスクがあるため、
    // 「追記」は新規作成時のみに行うのが一般的。ここではデータを返すだけにする。
    
    if(myData.grow) {
        const growth = newChar.growth || "";
        newChar.growth = growth + (growth?"\n":"") + `[${sData.title}] ${myData.grow}`;
    }
    if(myData.art && myData.art.name) {
        const sp = newChar.spells || "";
        newChar.spells = sp + (sp?"\n":"") + `[AF:${sData.title}] ${myData.art.name}: ${myData.art.desc}`;
    }
    if(myData.seq && myData.seq.name) {
        const rp = newChar.txtRoleplay || ""; // 備考やRP設定欄などを利用
        newChar.txtRoleplay = rp + (rp?"\n":"") + `[後遺症:${sData.title}] ${myData.seq.name}: ${myData.seq.desc}`;
    }

    return newChar;
}