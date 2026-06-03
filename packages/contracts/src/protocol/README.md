# protocol

Messages serialized across the extension ↔ webview process boundary:
`ExtensionToWebviewMessage` and `WebviewToExtensionMessage`. These cross a real wire,
so runtime validation schemas will be added here when introduced.
