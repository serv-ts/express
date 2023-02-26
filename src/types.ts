export interface Database {
  connect(): Promise<any>;
}