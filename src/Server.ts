import express from 'express';
import http from "http";
import https from "https";
import path from 'path';
import fs from 'fs';
import { Database } from "./types";

export interface ServerStartHttp {
  httpEnable?: boolean;
  httpPort?: number;
}

export interface ServerStartHttps {
  httpsEnable?: boolean;
  httpsPort?: number;
  httpsSSLKey?: string;
  httpsSSLCert?: string;
}

export interface ServerMiddlewareHandler {
  (app: express.Express): void;
}

export interface ServerRouterHandler {
  (app:express.Express, db: Database): express.Router;
}

export type ServerStart = ServerStartHttp & ServerStartHttps;

export interface ServerOptions extends ServerStart{
  db: Database;
  middleware?: string;
}

export default class Server {

  private readonly app: express.Express;

  private httpServer: http.Server;
  private httpsServer: https.Server;
  private options: ServerOptions;

  constructor(options: ServerOptions) {
    this.options = { ...options };
    this.app = express();

    this.autoMiddleware(options.middleware);
  }

  private autoMiddleware(autoDir?: string) {
    if (autoDir === undefined) {
      return;
    }

    const dir = path.resolve(process.cwd(), autoDir);
    if (!fs.existsSync(dir)) {
      return;
    }

    const stat = fs.statSync(dir);
    if (!stat.isDirectory()) {
      return;
    }

    const files = fs.readdirSync(dir);

    files.forEach(file => {
      const filePath = path.join(dir, file);
      const statFile = fs.statSync(filePath);

      if (!statFile.isFile() || !file.match(/\.(j|t)s$/i)) {
        return;
      }

      const handle = require(filePath).default();
      this.app.use(handle);
    });
  }

  public middleware(handle: ServerMiddlewareHandler) {
    handle(this.app);
  }

  public route(handle: ServerRouterHandler) {
    handle(this.app, this.options.db);
  }

  public startHttp(config: ServerStartHttp = {}) {
    const _config = { ...this.options, ...config };
    const { httpPort = 4000 } = _config;

    this.httpServer = http.createServer(this.app);

    this.httpServer.listen(httpPort, () => {
      console.log(`[ SERVER ] HTTP server listening on port`, httpPort);
    });
  }

  public startHttps(config: ServerStartHttps = {}) {
    const _config = { ...this.options, ...config };

    const {
      httpsPort = 443,
      httpsSSLKey = '',
      httpsSSLCert = ''
    } = _config;

    const keyPath = path.resolve(process.cwd(), httpsSSLKey);
    const certPath = path.resolve(process.cwd(), httpsSSLCert);

    const key = fs.existsSync(keyPath) ? fs.readFileSync(keyPath, "utf8") : '';
    const cert = fs.existsSync(certPath) ? fs.readFileSync(certPath, "utf8") : '';

    this.httpsServer = https.createServer({ key, cert }, this.app);

    this.httpsServer.listen(httpsPort, () => {
      console.log("[ SERVER ] HTTPS server listening on port", httpsPort);
    });
  }

  public start(config: ServerStart = {}) {
    return this.options.db
      .connect()
      .then(() => {
        console.log("[ SERVER ] Connected to database");

        const _config = { ...this.options, ...config };

        const { httpEnable = true, httpsEnable } = _config;

        httpEnable && this.startHttp(_config);
        httpsEnable && this.startHttps(_config);
      });
  }

  public stop(): void {
    this.httpServer?.close();
    this.httpsServer?.close();
    console.log("[ SERVER ] Server stopped");
  }

}