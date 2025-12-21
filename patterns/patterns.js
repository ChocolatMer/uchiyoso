/**
 * 柄（パターン）管理ライブラリ
 * 
 * 【他ページでの利用・設定時の注意事項】
 * 
 * 1. 読み込み方法
 *    HTML内で <script src="path/to/patterns.js"></script> を読み込んでください。
 *    グローバル変数 window.ChartPatternLibrary が利用可能になります。
 * 
 * 2. 描画の実行 (draw関数)
 *    window.ChartPatternLibrary.draw(ctx, width, height, patternObject, scale);
 *    - ctx: Canvasの2Dコンテキスト
 *    - width, height: 塗りつぶす範囲の幅と高さ
 *    - patternObject: config配列内のオブジェクト（canvasプロパティ）
 *    - scale: 柄の拡大率（1.0が基準）
 * 
 * 3. 色の変更について
 *    patternObject の内容を複製し、color プロパティを書き換えてから draw に渡すと色が変更できます。
 *    例: 
 *    const p = { ...originalPattern.canvas, color: '#ff0000' };
 *    ChartPatternLibrary.draw(ctx, w, h, p, 1.0);
 *    
 *    ※ type: 'dot-mix' の場合のみ color2 プロパティも必要です。
 * 
 * 4. 透明度について
 *    各パターンには opacity (0.0~1.0) が設定されています。
 *    色は「不透明なカラーコード(#RRGGBB)」で指定すると、自動的に opacity の透明度が適用され
 *    綺麗に馴染みます。
 */

(function() {
    // ■■■ 1. 柄の設定データ ■■■
    const config = [
        // 1. 斜めドット
        { 
            id: 1, 
            canvas: { type: 'dot-skew', color: '#ffffff', size: 10, spacing: 60, opacity: 0.9 }, 
            thumbUrl: '' 
        },
        // 2. 太いボーダー
        { 
            id: 2, 
            canvas: { type: 'stripe', color: '#ffffff', width: 60, opacity: 0.5 }, 
            thumbUrl: '' 
        },
        // 3. 大きなチェック
        { 
            id: 3, 
            canvas: { type: 'check', color: '#ffffff', size: 80, opacity: 0.3 }, 
            thumbUrl: '' 
        },
        // 4. 大きな市松模様
        { 
            id: 4, 
            canvas: { type: 'ichimatsu', color: '#ffffff', size: 80, opacity: 0.4 }, 
            thumbUrl: '' 
        },
        // 5. ビッグアーガイル
        { 
            id: 5, 
            canvas: { type: 'argyle', color: '#ffffff', size: 120, opacity: 0.3 }, 
            thumbUrl: '' 
        },
        // 6. ドット色違い（2色使用）
        {
            id: 6,
            canvas: { 
                type: 'dot-mix', 
                color: '#b4f3ea', // 色1 (初期値: 水色系)
                color2: '#ffbcbc', // 色2 (初期値: ピンク系)
                size: 15, 
                spacing: 60,
                opacity: 0.9
            },
            thumbUrl: ''
        },
        // 7. ドットサイズ違い
        {
            id: 7,
            canvas: { 
                type: 'dot-size', 
                color: '#ffffff', 
                size: 10, 
                size2: 25, 
                spacing: 70,
                opacity: 0.8
            },
            thumbUrl: ''
        }
    ];

    // ■■■ 2. 描画ロジック ■■■
    function draw(ctx, w, h, p, scale = 1.0) {
        const tempCanvas = document.createElement('canvas');
        const tCtx = tempCanvas.getContext('2d');
        
        // 透明度を一括適用（これにより色は不透明でも馴染みます）
        if (p.opacity) tCtx.globalAlpha = p.opacity;

        const s = p.spacing * scale;

        // ▼ 1. 斜めドット
        if (p.type === 'dot-skew') {
            const sz = p.size * scale;
            tempCanvas.width = s; tempCanvas.height = s;
            tCtx.fillStyle = p.color;
            tCtx.beginPath(); tCtx.arc(s/2, s/2, sz, 0, Math.PI*2); tCtx.fill();
            tCtx.beginPath(); tCtx.arc(0, 0, sz, 0, Math.PI*2); tCtx.fill();
            tCtx.beginPath(); tCtx.arc(s, 0, sz, 0, Math.PI*2); tCtx.fill();
            tCtx.beginPath(); tCtx.arc(0, s, sz, 0, Math.PI*2); tCtx.fill();
            tCtx.beginPath(); tCtx.arc(s, s, sz, 0, Math.PI*2); tCtx.fill();
        } 
        // ▼ 6. ドット色違い (2色対応)
        else if (p.type === 'dot-mix') {
            const sz = p.size * scale;
            tempCanvas.width = s; tempCanvas.height = s;
            // 色1
            tCtx.fillStyle = p.color;
            tCtx.beginPath(); tCtx.arc(s/2, s/2, sz, 0, Math.PI*2); tCtx.fill();
            // 色2
            tCtx.fillStyle = p.color2 || p.color; // color2がない場合はcolor1を使う
            tCtx.beginPath(); tCtx.arc(0, 0, sz, 0, Math.PI*2); tCtx.fill();
            tCtx.beginPath(); tCtx.arc(s, 0, sz, 0, Math.PI*2); tCtx.fill();
            tCtx.beginPath(); tCtx.arc(0, s, sz, 0, Math.PI*2); tCtx.fill();
            tCtx.beginPath(); tCtx.arc(s, s, sz, 0, Math.PI*2); tCtx.fill();
        }
        // ▼ 7. ドットサイズ違い
        else if (p.type === 'dot-size') {
            const sz1 = p.size * scale;
            const sz2 = p.size2 * scale;
            tempCanvas.width = s; tempCanvas.height = s;
            tCtx.fillStyle = p.color;
            tCtx.beginPath(); tCtx.arc(s/2, s/2, sz1, 0, Math.PI*2); tCtx.fill();
            tCtx.beginPath(); tCtx.arc(0, 0, sz2, 0, Math.PI*2); tCtx.fill();
            tCtx.beginPath(); tCtx.arc(s, 0, sz2, 0, Math.PI*2); tCtx.fill();
            tCtx.beginPath(); tCtx.arc(0, s, sz2, 0, Math.PI*2); tCtx.fill();
            tCtx.beginPath(); tCtx.arc(s, s, sz2, 0, Math.PI*2); tCtx.fill();
        }
        // --- 既存の柄 ---
        else if (p.type === 'ichimatsu') {
            const sz = p.size * scale;
            tempCanvas.width = sz * 2; tempCanvas.height = sz * 2;
            tCtx.fillStyle = p.color; tCtx.fillRect(0, 0, sz, sz); tCtx.fillRect(sz, sz, sz, sz);
        } 
        else if (p.type === 'stripe') {
            const width = p.width * scale;
            const size = width * 2;
            tempCanvas.width = size; tempCanvas.height = size;
            tCtx.fillStyle = p.color;
            tCtx.beginPath();
            tCtx.moveTo(0, size); tCtx.lineTo(size, 0); tCtx.lineTo(size + width, 0); tCtx.lineTo(width, size); tCtx.fill();
            tCtx.beginPath(); tCtx.moveTo(0, 0); tCtx.lineTo(width, 0); tCtx.lineTo(0, width); tCtx.fill();
        } 
        else if (p.type === 'check') {
            const sz = p.size * scale;
            tempCanvas.width = sz; tempCanvas.height = sz;
            tCtx.fillStyle = p.color; tCtx.fillRect(0, 0, sz, sz/2);
            tCtx.globalCompositeOperation = 'source-over'; 
            tCtx.fillStyle = p.color; tCtx.fillRect(0, 0, sz/2, sz);
        } 
        else if (p.type === 'argyle') {
            const sz = p.size * scale;
            tempCanvas.width = sz; tempCanvas.height = sz;
            tCtx.fillStyle = p.color;
            tCtx.beginPath(); tCtx.moveTo(sz/2, 0); tCtx.lineTo(sz, sz/2); tCtx.lineTo(sz/2, sz); tCtx.lineTo(0, sz/2); tCtx.fill();
            tCtx.strokeStyle = "rgba(255,255,255,0.6)"; tCtx.lineWidth = 1 * scale;
            tCtx.beginPath(); tCtx.moveTo(0,0); tCtx.lineTo(sz, sz); tCtx.moveTo(sz,0); tCtx.lineTo(0, sz); tCtx.stroke();
        } 

        const pattern = ctx.createPattern(tempCanvas, 'repeat');
        ctx.fillStyle = pattern; ctx.fillRect(0, 0, w, h);
    }

    window.ChartPatternLibrary = { config: config, draw: draw };
})();