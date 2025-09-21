const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Tailwind CSS v4 + DaisyUI를 로컬에서 빌드한다.
function buildTailwindCSS() {
    const inputPath = path.join(__dirname, 'src', 'input.css');
    const outputPath = path.join(__dirname, 'app', 'renderer', 'css', 'style.css');
    const outputDir = path.dirname(outputPath);

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log('Building Tailwind CSS v4 (with DaisyUI) from', inputPath);

    try {
        execSync(`npx @tailwindcss/cli -i "${inputPath}" -o "${outputPath}"`, {
            stdio: 'inherit',
        });
        console.log('Tailwind CSS build completed:', outputPath);
    } catch (error) {
        console.error('Tailwind CSS build failed.', error.message);
        process.exitCode = 1;
    }
}

buildTailwindCSS();
