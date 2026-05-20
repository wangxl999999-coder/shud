const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');
const width = canvas.width;
const height = canvas.height;

let board = [];
let solution = [];
let initialBoard = [];
let selectedCell = null;
let currentDifficulty = 'easy';
let currentLevel = 1;
let isPaused = false;
let timerInterval = null;
let elapsedSeconds = 0;
let gameMode = 'normal';
let dailyDate = '';
let hintsUsed = 0;
let touchStartTime = 0;
let lastTapTime = 0;

const COLORS = {
    primary: '#667eea',
    secondary: '#764ba2',
    background: '#f5f5f5',
    cellBg: '#ffffff',
    fixedCell: '#f0f0f0',
    selected: '#bbdefb',
    highlighted: '#e3f2fd',
    sameNumber: '#c5cae9',
    conflict: '#ffcdd2',
    conflictText: '#c62828',
    text: '#333333',
    textLight: '#667eea',
    border: '#333333',
    delete: '#ff6b6b'
};

const CELL_SIZE = Math.floor((width - 40) / 9);
const GRID_SIZE = CELL_SIZE * 9;

const difficultySettings = {
    easy: { min: 30, max: 40 },
    medium: { min: 25, max: 30 },
    hard: { min: 20, max: 25 }
};

let currentScreen = 'start';
let isDrawing = false;

function init() {
    loadRecords();
    drawStartScreen();
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
}

function handleTouchStart(e) {
    e.preventDefault();
    touchStartTime = Date.now();
    const touch = e.touches[0];
    const x = touch.clientX;
    const y = touch.clientY;

    if (currentScreen === 'start') {
        handleStartScreenClick(x, y);
    } else if (currentScreen === 'difficulty') {
        handleDifficultyClick(x, y);
    } else if (currentScreen === 'level') {
        handleLevelClick(x, y);
    } else if (currentScreen === 'daily') {
        handleDailyClick(x, y);
    } else if (currentScreen === 'records') {
        handleRecordsClick(x, y);
    } else if (currentScreen === 'game') {
        handleGameClick(x, y);
    } else if (currentScreen === 'win') {
        handleWinClick(x, y);
    }
}

function handleTouchEnd(e) {
    e.preventDefault();
}

function handleStartScreenClick(x, y) {
    const centerX = width / 2;
    const startY = height * 0.3;
    const btnWidth = 200;
    const btnHeight = 45;
    const gap = 15;

    const buttons = [
        { text: '开始游戏', action: () => { currentScreen = 'difficulty'; drawDifficultyScreen(); } },
        { text: '每日挑战', action: () => { showDailyChallenge(); } },
        { text: '关卡模式', action: () => { showLevelMode(); } },
        { text: '最佳记录', action: () => { showRecords(); } }
    ];

    buttons.forEach((btn, i) => {
        const btnY = startY + i * (btnHeight + gap);
        if (x >= centerX - btnWidth/2 && x <= centerX + btnWidth/2 &&
            y >= btnY && y <= btnY + btnHeight) {
            btn.action();
            return;
        }
    });
}

function handleDifficultyClick(x, y) {
    const centerX = width / 2;
    const startY = height * 0.35;
    const btnWidth = 200;
    const btnHeight = 45;
    const gap = 15;

    const buttons = [
        { text: '简单', color: '#4ade80', action: () => startNewGame('easy') },
        { text: '中等', color: '#fbbf24', action: () => startNewGame('medium') },
        { text: '困难', color: '#f87171', action: () => startNewGame('hard') }
    ];

    buttons.forEach((btn, i) => {
        const btnY = startY + i * (btnHeight + gap);
        if (x >= centerX - btnWidth/2 && x <= centerX + btnWidth/2 &&
            y >= btnY && y <= btnY + btnHeight) {
            btn.action();
            return;
        }
    });

    const backY = height - 80;
    if (x >= centerX - 60 && x <= centerX + 60 && y >= backY && y <= backY + 40) {
        currentScreen = 'start';
        drawStartScreen();
    }
}

function handleLevelClick(x, y) {
    const centerX = width / 2;

    const leftBtnX = width * 0.25;
    const rightBtnX = width * 0.75;
    const navY = height * 0.38;
    const btnSize = 40;

    if (x >= leftBtnX - btnSize/2 && x <= leftBtnX + btnSize/2 &&
        y >= navY - btnSize/2 && y <= navY + btnSize/2) {
        currentLevel = Math.max(1, currentLevel - 1);
        drawLevelScreen();
        return;
    }

    if (x >= rightBtnX - btnSize/2 && x <= rightBtnX + btnSize/2 &&
        y >= navY - btnSize/2 && y <= navY + btnSize/2) {
        currentLevel = Math.min(100, currentLevel + 1);
        drawLevelScreen();
        return;
    }

    const startY = height * 0.52;
    if (x >= centerX - 100 && x <= centerX + 100 && y >= startY && y <= startY + 45) {
        startLevelMode();
        return;
    }

    const backY = height - 80;
    if (x >= centerX - 60 && x <= centerX + 60 && y >= backY && y <= backY + 40) {
        currentScreen = 'start';
        drawStartScreen();
    }
}

function handleDailyClick(x, y) {
    const centerX = width / 2;
    const startY = height * 0.5;

    if (x >= centerX - 100 && x <= centerX + 100 && y >= startY && y <= startY + 45) {
        startDailyChallenge();
        return;
    }

    const backY = height - 80;
    if (x >= centerX - 60 && x <= centerX + 60 && y >= backY && y <= backY + 40) {
        currentScreen = 'start';
        drawStartScreen();
    }
}

function handleRecordsClick(x, y) {
    const centerX = width / 2;
    const backY = height - 80;

    if (x >= centerX - 60 && x <= centerX + 60 && y >= backY && y <= backY + 40) {
        currentScreen = 'start';
        drawStartScreen();
    }
}

function handleGameClick(x, y) {
    if (isPaused) {
        const centerX = width / 2;
        const pauseY = height * 0.4;
        const btnWidth = 150;
        const btnHeight = 40;
        const gap = 15;

        const buttons = [
            { text: '继续', action: () => togglePause() },
            { text: '退出', action: () => exitGame() }
        ];

        buttons.forEach((btn, i) => {
            const btnY = pauseY + i * (btnHeight + gap);
            if (x >= centerX - btnWidth/2 && x <= centerX + btnWidth/2 &&
                y >= btnY && y <= btnY + btnHeight) {
                btn.action();
                return;
            }
        });
        return;
    }

    const gridLeft = (width - GRID_SIZE) / 2 - 5;
    const gridTop = 100;

    if (x >= gridLeft && x <= gridLeft + GRID_SIZE + 10 &&
        y >= gridTop && y <= gridTop + GRID_SIZE + 10) {
        const col = Math.floor((x - gridLeft) / CELL_SIZE);
        const row = Math.floor((y - gridTop) / CELL_SIZE);

        if (col >= 0 && col < 9 && row >= 0 && row < 9) {
            selectedCell = { row, col };
            highlightCells();
            renderBoard();
        }
        return;
    }

    const numPadTop = height - 200;
    const numPadLeft = (width - 5 * 60) / 2;
    const numGap = 8;

    if (y >= numPadTop && y <= numPadTop + 130) {
        const col = Math.floor((x - numPadLeft + numGap/2) / 60);
        if (col >= 0 && col <= 4) {
            if (col === 4) {
                inputNumber(0);
            } else {
                inputNumber(col + 1);
            }
        }
        return;
    }

    if (y >= 50 && y <= 95) {
        if (x >= width - 130 && x <= width - 20) {
            const actionY = 60;
            if (y >= actionY - 20 && y <= actionY + 20) {
                togglePause();
                return;
            }
            if (y >= actionY + 30 && y <= actionY + 70) {
                resetGame();
                return;
            }
            if (y >= actionY + 60 && y <= actionY + 100) {
                giveHint();
                return;
            }
        }
    }
}

function handleWinClick(x, y) {
    const centerX = width / 2;
    const startY = height * 0.65;
    const btnWidth = 180;
    const btnHeight = 45;
    const gap = 15;

    const buttons = [
        { text: '再来一局', action: () => startNewGame(currentDifficulty) },
        { text: '返回主页', action: () => { currentScreen = 'start'; drawStartScreen(); } }
    ];

    buttons.forEach((btn, i) => {
        const btnY = startY + i * (btnHeight + gap);
        if (x >= centerX - btnWidth/2 && x <= centerX + btnWidth/2 &&
            y >= btnY && y <= btnY + btnHeight) {
            btn.action();
            return;
        }
    });
}

function drawText(text, x, y, size = 16, color = COLORS.text, align = 'center') {
    ctx.font = `${size}px sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
}

function fillRoundedRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
}

function strokeRoundedRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.stroke();
}

function drawButton(text, x, y, w, h, color = COLORS.primary, textColor = '#ffffff') {
    ctx.fillStyle = color;
    fillRoundedRect(x - w/2, y - h/2, w, h, 10);

    ctx.fillStyle = textColor;
    ctx.font = `bold 16px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
}

function drawStartScreen() {
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, width, height);

    const centerX = width / 2;

    ctx.fillStyle = COLORS.primary;
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('数独挑战', centerX, height * 0.15);

    const startY = height * 0.3;
    const buttons = [
        { text: '开始游戏', color: COLORS.primary },
        { text: '每日挑战', color: COLORS.primary },
        { text: '关卡模式', color: COLORS.primary },
        { text: '最佳记录', color: COLORS.primary }
    ];

    buttons.forEach((btn, i) => {
        drawButton(btn.text, centerX, startY + i * 60, 200, 45, btn.color);
    });
}

function drawDifficultyScreen() {
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, width, height);

    const centerX = width / 2;

    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('选择难度', centerX, height * 0.2);

    const startY = height * 0.35;
    const difficulties = [
        { text: '简单', color: '#4ade80' },
        { text: '中等', color: '#fbbf24' },
        { text: '困难', color: '#f87171' }
    ];

    difficulties.forEach((diff, i) => {
        drawButton(diff.text, centerX, startY + i * 60, 200, 45, diff.color);
    });

    drawButton('返回', centerX, height - 80, 120, 40, '#ddd', COLORS.text);
}

function showLevelMode() {
    updateLevelProgress();
    currentScreen = 'level';
    drawLevelScreen();
}

function drawLevelScreen() {
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, width, height);

    const centerX = width / 2;

    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('关卡模式', centerX, height * 0.2);

    ctx.font = '24px sans-serif';
    ctx.fillStyle = COLORS.primary;
    ctx.fillText(`关卡 ${currentLevel} / 100`, centerX, height * 0.32);

    const navY = height * 0.38;
    drawButton('<', width * 0.25, navY, 40, 40, COLORS.primary);
    drawButton('>', width * 0.75, navY, 40, 40, COLORS.primary);

    const records = getRecords();
    const maxUnlocked = records.maxLevel || 1;
    const progress = Math.min(1, maxUnlocked / 100);

    const barY = height * 0.48;
    const barWidth = 250;
    const barHeight = 10;

    ctx.fillStyle = '#ddd';
    fillRoundedRect(centerX - barWidth/2, barY - barHeight/2, barWidth, barHeight, 5);

    ctx.fillStyle = COLORS.primary;
    fillRoundedRect(centerX - barWidth/2, barY - barHeight/2, barWidth * progress, barHeight, 5);

    ctx.fillStyle = '#999';
    ctx.font = '12px sans-serif';
    ctx.fillText(`已解锁: ${maxUnlocked}`, centerX, barY + 20);

    drawButton('开始挑战', centerX, height * 0.58, 200, 45, COLORS.primary);
    drawButton('返回', centerX, height - 80, 120, 40, '#ddd', COLORS.text);
}

function showDailyChallenge() {
    const today = new Date();
    dailyDate = today.toISOString().split('T')[0];
    currentScreen = 'daily';
    drawDailyScreen();
}

function drawDailyScreen() {
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, width, height);

    const centerX = width / 2;
    const today = new Date();

    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('每日挑战', centerX, height * 0.2);

    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#666';
    ctx.fillText(today.toLocaleDateString('zh-CN', {
        year: 'numeric', month: 'long', day: 'numeric'
    }), centerX, height * 0.32);

    ctx.fillStyle = '#fff';
    fillRoundedRect(centerX - 140, height * 0.38, 280, 80, 10);

    ctx.fillStyle = COLORS.text;
    ctx.font = '14px sans-serif';
    const records = getRecords();
    const dailyRecords = records.daily || [];
    const todayRecords = dailyRecords.filter(r => r.date === dailyDate);

    ctx.fillText(`今日完成次数: ${todayRecords.length}`, centerX, height * 0.42);

    if (todayRecords.length > 0) {
        const best = Math.min(...todayRecords.map(r => r.time));
        ctx.fillText(`最快时间: ${formatTime(best)}`, centerX, height * 0.48);
    } else {
        ctx.fillText('最快时间: --:--', centerX, height * 0.48);
    }

    drawButton('开始挑战', centerX, height * 0.55, 200, 45, COLORS.primary);
    drawButton('返回', centerX, height - 80, 120, 40, '#ddd', COLORS.text);
}

function showRecords() {
    currentScreen = 'records';
    drawRecordsScreen();
}

function drawRecordsScreen() {
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, width, height);

    const centerX = width / 2;
    const records = getRecords();

    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('最佳记录', centerX, height * 0.12);

    let y = height * 0.22;

    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = COLORS.primary;
    ctx.textAlign = 'left';
    ctx.fillText('普通模式', centerX - 130, y);

    y += 30;
    ctx.font = '14px sans-serif';
    ctx.fillStyle = COLORS.text;

    const diffs = [
        { key: 'easy', name: '简单' },
        { key: 'medium', name: '中等' },
        { key: 'hard', name: '困难' }
    ];

    diffs.forEach(diff => {
        ctx.textAlign = 'left';
        ctx.fillText(diff.name, centerX - 130, y);
        ctx.textAlign = 'right';
        ctx.fillText(records[diff.key] ? formatTime(records[diff.key]) : '--:--', centerX + 130, y);
        y += 25;
    });

    y += 15;
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = COLORS.primary;
    ctx.textAlign = 'left';
    ctx.fillText('关卡模式', centerX - 130, y);

    y += 30;
    ctx.font = '14px sans-serif';
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = 'left';
    ctx.fillText('已通关关卡', centerX - 130, y);
    ctx.textAlign = 'right';
    ctx.fillText(`${records.maxLevel || 0} / 100`, centerX + 130, y);

    y += 15;
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = COLORS.primary;
    ctx.textAlign = 'left';
    ctx.fillText('每日挑战', centerX - 130, y);

    y += 30;
    ctx.font = '14px sans-serif';
    ctx.fillStyle = COLORS.text;

    if (records.daily && records.daily.length > 0) {
        const lastDaily = records.daily[records.daily.length - 1];
        ctx.textAlign = 'left';
        ctx.fillText(lastDaily.date, centerX - 130, y);
        ctx.textAlign = 'right';
        ctx.fillText(formatTime(lastDaily.time), centerX + 130, y);
    } else {
        ctx.textAlign = 'left';
        ctx.fillText('暂无记录', centerX - 130, y);
    }

    drawButton('返回', centerX, height - 80, 120, 40, '#ddd', COLORS.text);
}

function updateLevelProgress() {
}

function startNewGame(difficulty) {
    currentDifficulty = difficulty;
    gameMode = 'normal';
    hintsUsed = 0;

    const { board: newBoard, solution: newSolution } = generateSudoku(difficulty);
    board = newBoard;
    solution = newSolution;
    initialBoard = board.map(row => [...row]);

    selectedCell = null;
    elapsedSeconds = 0;
    isPaused = false;

    startTimer();
    currentScreen = 'game';
    renderBoard();
    saveGameState();
}

function startLevelMode() {
    currentDifficulty = getLevelDifficulty(currentLevel);
    gameMode = 'level';
    hintsUsed = 0;

    const seed = currentLevel + (currentLevel * 12345);
    const { board: newBoard, solution: newSolution } = generateSudoku(currentDifficulty, seed);
    board = newBoard;
    solution = newSolution;
    initialBoard = board.map(row => [...row]);

    selectedCell = null;
    elapsedSeconds = 0;
    isPaused = false;

    startTimer();
    currentScreen = 'game';
    renderBoard();
    saveGameState();
}

function startDailyChallenge() {
    currentDifficulty = 'medium';
    gameMode = 'daily';
    hintsUsed = 0;

    const dateNum = parseInt(dailyDate.replace(/-/g, ''));
    const { board: newBoard, solution: newSolution } = generateSudoku('medium', dateNum);
    board = newBoard;
    solution = newSolution;
    initialBoard = board.map(row => [...row]);

    selectedCell = null;
    elapsedSeconds = 0;
    isPaused = false;

    startTimer();
    currentScreen = 'game';
    renderBoard();
    saveGameState();
}

function getLevelDifficulty(level) {
    if (level <= 20) return 'easy';
    if (level <= 50) return 'medium';
    return 'hard';
}

function generateSudoku(difficulty, seed = null) {
    const random = seed != null ? seededRandom(seed) : Math.random;

    let newSolution = Array(9).fill(null).map(() => Array(9).fill(0));
    fillBoard(newSolution, 0, 0, random);

    const { min, max } = difficultySettings[difficulty];
    const cellsToKeep = min + Math.floor(random() * (max - min + 1));
    const cellsToRemove = 81 - cellsToKeep;

    let newBoard = newSolution.map(row => [...row]);
    const positions = [];
    for (let i = 0; i < 81; i++) positions.push(i);
    shuffleArray(positions, random);

    for (let i = 0; i < cellsToRemove && i < positions.length; i++) {
        const pos = positions[i];
        const row = Math.floor(pos / 9);
        const col = pos % 9;
        newBoard[row][col] = 0;
    }

    return { board: newBoard, solution: newSolution };
}

function seededRandom(seed) {
    let s = seed;
    return function() {
        s = Math.sin(s) * 10000;
        return s - Math.floor(s);
    };
}

function shuffleArray(array, random = Math.random) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function fillBoard(board, row, col, random) {
    if (row === 9) return true;
    if (col === 9) return fillBoard(board, row + 1, 0, random);

    const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    shuffleArray(nums, random);

    for (const num of nums) {
        if (isValidPlacement(board, row, col, num)) {
            board[row][col] = num;
            if (fillBoard(board, row, col + 1, random)) return true;
            board[row][col] = 0;
        }
    }
    return false;
}

function isValidPlacement(board, row, col, num) {
    for (let i = 0; i < 9; i++) {
        if (board[row][i] === num) return false;
        if (board[i][col] === num) return false;
    }

    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (board[boxRow + i][boxCol + j] === num) return false;
        }
    }
    return true;
}

function renderBoard() {
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, width, height);

    const gridLeft = (width - GRID_SIZE) / 2 - 5;
    const gridTop = 100;

    drawText(getModeText(), width / 2, 25, 14, COLORS.text);
    if (gameMode === 'level') {
        drawText(`第 ${currentLevel} 关`, width / 2, 48, 12, '#999');
    } else if (gameMode === 'daily') {
        drawText(dailyDate, width / 2, 48, 12, '#999');
    }

    ctx.fillStyle = COLORS.primary;
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(formatTime(elapsedSeconds), width - 70, 60);

    const actionX = width - 70;
    const actionY = 60;
    drawActionButton('暂停', actionX, actionY - 25, isPaused ? '#4ade80' : '#e0e0e0');
    drawActionButton('重置', actionX, actionY + 10, '#e0e0e0');
    drawActionButton('提示', actionX, actionY + 45, '#fef3c7', '#d97706');

    if (isPaused) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = '#fff';
        fillRoundedRect(width/2 - 100, height * 0.35 - 60, 200, 140, 15);

        ctx.fillStyle = COLORS.text;
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText('游戏暂停', width/2, height * 0.35 - 20);

        drawButton('继续', width/2, height * 0.35 + 20, 150, 40, '#4ade80');
        drawButton('退出', width/2, height * 0.35 + 70, 150, 40, '#e0e0e0', COLORS.text);
        return;
    }

    drawBoxBorders(gridLeft, gridTop);

    const conflicts = findAllConflicts();
    const conflictSet = new Set(conflicts.map(c => `${c.row},${c.col}`));
    const selectedValue = selectedCell ? board[selectedCell.row][selectedCell.col] : 0;
    const selectedBox = selectedCell ? getBoxIndex(selectedCell.row, selectedCell.col) : -1;

    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            const cellX = gridLeft + j * CELL_SIZE + 1;
            const cellY = gridTop + i * CELL_SIZE + 1;
            const cellW = CELL_SIZE - 2;
            const cellH = CELL_SIZE - 2;

            let bgColor = COLORS.cellBg;
            if (selectedCell && selectedCell.row === i && selectedCell.col === j) {
                bgColor = COLORS.selected;
            } else if (selectedCell && (i === selectedCell.row || j === selectedCell.col || getBoxIndex(i, j) === selectedBox)) {
                bgColor = COLORS.highlighted;
            } else if (selectedValue !== 0 && board[i][j] === selectedValue) {
                bgColor = COLORS.sameNumber;
            }

            if (conflictSet.has(`${i},${j}`)) {
                bgColor = COLORS.conflict;
            }

            ctx.fillStyle = bgColor;
            ctx.fillRect(cellX, cellY, cellW, cellH);

            if (conflictSet.has(`${i},${j}`)) {
                ctx.strokeStyle = COLORS.conflictText;
                ctx.lineWidth = 2;
                ctx.setLineDash([3, 3]);
                ctx.beginPath();
                ctx.moveTo(cellX + 4, cellY + cellH - 4);
                ctx.lineTo(cellX + cellW - 4, cellY + cellH - 4);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }
    }

    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            const val = board[i][j];
            if (val === 0) continue;

            const cellX = gridLeft + j * CELL_SIZE;
            const cellY = gridTop + i * CELL_SIZE;

            ctx.fillStyle = initialBoard[i][j] !== 0 ? COLORS.text : COLORS.textLight;
            ctx.font = `bold ${CELL_SIZE * 0.5}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(val.toString(), cellX + CELL_SIZE/2, cellY + CELL_SIZE/2);
        }
    }

    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 9; i++) {
        ctx.beginPath();
        ctx.moveTo(gridLeft, gridTop + i * CELL_SIZE);
        ctx.lineTo(gridLeft + GRID_SIZE, gridTop + i * CELL_SIZE);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(gridLeft + i * CELL_SIZE, gridTop);
        ctx.lineTo(gridLeft + i * CELL_SIZE, gridTop + GRID_SIZE);
        ctx.stroke();
    }

    ctx.lineWidth = 2;
    for (let i = 0; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(gridLeft, gridTop + i * 3 * CELL_SIZE);
        ctx.lineTo(gridLeft + GRID_SIZE, gridTop + i * 3 * CELL_SIZE);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(gridLeft + i * 3 * CELL_SIZE, gridTop);
        ctx.lineTo(gridLeft + i * 3 * CELL_SIZE, gridTop + GRID_SIZE);
        ctx.stroke();
    }

    drawNumberPad();
}

function drawBoxBorders(gridLeft, gridTop) {
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 3;

    for (let i = 1; i < 3; i++) {
        const y = gridTop + i * 3 * CELL_SIZE;
        ctx.beginPath();
        ctx.moveTo(gridLeft + 3, y);
        ctx.quadraticCurveTo(gridLeft + GRID_SIZE/2, y + 15, gridLeft + GRID_SIZE - 3, y);
        ctx.stroke();
    }

    for (let i = 1; i < 3; i++) {
        const x = gridLeft + i * 3 * CELL_SIZE;
        ctx.beginPath();
        ctx.moveTo(x, gridTop + 3);
        ctx.quadraticCurveTo(x + 15, gridTop + GRID_SIZE/2, x, gridTop + GRID_SIZE - 3);
        ctx.stroke();
    }
}

function drawActionButton(text, x, y, bgColor, textColor = COLORS.text) {
    ctx.fillStyle = bgColor;
    fillRoundedRect(x - 30, y - 12, 60, 24, 6);

    ctx.fillStyle = textColor;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
}

function drawNumberPad() {
    const numPadTop = height - 180;
    const numPadLeft = (width - 5 * 60) / 2;

    ctx.fillStyle = '#fff';
    fillRoundedRect(numPadLeft - 10, numPadTop - 10, 320, 140, 10);

    for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 2; j++) {
            if (i === 4 && j === 0) continue;

            const num = i + j * 5;
            if (num > 9) continue;

            const x = numPadLeft + i * 60;
            const y = numPadTop + j * 60;
            const isDelete = i === 4 && j === 1;

            ctx.fillStyle = isDelete ? COLORS.delete : '#f5f5f5';
            fillRoundedRect(x, y, 52, 52, 10);

            ctx.fillStyle = isDelete ? '#fff' : COLORS.text;
            ctx.font = `bold 24px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(isDelete ? '✕' : (num + 1).toString(), x + 26, y + 26);
        }
    }
}

function highlightCells() {
}

function getBoxIndex(row, col) {
    return Math.floor(row / 3) * 3 + Math.floor(col / 3);
}

function inputNumber(num) {
    if (!selectedCell || isPaused) return;

    const { row, col } = selectedCell;
    if (initialBoard[row][col] !== 0) return;

    board[row][col] = num;

    updateConflicts();
    renderBoard();
    saveGameState();

    if (checkWin()) {
        handleWin();
    }
}

function updateConflicts() {
}

function findAllConflicts() {
    const conflicts = [];

    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            const val = board[row][col];
            if (val === 0) continue;

            for (let c = 0; c < 9; c++) {
                if (c !== col && board[row][c] === val) {
                    conflicts.push({ row, col });
                    break;
                }
            }

            for (let r = 0; r < 9; r++) {
                if (r !== row && board[r][col] === val) {
                    if (!conflicts.some(c => c.row === row && c.col === col)) {
                        conflicts.push({ row, col });
                    }
                    break;
                }
            }

            const boxRow = Math.floor(row / 3) * 3;
            const boxCol = Math.floor(col / 3) * 3;
            outer:
            for (let r = 0; r < 3; r++) {
                for (let c = 0; c < 3; c++) {
                    const nr = boxRow + r;
                    const nc = boxCol + c;
                    if ((nr !== row || nc !== col) && board[nr][nc] === val) {
                        if (!conflicts.some(c => c.row === row && c.col === col)) {
                            conflicts.push({ row, col });
                        }
                        break outer;
                    }
                }
            }
        }
    }

    return conflicts;
}

function checkWin() {
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (board[row][col] === 0) return false;
            if (board[row][col] !== solution[row][col]) return false;
        }
    }
    return findAllConflicts().length === 0;
}

function handleWin() {
    stopTimer();

    const records = getRecords();

    if (gameMode === 'normal') {
        if (!records[currentDifficulty] || elapsedSeconds < records[currentDifficulty]) {
            records[currentDifficulty] = elapsedSeconds;
        }
    } else if (gameMode === 'level') {
        if (currentLevel >= (records.maxLevel || 0)) {
            records.maxLevel = Math.min(100, currentLevel + 1);
        }
    } else if (gameMode === 'daily') {
        records.daily = records.daily || [];
        records.daily.push({ date: dailyDate, time: elapsedSeconds });
        if (records.daily.length > 30) {
            records.daily = records.daily.slice(-30);
        }
    }

    saveRecords(records);

    currentScreen = 'win';
    drawWinScreen();
}

function drawWinScreen() {
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, width, height);

    createFireworks();

    const centerX = width / 2;

    ctx.fillStyle = '#fff';
    fillRoundedRect(centerX - 140, height * 0.25, 280, 280, 15);

    ctx.fillStyle = COLORS.primary;
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('恭喜通关！', centerX, height * 0.32);

    ctx.fillStyle = COLORS.text;
    ctx.font = '16px sans-serif';
    ctx.fillText(`用时: ${formatTime(elapsedSeconds)}`, centerX, height * 0.40);
    ctx.fillText(`难度: ${getWinDifficultyText()}`, centerX, height * 0.45);

    const records = getRecords();
    let isNewRecord = false;
    if (gameMode === 'normal') {
        isNewRecord = !records[currentDifficulty] || elapsedSeconds <= records[currentDifficulty];
    }

    if (isNewRecord) {
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText('新纪录！', centerX, height * 0.51);
    }

    drawButton('再来一局', centerX, height * 0.58, 180, 45, COLORS.primary);
    drawButton('返回主页', centerX, height * 0.68, 180, 45, '#ddd', COLORS.text);
}

function getWinDifficultyText() {
    if (gameMode === 'level') return `第 ${currentLevel} 关`;
    if (gameMode === 'daily') return dailyDate;
    return { easy: '简单', medium: '中等', hard: '困难' }[currentDifficulty];
}

function getModeText() {
    if (gameMode === 'level') return '关卡模式';
    if (gameMode === 'daily') return '每日挑战';
    return { easy: '简单', medium: '中等', hard: '困难' }[currentDifficulty] + '模式';
}

let fireworks = [];

function createFireworks() {
    fireworks = [];
    const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#f38181', COLORS.primary];

    for (let i = 0; i < 30; i++) {
        setTimeout(() => {
            fireworks.push({
                x: Math.random() * width,
                y: Math.random() * height * 0.6,
                color: colors[Math.floor(Math.random() * colors.length)],
                particles: []
            });

            for (let j = 0; j < 12; j++) {
                const angle = (j / 12) * Math.PI * 2;
                fireworks[fireworks.length - 1].particles.push({
                    x: fireworks[fireworks.length - 1].x,
                    y: fireworks[fireworks.length - 1].y,
                    vx: Math.cos(angle) * 3,
                    vy: Math.sin(angle) * 3,
                    life: 30
                });
            }
        }, i * 100);
    }
}

function drawFireworks() {
    if (fireworks.length === 0) return;

    fireworks = fireworks.filter(fw => {
        fw.particles = fw.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.1;
            p.life--;

            if (p.life > 0) {
                ctx.globalAlpha = p.life / 30;
                ctx.fillStyle = fw.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
                return true;
            }
            return false;
        });
        return fw.particles.length > 0;
    });
}

function startTimer() {
    stopTimer();
    timerInterval = setInterval(() => {
        if (!isPaused && currentScreen === 'game') {
            elapsedSeconds++;
            renderBoard();
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function togglePause() {
    isPaused = !isPaused;
    renderBoard();
}

function resetGame() {
    board = initialBoard.map(row => [...row]);
    selectedCell = null;
    hintsUsed = 0;
    elapsedSeconds = 0;
    isPaused = false;
    startTimer();
    renderBoard();
    saveGameState();
}

function exitGame() {
    stopTimer();
    currentScreen = 'start';
    drawStartScreen();
}

function giveHint() {
    if (!selectedCell) {
        const emptyCells = [];
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (board[r][c] === 0) {
                    emptyCells.push({ row: r, col: c });
                }
            }
        }
        if (emptyCells.length > 0) {
            const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            selectedCell = randomCell;
        }
    }

    if (selectedCell) {
        const { row, col } = selectedCell;
        if (board[row][col] !== solution[row][col]) {
            board[row][col] = solution[row][col];
            hintsUsed++;
            renderBoard();
            saveGameState();

            if (checkWin()) {
                handleWin();
            }
        }
    }
}

function saveGameState() {
    const state = {
        board,
        initialBoard,
        solution,
        selectedCell,
        elapsedSeconds,
        currentDifficulty,
        currentLevel,
        gameMode,
        dailyDate,
        hintsUsed,
        timestamp: Date.now()
    };
    wx.setStorageSync('sudoku_game_state', state);
}

function loadGameState() {
    const saved = wx.getStorageSync('sudoku_game_state');
    if (saved) {
        if (saved.timestamp && Date.now() - saved.timestamp < 24 * 60 * 60 * 1000) {
            board = saved.board;
            initialBoard = saved.initialBoard;
            solution = saved.solution;
            selectedCell = saved.selectedCell;
            elapsedSeconds = saved.elapsedSeconds;
            currentDifficulty = saved.currentDifficulty;
            currentLevel = saved.currentLevel;
            gameMode = saved.gameMode;
            dailyDate = saved.dailyDate;
            hintsUsed = saved.hintsUsed || 0;

            currentScreen = 'game';
            startTimer();
            renderBoard();
            return true;
        }
    }
    return false;
}

function clearGameState() {
    wx.removeStorageSync('sudoku_game_state');
}

function getRecords() {
    const saved = wx.getStorageSync('sudoku_records');
    return saved || {};
}

function saveRecords(records) {
    wx.setStorageSync('sudoku_records', records);
}

function loadRecords() {
}

function gameLoop() {
    if (currentScreen === 'win') {
        drawWinScreen();
        drawFireworks();
    }
    requestAnimationFrame(gameLoop);
}

init();
gameLoop();