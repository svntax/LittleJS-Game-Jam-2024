"use strict";

import * as LittleJS from "littlejsengine";
import loadLevel, { levelsList } from "./gameLevel.js";

import tilesUrl from "./assets/tiles.png";
import forestBackground from "./assets/forest_background.png";
import forestBackground2 from "./assets/forest_background_2.png";
import forestBackground3 from "./assets/forest_background_3.png";
import Player from "./Player/Player.js";
import playerSpritesheet from "./Player/gorilla.png";
import smallGorillaSpritesheet from "./Items/small_gorilla.png";
import leopardSpritesheet from "./Enemies/leopard.png";
import titleArtUrl from "./assets/title_art.png";
import ChaseEnemy from "./Enemies/ChaseEnemy.js";
import SmallGorilla from "./Items/SmallGorilla.js";
import Home from "./Items/Home.js";

const {vec2, Timer, keyWasPressed, gamepadWasPressed} = LittleJS;

// show the LittleJS splash screen
LittleJS.setShowSplashScreen(true);

// fix texture bleeding by shrinking tile slightly
LittleJS.setTileFixBleedScale(.5);

// sound effects
const bonusLifeSound = new LittleJS.Sound([.6,,269,.03,.17,.41,,.2,,1,239,.08,.04,,,,,.72,.19,.43,-720]);
export const pickupSound = new LittleJS.Sound([0.8,0,413,.03,.05,.05,,1.8,,19,177,.05,,,,,,.83,.02]);
export const collectedSound = new LittleJS.Sound([1.1,0,450,,.01,.13,,2.7,,-9.5,500,.08,,,,,,.89]);
const playerDiedSound = new LittleJS.Sound([0.7,0,344,.01,.02,.28,1,1.4,,,50,,,,.3,.2,.15,.6,.06]);
const levelCompleteMusic = new LittleJS.Music([[[,0,400,,,,,1.6]],[[[,,1,5,8,13,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,],[,1,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,],[,-1,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,],[,1,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,]]],[0],250,{"title":"Level Complete","instruments":["Instrument 0"],"patterns":["Pattern 0"]}]);
const gameOverMusic = new LittleJS.Music([[[1.3,0,130.8128,.03,.74,.5,1,3.9,,,,,,.3,,,,.31]],[[[,,4,,,,1,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,],[,1,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,],[,-1,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,],[,1,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,]]],[0],100,{"title":"Game Over","instruments":["Instrument 0"],"patterns":["Pattern 0"]}]);
const startGameSound = new LittleJS.Sound([,0,,.01,.02,.09,,.6,17,-3,,,.1,,,,,.76,.08]);

// medals
const medal_example = new LittleJS.Medal(0, "Example Medal", "Welcome to LittleJS!");
LittleJS.medalsInit("Hello World");

// game variables
const bgColor = new LittleJS.Color(0, 61 / 255, 16 / 255);
let forestBgObject;
export let player;
let lives = 2;
let score = 0;
let levelCompletePoints = 5000;
const bonusLifeTiers = [10000, 20000, 40000, 60000, 100000];
let currentBonusLifeIndex = 0;
let highScore = 0;
let currentLevel = 1;
let enemySpawnPoints = [];
let currentLevelData = {};
let homeNest;

class State {
    static get TITLE(){
        return "TITLE";
    }
    static get GAMEPLAY(){
        return "GAMEPLAY";
    }
    static get GAME_OVER(){
        return "GAME_OVER";
    }
}
let gameState = State.TITLE;
let gameOverTimer = new Timer();
let isLoadingNextLevel = false;
let nextLevelTimer = new Timer();
let transitionScreenTimer = new Timer();
let showingTransition = false;


///////////////////////////////////////////////////////////////////////////////
function gameInit(){
    LittleJS.setShowWatermark(false);
    LittleJS.setCanvasPixelated(true);
    //LittleJS.setCanvasMaxSize(vec2(256, 224));
    LittleJS.setCanvasFixedSize(vec2(256, 224));
    LittleJS.setCameraScale(16);
    LittleJS.setTileSizeDefault(vec2(16, 16));
    //LittleJS.setObjectMaxSpeed(8);

    // enable gravity
    LittleJS.setGravity(-.0375);
}

function startGame(){
    startGameSound.play();
    gameState = State.GAMEPLAY;
    LittleJS.engineObjectsDestroy();

    playTransition(0.25);

    score = 0;
    lives = 2;
    currentLevel = 1;
    enemySpawnPoints = [];
    currentLevelData = {};
    isLoadingNextLevel = false;

    setupForestBackground();

    currentLevelData = loadLevel(currentLevel);

    player = new Player(currentLevelData.playerSpawn.add(vec2(1, 0)));
    homeNest = new Home(currentLevelData.playerSpawn.add(vec2(1, 0)));

    // Spawn enemies in the loaded level
    spawnEnemies();

    // Spawn small gorillas to collect
    spawnSmallGorillas();
}

function startNextLevel(){
    isLoadingNextLevel = false;
    LittleJS.engineObjectsDestroy();

    playTransition(0.25);

    currentLevel++;
    // Loop back to first level after completing the final level.
    if(currentLevel > levelsList.length){
        currentLevel = 1;
    }
    enemySpawnPoints = [];

    setupForestBackground();

    currentLevelData = loadLevel(currentLevel);

    player = new Player(currentLevelData.playerSpawn.add(vec2(1, 0)));
    homeNest = new Home(currentLevelData.playerSpawn.add(vec2(1, 0)));

    // Spawn enemies in the loaded level
    spawnEnemies();

    // Spawn small gorillas to collect
    spawnSmallGorillas();
}

function setupForestBackground(){
    // Forest background layer
    forestBgObject = new LittleJS.EngineObject();
    forestBgObject.gravityScale = 0;
    forestBgObject.renderOrder = 0;
    forestBgObject.render = function(){
        if(gameState === State.GAMEPLAY || gameState === State.GAME_OVER){
            for(let bgx = -3; bgx <= 3; bgx++){
                // Note: levels 2 and 3 are different sized widths (not perfect multiples of 256), so the normal image doesn't tile seamlessly
                // Hacky solution is to just have different sized versions of the image
                if(currentLevel === 1){
                    LittleJS.drawTile(vec2(8 + (bgx*(16-0.05)), 8), vec2(16, 14), LittleJS.tile(0, vec2(256, 224), 5), LittleJS.WHITE, 0, false, undefined, false, false, LittleJS.mainContext);
                }
                else if(currentLevel === 2){
                    LittleJS.drawTile(vec2(10 + (bgx*(20-0.05)), 8), vec2(20, 14), LittleJS.tile(0, vec2(320, 224), 6), LittleJS.WHITE, 0, false, undefined, false, false, LittleJS.mainContext);
                }
                else if(currentLevel === 3){
                    LittleJS.drawTile(vec2(12 + (bgx*(24-0.05)), 8), vec2(24, 14), LittleJS.tile(0, vec2(384, 224), 7), LittleJS.WHITE, 0, false, undefined, false, false, LittleJS.mainContext);
                }
            }
        }
    }
}

export function enemyDied(enemy){
    const enemySpawn = enemySpawnPoints[enemy.spawnId].spawnPosition;
    const newEnemy = new ChaseEnemy(enemySpawn);
    newEnemy.spawnId = enemy.spawnId;
}

export function playerDied(){
    playerDiedSound.play();
    restartLevel();
}

export function addScore(amount){
    score += amount;
    if(score > highScore){
        highScore = score;
    }
    // Bonus life calculation
    if(score >= bonusLifeTiers[currentBonusLifeIndex]){
        lives++;
        bonusLifeSound.play();
        currentBonusLifeIndex++;
        if(currentBonusLifeIndex >= bonusLifeTiers.length){
            currentBonusLifeIndex = bonusLifeTiers.length - 1;
        }
    }
}

function spawnEnemies(){
    for(let i = 0; i < currentLevelData.enemySpawns.length; i++){
        const enemySpawn = currentLevelData.enemySpawns[i].add(vec2(1, 0.5));
        const enemy = new ChaseEnemy(enemySpawn);
        enemy.spawnId = i;
        enemySpawnPoints[i] = {
            "spawnPosition": enemySpawn
        };
        let spawnDelay = 1.5;
        if(player.isDead){
            spawnDelay = 4;
        }
        enemy.setSpawnTime(spawnDelay + i*1.5);
    }
}

function spawnSmallGorillas(){
    for(let i = 0; i < currentLevelData.smallGorillaSpawns.length; i++){
        const spawn = currentLevelData.smallGorillaSpawns[i].add(vec2(0.5, 0.5));
        const smallGorilla = new SmallGorilla(spawn);
    }
}

export function respawnPlayer(){
    lives--;
    if(lives < 0){
        // Game over
        lives = 0;
        gameOverTimer.set(3);
        gameState = State.GAME_OVER;
        gameOverMusic.setVolume(1.2);
        gameOverMusic.play();
    }
    else{
        playTransition(0.25);
        player.isDead = false;
        player.isRespawning = false;
        player.angle = 0;
        player.pos.x = currentLevelData.playerSpawn.x + 1;
        player.pos.y = currentLevelData.playerSpawn.y;
    }
}

function restartLevel(){
    // Remove all enemies
    for(let i = 0; i < LittleJS.engineObjects.length; i++){
        const object = LittleJS.engineObjects[i];
        if(object.isEnemy){
            object.queueRemove();
        }
    }
    // Respawn enemies
    spawnEnemies();
}

export function isLevelComplete(){
    let allGorillasSaved = true;
    for(let i = 0; i < LittleJS.engineObjects.length; i++){
        const object = LittleJS.engineObjects[i];
        if(object.isSmallGorilla && !object.isCollectedAndSaved()){
            allGorillasSaved = false;
            break;
        }
    }
    if(allGorillasSaved){
        levelCompleteMusic.play();
        isLoadingNextLevel = true;
        addScore(levelCompletePoints);
        nextLevelTimer.set(3);
        // Remove all enemies
        for(let i = 0; i < LittleJS.engineObjects.length; i++){
            const object = LittleJS.engineObjects[i];
            if(object.isEnemy){
                object.queueRemove();
            }
        }
        return true;
    }
    else{
        return false;
    }
}

// Triggers the full black screen transition
function playTransition(transitionTime){
    showingTransition = true;
    transitionScreenTimer.set(transitionTime);
}

///////////////////////////////////////////////////////////////////////////////
function gameUpdate(){
    if (LittleJS.mouseWasPressed(0)){

        // unlock medals
        //medal_example.unlock();
    }

    if(gameState === State.TITLE){
        LittleJS.setCameraPos(vec2(0, 0));
        const jumpPressed  = keyWasPressed("Space") || keyWasPressed("KeyZ") || keyWasPressed("KeyC") || keyWasPressed("KeyN") || gamepadWasPressed(0);
        if(jumpPressed){
            startGame();
        }
    }

    if(gameState === State.GAMEPLAY){
        if(player){
            LittleJS.setCameraPos(vec2(player.pos.x, (LittleJS.canvasFixedSize.y / 2 / LittleJS.tileSizeDefault.y)));
        }
    }

    if(gameState === State.GAME_OVER){
        if(!gameOverTimer.active()){
            LittleJS.engineObjectsDestroy();
            score = 0;
            playTransition(0.25);
            gameState = State.TITLE;
        }
    }

    if(isLoadingNextLevel){
        if(!nextLevelTimer.active()){
            startNextLevel();
        }
    }

    if(showingTransition){
        if(!transitionScreenTimer.active()){
            showingTransition = false;
        }
    }
}

///////////////////////////////////////////////////////////////////////////////
function gameUpdatePost(){

}

///////////////////////////////////////////////////////////////////////////////
function gameRender(){
    let currentBgColor = bgColor;
    if(gameState === State.TITLE){
        currentBgColor = LittleJS.BLACK;
    }
    LittleJS.drawRect(vec2(128, 112), vec2(256+8, 224+8), currentBgColor, 0, false, true);
    if(gameState === State.TITLE){
        const titleTileInfo = LittleJS.tile(0, vec2(176, 64), 4);
        LittleJS.drawTile(vec2(0, 2.25), vec2(11, 4), titleTileInfo);

        const playerTileInfo = LittleJS.tile(1, 32, 1);
        LittleJS.drawTile(vec2(0.5, -1.5), vec2(2), playerTileInfo);

        const smallGorillaTileInfo = LittleJS.tile(2, 16, 2);
        LittleJS.drawTile(vec2(-1, -2), vec2(1), smallGorillaTileInfo);

        const bushTileInfo = LittleJS.tile(5, vec2(16, 16), 0);
        LittleJS.drawTile(vec2(-3.25, -2), vec2(1, 1), bushTileInfo);
        LittleJS.drawTile(vec2(-2.25, -2), vec2(1, 1), bushTileInfo.frame(1));

        const leopardTileInfo = LittleJS.tile(2, vec2(32, 16), 3);
        LittleJS.drawTile(vec2(2.75, -2), vec2(2, 1), leopardTileInfo, LittleJS.WHITE, 0, true);
        LittleJS.drawTile(vec2(-2.75, -2), vec2(2, 1), leopardTileInfo.frame(3), LittleJS.WHITE, 0);
    }
}

///////////////////////////////////////////////////////////////////////////////
function gameRenderPost(){
    // draw to overlay canvas for hud rendering
    const drawText = (text, x, y, size=8, textAlign="left") =>
    {
        LittleJS.overlayContext.textAlign = textAlign;
        LittleJS.overlayContext.textBaseline = "top";
        LittleJS.overlayContext.font = size + "px 'PressStart2P'";
        LittleJS.overlayContext.fillStyle = "#fff";
        LittleJS.overlayContext.fillText(text, x, y);
    }
    // Score GUI
    drawText("1P", 16, 8);
    drawText(score, 96, 8, 8, "right");
    drawText("TOP", LittleJS.overlayCanvas.width - 104, 8, 8, "left");
    drawText(highScore, LittleJS.overlayCanvas.width - 16, 8, 8, "right");

    if(gameState === State.TITLE){
        drawText("PUSH START BUTTON", LittleJS.overlayCanvas.width / 2, LittleJS.overlayCanvas.height - 48, 8, "center");
    }
    else if(gameState === State.GAMEPLAY){
        // Level complete GUI
        if(isLoadingNextLevel){
            drawText("LEVEL COMPLETE", LittleJS.overlayCanvas.width / 2, 100, 8, "center");
            drawText("BONUS " + levelCompletePoints, LittleJS.overlayCanvas.width / 2, 112, 8, "center");
        }
    
        // Player lives
        const lifeIconTile = LittleJS.tile(7, 16, 0);
        for(let i = 0; i < lives; i++){
            LittleJS.drawTile(vec2(12+(i*14), LittleJS.canvasFixedSize.y - 12), vec2(16), lifeIconTile, LittleJS.WHITE, 0, false, undefined, true, true);
        }
    
    }
    else if(gameState === State.GAME_OVER){
        // Game over screen
        drawText("GAME OVER", LittleJS.canvasFixedSize.x / 2, LittleJS.canvasFixedSize.y / 2 + 4, 8, "center");
    }


    // Black transition screen
    if(showingTransition){
        LittleJS.drawRect(vec2(128, 112), vec2(256+8, 224), LittleJS.BLACK, 0, false, true, LittleJS.overlayContext);
    }
}

///////////////////////////////////////////////////////////////////////////////
// Startup LittleJS Engine
LittleJS.engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost, [tilesUrl, playerSpritesheet, smallGorillaSpritesheet, leopardSpritesheet, titleArtUrl, forestBackground, forestBackground2, forestBackground3]);