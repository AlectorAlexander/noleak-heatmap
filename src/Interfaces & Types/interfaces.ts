export interface HeatmapPoint {
    x: number;
    y: number;
    value: number;
    object: string;
  }

export interface JSONHit {
    fields: {
      'deepstream-msg': string[];
    };
  }


export interface JSONData {
    hits: {
      hits: JSONHit[];
    };
  }
