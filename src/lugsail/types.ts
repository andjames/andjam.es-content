export interface LugsailProject {
  format: 'lugsail-project';
  version: number;
  brandTheme?: LugsailBrandTheme;
  project: {
    rawData: string[][];
    mapping: Record<string, { value: string[]; ids?: string[] }>;
    userInput?: string;
    chart: string;
    visualOptions?: Record<string, unknown>;
    brandTheme?: LugsailBrandTheme;
  };
}

export interface LugsailBrandTheme {
  title?: string;
  subtitle?: string;
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
}

export interface LugsailChartMeta {
  title?: string;
  subtitle?: string;
  source?: string;
  accentColor?: string;
}
