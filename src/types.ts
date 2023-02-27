export interface Database {
  connect(): Promise<any>;
}

export type CookieKey = string;

export type CookieValue = string | number;

export type CookieHttpOnly = boolean;

export type CookieTimeoutOrHttpOnly = number | CookieHttpOnly;

export type CookieOptions = [
  CookieValue,
  CookieTimeoutOrHttpOnly?,
  CookieHttpOnly?
];

export type CookieParameters = Record<CookieKey, CookieValue | CookieOptions>;
