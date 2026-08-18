export interface LugsailProject {
  format: 'lugsail-project';
  version: number;
  project: {
    rawData: string[][];
    mapping: Record<string, { value: string[]; ids?: string[] }>;
    userInput?: string;
    chart: string;
    visualOptions?: Record<string, unknown>;
    brandTheme?: Record<string, unknown>;
  };
}
