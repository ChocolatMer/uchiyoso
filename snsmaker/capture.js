// --- CAPTURE & ALIGNMENT LOGIC ---

function adjustTextPosition(clonedDoc) {
    // 1. TEXT BUBBLES
    const bubbles = clonedDoc.querySelectorAll('.bubble');
    bubbles.forEach(b => {
        b.style.alignItems = 'flex-start';
        b.style.paddingTop = '1px';
        b.style.paddingBottom = '15px';
        b.style.lineHeight = '1.2';
        b.style.transform = 'none';
    });

    // 2. DATE LABELS
    const dateRows = clonedDoc.querySelectorAll('.date-row');
    dateRows.forEach(row => {
        row.style.marginTop = '2px';
        // 【修正箇所】日付ラベルの下マージンをなくして詰める
        row.style.marginBottom = '0px'; 
    });

    const dateLabels = clonedDoc.querySelectorAll('.date-label');
    dateLabels.forEach(l => {
        l.style.display = 'inline-flex';
        l.style.alignItems = 'center'; 
        l.style.justifyContent = 'center';
        // 文字ズレ補正のためにpaddingBottomがあるため、実体の高さが広がっている
        l.style.paddingTop = '0px';
        l.style.paddingBottom = '10px'; 
        l.style.transform = 'translateY(-6px)'; 
    });

    // 3. SYSTEM MESSAGES (Spacing Adjustment)
    const sysRows = clonedDoc.querySelectorAll('.system-msg-row');
    sysRows.forEach(row => {
        // 【修正箇所】日付ラベルの実体が広がっている分、強力に上に引き上げる
        row.style.marginTop = '-15px'; 
        // 下マージンは適度に確保
        row.style.marginBottom = '10px'; 
    });

    // 4. ICONS
    const icons = clonedDoc.querySelectorAll('.chat-area-container img.w-12');
    icons.forEach(icon => {
        icon.style.transform = 'translateY(-5px)';
    });
    
    // 5. CALL ICONS
    const callIcons = clonedDoc.querySelectorAll('.call-icon-circle i, .call-active-widget i');
    callIcons.forEach(icon => {
        icon.style.transform = 'translateY(-8px)'; 
    });

    // 6. CALL TEXT
    const callTexts = clonedDoc.querySelectorAll(
        '.call-history-bubble .font-bold, ' + 
        '.call-history-bubble .opacity-70, ' +
        '.call-active-widget .font-bold'
    );
    callTexts.forEach(el => {
        el.style.position = 'relative';
        el.style.top = '-6px'; 
    });
    
    try {
        const durationTexts = clonedDoc.querySelectorAll('.call-active-widget .text-\\[10px\\]');
        durationTexts.forEach(el => {
            el.style.position = 'relative';
            el.style.top = '-6px';
        });
    } catch(e) { console.log('Duration selector error', e); }

    // 7. META TEXT (READ/TIME)
    const metaTexts = clonedDoc.querySelectorAll('.meta-text');
    metaTexts.forEach(m => {
        m.style.position = 'relative';
        m.style.top = '-6px'; 
        m.style.display = 'inline-block';
    });

    // 8. FOOTER
    const footerIcons = clonedDoc.querySelectorAll('.footer-icon, .fa-face-smile');
    footerIcons.forEach(el => {
        el.style.position = 'relative';
        el.style.top = '-8px'; 
    });
}

function downloadPhoneView() {
    const target = document.querySelector('.phone-frame');
    html2canvas(target, { 
        scale: 3, 
        backgroundColor: null, 
        useCORS: true, 
        allowTaint: false,
        scrollX: 0, 
        scrollY: 0,
        imageTimeout: 15000,
        onclone: (clonedDoc) => {
            adjustTextPosition(clonedDoc);
        }

    }).then(canvas => {
        const link = document.createElement('a');
        link.download = `SNS_PHONE_${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }).catch(err => {
        console.error(err);
        alert("保存に失敗しました。");
    });
}

function downloadScreenShot() {
    const target = document.querySelector('.phone-frame');
    
    html2canvas(target, { 
        scale: 3, 
        backgroundColor: null, 
        useCORS: true, 
        allowTaint: false,
        scrollX: 0, 
        scrollY: 0,
        imageTimeout: 15000,
        onclone: (clonedDoc) => {
            adjustTextPosition(clonedDoc);

            const clonedFrame = clonedDoc.querySelector('.phone-frame');
            clonedFrame.style.border = 'none';
            clonedFrame.style.borderRadius = '0';
            clonedFrame.style.boxShadow = 'none';
            
            const notch = clonedDoc.querySelector('.notch');
            if(notch) notch.style.display = 'none';
        }
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = `SNS_SCREEN_${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }).catch(err => {
        console.error(err);
        alert("保存に失敗しました。");
    });
}

function downloadFullChat() {
    const target = document.getElementById('capture-area');
    html2canvas(target, {
        backgroundColor: null,
        scale: 3, 
        useCORS: true, 
        allowTaint: false,
        scrollX: 0, 
        scrollY: 0,
        height: target.scrollHeight, 
        windowHeight: target.scrollHeight, 
        imageTimeout: 15000,
        onclone: (clonedDoc) => {
            const clonedNode = clonedDoc.getElementById('capture-area');
            if (clonedNode) {
                clonedNode.style.height = 'auto';
                clonedNode.style.overflow = 'visible';
                clonedNode.style.position = 'static';
            }
            adjustTextPosition(clonedDoc);
        }
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = `SNS_FULLCHAT_${Date.now()}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    }).catch(err => {
        console.error(err);
        alert("保存に失敗しました。");
    });
}