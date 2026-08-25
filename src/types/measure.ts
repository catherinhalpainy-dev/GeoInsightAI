export type MeasureMode =
  | "none"
  | "distance"
  | "area";


export interface MeasureState {

  mode:MeasureMode;

  coordinates:
    [number,number][];

  result:number|null;

}