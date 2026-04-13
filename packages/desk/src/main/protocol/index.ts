import path from "node:path";
import { UI_PROTOCOL } from "@desk-framework/shared";
import { net, protocol } from "electron";

export function setupUiProtocol(getFrontendDir: () => string | undefined) {
  protocol.handle(UI_PROTOCOL, (request) => {
    const url = new URL(request.url);
    let pathname = decodeURIComponent(url.pathname);

    if (pathname === "/" || !path.extname(pathname)) {
      pathname = "/index.html";
    }

    const frontendDir = getFrontendDir();
    if (!frontendDir) {
      return new Response("Frontend not found", { status: 404 });
    }

    return net.fetch(`file://${path.join(frontendDir, pathname)}`);
  });
}
