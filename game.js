// ===== SETUP =====
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const blockSize = 24;
const rows = 20;
const cols = 10;

const startBtn = document.getElementById('startBtn');
const scoreboard = document.getElementById('scoreboard');
const dogeGif = document.getElementById('dogeGif');
const bgMusic = document.getElementById('bgMusic');
const barkSound = document.getElementById('barkSound');

const coinImages = {
  BTC:'images/BTC.png',
  ETH:'images/ETH.png',
  DOGE:'images/DOGE.png',
  SOL:'images/SOL.png',
  XRP:'images/XRP.png'
};
const coinTypes = Object.keys(coinImages);

let images = {};
for(let k of coinTypes){
  let img = new Image();
  img.src = coinImages[k];
  images[k] = img;
}

let score = {BTC:0,ETH:0,DOGE:0,SOL:0,XRP:0};
let dogeShown=false;
let grid = Array.from({length:rows},()=>Array(cols).fill(null));

// ===== Tetrominoes =====
const tetrominoes = {
  I:[[1,1,1,1]],
  O:[[1,1],[1,1]],
  T:[[0,1,0],[1,1,1]],
  S:[[0,1,1],[1,1,0]],
  Z:[[1,1,0],[0,1,1]],
  J:[[1,0,0],[1,1,1]],
  L:[[0,0,1],[1,1,1]],
  F:[[1,1,0],[0,1,1]],
  C:[[1,0,0],[1,1,1]]
};

let current = null;
let dropCounter = 0;
let dropInterval = 500;
let lastTime = 0;
let gameActive = false;
let paused = false;

// ===== PARTICLE EFFECT =====
let particles = [];
function createParticles(x,y,coin){
  for(let i=0;i<20;i++){
    particles.push({
      x:x+blockSize/2,
      y:y+blockSize/2,
      vx:(Math.random()-0.5)*2,
      vy:Math.random()*-3,
      alpha:1,
      coin:coin,
      size:Math.random()*blockSize/2+4
    });
  }
}

function drawParticles(){
  for(let i=particles.length-1;i>=0;i--){
    const p = particles[i];
    ctx.globalAlpha = p.alpha;
    ctx.drawImage(images[p.coin], p.x-p.size/2, p.y-p.size/2, p.size, p.size);
    ctx.globalAlpha=1;
    if(!paused){
      p.x+=p.vx;
      p.y+=p.vy;
      p.vy+=0.05;
      p.alpha-=0.03;
      if(p.alpha<=0) particles.splice(i,1);
    }
  }
}

// ===== TETROMINO FUNCTIONS =====
function randomTetromino(){
  const spawnPool = ['I','O','T','S','Z','J','L','F','F','C','C','F','C'];
  const key = spawnPool[Math.floor(Math.random()*spawnPool.length)];
  const shape = tetrominoes[key];
  
  let coins;
  if(Math.random() <0.2){
    const coinType = coinTypes[Math.floor(Math.random()*coinTypes.length)];
    coins = shape.map(row=>row.map(cell=>cell?coinType:null));
  } else {
    coins = shape.map(row=>row.map(cell=>cell?coinTypes[Math.floor(Math.random()*coinTypes.length)]:null));
  }
  
  return {shape, coins, x:Math.floor(cols/2) - Math.floor(shape[0].length/2), y:0};
}

function drawGrid(){
  ctx.clearRect(0,0,cols*blockSize,rows*blockSize);
  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      if(grid[r][c]) ctx.drawImage(images[grid[r][c]], c*blockSize, r*blockSize, blockSize, blockSize);
    }
  }
  if(current){
    for(let r=0;r<current.shape.length;r++){
      for(let c=0;c<current.shape[0].length;c++){
        if(current.shape[r][c] && current.coins[r][c]){
          ctx.drawImage(images[current.coins[r][c]], (current.x+c)*blockSize, (current.y+r)*blockSize, blockSize, blockSize);
        }
      }
    }
  }
  drawParticles();
  if(paused){
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0,0,cols*blockSize,rows*blockSize);
    ctx.fillStyle = 'white';
    ctx.font = '36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', cols*blockSize/2, rows*blockSize/2);
  }
}

function collisionAt(tet, xOffset=0, yOffset=0){
  const shape = tet.shape;
  for(let r=0;r<shape.length;r++){
    for(let c=0;c<shape[0].length;c++){
      if(shape[r][c]){
        const nx = tet.x+c+xOffset;
        const ny = tet.y+r+yOffset;
        if(nx<0||nx>=cols||ny>=rows) return true;
        if(grid[ny][nx]) return true;
      }
    }
  }
  return false;
}

function mergeTetromino(){
  for(let r=0;r<current.shape.length;r++){
    for(let c=0;c<current.shape[0].length;c++){
      if(current.shape[r][c] && current.coins[r][c]){
        const gx = current.x+c;
        const gy = current.y+r;
        grid[gy][gx] = current.coins[r][c];
      }
    }
  }
}

function clearLines(){
  for(let r=rows-1;r>=0;r--){
    if(grid[r].every(cell=>cell)){
      grid[r].forEach((coin,c)=>{
        createParticles(c*blockSize,r*blockSize,coin);
        score[coin]+=1;
      });
      grid.splice(r,1);
      grid.unshift(Array(cols).fill(null));
      r++;
    }
  }
  if(score.DOGE>=20 && !dogeShown){
    dogeGif.style.display='block';
    dogeShown=true;
    barkSound.play();
  }
  updateScoreboard();
}

function rotateTetromino(tet){
  const shape = tet.shape;
  const coins = tet.coins;
  const rowsS = shape.length;
  const colsS = shape[0].length;
  let newShape = Array.from({length:colsS},()=>Array(rowsS).fill(0));
  let newCoins = Array.from({length:colsS},()=>Array(rowsS).fill(null));
  for(let r=0;r<rowsS;r++){
    for(let c=0;c<colsS;c++){
      newShape[c][rowsS-1-r]=shape[r][c];
      newCoins[c][rowsS-1-r]=coins[r][c];
    }
  }
  return {shape:newShape, coins:newCoins};
}

function drop(){
  if(!collisionAt(current,0,1)){
    current.y++;
  } else {
    mergeTetromino();
    clearLines();
    let next = randomTetromino();
    if(collisionAt(next,0,0)){
      alert("Game Over");
      gameActive=false;
      paused=false;
      startBtn.style.display='block';
      bgMusic.pause();
      dogeGif.style.display='none';
    } else {
      current = next;
    }
  }
}

// ===== CONTROLS =====
document.addEventListener('keydown', e=>{
  if(!gameActive) return;

  if(e.key.toLowerCase()==='p'){
    paused = !paused;
    if(paused) bgMusic.pause();
    else bgMusic.play().catch(()=>console.log("Click canvas để bật nhạc"));
    return;
  }

  if(paused) return;

  if(e.key==='ArrowLeft' && !collisionAt(current,-1,0)) current.x--;
  else if(e.key==='ArrowRight' && !collisionAt(current,1,0)) current.x++;
  else if(e.key==='ArrowDown') drop();
  else if(e.key.toLowerCase()==='a' || e.code==='Space'){
    const rotated = rotateTetromino(current);
    const old = {shape:current.shape, coins:current.coins};
    current.shape=rotated.shape;
    current.coins=rotated.coins;
    if(collisionAt(current,0,0)) current=old;
  }
});

// ===== GAME LOOP =====
function update(time=0){
  if(!gameActive) return;
  const delta = time-lastTime;
  lastTime=time;

  if(!paused){
    dropCounter+=delta;
    if(dropCounter>dropInterval){
      drop();
      dropCounter=0;
    }
  }
  drawGrid();
  requestAnimationFrame(update);
}

// ===== START GAME =====
bgMusic.volume=0.3;
startBtn.addEventListener('click',()=>{
  grid = Array.from({length:rows},()=>Array(cols).fill(null));
  score = {BTC:0,ETH:0,DOGE:0,SOL:0,XRP:0};
  dogeShown=false;
  dogeGif.style.display='none';
  particles = [];
  current = randomTetromino();
  dropCounter=0;
  lastTime=performance.now();
  paused=false;
  gameActive=true;
  startBtn.style.display='none';
  bgMusic.currentTime=0;
  bgMusic.play().catch(()=>console.log("Click canvas để bật nhạc"));
  update();
});

function updateScoreboard(){
  scoreboard.textContent = `BTC:${score.BTC}|ETH:${score.ETH}|DOGE:${score.DOGE}|SOL:${score.SOL}|XRP:${score.XRP}`;
}
