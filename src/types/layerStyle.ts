export interface LayerStyle{
    layerVisible:boolean;

    fillVisible:boolean;
    fillColor:string;
    fillOpacity:number;

    outlineVisible:boolean;
    outlineColor:string;
    outlineWidth:number;
    outlineOpacity:number;

    colorMode:"single"|"classified";
}

export const DEFAULT_LAYER_STYLE:LayerStyle={
    layerVisible:true,

    fillVisible: true,
    fillColor: "#0d9488",
    fillOpacity: 0.7,

    outlineVisible: true,
    outlineColor: "#ffffff",
    outlineWidth: 1.5,
    outlineOpacity: 1,

    colorMode: "classified",
}

export interface LayerStylePreset {
    id: string;
    name: string;
    style: Partial<LayerStyle>;
    // 预设只需设置部分字段
    // Partial<LayerStyle>:
    // 将interface LayerStyle{
    //     fillVisible:boolean;
    //     fillColor:string;
    //     ....
    // }变成
    // interface LayerStyle{
    //     fillVisible?:boolean;
    //     fillColor?:string;
    //     ....
    // }
}