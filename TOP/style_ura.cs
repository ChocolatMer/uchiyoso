@charset "UTF-8";

/* === 裏サイト（水色テーマ）の変数上書き === */
:root {
    /* メインカラーを水色系に変更 */
    --accent-pink: #89c3eb; /* 勿忘草色 */
    --accent-gradient: linear-gradient(135deg, #89c3eb 0%, #a0d8ef 100%);
    
    /* テキスト色を少しクールな色味に */
    --text-main: #384d5a;
    --text-sub: #5f7a8b;
    
    /* 背景色変更 */
    background-color: #e0f7fa; 
}

/* 裏テーマ時の背景画像の色味変更 */
body {
    background-blend-mode: hue;
}