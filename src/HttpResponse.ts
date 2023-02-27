import { Response } from "express";

import ContentType from "./enum/ContentType";
import ErrorCode from "./enum/ErrorCode";
import HeaderStatus from "./enum/HeaderStatus";
import Message from "./enum/Message";

import { CookieParameters, CookieValue } from "./types";
import { SERVER_DEFAULT_COOKIE_TIMEOUT } from "./constants";
import { isUndefined } from "./utils";

export default class HttpResponse {

  private _status: HeaderStatus = HeaderStatus.SUCCESS;

  private _message: string | null = null;

  private _code: string | null = null;

  private _contentType: ContentType = ContentType.JSON;

  private _res: Response;

  private _traces: Array<string | number> = [];

  constructor(res: Response, status?: HeaderStatus, contentType?: ContentType) {
    this._res = res;
    isUndefined(status) || this.status(status);
    isUndefined(contentType) || this.contentType(contentType);
  }

  status(status: HeaderStatus): this {
    this._status = status;
    return this;
  }

  contentType(contentType: ContentType): this {
    this._contentType = contentType;
    return this;
  }

  message(message: string): this {
    this._message = message;
    return this;
  }

  code(code: string): this {
    this._code = code;
    return this;
  }

  traces(traces: Array<string | number>): this {
    this._traces = traces;
    return this;
  }

  cookie(ck: CookieParameters): this {
    Object.keys(ck).forEach(name => {
      const params = ck[name];
      
      let value: CookieValue = ''
      , timeout = SERVER_DEFAULT_COOKIE_TIMEOUT
      , expires = new Date(Date.now() + timeout)
      , httpOnly = false;

      if (typeof params === 'string' || typeof params === 'number') {
        value = params;
      }
      else {
        const [ val, expireOrHttpOnly, http ] = params
        , isNum = typeof expireOrHttpOnly === 'number';

        value = val;
        timeout = isNum && expireOrHttpOnly > 0 ? expireOrHttpOnly : timeout;
        expires = new Date(Date.now() + timeout);
        httpOnly = isNum ? !http : !expireOrHttpOnly;
      }

      this._res.cookie(name, value, {
        secure: process.env.NODE_ENV === 'production',
        httpOnly,
        expires
      });

    });

    return this;
  }

  get(data: any = null) {
    let rs: Record<string, any> = { data, error: null };

    if (this._status > 200 || this._status >= 400) {
        rs.error = {
            message: this._message,
            code: this._code,
            traces: this._traces
        }
    }

    return rs;
  }

  send(data?: any): void {
    this._res
      .status(this._status)
      .contentType(this._contentType)
      .json(this.get(data));
  }

  notExist(message: string, data: any = null) {
    return this
      .status(HeaderStatus.INVALID)
      .code(ErrorCode.NOT_EXIST)
      .message(message)
      .send(data);
  }

  existed(message: string, data: any = null) {
    return this
      .status(HeaderStatus.INVALID)
      .code(ErrorCode.EXISTED)
      .message(message)
      .send(data);
  }

  invalid(message: string, data: any = null) {
    return this
      .status(HeaderStatus.INVALID)
      .code(ErrorCode.INVALID)
      .message(message)
      .send(data);
  }

  authorize() {
    return this
      .status(HeaderStatus.AUTHORIZE)
      .code(ErrorCode.AUTH_FAILURE)
      .message(Message.AUTHORIZE)
      .send();
  }

  internal() {
    return this
      .status(HeaderStatus.INTERNAL)
      .code(ErrorCode.INTERNAL)
      .message(Message.INTERNAL)
      .send();
  }

}