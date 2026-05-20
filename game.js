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

const difficultySettings = {
    easy: { min: 30, max: 40 },
    medium: { min: 25, max: 30 },
    hard: { min: 20, max: 25 }
};

function init() {
    setupEventListeners();
    drawBoxIndicators();
    showStartScreen();
}

function setupEventListeners() {
    document.querySelectorAll('.num-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const num = parseInt(btn.dataset.num);
            inputNumber(num);
        });
    });

    document.addEventListener('keydown', (e) => {
        if (document.getElementById('game-screen').classList.contains('active')) {
            if (e.key >= '1' && e.key <= '9') {
                inputNumber(parseInt(e.key));
            } else if (e.key === 'Backspace' || e.key === '0') {
                inputNumber(0);
            } else if (e.key === 'ArrowUp') moveSelection(-9);
            else if (e.key === 'ArrowDown') moveSelection(9);
            else if (e.key === 'ArrowLeft') moveSelection(-1);
            else if (e.key === 'ArrowRight') moveSelection(1);
        }
    });
}

function drawBoxIndicators() {
    const svg = document.getElementById('box-indicators');
    const grid = document.getElementById('sudoku-grid');
    const cellSize = grid.querySelector('.cell')?.offsetWidth || 38;
    const width = cellSize * 9 + 2;
    const height = cellSize * 9 + 2;

    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.innerHTML = '';

    for (let i = 1; i < 3; i++) {
        const y = cellSize * 3 * i + 1;
        const pathH = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const dH = `M 1 ${y} Q ${width/2} ${y + 15} ${width-1} ${y}`;
        pathH.setAttribute('d', dH);
        pathH.setAttribute('class', 'box-border-h');
        svg.appendChild(pathH);
    }

    for (let i = 1; i < 3; i++) {
        const x = cellSize * 3 * i + 1;
        const pathV = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const dV = `M ${x} 1 Q ${x + 15} ${height/2} ${x} ${height-1}`;
        pathV.setAttribute('d', dV);
        pathV.setAttribute('class', 'box-border-v');
        svg.appendChild(pathV);
    }
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function showStartScreen() {
    stopTimer();
    showScreen('start-screen');
}

function showDifficultySelect() {
    showScreen('difficulty-screen');
}

function showLevelMode() {
    updateLevelProgress();
    showScreen('level-screen');
}

function showDailyChallenge() {
    const today = new Date();
    dailyDate = today.toISOString().split('T')[0];
    document.getElementById('daily-date-display').textContent = today.toLocaleDateString('zh-CN', {
        year: 'numeric', month: 'long', day: 'numeric'
    });

    const records = getRecords();
    const dailyRecords = records.daily || [];
    const todayRecords = dailyRecords.filter(r => r.date === dailyDate);
    document.getElementById('daily-completed').textContent = todayRecords.length;

    if (todayRecords.length > 0) {
        const best = Math.min(...todayRecords.map(r => r.time));
        document.getElementById('daily-best').textContent = formatTime(best);
    } else {
        document.getElementById('daily-best').textContent = '--:--';
    }

    showScreen('daily-screen');
}

function showRecords() {
    const records = getRecords();
    const list = document.getElementById('records-list');

    let html = '<h3>普通模式</h3>';
    ['easy', 'medium', 'hard'].forEach(diff => {
        if (records[diff]) {
            html += `<div class="record-item"><span>${getDiffName(diff)}</span><span>${formatTime(records[diff])}</span></div>`;
        }
    });

    html += '<h3 style="margin-top:15px">关卡模式</h3>';
    html += `<div class="record-item"><span>已通关关卡</span><span>${records.maxLevel || 0} / 100</span></div>`;

    html += '<h3 style="margin-top:15px">每日挑战</h3>';
    if (records.daily && records.daily.length > 0) {
        const lastDaily = records.daily[records.daily.length - 1];
        html += `<div class="record-item"><span>${lastDaily.date}</span><span>${formatTime(lastDaily.time)}</span></div>`;
    } else {
        html += '<div class="record-item"><span>暂无记录</span><span>--:--</span></div>';
    }

    list.innerHTML = html;
    showScreen('records-screen');
}

function getDiffName(diff) {
    return { easy: '简单', medium: '中等', hard: '困难' }[diff] || diff;
}

function changeLevel(delta) {
    currentLevel = Math.max(1, Math.min(100, currentLevel + delta));
    document.getElementById('current-level-display').textContent = currentLevel;
    updateLevelProgress();
}

function updateLevelProgress() {
    const records = getRecords();
    const maxUnlocked = records.maxLevel || 1;
    const progress = Math.min(100, (maxUnlocked / 100) * 100);
    document.getElementById('level-progress-bar').style.width = progress + '%';
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

    document.getElementById('game-mode').textContent = getDiffName(difficulty) + '模式';
    document.getElementById('game-level').textContent = '';

    renderBoard();
    startTimer();
    showScreen('game-screen');

    drawBoxIndicators();
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

    document.getElementById('game-mode').textContent = '关卡模式';
    document.getElementById('game-level').textContent = `第 ${currentLevel} 关`;

    renderBoard();
    startTimer();
    showScreen('game-screen');

    drawBoxIndicators();
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

    document.getElementById('game-mode').textContent = '每日挑战';
    document.getElementById('game-level').textContent = dailyDate;

    renderBoard();
    startTimer();
    showScreen('game-screen');

    drawBoxIndicators();
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
    const grid = document.getElementById('sudoku-grid');
    grid.innerHTML = '';

    for (let i = 0; i < 81; i++) {
        const row = Math.floor(i / 9);
        const col = i % 9;
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.row = row;
        cell.dataset.col = col;

        if (initialBoard[row][col] !== 0) {
            cell.classList.add('fixed');
            cell.textContent = initialBoard[row][col];
        } else if (board[row][col] !== 0) {
            cell.classList.add('empty');
            cell.textContent = board[row][col];
        }

        cell.addEventListener('click', () => selectCell(row, col));
        grid.appendChild(cell);
    }

    updateConflicts();
}

function selectCell(row, col) {
    if (isPaused) return;

    selectedCell = { row, col };
    highlightCells();
}

function highlightCells() {
    const cells = document.querySelectorAll('.cell');
    cells.forEach(c => {
        c.classList.remove('selected', 'highlighted', 'same-number');
    });

    if (!selectedCell) return;

    const { row, col } = selectedCell;
    const selectedValue = board[row][col];
    const selectedBox = getBoxIndex(row, col);

    cells.forEach(c => {
        const r = parseInt(c.dataset.row);
        const cc = parseInt(c.dataset.col);
        const box = getBoxIndex(r, cc);

        if (r === row && cc === col) {
            c.classList.add('selected');
        } else if (r === row || cc === col || box === selectedBox) {
            c.classList.add('highlighted');
        }

        if (selectedValue !== 0 && board[r][cc] === selectedValue) {
            c.classList.add('same-number');
        }
    });
}

function getBoxIndex(row, col) {
    return Math.floor(row / 3) * 3 + Math.floor(col / 3);
}

function moveSelection(delta) {
    if (!selectedCell) {
        selectedCell = { row: 0, col: 0 };
    } else {
        let newIndex = selectedCell.row * 9 + selectedCell.col + delta;
        if (newIndex >= 0 && newIndex < 81) {
            selectedCell.row = Math.floor(newIndex / 9);
            selectedCell.col = newIndex % 9;
        }
    }
    highlightCells();
}

function inputNumber(num) {
    if (!selectedCell || isPaused) return;

    const { row, col } = selectedCell;
    if (initialBoard[row][col] !== 0) return;

    board[row][col] = num;

    const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    cell.textContent = num === 0 ? '' : num;
    cell.classList.toggle('empty', num !== 0);

    updateConflicts();
    highlightCells();
    saveGameState();

    if (checkWin()) {
        handleWin();
    }
}

function updateConflicts() {
    const conflicts = findAllConflicts();

    document.querySelectorAll('.cell').forEach(c => {
        c.classList.remove('conflict');
    });

    conflicts.forEach(({ row, col }) => {
        const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
        if (cell) cell.classList.add('conflict');
    });
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

    const isNewRecord = checkIfNewRecord();
    const records = getRecords();

    if (gameMode === 'normal') {
        if (isNewRecord) {
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

    document.getElementById('win-time').textContent = formatTime(elapsedSeconds);
    document.getElementById('win-difficulty').textContent = getWinDifficultyText();
    document.getElementById('new-record').classList.toggle('hidden', !isNewRecord);

    showScreen('win-screen');
    createFireworks();
}

function getWinDifficultyText() {
    if (gameMode === 'level') return `第 ${currentLevel} 关`;
    if (gameMode === 'daily') return dailyDate;
    return getDiffName(currentDifficulty);
}

function checkIfNewRecord() {
    const records = getRecords();
    if (gameMode === 'normal') {
        return !records[currentDifficulty] || elapsedSeconds < records[currentDifficulty];
    }
    return true;
}

function createFireworks() {
    const container = document.getElementById('fireworks');
    container.innerHTML = '';

    const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#f38181', '#667eea'];

    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            const firework = document.createElement('div');
            firework.className = 'firework';
            firework.style.left = Math.random() * 100 + '%';
            firework.style.top = Math.random() * 60 + '%';
            firework.style.background = colors[Math.floor(Math.random() * colors.length)];
            container.appendChild(firework);

            setTimeout(() => firework.remove(), 1000);
        }, i * 50);
    }

    for (let i = 0; i < 30; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.top = '-10px';
            confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
            container.appendChild(confetti);

            setTimeout(() => confetti.remove(), 3000);
        }, i * 100);
    }
}

function startTimer() {
    stopTimer();
    timerInterval = setInterval(() => {
        if (!isPaused) {
            elapsedSeconds++;
            document.getElementById('timer').textContent = formatTime(elapsedSeconds);
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
    document.getElementById('pause-overlay').classList.toggle('hidden', !isPaused);
    document.getElementById('pause-btn').textContent = isPaused ? '继续' : '暂停';
}

function resetGame() {
    if (confirm('确定要重置本局吗？所有玩家填入的数字将被清除。')) {
        board = initialBoard.map(row => [...row]);
        selectedCell = null;
        hintsUsed = 0;
        elapsedSeconds = 0;
        isPaused = false;

        document.getElementById('pause-overlay').classList.add('hidden');
        document.getElementById('pause-btn').textContent = '暂停';
        document.getElementById('timer').textContent = '00:00';

        renderBoard();
        saveGameState();
    }
}

function exitGame() {
    stopTimer();
    showStartScreen();
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

            const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
            cell.textContent = solution[row][col];
            cell.classList.add('empty', 'hint-highlight');
            cell.classList.remove('conflict');

            setTimeout(() => cell.classList.remove('hint-highlight'), 1500);

            hintsUsed++;
            updateConflicts();
            highlightCells();
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
    localStorage.setItem('sudoku_game_state', JSON.stringify(state));
}

function loadGameState() {
    const saved = localStorage.getItem('sudoku_game_state');
    if (saved) {
        const state = JSON.parse(saved);
        if (state.timestamp && Date.now() - state.timestamp < 24 * 60 * 60 * 1000) {
            board = state.board;
            initialBoard = state.initialBoard;
            solution = state.solution;
            selectedCell = state.selectedCell;
            elapsedSeconds = state.elapsedSeconds;
            currentDifficulty = state.currentDifficulty;
            currentLevel = state.currentLevel;
            gameMode = state.gameMode;
            dailyDate = state.dailyDate;
            hintsUsed = state.hintsUsed || 0;

            document.getElementById('game-mode').textContent = getModeText();
            document.getElementById('game-level').textContent = getLevelText();
            document.getElementById('timer').textContent = formatTime(elapsedSeconds);

            renderBoard();
            if (selectedCell) highlightCells();

            return true;
        }
    }
    return false;
}

function getModeText() {
    if (gameMode === 'level') return '关卡模式';
    if (gameMode === 'daily') return '每日挑战';
    return getDiffName(currentDifficulty) + '模式';
}

function getLevelText() {
    if (gameMode === 'level') return `第 ${currentLevel} 关`;
    if (gameMode === 'daily') return dailyDate;
    return '';
}

function clearGameState() {
    localStorage.removeItem('sudoku_game_state');
}

function getRecords() {
    const saved = localStorage.getItem('sudoku_records');
    return saved ? JSON.parse(saved) : {};
}

function saveRecords(records) {
    localStorage.setItem('sudoku_records', JSON.stringify(records));
}

window.onload = init;
window.onbeforeunload = () => {
    if (document.getElementById('game-screen').classList.contains('active')) {
        saveGameState();
    }
};

showScreen('start-screen');