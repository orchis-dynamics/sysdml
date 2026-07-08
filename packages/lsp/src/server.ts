import { createConnection, ProposedFeatures } from "vscode-languageserver/node.js";

import { startServer } from "./server-core.js";

startServer(createConnection(ProposedFeatures.all));
