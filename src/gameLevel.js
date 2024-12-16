import * as LittleJS from "littlejsengine";
const {vec2, TileLayer, TileLayerData} = LittleJS;
import level_1 from "./assets/levels/level_1.json";
const levelsData = [level_1];

export let roomWidthInTiles = 16;

export default function loadLevel(level=0){
    const tileMapData = levelsData[level];
    const levelSize = vec2(tileMapData.width, tileMapData.height);
    LittleJS.initTileCollision(levelSize);
    roomWidthInTiles = levelSize.x;

    // set all level data tiles
    const layerCount = tileMapData.layers.length;
    for (let layer=layerCount; layer--;){
        const layerData = tileMapData.layers[layer].data;
        const tileLayer = new TileLayer(vec2(), levelSize, LittleJS.tile(0,tileMapData.tilewidth,0));
        // Copies of the tilemap for the left and right sides
        const edgeBleedAmount = 0.05;
        const tileLayerLeft = new TileLayer(vec2(-tileMapData.width + edgeBleedAmount, 0), levelSize, LittleJS.tile(0,tileMapData.tilewidth,0));
        const tileLayerRight = new TileLayer(vec2(tileMapData.width - edgeBleedAmount, 0), levelSize, LittleJS.tile(0,tileMapData.tilewidth,0));

        for (let x=levelSize.x; x--;) 
        for (let y=levelSize.y; y--;)
        {
            const pos = vec2(x,levelSize.y-1-y);
            const tile = layerData[y*levelSize.x+x];
            if(tile > 0){
                const data = new TileLayerData(tile-1);
                tileLayer.setData(pos, data);
                tileLayerLeft.setData(pos, data);
                tileLayerRight.setData(pos, data);
                LittleJS.setTileCollisionData(pos, 1);
            }
        }
        tileLayer.redraw();
        tileLayerLeft.redraw();
        tileLayerRight.redraw();
    }
}