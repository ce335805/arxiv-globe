export interface Affiliation {
  institution: string;
  address: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  geocoded: boolean;
}

export interface Author {
  name: string;
}

export interface PaperData {
  arxiv_id: string;
  title: string;
  authors: Author[];
  abstract: string;
  published: string;
  categories: string[];
  affiliations: Affiliation[];
  metadata: {
    index: number;
    category: string;
    total_affiliations: number;
    geocoded_affiliations: number;
    has_more: boolean;
  };
}
