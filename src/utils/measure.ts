import {
    distance,
    area,
    polygon,
    
} from "@turf/turf";



export function calculateDistance(
    points: [number, number][]
) {

    if (points.length < 2) {
        return 0;
    }


    let total = 0;


    for (
        let i = 0;
        i < points.length - 1;
        i++
    ) {

        total += distance(
            points[i],
            points[i + 1],
            {
                units: "kilometers"
            }
        );

    }


    return total;

}




export function calculateArea(
    points: [number, number][]
) {

    if (points.length < 3) {
        return 0;
    }


    const poly = polygon([
        [
            ...points,
            points[0]
        ]
    ]);


    return area(poly) / 1000000;

}
