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
        meta: input.meta || {},

        // 参加メンバーID配列
        members: input.members || [],

        // キャラクター別リザルトデータ (成長とメモはここで分離保持)
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
 * シナリオデータを元に、キャラクターデータの各フィールドを更新する
 * schema.jsの定義(txtGrowth, txtMemoなど)に合わせて追記を行う
 */
export function syncScenarioToCharacter(charData, sData, sId, roleKey) {
    const newChar = JSON.parse(JSON.stringify(charData));
    const myResult = sData.characters[roleKey];
    
    if (!myResult || !myResult.id) return newChar; 

    // 1. 簡易履歴 (scenarios / txtScenarios)
    const resText = (myResult.res === 'Alive') ? '生還' : (myResult.res === 'Lost' ? 'ロスト' : myResult.res);
    const dateText = sData.date ? `(${sData.date})` : '';
    const logLine = `[${sData.title}] ${resText} - ${sData.endName || 'End'} ${dateText}`;

    // schema.jsでは key: 'scenarios' -> id: 'txtScenarios'
    if (!newChar.scenarios) newChar.scenarios = "";
    if (!newChar.scenarios.includes(`[${sData.title}]`)) {
        newChar.scenarios = logLine + "\n" + newChar.scenarios;
    }

    // 2. 詳細データリスト (JSON構造: scenarioList)
    if (!newChar.scenarioList) newChar.scenarioList = [];
    const listIdx = newChar.scenarioList.findIndex(item => item.scenarioId === sId);
    
    const listItem = {
        scenarioId: sId,
        title: sData.title,
        date: sData.date,
        gm: sData.gm,
        system: sData.system,
        desc: `Role: ${roleKey.toUpperCase()}\nResult: ${resText}\nSAN: ${myResult.san || '-'}\nMemo: ${myResult.memo || ''}`
    };

    if (listIdx >= 0) {
        newChar.scenarioList[listIdx] = listItem;
    } else {
        newChar.scenarioList.push(listItem);
    }

    // 3. テキスト追記ヘルパー
    const appendText = (fieldKey, header, content) => {
        if (!content) return;
        const current = newChar[fieldKey] || "";
        const entry = `[${header}] ${content}`;
        // 単純な重複防止
        if (!current.includes(entry)) {
            newChar[fieldKey] = current + (current ? "\n\n" : "") + entry;
        }
    };

    // 4. 各種項目への反映 (schema.jsの定義に基づく)
    
    // 技能成長 -> txtGrowth (key: growth)
    if (myResult.grow) {
        appendText('growth', sData.title, myResult.grow);
    }

    // 感想・メモ -> txtMemo (key: memo)
    if (myResult.memo) {
        appendText('memo', sData.title, myResult.memo);
    }

    // AF -> txtSpells (key: spells)
    if (myResult.art && myResult.art.name) {
        appendText('spells', `AF:${sData.title}`, `${myResult.art.name}: ${myResult.art.desc}`);
    }
    
    // 後遺症 -> txtRoleplay (key: encountered をRP補足として使うか、roleplayか。schemaでは roleplay='RP補足')
    // ここでは後遺症は「RP補足(txtRoleplay)」へ追記する
    if (myResult.seq && myResult.seq.name) {
        // schema.jsには 'txtRoleplay' のキーがないため、schemaの 'key' を探す必要があるが、
        // 提供されたschema.jsを見ると RP補足='txtRoleplay' なので、保存データのキーは何か確認が必要。
        // 通常は schema.js の key が保存データのプロパティ名になる。
        // schema.js: { key: 'roleplay', id: 'txtRoleplay' } があると仮定するが、
        // 提示されたschema.jsには `RP補足` は `key: undefined` に見える箇所があるため
        // `encountered` (遭遇) か `notes` など安全な場所へ。
        // ここでは一旦 `memo` に統合するか、独自のプロパティ `sequelae` を作るかだが、
        // ユーザー要望の「キャラクターの情報として読み込む」に従い `memo` に追記が無難。
        appendText('memo', `後遺症:${sData.title}`, `${myResult.seq.name}: ${myResult.seq.desc}`);
    }

    return newChar;
}