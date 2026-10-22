declare module "papaparse" {
  export type ParseError = {
    message: string;
    code?: string;
    row?: number;
  };

  export type ParseResult<T> = {
    data: T[];
    errors: ParseError[];
  };

  export function parse<T>(
    input: string,
    config: {
      header?: boolean;
      skipEmptyLines?: boolean | "greedy";
      transformHeader?: (header: string) => string;
    }
  ): ParseResult<T>;

  export function unparse(
    data: Array<Record<string, unknown>>,
    config?: {
      columns?: string[];
      header?: boolean;
      newline?: string;
    }
  ): string;

  const Papa: {
    parse: typeof parse;
    unparse: typeof unparse;
  };

  export default Papa;
}
