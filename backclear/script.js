// Global State
let originalImg = null;
let originalData = null; 
let manualMaskData = null; 
let floodFillMask = null;
let currentTool = 'pan';
let dropperTarget = 'bg'; 
let targetRGB = { r: 0, g: 255, b: 0 };

let scale = 1;
let panX = 0, panY = 0;
let isDragging = false;
let dragStart = {x:0, y:0};
let lastPos = null;
let rectStart = null;
let rectCurrent = null;
let wandPoint = null; 

// Slice Feature
let isSliceMode = false;
let sliceLinesX = [];
let sliceLinesY = [];
let draggingLine = null;

let historyStack = [];
let historyIndex = -1;
// メモリ保護のため履歴数を減らす
const MAX_HISTORY = 10; 

let isLongPress = false;
let pressTimer;

const canvas = document.getElementById('mainCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const wrapper = document.getElementById('canvasWrapper');
const container = document.getElementById('canvasContainer');
const overlayMsg = document.getElementById('overlayMsg');
const loading = document.getElementById('loadingOverlay');
const loadingText = document.getElementById('loadingText');

window.onload = function() {
    setTool('pan');
    
    const bgBtn = document.getElementById('customBgBtn');
    const bgInput = document.getElementById('customBgInput');
    
    bgBtn.addEventListener('pointerdown', (e) => {
        isLongPress = false;
        pressTimer = setTimeout(() => { 
            isLongPress = true; 
            bgInput.click(); 
        }, 1000); 
    });
    bgBtn.addEventListener('pointerup', () => {
        clearTimeout(pressTimer);
        if (!isLongPress) setCanvasBg('custom'); 
    });
    bgBtn.addEventListener('pointerleave', () => { clearTimeout(pressTimer); });

    bgInput.addEventListener('input', (e) => {
        bgBtn.style.background = e.target.value;
        setCanvasBg('custom');
    });

    container.addEventListener('dragover', e => { e.preventDefault(); container.style.background = '#eef'; });
    container.addEventListener('dragleave', e => { e.preventDefault(); setCanvasBg('checker'); });
    container.addEventListener('drop', e => {
        e.preventDefault();
        if(e.dataTransfer.files[0]) handleFileSelect({files: e.dataTransfer.files});
    });
    
    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('wheel', onWheel, {passive:false});
};

function handleFileSelect(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() { initImage(img); }
            img.src = e.target.result;
        }
        reader.readAsDataURL(input.files[0]);
    }
}

function initImage(img) {
    originalImg = img;
    canvas.width = img.width;
    canvas.height = img.height;
    const tCtx = document.createElement('canvas').getContext('2d');
    tCtx.canvas.width = img.width; tCtx.canvas.height = img.height;
    tCtx.drawImage(img, 0, 0);
    originalData = tCtx.getImageData(0, 0, img.width, img.height).data;
    manualMaskData = new Uint8Array(img.width * img.height).fill(100);
    floodFillMask = null;
    wandPoint = null;
    sliceLinesX = []; sliceLinesY = [];
    
    isSliceMode = false;
    document.getElementById('sliceModeToggle').checked = false;
    toggleSliceMode();

    document.getElementById('downloadBtn').disabled = false;
    document.getElementById('autoCutBtn').disabled = false;
    overlayMsg.style.display = 'none';
    resetParams();
    
    historyStack = [];
    historyIndex = -1;
    saveHistory();

    fitImage();
    runProcess();
    setTool('pan');
}

function fitImage() {
    const rect = container.getBoundingClientRect();
    const margin = 60; 
    const sc = Math.min((rect.width - margin)/originalImg.width, (rect.height - margin)/originalImg.height);
    scale = Math.min(1, sc);
    panX = (rect.width - originalImg.width*scale)/2;
    panY = (rect.height - originalImg.height*scale)/2;
    updateTransform();
}

function updateTransform() {
    wrapper.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
}

function setTool(tool) {
    if (isSliceMode && tool !== 'pan' && tool !== 'dropper') {
            // Slice mode active
    }

    if(tool === 'dropper_border') {
        currentTool = 'dropper';
        dropperTarget = 'border';
    } else {
        currentTool = tool;
        dropperTarget = 'bg';
    }

    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    if(document.getElementById('btn-'+tool)) document.getElementById('btn-'+tool).classList.add('active');

    wrapper.style.cursor = 'default';
    document.getElementById('eraser-cursor').style.display = 'none';
    document.getElementById('protect-cursor').style.display = 'none';
    
    document.getElementById('eraser-settings').style.display = 'none';
    document.getElementById('wand-settings').style.display = 'none';
    
    if(tool === 'pan') wrapper.style.cursor = 'grab';
    if(tool === 'dropper' || tool === 'dropper_border' || tool === 'rect' || tool === 'crop') wrapper.style.cursor = 'crosshair';
    if(tool === 'wand') {
        wrapper.style.cursor = 'pointer';
        document.getElementById('wand-settings').style.display = 'block';
    }
    if(tool === 'eraser' || tool === 'protect') {
        wrapper.style.cursor = 'none';
        document.getElementById('eraser-settings').style.display = 'block';
        updateCursor(document.getElementById('s-eraser').value);
    }
    
    runProcess(); 
}

// --- Slice & Crop Logic ---
function toggleSliceMode() {
    isSliceMode = document.getElementById('sliceModeToggle').checked;
    const area = document.getElementById('slice-controls-area');
    if(isSliceMode) {
        area.style.opacity = 1;
        area.style.pointerEvents = 'auto';
        if(sliceLinesX.length === 0 && sliceLinesY.length === 0) initGridLines();
    } else {
        area.style.opacity = 0.5;
        area.style.pointerEvents = 'none';
        draggingLine = null;
    }
    runProcess();
}

function initGridLines() {
    if(!originalImg) return;
    const cols = Math.max(1, parseInt(document.getElementById('sliceCols').value));
    const rows = Math.max(1, parseInt(document.getElementById('sliceRows').value));
    const w = canvas.width;
    const h = canvas.height;
    sliceLinesX = [];
    sliceLinesY = [];
    for(let i=1; i<cols; i++) sliceLinesX.push( Math.floor((w/cols)*i) );
    for(let i=1; i<rows; i++) sliceLinesY.push( Math.floor((h/rows)*i) );
    runProcess();
}

function drawGridLines() {
    ctx.save();
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 2/scale;
    ctx.setLineDash([5/scale, 3/scale]);
    for(let x of sliceLinesX) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
    for(let y of sliceLinesY) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.5)'; ctx.strokeRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
}

function checkSliceLineHover(pt) {
    if(!isSliceMode) return null;
    const radius = 10 / scale;
    for(let i=0; i<sliceLinesX.length; i++) { if(Math.abs(pt.x - sliceLinesX[i]) < radius) return { axis: 'x', index: i }; }
    for(let i=0; i<sliceLinesY.length; i++) { if(Math.abs(pt.y - sliceLinesY[i]) < radius) return { axis: 'y', index: i }; }
    return null;
}

function sliceAndZip() {
    if(!originalImg) return;
    showLoading("分割・圧縮中...");
    setTimeout(() => {
        try {
            sliceLinesX.sort((a,b)=>a-b); sliceLinesY.sort((a,b)=>a-b);
            const pointsX = [0, ...sliceLinesX, canvas.width];
            const pointsY = [0, ...sliceLinesY, canvas.height];
            runProcess(false);
            const zip = new JSZip();
            for(let y=0; y<pointsY.length-1; y++) {
                for(let x=0; x<pointsX.length-1; x++) {
                    const sx = pointsX[x], sy = pointsY[y], sw = pointsX[x+1]-sx, sh = pointsY[y+1]-sy;
                    if(sw <=0 || sh <=0) continue;
                    const sCanvas = document.createElement('canvas'); sCanvas.width = sw; sCanvas.height = sh;
                    sCanvas.getContext('2d').putImageData(ctx.getImageData(sx, sy, sw, sh), 0, 0);
                    const base64Data = sCanvas.toDataURL("image/png").replace(/^data:image\/(png|jpg);base64,/, "");
                    zip.file(`slice_${y+1}_${x+1}.png`, base64Data, {base64: true});
                }
            }
            zip.generateAsync({type:"blob"}).then(content => {
                const link = document.createElement('a'); link.download = `chroma_slices_${Date.now()}.zip`; link.href = URL.createObjectURL(content); link.click();
                hideLoading(); runProcess(true);
            });
        } catch(e) { console.error(e); alert("エラーが発生しました"); hideLoading(); runProcess(true); }
    }, 100);
}

function downloadCroppedArea() {
    if(!rectStart || !rectCurrent) return;
    const x1=Math.min(rectStart.x, rectCurrent.x), x2=Math.max(rectStart.x, rectCurrent.x);
    const y1=Math.min(rectStart.y, rectCurrent.y), y2=Math.max(rectStart.y, rectCurrent.y);
    const w = x2 - x1, h = y2 - y1;
    if(w <= 0 || h <= 0) return;
    
    runProcess(false); 
    const tCanvas = document.createElement('canvas'); tCanvas.width = w; tCanvas.height = h;
    tCanvas.getContext('2d').putImageData(ctx.getImageData(x1, y1, w, h), 0, 0);
    
    const link = document.createElement('a'); link.download = `chroma_crop_${Date.now()}.png`; link.href = tCanvas.toDataURL("image/png"); link.click();
    
    runProcess(true);
}

// --- Image Process ---

function runProcess(renderOverlays = true) {
    if (!originalImg) return;

    const w = canvas.width;
    const h = canvas.height;
    const out = ctx.createImageData(w, h);
    const data = out.data;
    const src = originalData;

    // パラメータ取得
    const thresh = parseInt(document.getElementById('s-thresh').value) * 4.42;
    const soft = parseInt(document.getElementById('s-soft').value) * 1.5;
    const choke = parseInt(document.getElementById('s-choke').value);
    const spill = parseInt(document.getElementById('s-spill').value) / 100;
    
    // 新機能パラメータ
    const smoothVal = parseInt(document.getElementById('s-smooth').value);
    const hardnessVal = parseInt(document.getElementById('s-hardness').value);

    const isContiguous = document.getElementById('contiguousMode').checked;
    const isMaskView = document.getElementById('maskViewMode').checked;
    
    const tr = targetRGB.r, tg = targetRGB.g, tb = targetRGB.b;
    const lower = Math.max(0, thresh - soft + choke);
    const upper = thresh + soft + choke;
    
    const doChroma = thresh > 0;
    const useFlood = (isContiguous && floodFillMask);

    const isGreenKey = (tg > tr && tg > tb);
    const isBlueKey = (tb > tr && tb > tg);
    const isRedKey = (tr > tg && tr > tb);

    // 1. 基本的な抽出処理
    for (let i = 0; i < src.length; i += 4) {
        const mVal = manualMaskData[i/4];

        if (mVal === 0) { data[i+3] = 0; continue; }
        
        let r = src[i], g = src[i+1], b = src[i+2];
        if (mVal === 255) {
            // 保護領域
            if(isMaskView) { data[i]=255; data[i+1]=255; data[i+2]=255; data[i+3]=255; }
            else { data[i]=r; data[i+1]=g; data[i+2]=b; data[i+3]=255; }
            continue;
        }

        let alpha = 255;
        if (doChroma) {
            let dist = 0;
            if (useFlood) {
                if (floodFillMask[i/4] !== 1) dist = 9999;
                else dist = Math.sqrt((r-tr)**2 + (g-tg)**2 + (b-tb)**2);
            } else {
                dist = Math.sqrt((r-tr)**2 + (g-tg)**2 + (b-tb)**2);
            }

            if (dist < lower) alpha = 0;
            else if (dist < upper) alpha = ((dist - lower) / (upper - lower)) * 255;
        }

        if (alpha > 0 && spill > 0) {
            if(isGreenKey) { const l=(r+b)/2; if(g>l) g -= (g-l)*spill; }
            else if(isBlueKey) { const l=(r+g)/2; if(b>l) b -= (b-l)*spill; }
            else if(isRedKey) { const l=(g+b)/2; if(r>l) r -= (r-l)*spill; }
        }

        // 一旦セット
        data[i] = r; data[i+1] = g; data[i+2] = b; data[i+3] = alpha;
    }

    // 2. ポストプロセス（アンチエイリアス ＆ 硬さ調整）
    // アルファチャンネルに対して操作を行う
    if (smoothVal > 0 || hardnessVal > 0) {
        applyPostProcessAlpha(data, w, h, smoothVal, hardnessVal);
    }

    // 3. マスク表示モードならRGBを上書き
    if (isMaskView) {
        for(let i=0; i<data.length; i+=4) {
            const a = data[i+3];
            data[i] = a; data[i+1] = a; data[i+2] = a; data[i+3] = 255;
        }
    }

    ctx.putImageData(out, 0, 0);

    // 4. 縁取り適用
    if (document.getElementById('enableBorder').checked && !isMaskView) {
        applyBorder(w, h);
    }

    // 5. オーバーレイ描画
    if (renderOverlays) {
        if ((currentTool === 'rect' || currentTool === 'crop') && rectStart && rectCurrent) {
            drawRectOverlay();
        }
        if (isSliceMode) {
            drawGridLines();
        }
        
        if (isDragging && (currentTool === 'eraser' || currentTool === 'protect') && lastPos && !isSliceMode) {
            const size = parseInt(document.getElementById('s-eraser').value);
            ctx.save(); ctx.beginPath(); ctx.arc(lastPos.x, lastPos.y, size/2, 0, Math.PI*2);
            ctx.fillStyle = (currentTool === 'protect') ? "rgba(255, 214, 0, 0.3)" : "rgba(255, 23, 68, 0.3)";
            ctx.fill(); ctx.restore();
        }
    }
}

// ★新機能: アルファチャンネルのポストプロセス
// smooth: ぼかし強度 (0-10)
// hardness: エッジのコントラスト (0-100)
function applyPostProcessAlpha(data, w, h, smooth, hardness) {
    // Step 1: Smoothing (Blur)
    if (smooth > 0) {
        const tempAlpha = new Uint8Array(w * h);
        // 現在のアルファ値をコピー
        for (let i = 0; i < w * h; i++) tempAlpha[i] = data[i*4 + 3];

        // 簡易ボックスブラー (3x3) をsmooth回数適用して強度を表現
        // 本来はカーネルサイズを変えるべきだが、パフォーマンス重視で反復適用する簡易実装
        const passes = Math.ceil(smooth / 2); 
        const ratio = (smooth % 2 === 0 && smooth > 0) ? 1.0 : 0.5; // 簡易的な強度調整

        for (let p = 0; p < passes; p++) {
            // 端の処理は簡易的にスキップ
            for (let y = 1; y < h - 1; y++) {
                for (let x = 1; x < w - 1; x++) {
                    const idx = y * w + x;
                    const a = tempAlpha[idx];
                    
                    // 近傍平均
                    const sum = 
                        tempAlpha[idx-w-1] + tempAlpha[idx-w] + tempAlpha[idx-w+1] +
                        tempAlpha[idx-1]   + a                + tempAlpha[idx+1] +
                        tempAlpha[idx+w-1] + tempAlpha[idx+w] + tempAlpha[idx+w+1];
                    
                    const avg = sum / 9;
                    
                    // 元の値と平均値をブレンド
                    // 最後のパス以外は完全に平均化、最後のパスで微調整など
                    data[idx*4 + 3] = a * (1 - ratio) + avg * ratio;
                }
            }
            // 次のパスのために結果をtempに書き戻す（簡易実装のため直列書き込みで代用）
            if (p < passes - 1) {
                for (let i = 0; i < w * h; i++) tempAlpha[i] = data[i*4 + 3];
            }
        }
    }

    // Step 2: Hardness (Contrast / Gamma)
    // アルファ値をシグモイド関数的に変換して、半透明領域を減らす
    if (hardness > 0) {
        // コントラスト係数 (1.0 ~ 5.0くらいまで広げる)
        const contrast = 1 + (hardness / 25); 
        const mid = 127.5;

        for (let i = 0; i < w * h; i++) {
            let a = data[i*4 + 3];
            if (a === 0 || a === 255) continue; // 完全な透明/不透明はスキップ

            // 中心(127.5)からの距離を拡大
            let newVal = (a - mid) * contrast + mid;
            
            // クランプ
            if (newVal < 0) newVal = 0;
            if (newVal > 255) newVal = 255;
            
            data[i*4 + 3] = newVal;
        }
    }
}

function onMouseDown(e) {
    if (!originalImg) return;
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) currentTool = 'pan';
    
    isDragging = true;
    dragStart = { x: e.clientX, y: e.clientY };
    const pt = getCanvasPoint(e);
    
    if (!pt) {
            if(currentTool === 'pan') wrapper.style.cursor = 'grabbing';
            return;
    }

    if(currentTool !== 'wand') wandPoint = null;

    if (isSliceMode) {
        const hoverLine = checkSliceLineHover(pt);
        if(hoverLine) { draggingLine = hoverLine; isDragging = true; return; }
        if(currentTool === 'pan') { wrapper.style.cursor = 'grabbing'; }
        return; 
    }

    if (currentTool === 'pan') {
        wrapper.style.cursor = 'grabbing';
    } else if (currentTool === 'dropper') {
        pickColor(pt);
    } else if (currentTool === 'wand') {
        wandPoint = pt; 
        showLoading();
        setTimeout(() => { magicWand(pt); saveHistory(); hideLoading(); }, 10);
    } else if (currentTool === 'rect' || currentTool === 'crop') {
        rectStart = pt; rectCurrent = pt;
    } else if (currentTool === 'eraser' || currentTool === 'protect') {
        lastPos = pt; stroke(pt);
    }
    runProcess();
}

function onMouseMove(e) {
    const allowOutside = isDragging && (currentTool === 'rect' || currentTool === 'crop' || currentTool === 'eraser' || currentTool === 'protect');
    const pt = getCanvasPoint(e, allowOutside);

    if(isSliceMode && !isDragging && pt) {
        const hoverLine = checkSliceLineHover(pt);
        if(hoverLine) wrapper.style.cursor = (hoverLine.axis === 'x') ? 'col-resize' : 'row-resize';
        else wrapper.style.cursor = 'default';
    }

    const eCursor = document.getElementById('eraser-cursor');
    const pCursor = document.getElementById('protect-cursor');
    
    if (currentTool === 'eraser' && !isSliceMode) {
        eCursor.style.display = 'block'; pCursor.style.display = 'none';
        eCursor.style.left = e.clientX + 'px'; eCursor.style.top = e.clientY + 'px';
    } else if (currentTool === 'protect' && !isSliceMode) {
        pCursor.style.display = 'block'; eCursor.style.display = 'none';
        pCursor.style.left = e.clientX + 'px'; pCursor.style.top = e.clientY + 'px';
    } else {
        eCursor.style.display = 'none'; pCursor.style.display = 'none';
    }

    if (!isDragging) return;

    if (isSliceMode && draggingLine && pt) {
        if(draggingLine.axis === 'x') sliceLinesX[draggingLine.index] = pt.x;
        else sliceLinesY[draggingLine.index] = pt.y;
        runProcess();
        return;
    }

    if (currentTool === 'pan') {
        panX += e.clientX - dragStart.x; panY += e.clientY - dragStart.y;
        dragStart = { x: e.clientX, y: e.clientY };
        updateTransform();
    } else {
        if (!pt) return;
        if(isSliceMode) return;
        
        if (currentTool === 'rect' || currentTool === 'crop') {
            rectCurrent = pt; runProcess(); 
        } else if (currentTool === 'eraser' || currentTool === 'protect') {
            strokeLine(lastPos, pt); lastPos = pt; runProcess();
        }
    }
}

function onMouseUp(e) {
    draggingLine = null; 
    if (!isDragging) return;
    isDragging = false;
    if (currentTool === 'pan') wrapper.style.cursor = 'grab';
    else if (isSliceMode) { }
    else if (currentTool === 'rect' && rectStart) {
        applyRect(); rectStart = null;
    }
    else if (currentTool === 'crop' && rectStart) {
        downloadCroppedArea(); rectStart = null;
    }
    else if (currentTool === 'eraser' || currentTool === 'protect') {
        runProcess(); saveHistory();
    }
}

function onWheel(e) {
    if (!originalImg) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const rect = container.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const ns = Math.min(Math.max(0.05, scale * delta), 20);
    panX += (mx - panX) * (1 - ns / scale);
    panY += (my - panY) * (1 - ns / scale);
    scale = ns;
    updateTransform();
    updateCursor(document.getElementById('s-eraser').value);
}

function getCanvasPoint(e, allowOutside = false) { 
    const rect = wrapper.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / scale);
    const y = Math.floor((e.clientY - rect.top) / scale);
    
    if (!allowOutside) {
        if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return null;
    }
    return {x, y};
}

function pickColor(pt) {
    const idx = (pt.y * canvas.width + pt.x) * 4;
    const r = originalData[idx], g = originalData[idx+1], b = originalData[idx+2];
    const hex = "#" + ((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1).toUpperCase();

    if (dropperTarget === 'bg') {
        document.getElementById('bgColorInput').value = hex;
        document.getElementById('bgColorPreview').style.background = hex;
        targetRGB = {r, g, b};
        document.getElementById('s-thresh').value = 30; updateVal('v-thresh', 30);
        if(document.getElementById('contiguousMode').checked) updateFloodMask(pt);
    } else {
        document.getElementById('borderColorInput').value = hex;
        document.getElementById('borderColorPreview').style.background = hex;
    }
    saveHistory(); runProcess(); setTool('pan');
}

function autoDetectBackground() {
    if(!originalImg) return;
    const pts = [{x:0,y:0}, {x:canvas.width-1,y:0}, {x:0,y:canvas.height-1}, {x:canvas.width-1,y:canvas.height-1}];
    pickColor(pts[0]);
}

function stroke(pt) {
    const size = parseInt(document.getElementById('s-eraser').value);
    const r2 = (size/2)**2;
    const val = (currentTool === 'protect') ? 255 : 0;
    const w = canvas.width;
    const minX=Math.max(0, Math.floor(pt.x-size/2)), maxX=Math.min(w, Math.ceil(pt.x+size/2));
    const minY=Math.max(0, Math.floor(pt.y-size/2)), maxY=Math.min(canvas.height, Math.ceil(pt.y+size/2));
    for(let y=minY; y<maxY; y++) for(let x=minX; x<maxX; x++) if((x-pt.x)**2 + (y-pt.y)**2 <= r2) manualMaskData[y*w+x] = val;
}

function strokeLine(p1, p2) {
    const dist = Math.hypot(p2.x-p1.x, p2.y-p1.y);
    const step = Math.max(1, parseInt(document.getElementById('s-eraser').value)/4);
    for(let i=0; i<=dist; i+=step) {
        const t = i/dist;
        stroke({x: Math.round(p1.x+(p2.x-p1.x)*t), y: Math.round(p1.y+(p2.y-p1.y)*t)});
    }
}

function magicWand(pt) {
    const w = canvas.width, h = canvas.height;
    const tol = parseInt(document.getElementById('s-wand').value) * 2.55;
    const sIdx = (pt.y*w + pt.x)*4;
    const sr=originalData[sIdx], sg=originalData[sIdx+1], sb=originalData[sIdx+2];
    const stack = [[pt.x, pt.y]];
    const visited = new Uint8Array(w*h);
    
    while(stack.length) {
        const [x, y] = stack.pop();
        const idx = y*w + x;
        if(visited[idx]) continue; visited[idx] = 1;
        const i = idx*4;
        if(Math.abs(originalData[i]-sr)<=tol && Math.abs(originalData[i+1]-sg)<=tol && Math.abs(originalData[i+2]-sb)<=tol) {
            manualMaskData[idx] = 0;
            if(x>0) stack.push([x-1,y]); if(x<w-1) stack.push([x+1,y]);
            if(y>0) stack.push([x,y-1]); if(y<h-1) stack.push([x,y+1]);
        }
    }
    runProcess();
}

function updateFloodMask(seed) {
    const w = canvas.width, h = canvas.height;
    floodFillMask = new Uint8Array(w*h);
    const tr=targetRGB.r, tg=targetRGB.g, tb=targetRGB.b;
    const tol = parseInt(document.getElementById('s-thresh').value) * 4.42;
    const stack = [[seed.x, seed.y]];
    while(stack.length) {
        const [x,y] = stack.pop();
        const idx = y*w+x;
        if(floodFillMask[idx]) continue;
        const i = idx*4;
        if(Math.sqrt((originalData[i]-tr)**2 + (originalData[i+1]-tg)**2 + (originalData[i+2]-tb)**2) <= tol) {
            floodFillMask[idx] = 1;
            if(x>0) stack.push([x-1,y]); if(x<w-1) stack.push([x+1,y]);
            if(y>0) stack.push([x,y-1]); if(y<h-1) stack.push([x,y+1]);
        }
    }
}

function applyRect() {
    if(!rectStart || !rectCurrent) return;
    const x1=Math.min(rectStart.x, rectCurrent.x), x2=Math.max(rectStart.x, rectCurrent.x);
    const y1=Math.min(rectStart.y, rectCurrent.y), y2=Math.max(rectStart.y, rectCurrent.y);
    const w = canvas.width;
    for(let y=y1; y<y2; y++) for(let x=x1; x<x2; x++) if(x>=0 && x<w && y>=0 && y<canvas.height) manualMaskData[y*w+x] = 0;
    rectStart = null; rectCurrent = null;
    runProcess(); saveHistory();
}

function drawRectOverlay() {
    ctx.save(); 
    if(currentTool === 'crop') {
        ctx.strokeStyle = '#00C853'; ctx.fillStyle = 'rgba(0, 200, 83, 0.2)';
    } else {
        ctx.strokeStyle = '#FF1744'; ctx.fillStyle = 'rgba(255, 23, 68, 0.2)';
    }
    ctx.lineWidth = 2/scale; ctx.setLineDash([5/scale, 3/scale]);
    const w = rectCurrent.x - rectStart.x; const h = rectCurrent.y - rectStart.y;
    ctx.strokeRect(rectStart.x, rectStart.y, w, h);
    ctx.fillRect(rectStart.x, rectStart.y, w, h);
    ctx.restore();
}

function applyBorder(w, h) {
    const width = parseInt(document.getElementById('s-border').value);
    if(width <= 0) return;
    const color = document.getElementById('borderColorInput').value;
    const style = document.querySelector('input[name="borderStyle"]:checked').value;
    const bCanvas = document.createElement('canvas'); bCanvas.width = w; bCanvas.height = h;
    const bCtx = bCanvas.getContext('2d');
    bCtx.drawImage(canvas, 0, 0);
    bCtx.globalCompositeOperation = 'source-in'; bCtx.fillStyle = color; bCtx.fillRect(0, 0, w, h);
    
    ctx.save(); ctx.globalCompositeOperation = 'destination-over'; ctx.shadowColor = color;
    
    if (style === 'blur') { 
        ctx.shadowBlur = width; ctx.shadowOffsetX = 10000; ctx.drawImage(bCanvas, -10000, 0); 
    } else { 
        ctx.shadowBlur = 2; 
        const steps = Math.max(30, width * 3); 
        for(let i=0; i<steps; i++) { 
            const a=(i/steps)*Math.PI*2; 
            ctx.drawImage(bCanvas, Math.cos(a)*width, Math.sin(a)*width); 
        } 
    }
    ctx.restore();
}

function updateVal(id, val) { document.getElementById(id).textContent = val; }
function changeBgColor(hex) { document.getElementById('bgColorPreview').style.background = hex; }
function setCanvasBg(type) {
    if(type==='checker') {
        container.style.background = 'linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc)';
        container.style.backgroundSize = '20px 20px'; container.style.backgroundPosition = '0 0, 10px 10px'; container.style.backgroundColor = '#fff';
    } else if(type==='custom') {
        const c = document.getElementById('customBgInput').value;
        container.style.background = c;
    } else {
        container.style.background = (type==='white')?'white':'black';
    }
}

function toggleBorder() {
    const en = document.getElementById('enableBorder').checked;
    document.getElementById('border-controls').style.opacity = en ? 1 : 0.5;
    document.getElementById('border-controls').style.pointerEvents = en ? 'auto' : 'none';
    runProcess();
}

function resetParams() {
    document.getElementById('s-thresh').value = 0; updateVal('v-thresh', 0);
    document.getElementById('s-soft').value = 0; updateVal('v-soft', 0);
    document.getElementById('s-choke').value = 0; updateVal('v-choke', 0);
    document.getElementById('s-spill').value = 0; updateVal('v-spill', '0%');
    document.getElementById('s-border').value = 0; updateVal('v-border', 0);
    
    // 新機能リセット
    document.getElementById('s-smooth').value = 0; updateVal('v-smooth', 0);
    document.getElementById('s-hardness').value = 0; updateVal('v-hardness', 0);
    
    document.getElementById('contiguousMode').checked = false;
    document.getElementById('enableBorder').checked = false;
    toggleBorder();
}

function updateCursor(size) {
    const px = size * scale;
    const cursors = document.querySelectorAll('.cursor-indicator');
    cursors.forEach(c => { c.style.width = px + 'px'; c.style.height = px + 'px'; });
}

function saveHistory() {
    const state = {
        mask: new Uint8Array(manualMaskData),
        params: {
            bg: document.getElementById('bgColorInput').value,
            thresh: document.getElementById('s-thresh').value,
            soft: document.getElementById('s-soft').value,
            choke: document.getElementById('s-choke').value,
            spill: document.getElementById('s-spill').value,
            border: document.getElementById('s-border').value,
            smooth: document.getElementById('s-smooth').value,
            hardness: document.getElementById('s-hardness').value
        }
    };
    if(historyIndex < historyStack.length - 1) historyStack = historyStack.slice(0, historyIndex + 1);
    historyStack.push(state);
    if(historyStack.length > MAX_HISTORY) historyStack.shift();
    else historyIndex++;
    updateHistoryBtns();
}

function undo() {
    if(historyIndex > 0) { historyIndex--; restoreHistory(historyStack[historyIndex]); }
}
function redo() {
    if(historyIndex < historyStack.length - 1) { historyIndex++; restoreHistory(historyStack[historyIndex]); }
}
function restoreHistory(state) {
    manualMaskData.set(state.mask);
    document.getElementById('bgColorInput').value = state.params.bg;
    document.getElementById('bgColorPreview').style.background = state.params.bg;
    document.getElementById('s-thresh').value = state.params.thresh; updateVal('v-thresh', state.params.thresh);
    document.getElementById('s-soft').value = state.params.soft; updateVal('v-soft', state.params.soft);
    document.getElementById('s-choke').value = state.params.choke; updateVal('v-choke', state.params.choke);
    document.getElementById('s-spill').value = state.params.spill; updateVal('v-spill', state.params.spill+'%');
    document.getElementById('s-border').value = state.params.border; updateVal('v-border', state.params.border);
    
    // 新機能復元
    document.getElementById('s-smooth').value = state.params.smooth || 0; updateVal('v-smooth', state.params.smooth || 0);
    document.getElementById('s-hardness').value = state.params.hardness || 0; updateVal('v-hardness', state.params.hardness || 0);
    
    runProcess(); updateHistoryBtns();
}
function updateHistoryBtns() {
    document.getElementById('undoBtn').disabled = (historyIndex <= 0);
    document.getElementById('redoBtn').disabled = (historyIndex >= historyStack.length - 1);
}

function downloadImage() {
    if (!originalImg) return;
    runProcess(false); 
    let dlCanvas = canvas;
    if(document.getElementById('autoTrim').checked) {
        const w=canvas.width, h=canvas.height;
        const data = ctx.getImageData(0,0,w,h).data;
        let minX=w, minY=h, maxX=0, maxY=0, found=false;
        for(let y=0; y<h; y++) for(let x=0; x<w; x++) if(data[(y*w+x)*4+3]>0) { if(x<minX)minX=x; if(x>maxX)maxX=x; if(y<minY)minY=y; if(y>maxY)maxY=y; found=true; }
        if(found) {
            const trimW = maxX - minX + 1; const trimH = maxY - minY + 1;
            const tmp = document.createElement('canvas'); tmp.width = trimW; tmp.height = trimH;
            tmp.getContext('2d').putImageData(ctx.getImageData(minX, minY, trimW, trimH), 0, 0);
            dlCanvas = tmp;
        }
    }
    const link = document.createElement('a');
    link.download = `chroma_pro_${Date.now()}.png`;
    link.href = dlCanvas.toDataURL('image/png');
    link.click();
    runProcess(true);
}

function autoCutAndZip() {
    if(!originalImg) return;
    showLoading("自動カット処理中...<br>(※大きな画像は数秒固まります)");
    setTimeout(() => {
        try {
            runProcess(false);
            const w = canvas.width, h = canvas.height;
            const data = ctx.getImageData(0,0,w,h).data;
            const visited = new Uint8Array(w*h);
            const segments = [];

            for(let y=0; y<h; y++) {
                for(let x=0; x<w; x++) {
                    const idx = y*w+x;
                    if(data[idx*4+3] > 0 && !visited[idx]) {
                        const segment = { minX:x, minY:y, maxX:x, maxY:y, pixels:[] };
                        const stack = [[x,y]];
                        visited[idx] = 1;
                        
                        while(stack.length) {
                            const [cx, cy] = stack.pop();
                            segment.minX = Math.min(segment.minX, cx);
                            segment.maxX = Math.max(segment.maxX, cx);
                            segment.minY = Math.min(segment.minY, cy);
                            segment.maxY = Math.max(segment.maxY, cy);
                            segment.pixels.push({x:cx, y:cy});

                            const neighbors = [[cx+1,cy], [cx-1,cy], [cx,cy+1], [cx,cy-1]];
                            for(const [nx,ny] of neighbors) {
                                    if(nx>=0 && nx<w && ny>=0 && ny<h) {
                                    const nIdx = ny*w+nx;
                                    if(data[nIdx*4+3]>0 && !visited[nIdx]) {
                                        visited[nIdx] = 1;
                                        stack.push([nx,ny]);
                                    }
                                }
                            }
                        }
                        if(segment.pixels.length > 20) segments.push(segment);
                    }
                }
            }

            if(segments.length === 0) { alert("切り出す対象が見つかりませんでした。"); hideLoading(); runProcess(true); return; }

            const zip = new JSZip();
            
            segments.forEach((seg, i) => {
                const sw = seg.maxX - seg.minX + 1;
                const sh = seg.maxY - seg.minY + 1;
                const sCanvas = document.createElement('canvas');
                sCanvas.width = sw; sCanvas.height = sh;
                const sCtx = sCanvas.getContext('2d');
                const sImgData = sCtx.createImageData(sw, sh);
                
                for(const p of seg.pixels) {
                    const srcIdx = (p.y*w + p.x)*4;
                    const dstIdx = ((p.y-seg.minY)*sw + (p.x-seg.minX))*4;
                    sImgData.data[dstIdx]   = data[srcIdx];
                    sImgData.data[dstIdx+1] = data[srcIdx+1];
                    sImgData.data[dstIdx+2] = data[srcIdx+2];
                    sImgData.data[dstIdx+3] = data[srcIdx+3];
                }
                sCtx.putImageData(sImgData, 0, 0);
                
                const dataUrl = sCanvas.toDataURL("image/png");
                const base64Data = dataUrl.replace(/^data:image\/(png|jpg);base64,/, "");
                
                zip.file(`part_${i+1}.png`, base64Data, {base64: true});
            });

            zip.generateAsync({type:"blob"}).then(content => {
                const link = document.createElement('a');
                link.download = `chroma_parts_${Date.now()}.zip`;
                link.href = URL.createObjectURL(content);
                link.click();
                hideLoading();
                runProcess(true);
            });

        } catch(e) {
            console.error(e);
            alert("処理中にエラーが発生しました。");
            hideLoading();
            runProcess(true);
        }
    }, 100);
}

function showLoading(msg) {
    loadingText.innerHTML = msg || "処理中...";
    loading.style.display = 'flex';
}
function hideLoading() {
    loading.style.display = 'none';
}

function resetAll() { if(confirm("すべてリセットしますか？")) initImage(originalImg); }