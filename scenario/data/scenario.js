// --- uchiyoso/character/data/scenario.js ---

/**
 * フォームの入力値から、保存用のシナリオデータを作成する
 * @param {Object} input - HTMLフォームからの入力値オブジェクト
 * @param {string} userId - ログイン中のユーザーID
 * @param {string|null} existingId - 編集モード時のシナリオID (新規ならnull)
 */
export function createScenarioRecord(input, userId, existingId = null) {
    const timestamp = new Date().toISOString();

    const record = {
        // 管理情報
        userId: userId,
        updatedAt: timestamp, // 更新日時は常に最新

        // 基本情報
        title: input.title,
        count: input.count, // セッション回数等
        
        // Page 1 Metadata
        system: input.system,
        type: input.type,
        gm: input.gm,
        endName: input.endName,
        date: input.date,
        tags: input.tags,
        
        // 検索用: 参加キャラクターIDリスト
        members: input.members || [],

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

        urls: { shop: input.urls.shop, room: input.urls.room },
        overview: input.overview, 
        introduction: input.introduction,
        warnings: input.warnings,
        memos: { public: input.public, secret: input.secret },
        images: input.images || {}
    };

    // 新規作成時のみ作成日を入れる
    if (!existingId) {
        record.createdAt = timestamp;
    }

    return record;
}

/**
 * シナリオデータを元に、キャラクターデータを更新して新しいデータを返す
 * ※編集モードの場合、既存のログが重複しないように制御します
 * 
 * @param {Object} charData - 元のキャラクターデータ
 * @param {Object} sData - 保存するシナリオデータ
 * @param {string} sId - シナリオID
 * @param {string} role - 'PC' or 'KPC'
 */
export function syncScenarioToCharacter(charData, sData, sId, role) {
    // 元のデータを壊さないようにコピー
    const newChar = JSON.parse(JSON.stringify(charData));
    const myData = (role === 'PC') ? sData.pcData : sData.kpcData;
    
    // 参加していない(ID紐づけなし)場合は何もしない
    if (!myData.id) return newChar;

    // --- 1. 簡易一覧 (scenarios string) ---
    // ※文字列追記型のため、過去ログの厳密な編集は難しいが、
    // 重複を避ける簡易的なチェックを行う
    const logLineBody = `] ${myData.res}`; // タイトル以外の部分一致用
    
    const resultStr = myData.res === 'Alive' ? '生還' : (myData.res === 'Lost' ? 'ロスト' : myData.res);
    const endStr = sData.endName ? ` - ${sData.endName}` : '';
    const dateStr = sData.date ? `(${sData.date})` : '';
    const newHistoryLine = `[${sData.title}] ${resultStr}${endStr} ${dateStr}`;

    if (!newChar.scenarios) newChar.scenarios = "";
    
    // 既に同じタイトルのログがあるか確認（完全一致チェックは難しいので、あくまで簡易的な重複防止）
    // 編集時は「追記」しない方針とする（古いログを消すのはリスクが高いため）
    if (!newChar.scenarios.includes(newHistoryLine)) {
        // 先頭に追加
        newChar.scenarios = newHistoryLine + "\n" + newChar.scenarios;
    }

    // --- 2. 詳細シナリオログ (配列) ---
    if (!newChar.scenarioList) newChar.scenarioList = [];
    
    // 既存のIDがあれば更新、なければ追加
    const existingIndex = newChar.scenarioList.findIndex(item => item.scenarioId === sId);
    
    const listItem = {
        scenarioId: sId,
        title: sData.title,
        date: sData.date,
        desc: `Role: ${role}\nGM: ${sData.gm}\nResult: ${resultStr}${endStr}\nSAN: ${myData.san || '-'}\nGrow: ${myData.grow || 'なし'}`
    };

    if (existingIndex >= 0) {
        newChar.scenarioList[existingIndex] = listItem;
    } else {
        newChar.scenarioList.push(listItem);
    }

    // ヘルパー: テキストエリアへの追記（重複チェック付き）
    const appendToField = (fieldKey, header, content) => {
        if (!content) return;
        const current = newChar[fieldKey] || "";
        const entryHeader = `[${header}]`;
        
        // 既にこのシナリオの記述が含まれているか簡易チェック
        // (編集機能を入れる場合、ここを厳密にするのは難易度が高いため、
        //  「既にタイトルが含まれていれば追記しない」安全策を取る)
        if(current.includes(entryHeader)) {
            // 既に記載があるので何もしない（手動編集されたものを上書きしないため）
            return;
        }
        
        const entry = `${entryHeader} ${content}`;
        newChar[fieldKey] = current + (current ? "\n\n" : "") + entry;
    };

    // --- 3. 各種テキストフィールドへの追記 ---
    // 編集時は「追記」を行わない（二重書き込み防止）
    // 新規作成かどうかのフラグがないため、scenarioListの存在チェックで代用
    const isUpdate = (existingIndex >= 0);

    if (!isUpdate) {
        if(myData.grow) appendToField('growth', sData.title, myData.grow);
        
        if(myData.art.name) {
             // 呪文・AF欄
             const content = `${myData.art.name}: ${myData.art.desc}`;
             appendToField('spells', `AF:${sData.title}`, content);
        }
        
        if(myData.seq.name) {
            // 後遺症はメモやRoleplay欄へ
            const content = `${myData.seq.name}: ${myData.seq.desc}`;
            // 適切なフィールドが無ければ txtRoleplay か memos を使う
            const targetField = newChar.txtRoleplay ? 'txtRoleplay' : 'memos';
            appendToField(targetField, `後遺症:${sData.title}`, content);
        }

        // 報酬(所持品)
        // input.rewards は今回のUIにはないが、将来用
        if (sData.rewards && sData.rewards.items) {
            if (!newChar.items) newChar.items = [];
            newChar.items.push({
                name: "獲得報酬", 
                desc: `[${sData.title}] ${sData.rewards.items}`
            });
        }
    }

    return newChar;
}