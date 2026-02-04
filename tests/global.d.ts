/**
 * Type declarations for Jest tests
 * This file helps TypeScript understand .js extensions in imports
 */

declare module '*.js' {
  const value: any;
  export default value;
}

declare module '*.ts' {
  const value: any;
  export default value;
}
