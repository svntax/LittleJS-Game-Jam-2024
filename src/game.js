"use strict";

import * as LittleJS from "littlejsengine";
import loadLevel from "./gameLevel.js";

import tilesUrl from "./assets/tiles.png";
import Player from "./Player/Player.js";
import playerSpritesheet from "./Player/gorilla.png";

const {vec2} = LittleJS;

// show the LittleJS splash screen
//LittleJS.setShowSplashScreen(true);

// fix texture bleeding by shrinking tile slightly
LittleJS.setTileFixBleedScale(.5);

// sound effects
const sound_click = new LittleJS.Sound([1,.5]);

// medals
const medal_example = new LittleJS.Medal(0, "Example Medal", "Welcome to LittleJS!");
LittleJS.medalsInit("Hello World");

// game variables
const bgColor = new LittleJS.Color(0, 132 / 255, 86 / 255);
let player;
let score = 0;
let highScore = 1000000;

///////////////////////////////////////////////////////////////////////////////
function gameInit(){
    LittleJS.setCanvasPixelated(true);
    //LittleJS.setCanvasMaxSize(vec2(256, 224));
    LittleJS.setCanvasFixedSize(vec2(256, 224));
    LittleJS.setCameraScale(16);
    LittleJS.setTileSizeDefault(vec2(16, 16));
    //LittleJS.setObjectMaxSpeed(8);
    
    loadLevel();

    // enable gravity
    LittleJS.setGravity(-.0375);

    player = new Player(vec2(6, 2));
}

///////////////////////////////////////////////////////////////////////////////
function gameUpdate(){
    if (LittleJS.mouseWasPressed(0)){
        // play sound when mouse is pressed
        sound_click.play(LittleJS.mousePos);

        // unlock medals
        medal_example.unlock();
    }

    LittleJS.setCameraPos(vec2(player.pos.x, (LittleJS.canvasFixedSize.y / 2 / LittleJS.tileSizeDefault.y)));
}

///////////////////////////////////////////////////////////////////////////////
function gameUpdatePost(){

}

///////////////////////////////////////////////////////////////////////////////
function gameRender(){
    LittleJS.drawRect(vec2(128, 112), vec2(256, 224), bgColor, 0, false, true);
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
    drawText("1P", 16, 16);
    drawText(score, 96, 16, 8, "right");
    drawText("TOP", LittleJS.overlayCanvas.width - 104, 16, 8, "left");
    drawText(highScore, LittleJS.overlayCanvas.width - 16, 16, 8, "right");
}

///////////////////////////////////////////////////////////////////////////////
// Startup LittleJS Engine
LittleJS.engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost, [tilesUrl, playerSpritesheet]);