/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	createConnection,
	TextDocuments,
	TextDocument,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	CompletionItem,
	CompletionItemKind,
	TextDocumentPositionParams,
	Hover,
	Location,
	SignatureHelp,
	SignatureInformation,
	Position,
	CodeLens,
	Diagnostic,
	Command,
	CodeAction,
	CodeActionKind,
	WorkspaceEdit,
	ExecuteCommandRequest,
	CompletionParams,
	CompletionTriggerKind,
	CompletionList,
	TextEdit,
	DocumentLink
} from 'vscode-languageserver';

import { Analyzer } from './analyzer';
import { DocumentManager } from './DocumentManager';
import { ParserFunctions } from './parserFunctions/parserFunctions';

/* Callbacks */
import { OnHover } from './Events/OnHover';
import { OnReference } from './Events/OnReference';
import { OnDefinition } from './Events/OnDefinition';
import { OnSignature } from './Events/OnSignature';
import { OnCompletion } from './Events/OnCompletion';
import { OnDiagnostic } from './Events/OnDiagnostic';
import { TextParser } from './TextParser';


export let parserFunctions :ParserFunctions = new ParserFunctions();

// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
let connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager. The text document manager
// supports full document sync only
let documents: TextDocuments = new TextDocuments();

let hasConfigurationCapability: boolean = false;
let hasWorkspaceFolderCapability: boolean = true;
let hasDiagnosticRelatedInformationCapability: boolean = false;
let paramsimpl:InitializeParams;
export let GlobalAnalyzer = new Analyzer();
let GlobalManager :DocumentManager = new DocumentManager();

connection.onInitialize((params: InitializeParams) => {
	let capabilities = params.capabilities;
	paramsimpl = params;
	
	// Does the client support the `workspace/configuration` request?
	// If not, we will fall back using global settings
	hasConfigurationCapability = !!(
		capabilities.workspace && !!capabilities.workspace.configuration
	);
	hasWorkspaceFolderCapability = !!(
		capabilities.workspace && !!capabilities.workspace.workspaceFolders
	);
	hasDiagnosticRelatedInformationCapability = !!(
		capabilities.textDocument &&
		capabilities.textDocument.publishDiagnostics &&
		capabilities.textDocument.publishDiagnostics.relatedInformation
	);

	return {
		capabilities: {
			textDocumentSync: documents.syncKind,
			// Tell the client that the server supports code completion
			completionProvider: {
				resolveProvider: false,
				triggerCharacters: ['.', ':']
			},
			hoverProvider: true,
			referencesProvider: true,
			definitionProvider: true,
			signatureHelpProvider: {
				triggerCharacters: ['(']
			},
			codeLensProvider: {
				resolveProvider: false
			},
			codeActionProvider: true
		}
	};
});

connection.onInitialized(() => {
	if (hasConfigurationCapability) {
		// Register for all configuration changes.
		connection.client.register(DidChangeConfigurationNotification.type, undefined);
	}
	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			connection.console.log('Workspace folder change event received.');
		});
	}
	console.log("onInitialized");
	GlobalManager.clear();
	connection.sendNotification("custom/getFilenames");
	connection.sendNotification("custom/getParserXML");
});

// The example settings
interface ExampleSettings {
	maxNumberOfProblems: number;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: ExampleSettings = { 
	maxNumberOfProblems: 1000
};

let globalSettings: ExampleSettings = defaultSettings;

// Cache the settings of all open documents
let documentSettings: Map<string, Thenable<ExampleSettings>> = new Map();

connection.onDidChangeConfiguration(change => {
	GlobalManager.clear();

	if (hasConfigurationCapability) {
		// Reset all cached document settings
		documentSettings.clear();
	} else {
		globalSettings = <ExampleSettings>(
			(change.settings.Future_C_Language_Server || defaultSettings)
		);
	}
	console.log("onDidChangeConfiguration");
	// Revalidate all open text documents
	connection.sendNotification("custom/getFilenames");
	documents.all().forEach(validateTextDocument);
});

function getDocumentSettings(resource: string): Thenable<ExampleSettings> {
	if (!hasConfigurationCapability) {
		return Promise.resolve(globalSettings);
	}

	let result = documentSettings.get(resource);
	if (!result) {
		result = connection.workspace.getConfiguration({
			scopeUri: resource,
			section: 'Future_C_Language_Server'
		});
		documentSettings.set(resource, result);
	}
	return result;
}

// Only keep settings for open documents
documents.onDidClose(e => {
	documentSettings.delete(e.document.uri);
	GlobalManager.add(e.document);

});

documents.onDidOpen(e => {
	GlobalManager.delete(e.document.uri);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
	validateTextDocument(change.document);
});

connection.onNotification("custom/GetDiagnostic", (param :Position, param2 :string) => {
	console.log("custom/GetDiagnostic");


	let doc = documents.get(param2);
	if(doc) {
		let diag = <Diagnostic[]>GlobalManager.doWithDocuments(documents, doc, param, OnDiagnostic);
		
		connection.sendDiagnostics({
			diagnostics: diag,
			uri: param2
		})
	}
});

connection.onNotification("custom/sendFilename", (uris: string[]) => {
	console.log("onNotification custom/sendFilename")
	//console.log(documents);
	//console.log(notManageddocuments);
	GlobalManager.clear();

	//console.log(documents);
	uris.forEach(element => {
		let doc = documents.get(element);
		if(doc) {
			GlobalManager.delete(element);
		}
		else {
			GlobalManager.addFromFile(element);
		}
	});
	//console.log(documents);
	//console.log(notManageddocuments);
});

connection.onNotification("custom/sendParserFunctionXML", (uri :string) => {

	parserFunctions.buildFunctions(uri);

});

connection.onRequest("custom/jump.to.start.of.script", (param :TextDocumentPositionParams) :Position => {

	let doc = documents.get(param.textDocument.uri);
	if(doc) {
		return TextParser.getScriptStart(doc, param.position)[0];
	}
	return param.position;
})

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
	// In this simple example we get the settings for every validate run.
	let settings = await getDocumentSettings(textDocument.uri);

	//let sig = <Diagnostic[]>GlobalManager.doWithDocuments(documents, textDocument, {character: 0, line: 0}, OnDiagnostic);
	
	// Send the computed diagnostics to VSCode.
	//connection.sendDiagnostics({ uri: textDocument.uri, diagnostics: sig });
}

connection.onDidChangeWatchedFiles(_change => {
	// Monitored files have change in VSCode
	console.log('We received an file change event');

});

connection.onCodeAction((params, token) :(Command | CodeAction)[] => {
	let doc = documents.get(params.textDocument.uri);
	if(doc) {
		return [{
			title: "Extract return and replace with isVariableDefined",
			diagnostics: params.context.diagnostics,
			kind: CodeActionKind.QuickFix,
			edit: {
				changes: {
					[params.textDocument.uri]: [{
						range: params.range, newText: "if(H.IsVariableDefined(XXX)) {\n\t\t//Do Something to prevent execution\n\t}"
					}]
				}
			}
		}];
	}
	return [];
});

connection.onHover((params :TextDocumentPositionParams, token): Hover => {
	let doc = documents.get(params.textDocument.uri);

	let test = <Hover>GlobalManager.doWithDocuments(documents, doc!, params.position, OnHover);
	//<(docs: Map<string, TextDocument>, curDoc :TextDocument, pos: Position) => Hover, Hover>
	return test;
});

connection.onSignatureHelp((params, token): SignatureHelp => {
	let doc = documents.get(params.textDocument.uri);
	let fnc :SignatureInformation[] = [];
	//console.log("onSignatureHelp");
	if(doc) {
		let signatureHelp = <SignatureHelp>GlobalManager.doWithDocuments(documents, doc, params.position, OnSignature);
		return signatureHelp;

	}
	return {
		activeParameter: 0,
		activeSignature: 0,
		signatures: fnc
	}
});

connection.onReferences((refer, token): Location[] => {
	let doc = documents.get(refer.textDocument.uri);
	if(doc) {
		
		let references = <Location[]>GlobalManager.doWithDocuments(documents, doc, refer.position, OnReference);
		return references;
	}
	return [];
});

connection.onDefinition((param, token): Location[] => {
	let doc = documents.get(param.textDocument.uri);
	if(doc) {
		
		let references = <Location[]>GlobalManager.doWithDocuments(documents, doc, param.position, OnReference);
		return references;
	}
	return [];
});

// This handler provides the initial list of the completion items.
connection.onCompletion((param: CompletionParams, token): CompletionItem[] | CompletionList => {
	// The pass parameter contains the position of the text document in
	// which code complete got requested. For the example we ignore this
	// info and always provide the same completion items.
	let doc = documents.get(param.textDocument.uri);

	let completionitems :CompletionItem[] = new Array();

	if(doc) {
		
		completionitems = GlobalManager.doWithDocuments(documents, doc, param.position, OnCompletion);
		return completionitems;
	}
	return completionitems;
});

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
	(item: CompletionItem, token): CompletionItem => {
		if (item.data === 1) {
			item.detail = 'TypeScript details';
			item.documentation = 'TypeScript documentation';

		} else if (item.data === 2) {
			item.detail = 'JavaScript details';
			item.documentation = 'JavaScript documentation';
		}
		return item;
	}
);

let codelens :CodeLens[] = [];
connection.onCodeLens((params, token):CodeLens[] => {
	let doc = documents.get(params.textDocument.uri);
	if(doc) {
		let text = doc.getText();
		let pattern = /^.*\bS\.(Select|(Set|Add)....?.?.?.?.?.?.?.?)\(.*\)\;.*$/gm;
		let patternFunction = /S\..*/g;
		codelens = [];
		let m :RegExpExecArray|null = null;
		while(m = pattern.exec(text)) {

			patternFunction.lastIndex = m.index;

			m = patternFunction.exec(text);
			if(m) {
				

				let patternStart = /\(/g;
				patternStart.lastIndex = m.index + 1;
				let startNumber = patternStart.exec(text);
				if(startNumber) {
					startNumber.index++;

					let patternEnd = /\,/g;
					patternEnd.lastIndex = startNumber.index;
					let endNumber = patternEnd.exec(text);
					if(endNumber) {
						let tableNumber = text.substring(startNumber.index, endNumber.index);
						let pos = doc.positionAt(startNumber.index);
						let number = parseInt(tableNumber);

						let fallback = "";
						if(isNaN(number)) {
							number = 90;
							fallback = " fallback auf Tabelle 90, weil nicht bestimmbar"
						}
						codelens.push({
							range: {start: {character: pos.character, line: pos.line}, end: {character: pos.character, line: pos.line}},
							command: {
								title: "Spalten anzeigen" + fallback,
								command: "Show.columns",
								arguments: [number]
							}
						});
					}
	
				}

			}
		}
	} else {
		console.log("do nothing");
	}

	return codelens;
});

connection.onDidOpenTextDocument((params) => {
	// A text document got opened in VSCode.
	// params.textDocument.uri uniquely identifies the document. For documents store on disk this is a file URI.
	// params.textDocument.text the initial full content of the document.
	connection.console.log(`${params.textDocument.uri} opened.`);
});

connection.onDidChangeTextDocument((params) => {
	// The content of a text document did change in VSCode.
	// params.textDocument.uri uniquely identifies the document.
	// params.contentChanges describe the content changes to the document.
	connection.console.log(`${params.textDocument.uri} changed: ${JSON.stringify(params.contentChanges)}`);
});

connection.onDidCloseTextDocument((params) => {
	// A text document got closed in VSCode.
	// params.textDocument.uri uniquely identifies the document.
	connection.console.log(`${params.textDocument.uri} closed.`);
});


// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
