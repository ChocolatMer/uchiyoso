// Init Data
let characters = [
    { id: 'me', name: '自分', type: 'me', icon: '', defaultIcon: '' },
    { id: 'char1', name: '鱸', type: 'other', icon: '../images/icons/lineicon-syu.png', defaultIcon: 'images/icons/lineicon-syu.png' },
    { id: 'char2', name: 'Yua', type: 'other', icon: '../images/icons/lineicon-yua.png', defaultIcon: 'images/icons/lineicon-yua.png' },
    { id: 'char3', name: '天空', type: 'other', icon: '../images/icons/lineicon-sora.png', defaultIcon: 'images/icons/lineicon-sora.png' },
    { id: 'char4', name: '雨蓮', type: 'other', icon: '../images/icons/lineicon-uren.png', defaultIcon: 'images/icons/lineicon-uren.png' },
];

let state = { 
    selectedCharId: 'me', 
    mode: 'call', 
    selectedStickerSrc: '',
    isHeaderLocked: false,
    isGroupMode: false,
    uploadedPhotoSrc: '' 
};

const randomEmojis = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐙'];

function init() { 
    renderCharList(); 
    updateTime();
    updateTabUI(); 
    setInterval(updateTime, 1000);
    // 初期ヘッダー名同期
    const headerNameEl = document.getElementById('header-name');
    if(headerNameEl) {
        document.getElementById('header-name-input').value = headerNameEl.innerText;
    }
}

function updateTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    const el = document.getElementById('sb-time');
    if (document.activeElement !== el && el) {
        el.innerText = timeStr;
    }
}

// --- Character Logic ---
function renderCharList() {
    const container = document.getElementById('char-list');
    if(!container) return;
    container.innerHTML = '';
    characters.forEach(char => {
        const isSelected = char.id === state.selectedCharId;
        const div = document.createElement('div');
        div.className = `cursor-pointer flex flex-col items-center min-w-[50px] transition ${isSelected ? 'scale-110 opacity-100' : 'opacity-60'}`;
        
        div.onclick = () => { 
            state.selectedCharId = char.id; 
            renderCharList(); 
            if(char.type === 'other' && !state.isHeaderLocked) {
                const newName = state.isGroupMode ? `${char.name} (2)` : char.name;
                const headerNameEl = document.getElementById('header-name');
                if(headerNameEl) headerNameEl.innerText = newName;
                document.getElementById('header-name-input').value = newName;
            }
        };
        
        let iconHtml;
        const isEmoji = char.icon && !char.icon.includes('/') && !char.icon.includes('data:image');
        
        if (char.type === 'me') {
            iconHtml = `<div class="w-12 h-12 rounded-full bg-green-500 border-2 border-white flex items-center justify-center text-white text-[10px] shadow font-bold">自分</div>`;
        } else if (isEmoji) {
            iconHtml = `<div class="w-12 h-12 rounded-full bg-white border-2 border-white flex items-center justify-center text-2xl shadow">${char.icon}</div>`;
        } else {
            iconHtml = `<img src="${char.icon}" onerror="this.src='https://placehold.co/100x100/gray/white?text=${char.name.charAt(0)}'" class="w-12 h-12 rounded-full border-2 border-white shadow object-cover">`;
        }
        div.innerHTML = `${iconHtml}<span class="text-[9px] text-gray-500 mt-1 font-bold truncate max-w-[50px]">${char.name}</span>`;
        container.appendChild(div);
    });

    const curChar = characters.find(c => c.id === state.selectedCharId);
    const charNameEl = document.getElementById('editing-char-name');
    if(charNameEl) charNameEl.innerText = `設定中: ${curChar.name}`;
    
    const editPanel = document.getElementById('char-edit-panel');
    if(editPanel) {
        if(curChar.type === 'me') {
            editPanel.classList.add('opacity-50', 'pointer-events-none');
        } else {
            editPanel.classList.remove('opacity-50', 'pointer-events-none');
        }
    }
}

function addNewCharacter() {
    const name = prompt("キャラクターの名前を入力してください:", "新キャラ");
    if (!name) return;
    const randomEmoji = randomEmojis[Math.floor(Math.random() * randomEmojis.length)];
    characters.push({ id: 'char' + Date.now(), name: name, type: 'other', icon: randomEmoji, defaultIcon: randomEmoji });
    renderCharList();
}

const charIconUpload = document.getElementById('char-icon-upload');
if(charIconUpload) {
    charIconUpload.addEventListener('change', function(e) {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) { updateCharIcon(e.target.result); }
            reader.readAsDataURL(e.target.files[0]);
        }
    });
}

function updateCharIcon(newIcon) {
    const index = characters.findIndex(c => c.id === state.selectedCharId);
    if(index > -1 && characters[index].type !== 'me') {
        characters[index].icon = newIcon;
        renderCharList();
    }
}

function resetCharIcon() {
    const index = characters.findIndex(c => c.id === state.selectedCharId);
    if(index > -1 && characters[index].type !== 'me') {
        const char = characters[index];
        if (char.defaultIcon && char.defaultIcon !== '') {
            char.icon = char.defaultIcon;
        } else {
            char.icon = `https://placehold.co/100x100/gray/white?text=${char.name.charAt(0)}`;
        }
        renderCharList();
    }
}

// --- Settings Logic ---
function toggleHeaderLock() {
    state.isHeaderLocked = !state.isHeaderLocked;
    const btn = document.getElementById('lock-header-btn');
    const icon = document.getElementById('lock-icon');
    if(state.isHeaderLocked) {
        btn.classList.add('text-blue-500', 'border-blue-500');
        icon.className = 'fa-solid fa-lock';
    } else {
        btn.classList.remove('text-blue-500', 'border-blue-500');
        icon.className = 'fa-solid fa-lock-open';
    }
}

function syncHeaderName(val) { 
    const el = document.getElementById('header-name');
    if(el) el.innerText = val; 
}

function toggleGroupMode() {
    const checkbox = document.getElementById('group-mode-toggle');
    state.isGroupMode = checkbox.checked;
    const headerNameEl = document.getElementById('header-name');
    const currentName = headerNameEl.innerText.split('(')[0].trim();
    const countWrapper = document.getElementById('read-count-wrapper');

    if(state.isGroupMode) {
        headerNameEl.innerText = `${currentName} (3)`;
        document.getElementById('header-name-input').value = headerNameEl.innerText;
        countWrapper.classList.remove('hidden');
    } else {
        headerNameEl.innerText = currentName;
        document.getElementById('header-name-input').value = headerNameEl.innerText;
        countWrapper.classList.add('hidden');
    }
}

// --- Mode Switching (Tab Toggle) ---
function toggleMode(mode) {
    if (state.mode === mode) {
        state.mode = 'text';
    } else {
        state.mode = mode;
    }
    updateTabUI();
}

function updateTabUI() {
    ['sticker', 'call', 'photo'].forEach(m => {
        const btn = document.getElementById(`tab-${m}`);
        const area = document.getElementById(`input-${m}-area`);
        
        if (m === state.mode) {
            btn?.classList.remove('tab-inactive');
            btn?.classList.add('tab-active');
            if(area) area.style.display = 'block';
        } else {
            btn?.classList.remove('tab-active');
            btn?.classList.add('tab-inactive');
            if(area) area.style.display = 'none';
        }
    });

    // Update Main Button Text based on Tab
    const btn = document.getElementById('send-btn');
    if(!btn) return;

    if (state.mode === 'sticker') {
        btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> スタンプ送信';
        btn.className = "w-full bg-gradient-to-r from-green-400 to-green-500 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl transition transform active:scale-95 flex items-center justify-center gap-2";
    }
    else if (state.mode === 'photo') {
        btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> 画像送信';
        btn.className = "w-full bg-gradient-to-r from-green-400 to-green-500 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl transition transform active:scale-95 flex items-center justify-center gap-2";
    }
    else if (state.mode === 'call') {
        btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> 通話履歴追加';
        btn.className = "w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl transition transform active:scale-95 flex items-center justify-center gap-2";
    }
    else {
        btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> 送信';
        btn.className = "w-full bg-gradient-to-r from-gray-500 to-gray-600 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl transition transform active:scale-95 flex items-center justify-center gap-2";
    }
}

function selectSticker(imgEl) {
    document.querySelectorAll('#input-sticker-area img').forEach(img => img.classList.remove('border-green-500'));
    imgEl.classList.add('border-green-500');
    state.selectedStickerSrc = imgEl.src;
}

const stickerUpload = document.getElementById('sticker-upload');
if(stickerUpload) {
    stickerUpload.addEventListener('change', function(e) {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                state.selectedStickerSrc = e.target.result;
                alert("スタンプ画像を読み込みました");
            }
            reader.readAsDataURL(e.target.files[0]);
        }
    });
}

const photoUpload = document.getElementById('photo-upload');
if(photoUpload) {
    photoUpload.addEventListener('change', function(e) {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) { state.uploadedPhotoSrc = e.target.result; }
            reader.readAsDataURL(e.target.files[0]);
        }
    });
}

function addDate(label) {
    if(!label) return;
    const container = document.getElementById('capture-area');
    const div = document.createElement('div');
    // クラス date-row を追加
    div.className = "flex justify-center my-3 relative z-10 date-row";
    div.innerHTML = `<span class="bg-black/10 text-white text-[11px] px-3 py-1 rounded-full cursor-text date-label" contenteditable="true">${label}</span>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function addSystemMsg(label) {
    if(!label) return;
    const container = document.getElementById('capture-area');
    const div = document.createElement('div');
    // クラス system-msg-row を追加
    div.className = "flex justify-center my-1 relative z-10 system-msg-row";
    div.innerHTML = `<span class="text-white text-[11px] px-2 py-0.5 cursor-text opacity-70 system-msg-text" style="text-shadow:0 1px 1px rgba(0,0,0,0.2)" contenteditable="true">${label}</span>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

// --- Text Sender ---
function sendTextMsg() {
    const container = document.getElementById('capture-area');
    const char = characters.find(c => c.id === state.selectedCharId);
    const isMe = char.type === 'me';
    const timeStr = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });

    const msgInput = document.getElementById('message-input');
    const text = msgInput.value.trim().replace(/\n/g, '<br>');
    if (!text) return;

    // Reply Check
    const replyCheck = document.getElementById('reply-check');
    const isReply = replyCheck ? replyCheck.checked : false;
    let finalHtml = text;
    if(isReply) {
        finalHtml = `<span class="reply-block" contenteditable="false">Reply to...</span>${text}`;
        if(replyCheck) replyCheck.checked = false; 
    }
    
    // Logic for continuous messages
    let bubbleClass = isMe ? 'bubble-right' : 'bubble-left';
    const children = Array.from(container.children);
    const lastMsgRow = children.reverse().find(el => el.classList.contains('message-row'));
    
    if (lastMsgRow && lastMsgRow.dataset.senderId === char.id) {
        bubbleClass += ' no-tail';
    }

    const contentHtml = `<div class="bubble ${bubbleClass}" contenteditable="true">${finalHtml}</div>`;
    msgInput.value = '';

    appendMessage(isMe, contentHtml, char, timeStr);
}

// --- Tab Content Sender ---
function addToChat() {
    if(state.mode === 'text') {
        sendTextMsg();
        return;
    }

    const char = characters.find(c => c.id === state.selectedCharId);
    const isMe = char.type === 'me';
    const timeStr = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    
    let contentHtml = '';
    
    if (state.mode === 'sticker') {
        if (!state.selectedStickerSrc) return;
        contentHtml = `<img src="${state.selectedStickerSrc}" class="rounded-lg max-w-[150px] relative z-10">`;
    }
    else if (state.mode === 'photo') {
        if (!state.uploadedPhotoSrc) { alert('写真を選択してください'); return; }
        contentHtml = `<img src="${state.uploadedPhotoSrc}" class="photo-msg relative z-10">`;
    }
    else if (state.mode === 'call') {
        const status = document.getElementById('call-status').value;
        const duration = document.getElementById('call-duration').value;
        
        if (status === 'active') {
            contentHtml = `
                <div class="call-active-widget flex items-center justify-between z-10">
                        <div class="flex items-center gap-3 z-10">
                        <div class="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center animate-pulse">
                            <i class="fa-solid fa-phone text-white"></i>
                        </div>
                        <div>
                            <div class="text-white text-xs font-bold" contenteditable="true">通話中</div>
                            <div class="text-white/80 text-[10px]" contenteditable="true">${duration}</div>
                        </div>
                        </div>
                </div>`;
        } else {
            let iconClass = ''; let title = '';
            let durationHtml = `<div class="text-[10px] opacity-70" contenteditable="true">${duration}</div>`;

            if (status === 'voice') {
                iconClass = 'fa-solid fa-phone'; title = '音声通話';
            } 
            else if (status === 'cancel') {
                iconClass = 'fa-solid fa-phone-slash'; title = 'キャンセル';
                durationHtml = '';
            } 
            else if (status === 'noanswer') {
                iconClass = 'fa-solid fa-phone-slash'; title = '応答なし';
                durationHtml = '';
            }
            const sideClass = isMe ? 'right' : 'left';

            contentHtml = `
                <div class="call-history-bubble ${sideClass}">
                    <div class="call-icon-circle"><i class="${iconClass}"></i></div>
                    <div class="flex flex-col justify-center">
                        <div class="text-sm font-bold leading-tight" contenteditable="true">${title}</div>
                        ${durationHtml}
                    </div>
                </div>`;
        }
    }

    appendMessage(isMe, contentHtml, char, timeStr);
}

function appendMessage(isMe, contentHtml, char, timeStr) {
    const container = document.getElementById('capture-area');
    const msgRow = document.createElement('div');
    
    msgRow.className = isMe ? "flex justify-end items-end gap-1 mb-1 group relative z-10 message-row" : "flex justify-start items-end gap-2 mb-1 group relative z-10 message-row";
    msgRow.setAttribute('data-sender-id', char.id);

    let readLabel = "既読";
    if (state.isGroupMode) {
        const countVal = document.getElementById('read-count-val').value;
        readLabel = `既読 ${countVal}`;
    }

    const isCallActive = contentHtml.includes('call-active-widget');

    if (isMe) {
            if(isCallActive) {
                msgRow.innerHTML = `${contentHtml}`;
        } else {
            msgRow.innerHTML = `
                <div class="flex flex-col items-end min-w-[30px] text-right pb-1">
                    <span class="meta-text text-[10px] text-white mb-[1px] cursor-pointer" contenteditable="true">${readLabel}</span>
                    <span class="meta-text text-[10px] text-white/80 cursor-pointer" contenteditable="true">${timeStr}</span>
                </div>
                <div class="bubble-wrapper">${contentHtml}</div>
            `;
        }
    } else {
        const isEmoji = char.icon && !char.icon.includes('/') && !char.icon.includes('data:image');
        const iconHtml = isEmoji 
            ? `<div class="w-12 h-12 rounded-full bg-white border border-gray-300 flex items-center justify-center text-2xl mb-auto shrink-0">${char.icon}</div>`
            : `<img src="${char.icon}" onerror="this.src='https://placehold.co/100x100/gray/white?text=${char.name.charAt(0)}'" class="w-12 h-12 rounded-full mb-auto border border-gray-300 bg-white object-cover shrink-0">`;

            if(isCallActive) {
                msgRow.innerHTML = `
                ${iconHtml}
                <div>
                        <div class="flex items-end gap-1 bubble-wrapper">
                        ${contentHtml}
                    </div>
                </div>`;
        } else {
            msgRow.innerHTML = `
                ${iconHtml}
                <div>
                    <div class="flex items-end gap-1 bubble-wrapper">
                        ${contentHtml}
                        <div class="flex flex-col justify-end min-w-[30px] ml-1 pb-1">
                            <span class="meta-text text-[10px] text-white/80 cursor-pointer" contenteditable="true">${timeStr}</span>
                        </div>
                    </div>
                </div>
            `;
        }
    }
    container.appendChild(msgRow);
    container.scrollTop = container.scrollHeight;
}

function undoLast() {
    const container = document.getElementById('capture-area');
    const children = Array.from(container.children);
    const lastMsg = children.reverse().find(el => el.id !== 'bg-overlay-layer');
    if (lastMsg) container.removeChild(lastMsg);
}

// --- Background & Save ---
const bgUpload = document.getElementById('bg-upload');
if(bgUpload) {
    bgUpload.addEventListener('change', function(e) {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) { document.getElementById('capture-area').style.backgroundImage = `url(${e.target.result})`; }
            reader.readAsDataURL(e.target.files[0]);
        }
    });
}

const bgOpacity = document.getElementById('bg-opacity');
if(bgOpacity) {
    bgOpacity.addEventListener('input', function(e) {
        document.getElementById('bg-overlay-layer').style.backgroundColor = `rgba(0,0,0,${e.target.value})`;
    });
}

function resetBg() { document.getElementById('capture-area').style.backgroundImage = 'none'; }

function saveProjectData() {
    const captureArea = document.getElementById('capture-area');
    const data = {
        characters: characters,
        htmlContent: captureArea.innerHTML,
        backgroundStyle: captureArea.style.backgroundImage,
        overlayColor: document.getElementById('bg-overlay-layer').style.backgroundColor
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
    const link = document.createElement('a');
    link.setAttribute("href", dataStr);
    link.setAttribute("download", `sns_project_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    link.remove();
}

const jsonUpload = document.getElementById('json-upload');
if(jsonUpload) {
    jsonUpload.addEventListener('change', function(e) {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = JSON.parse(e.target.result);
                    if(data.characters) { characters = data.characters; renderCharList(); }
                    if(data.htmlContent) { document.getElementById('capture-area').innerHTML = data.htmlContent; }
                    if(data.backgroundStyle) { document.getElementById('capture-area').style.backgroundImage = data.backgroundStyle; }
                    if(data.overlayColor) { document.getElementById('bg-overlay-layer').style.backgroundColor = data.overlayColor; }
                    alert("データ読込完了");
                } catch(err) { alert("読込エラー"); }
            }
            reader.readAsText(e.target.files[0]);
        }
    });
}

init();