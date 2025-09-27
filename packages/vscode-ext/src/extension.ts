import { ExtensionContext, languages } from 'vscode';

export function activate(context: ExtensionContext) {
  const collection = languages.createDiagnosticCollection('storyflow');
  context.subscriptions.push(collection);

  context.subscriptions.push(
    languages.registerDocumentSemanticTokensProvider(
      { language: 'storyflow' },
      {
        provideDocumentSemanticTokens() {
          return undefined;
        }
      },
      { tokenTypes: [], tokenModifiers: [] }
    )
  );

  collection.set([], []);
}

export function deactivate() {}
