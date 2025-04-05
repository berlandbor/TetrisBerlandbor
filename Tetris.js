// Tetris.js — современный JS с комментариями, удержанием клавиш, Play/Pause и автоуровнем

document.addEventListener("DOMContentLoaded", () => {
  alert(`Добро пожаловать в ретро игру: Tetris!

Игра Тетрис была придумана советским программистом Алексеем Пажитновым в 1984 году.
Эта версия написана на JavaScript, HTML5 и CSS. Нажмите OK и наслаждайтесь игрой!`);

  // DOM элементы
  const mainCanvas = document.getElementById("maincanvas");
  const subCanvas = document.getElementById("subcanvas");
  const con = mainCanvas.getContext("2d");
  const ctx = subCanvas.getContext("2d");

  const scoreDisplay = document.getElementById("score");
  const levelDisplay = document.getElementById("level");

  const leftBtn = document.getElementById("left");
  const rightBtn = document.getElementById("right");
  const downBtn = document.getElementById("down");
  const rotateBtn = document.getElementById("rotate");
  const rotateAltBtn = document.getElementById("rotatealt");
  const playBtn = document.getElementById("playBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const resetBtn = document.getElementById("resetBtn");

  // Масштаб страницы под экран
  const resY = window.screen.availHeight;
  const resX = window.screen.availWidth;
  const coeff = (resX * 480 > resY * 380) ? resY / 480 : resX / 380;
  document.getElementById("div").style.transform = `scale(${coeff})`;

  // Цвета фигур
  const colors = [
    null, '#000000', '#031c71', '#800707', '#875205',
    '#054e03', '#034c27', '#045648', '#09477d',
    '#0e077d', '#36086e', '#79067b', '#085f5a'
  ];

  con.scale(20, 20);
  ctx.scale(20, 20);

  const field = createMatrix(20, 12);

  const player = {
    pos: { x: 0, y: 0 },
    matrix: null,
    score: 0
  };

  let nextPiece = 'T';
  let dropInterval = 0;
  let threshold = 1000;
  let lastTime = 0;
  let animationFrameId = null;
  let isPaused = false;

  let keyInterval = null;
  let keyHeld = null;

  function createMatrix(rows, cols) {
    return Array.from({ length: rows }, () => Array(cols).fill(0));
  }

  function createPiece(type) {
    const pieces = {
      'L': [[0,1,0],[0,1,0],[0,1,1]],
      'O': [[2,2],[2,2]],
      'I': [[0,3,0,0],[0,3,0,0],[0,3,0,0],[0,3,0,0]],
      'T': [[0,0,0],[4,4,4],[0,4,0]],
      'S': [[0,5,5],[5,5,0],[0,0,0]],
      'Z': [[6,6,0],[0,6,6],[0,0,0]],
      'J': [[0,7,0],[0,7,0],[7,7,0]],
      'П': [[0,0,0],[8,8,8],[8,0,8]],
      '.': [[0,0,0],[0,9,0],[0,0,0]],
      'h': [[0,10,0],[10,10,10],[10,0,10]],
      ':': [[0,0,0],[0,11,0],[0,11,0]],
      'г': [[0,0,0],[12,12,0],[0,12,0]]
    };
    return pieces[type] || pieces['T'];
  }

  function drawMatrix(matrix, offset, context) {
    matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          context.fillStyle = colors[value];
          context.fillRect(x + offset.x, y + offset.y, 1, 1);
          context.strokeStyle = '#fff';
          context.lineWidth = 0.1;
          context.strokeRect(x + offset.x, y + offset.y, 1, 1);
        }
      });
    });
  }

  function merge(field, player) {
    player.matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          field[y + player.pos.y][x + player.pos.x] = value;
        }
      });
    });
  }

  function collide(field, player) {
    const { matrix, pos } = player;
    for (let y = 0; y < matrix.length; y++) {
      for (let x = 0; x < matrix[y].length; x++) {
        if (
          matrix[y][x] !== 0 &&
          (field[y + pos.y] && field[y + pos.y][x + pos.x]) !== 0
        ) return true;
      }
    }
    return false;
  }

  function rotate(matrix, clockwise = true) {
    for (let y = 0; y < matrix.length; y++) {
      for (let x = 0; x < y; x++) {
        [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
      }
    }
    clockwise ? matrix.forEach(row => row.reverse()) : matrix.reverse();
  }

  function rotatePlayer(clockwise) {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, clockwise);
    while (collide(field, player)) {
      player.pos.x += offset;
      offset = -(offset + (offset > 0 ? 1 : -1));
      if (offset > player.matrix[0].length) {
        rotate(player.matrix, !clockwise);
        player.pos.x = pos;
        return;
      }
    }
  }

  function clearLines() {
    let rowCount = 0;
    outer: for (let y = field.length - 1; y >= 0; y--) {
      if (field[y].every(cell => cell !== 0)) {
        field.splice(y, 1);
        field.unshift(new Array(field[0].length).fill(0));
        y++;
        rowCount++;
      }
    }
    if (rowCount > 0) {
      player.score += rowCount * 10;
      updateScore();
    }
  }

  function updateScore() {
    scoreDisplay.textContent = player.score;
    updateLevel();
  }

  function updateLevel() {
    const level = Math.floor(player.score / 100) + 1;
    levelDisplay.textContent = level;
    threshold = Math.max(1000 - (level - 1) * 100, 100);
  }

  function dropPlayer() {
    player.pos.y++;
    if (collide(field, player)) {
      player.pos.y--;
      merge(field, player);
      resetPlayer();
      clearLines();
    }
    dropInterval = 0;
  }

  function movePlayer(dir) {
    player.pos.x += dir;
    if (collide(field, player)) {
      player.pos.x -= dir;
    }
  }

  function resetPlayer() {
    player.matrix = createPiece(nextPiece);
    nextPiece = randomPiece();
    player.pos.y = 0;
    player.pos.x = ((field[0].length / 2) | 0) - ((player.matrix[0].length / 2) | 0);

    if (collide(field, player)) {
      alert(`⚠ GAME OVER ⚠\nВаш счёт: ${player.score}`);
      for (let y = 0; y < field.length; y++) field[y].fill(0);
      player.score = 0;
      updateScore();
    }
  }

  function drawNext() {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, subCanvas.width, subCanvas.height);
    drawMatrix(createPiece(nextPiece), { x: 1, y: 1 }, ctx);
  }

  function draw() {
    con.fillStyle = '#fff';
    con.fillRect(0, 0, mainCanvas.width, mainCanvas.height);
    drawMatrix(field, { x: 0, y: 0 }, con);
    drawMatrix(player.matrix, player.pos, con);
    drawNext();
  }

  function update(time = 0) {
    if (isPaused) return;
    const delta = time - lastTime;
    lastTime = time;
    dropInterval += delta;
    if (dropInterval > threshold) dropPlayer();
    draw();
    animationFrameId = requestAnimationFrame(update);
  }

  function randomPiece() {
    const pieces = ['L', 'O', 'I', 'T', 'S', 'Z', 'J', 'П', '.', 'h', ':', 'г'];
    return pieces[Math.floor(Math.random() * pieces.length)];
  }

  function startKeyRepeat(action, key) {
    keyHeld = key;
    keyInterval = setInterval(() => {
      if (!isPaused) action();
    }, 100);
  }

  function stopKeyRepeat(key) {
    if (keyHeld === key) {
      clearInterval(keyInterval);
      keyHeld = null;
    }
  }

  // Клавиши
  document.addEventListener("keydown", (e) => {
    if (isPaused || keyHeld === e.key) return;
    switch (e.key) {
      case "ArrowLeft":
      case "a":
      case "A":
        movePlayer(-1);
        startKeyRepeat(() => movePlayer(-1), e.key);
        break;
      case "ArrowRight":
      case "d":
      case "D":
        movePlayer(1);
        startKeyRepeat(() => movePlayer(1), e.key);
        break;
      case "ArrowDown":
      case "s":
      case "S":
        threshold = 50;
        break;
      case "ArrowUp":
      case "w":
      case "W":
        rotatePlayer(true);
        break;
      case " ":
        dropPlayer();
        break;
    }
  });

  document.addEventListener("keyup", (e) => {
    if (["ArrowDown", "s", "S"].includes(e.key)) threshold = 1000;
    stopKeyRepeat(e.key);
  });

  // Кнопки управления
  leftBtn.addEventListener("click", () => movePlayer(-1));
  rightBtn.addEventListener("click", () => movePlayer(1));
  rotateBtn.addEventListener("click", () => rotatePlayer(true));
  rotateAltBtn.addEventListener("click", () => rotatePlayer(false));
  downBtn.addEventListener("touchstart", () => threshold = 50);
  downBtn.addEventListener("touchend", () => threshold = 1000);

  playBtn.addEventListener("click", () => {
    if (isPaused) {
      isPaused = false;
      update();
    }
  });

  pauseBtn.addEventListener("click", () => {
    isPaused = true;
    cancelAnimationFrame(animationFrameId);
  });

  resetBtn.addEventListener("click", () => {
    for (let y = 0; y < field.length; y++) field[y].fill(0);
    player.score = 0;
    updateScore();
    resetPlayer();
    if (isPaused) {
      isPaused = false;
      update();
    }
  });

  window.обновитьСтраницу = () => window.location.href = "index.html";

  // Запуск игры
  resetPlayer();
  update();
});