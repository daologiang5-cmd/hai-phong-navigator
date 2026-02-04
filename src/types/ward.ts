export interface Ward {
  name: string;
  mergedFrom: string[];
  area: string;
  population: string;
  landmarks: string[];
  specialties: string[];
  description: string;
}

export interface WardCSV {
  new_name: string;
  merged_from: string;
  population: string;
  area_km2: string;
}
