const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Tailwind CSS v4 빌드 스크립트
function buildTailwindCSS() {
    console.log('Building Tailwind CSS v4 with DaisyUI...');

    // 임시 CSS 파일 생성
    const tempCssPath = path.join(__dirname, 'temp-input.css');
    const outputCssPath = path.join(__dirname, 'app', 'renderer', 'css', 'style.css');

    const inputCss = `
@import "tailwindcss";
@plugin "daisyui";

/* Custom Electron styles */
body {
    overflow: hidden;
    margin: 0;
    padding: 0;
}

webview {
    width: 100%;
    height: 100%;
    border: none;
}

.webview-container {
    position: relative;
    overflow: hidden;
    flex: 1;
    min-height: 0;
}

#loadingOverlay {
    position: absolute;
    inset: 0;
    background: white;
    z-index: 10;
}

#loadingOverlay.hidden {
    display: none;
}

.loading-spinner {
    width: 2rem;
    height: 2rem;
    border: 2px solid #e5e7eb;
    border-top: 2px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

/* Layout fixes */
body .main-container {
    height: calc(100vh - 4rem);
    display: flex;
}

body .sidebar {
    width: 320px;
    flex-shrink: 0;
    display: block;
    position: relative;
    transform: none;
}

body .webview-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.webview-section {
    flex: 1;
    position: relative;
    min-height: 0;
}

webview {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
}`;

    // 임시 파일 작성
    fs.writeFileSync(tempCssPath, inputCss);

    try {
        // Tailwind CSS CLI로 빌드
        execSync(`npx tailwindcss@4.1.13 -i ${tempCssPath} -o ${outputCssPath}`, {
            stdio: 'inherit'
        });

        console.log('Tailwind CSS built successfully!');

        // 임시 파일 삭제
        fs.unlinkSync(tempCssPath);

    } catch (error) {
        console.error('Error building Tailwind CSS:', error.message);
        console.log('Falling back to CDN approach...');

        // 임시 파일 정리
        if (fs.existsSync(tempCssPath)) {
            fs.unlinkSync(tempCssPath);
        }

        // CDN 방식으로 fallback
        buildCSSWithCDN();
    }
}

function buildCSSWithCDN() {
    const outputCssPath = path.join(__dirname, 'app', 'renderer', 'css', 'style.css');
    const cssDir = path.dirname(outputCssPath);

    if (!fs.existsSync(cssDir)) {
        fs.mkdirSync(cssDir, { recursive: true });
    }

    const cssContent = `
/* Tailwind CSS v4 + DaisyUI CDN을 사용합니다. */
/* 실제 스타일은 HTML의 CDN 링크에서 로드됩니다. */

/* Custom Electron styles */
body {
    overflow: hidden;
    margin: 0;
    padding: 0;
}

webview {
    width: 100%;
    height: 100%;
    border: none;
}

.webview-container {
    position: relative;
    overflow: hidden;
    flex: 1;
    min-height: 0;
}

#loadingOverlay {
    position: absolute;
    inset: 0;
    background: white;
    z-index: 10;
}

#loadingOverlay.hidden {
    display: none;
}

.loading-spinner {
    width: 2rem;
    height: 2rem;
    border: 2px solid #e5e7eb;
    border-top: 2px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

/* Layout fixes */
body .main-container {
    height: calc(100vh - 4rem);
    display: flex;
}

body .sidebar {
    width: 320px;
    flex-shrink: 0;
    display: block;
    position: relative;
    transform: none;
}

body .webview-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.webview-section {
    flex: 1;
    position: relative;
    min-height: 0;
}

webview {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
}`;

    fs.writeFileSync(outputCssPath, cssContent);
    console.log('CSS built with CDN fallback!');
}

// 메인 실행
buildTailwindCSS();