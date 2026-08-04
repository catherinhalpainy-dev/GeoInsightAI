import type { LandUseFeature, Position } from "../types/landUse";


export interface LandUseBounds{
    minLongitude: number;
    minLatitude: number;
    maxLongitude: number;
    maxLatitude: number;    
}

export function calculateLandUseBounds(features:readonly LandUseFeature[]):LandUseBounds |null{
    if(features.length ===0){
        return null;
    }

    let minLongitude=Infinity;
    let minLatitude=Infinity;
    let maxLongitude=-Infinity;
    let maxLatitude=-Infinity;

    features.forEach((feature)=>{
        feature.geometry.coordinates.forEach((ring)=>{
            ring.forEach(
                ([longitude,latitude]:Position)=>{
                    minLongitude=Math.min(
                        minLongitude,
                        longitude,
                    );
                    minLatitude=Math.min(
                        minLatitude,
                        latitude,
                    );

                    maxLatitude=Math.max(
                        maxLatitude,
                        latitude,
                    );
                    maxLongitude=Math.max(maxLongitude,longitude);
                }
            )
        })
    });
    return { minLongitude, minLatitude, maxLongitude, maxLatitude };
}