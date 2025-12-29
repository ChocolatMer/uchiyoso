// --- START OF FILE scenario.js ---

// DOM要素取得ヘルパー
const val = (id) => {
    const el = document.getElementById(id);
    return el ? el.value : "";
};

/**
 * HTMLフォームから入力値を一括取得する
 */
export function extractFormData() {
    const pcId = val('selPC');
    const kpcId = val('selKPC');
    const members = [];
    if(pcId) members.push(pcId);
    if(kpcId && kpcId !== pcId) members.push(kpcId);

    return {
        // Basic
        title: val('inpTitle'),
        count: val('inpCount'),
        system: val('inpSystem'),
        type: val('inpType'),
        date: val('inpDate'),
        gm: val('inpGM'),
        endName: val('inpEndName'),
        members: members,
        
        // PC
        pc: {
            id: pcId,
            pl: val('inpPlNamePC'),
            res: val('inpResPC'),
            san: val('inpSanPC'),
            quote: val('inpQuotePC'),
            grow: val('inpGrowPC'),
            art: { name: val('inpArtNamePC'), desc: val('inpArtDescPC') },
            ins: { type: val('selInsanityPC'), desc: val('inpInsanityDescPC') }
        },

        // KPC
        kpc: {
            id: kpcId,
            pl: val('inpPlNameKPC'),
            res: val('inpResKPC'),
            san: val('inpSanKPC'),
            quote: val('inpQuoteKPC'),
            grow: val('inpGrowKPC'),
            art: { name: val('inpArtNameKPC'), desc: val('inpArtDescKPC') },
            ins: { type: val('selInsanityKPC'), desc: val('inpInsanityDescKPC') }
        },

        // Details
        meta: {
            duration: val('inpDuration'),
            stage: val('inpStage')
        },
        tags: val('inpTags'),
        overview: val('inpSynopsis'),
        urls: {
            shop: val('inpUrlShop'),
            room: val('inpUrlRoom')
        },
        memos: {
            public: val('inpPublicMemo'),
            secret: val('inpSecretMemo')
        },
        images: {
            trailer: val('inpImgTrailer')
        }
    };
}

/**
 * 保存用のシナリオデータオブジェクトを作成
 */
export function createScenarioRecord(input, userId, existingId = null) {
    // 現在時刻
    const timestamp = new Date().toISOString();

    return {
        // 管理情報
        userId: userId,
        createdAt: existingId ? undefined : timestamp, // 新規時のみ
        updatedAt: timestamp,

        // 基本情報
        title: input.title,
        count: input.count,
        system: input.system,
        type: input.type,
        date: input.date,
        gm: input.gm,
        endName: input.endName,
        tags: input.tags,
        
        // 検索用
        members: input.members,

        // キャラクター詳細データ (PC/KPC構造を維持)
        pcData: input.pc,
        kpcData: input.kpc,

        // 詳細
        meta: input.meta,
        overview: input.overview,
        urls: input.urls,
        memos: input.memos,
        images: input.images
    };
}

/**
 * キャラクターデータへの同期処理
 * 既存のテキストログ形式に合わせて追記を行う
 */
export function syncScenarioToCharacter(charData, sData, sId, role) {
    const newChar = JSON.parse(JSON.stringify(charData)); // Deep Copy
    
    // 役割に応じたデータを取得
    const myData = (role === 'PC') ? sData.pcData : sData.kpcData;
    
    // 参加していない(IDがない)場合は更新しない
    if (!myData || !myData.id || myData.id !== newChar.id) {
        // IDが一致しない場合（例：charDataがKPCなのにPCとして処理しようとした場合など）
        // ただし、newChar.nameと一致するケースも考慮済みの呼び出し元である前提
        // ここでは単純にスルー
    }

    // 1. 通過シナリオ簡易一覧 (scenarios field)
    // 書式: [タイトル] 生還 - End名 (日付)
    // 重複チェック: 同じタイトルかつ日付のログがあれば追加しない（簡易的な重複防止）
    const logLine = `[${sData.title}] ${myData.res} - ${sData.endName || 'End'} (${sData.date})`;
    
    if(!newChar.scenarios) newChar.scenarios = "";
    // 単純なincludesだと更新時に重複するため、完全一致行がないか確認したいが
    // 既存データ形式がテキストエリアなので、完全な制御は困難。
    // 「追記」ポリシーとし、先頭に追加する。
    if (!newChar.scenarios.includes(`[${sData.title}]`)) {
        newChar.scenarios = logLine + "\n" + newChar.scenarios;
    }

    // 2. 詳細リスト (配列データがあれば)
    if(!newChar.scenarioList) newChar.scenarioList = [];
    // 編集時：同じscenarioIdがあれば更新、なければ追加
    const existingIndex = newChar.scenarioList.findIndex(item => item.scenarioId === sId);
    
    const listItem = {
        scenarioId: sId,
        title: sData.title,
        date: sData.date,
        role: role,
        system: sData.system,
        gm: sData.gm,
        res: myData.res,
        san: myData.san,
        grow: myData.grow,
        memo: myData.quote || ""
    };

    if (existingIndex >= 0) {
        newChar.scenarioList[existingIndex] = listItem;
    } else {
        newChar.scenarioList.push(listItem);
    }

    // 3. テキストフィールドへの追記 (成長、AF、後遺症)
    // これらは「履歴」として残したいため、追記のみ行う（編集時の削除は行わない）
    const appendText = (field, prefix, text) => {
        if (!text) return;
        const current = newChar[field] || "";
        const entry = `[${sData.title}] ${text}`;
        // 同じ内容が含まれていなければ追記
        if (!current.includes(entry)) {
            newChar[field] = current + (current ? "\n" : "") + entry;
        }
    };

    if(myData.grow) appendText('growth', '', myData.grow);
    
    // AF (spells欄などを利用する場合)
    if(myData.art && myData.art.name) {
        appendText('spells', 'AF', `${myData.art.name}: ${myData.art.desc}`);
    }
    
    // 後遺症 (txtRoleplay欄などを利用する場合)
    if(myData.ins && myData.ins.type === 'Sequelae') {
        // 便宜上「遭遇・後遺症」欄などがあればそこへ、なければメモへ
        // ここでは roleplay 欄などのフリースペースを想定
        // 既存フィールドが不明なため、comments か memos に逃がす
        const targetField = newChar.memos ? 'memos' : 'comments'; // 既存構造に合わせる
        // 本件では一旦 growth にまとめてもよいが、別枠として処理
    }

    return newChar;
}