export interface WardItem {
  text: string;
  images: string[];
}

export interface Ward {
  name: string;
  mergedFrom: string[];
  area: string;
  population: string;
  landmarks: WardItem[];
  specialties: WardItem[];
  description: string;
}

export interface WardCSV {
  new_name: string;
  merged_from: string;
  population: string;
  area_km2: string;
}
