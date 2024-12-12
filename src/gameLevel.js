import * as LittleJS from "littlejsengine";
const {vec2, TileLayer, TileLayerData} = LittleJS;
import level_1 from "./assets/levels/level_1.json";
const levelsData = [level_1];

export default function loadLevel(level=0){
    const tileMapData = levelsData[level];
    const levelSize = vec2(tileMapData.width, tileMapData.height);
    LittleJS.initTileCollision(levelSize);

    // set all level data tiles
    const layerCount = tileMapData.layers.length;
    for (let layer=layerCount; layer--;){
        const layerData = tileMapData.layers[layer].data;
        const tileLayer = new TileLayer(vec2(), levelSize, LittleJS.tile(0,tileMapData.tilewidth,0), vec2(tileMapData.tilewidth, tileMapData.tileheight));

        for (let x=levelSize.x; x--;) 
        for (let y=levelSize.y; y--;)
        {
            const pos = vec2(x,levelSize.y-1-y);
            const tile = layerData[y*levelSize.x+x];
            if(tile > 0){
                const data = new TileLayerData(tile-1);
                tileLayer.setData(pos, data);
                LittleJS.setTileCollisionData(pos, 1);
            }
        }
        tileLayer.redraw();
    }
}