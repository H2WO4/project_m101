import WebSocket from 'ws';
import http from 'http';
declare const app: import("express-serve-static-core").Express;
declare const server: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>;
declare const wss: WebSocket.Server<typeof WebSocket, typeof http.IncomingMessage>;
export { app, server, wss };
//# sourceMappingURL=backend-server.d.ts.map