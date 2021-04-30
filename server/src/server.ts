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
	CompletionParams,
	CompletionList,
	TextDocumentChangeEvent
} from 'vscode-languageserver';

import { Analyzer } from './analyzer';
import { DocumentManager } from './DocumentManager';
import { ParserFunctions } from './parserFunctions/parserFunctions';

/* Callbacks */
import { OnHover } from './Events/OnHover';
import { OnReference } from './Events/OnReference';
import { OnSignature } from './Events/OnSignature';
import { OnCompletion } from './Events/OnCompletion';
import { OnDiagnostic } from './Events/OnDiagnostic';
import { TextParser } from './TextParser';
import { OnDiagnosticForAllScripts } from './Events/OnDiagnosticAllFiles';

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

// Cache the settings of all open documents
export let documentSettings: Map<string, Thenable<ExampleSettings>> = new Map();

export let CurrentCompletionCharacter :string|undefined = undefined;


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

	documentSettings.clear();
	GlobalManager.clear();
	connection.sendNotification("custom/getFilenames");
	connection.sendNotification("custom/getParserXML");
});

// The example settings
interface ExampleSettings {
	signaturhilfeBeiParserfunktionen: string;
	CodeLens: Boolean;
	AutocompletionMitZusaetzlichenTextedits: Boolean;
	ShowDiagnosisOfCurrentScript: Boolean;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: ExampleSettings = { 
	signaturhilfeBeiParserfunktionen: "Snippet",
	CodeLens: true,
	AutocompletionMitZusaetzlichenTextedits: true,
	ShowDiagnosisOfCurrentScript: true
};

let globalSettings: ExampleSettings = defaultSettings;


connection.onDidChangeConfiguration(change => {
	GlobalManager.clear();

	if (hasConfigurationCapability) {
		// Reset all cached document settings
		documentSettings.clear();
	} else {
		globalSettings = <ExampleSettings>(
			(change.settings.future_c || defaultSettings)
		);
	}
	
	// Revalidate all open text documents
	connection.sendNotification("custom/getFilenames");
	documents.all().forEach(validateTextDocument);
});

export function getDocumentSettings(resource: string): Thenable<ExampleSettings> {
	if (!hasConfigurationCapability) {
		return Promise.resolve(globalSettings);
	}

	let result : Thenable<ExampleSettings>|undefined = documentSettings.get(resource);
	if (!result) {
		result = connection.workspace.getConfiguration({
			scopeUri: resource,
			section: 'future_c'
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
documents.onDidChangeContent((change :TextDocumentChangeEvent) => {
	validateTextDocument(change.document);
});

connection.onRequest("custom/GetScriptNumber", (params :any) :number => {

	let doc = documents.get(params.doc);
	if(doc) {
		let script = GlobalAnalyzer.getEditedScript(params.pos, doc, true);
		if(script) {
			return script.m_scriptnumber;
		}
	}
	return 0;
});


connection.onRequest("custom/getHookStart", (params :any) :any => {

	let doc = documents.get(params.uri);
	let oldDoc = documents.get(params.oldDoc);
	if(doc && oldDoc) {
		let docText = doc.getText();

		let m :RegExpExecArray|null = null;
	
		let additionalChecks = "INSERTINTOSCRIPT";
		if(params.dontCheckOldDoc) {
			additionalChecks = "SCRIPT";
			params.name = "";
		}

		let regex = new RegExp("\\b("+additionalChecks+"):"+params.number+","+params.name+"\\b", "gm");
		// Check if hook does already exist
		if(m = regex.exec(docText)) {
			return {
				posScript: {
					character: 0,
					line: -1
				},
				posToc: {
					character: 0,
					line: -1
				}
			}
		}
		
		let script = null;
		if(!params.dontCheckOldDoc) {
			script = GlobalAnalyzer.getEditedScript(params.pos, oldDoc, true);
		}

		let posScript = GlobalAnalyzer.getPositionForScript(doc, docText, <string>(params.name) ,<number>params.number, script);
		let posToc = GlobalAnalyzer.getPositionForTOC(doc, docText, <string>(params.name) ,<number>params.number, script);

		return {
			posScript: posScript,
			posToc: posToc
		};
	}

	return {
		character: 0,
		line: 0
	};
});

connection.onNotification("custom/GetDiagnosticsForAllScripts", async (obj) => {
	let settings = await documentSettings.get(obj.uri);

	if(settings && settings.ShowDiagnosisOfCurrentScript) {
		let doc = documents.get(obj.uri);
		if(doc) {
			let diag = <Diagnostic[]>GlobalManager.doWithDocuments(documents, doc, obj.pos, OnDiagnosticForAllScripts);
			connection.sendDiagnostics({
				diagnostics: diag,
				uri: obj.uri
			});
		}
	} else {
		connection.sendDiagnostics({uri: obj.uri, diagnostics: []})
	}
});

connection.onNotification("custom/sendFilename", (uris: string[]) => {
	console.log("onNotification custom/sendFilename")
	GlobalManager.clear();
	uris.forEach(element => {
		let doc = documents.get(element);
		if(doc) {
			GlobalManager.delete(element);
		}
		else {
			GlobalManager.addFromFile(element);
		}
	});
});

connection.onNotification("custom/sendParserFunctionXML", (obj :any) => {

	parserFunctions.buildFunctions(obj.uri, obj.root);

});

connection.onNotification("custom/sendCursorPos", (obj) => {
	let doc :string = obj.uri;
	let docc = documents.get(doc);
	if(docc) {
		try {
			let sig = <Diagnostic[]>GlobalManager.doWithDocuments(documents, docc, obj.pos, OnDiagnostic);

			//Send the computed diagnostics to VSCode.
			connection.sendDiagnostics({ uri: docc.uri, diagnostics: sig });
		} catch (error) {
			console.log(error);
		}
		
	}
});


let cachedCodeLensPos :Position|null = null;
connection.onNotification("custom/sendCursorPosReturn", (obj) => {
	cachedCodeLensPos = obj.pos;
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
	if(settings && settings.ShowDiagnosisOfCurrentScript) {
		connection.sendNotification("custom/getCursorPos");
	} else {
		connection.sendDiagnostics({uri: textDocument.uri, diagnostics: []})
	}
}

connection.onDidChangeWatchedFiles(_change => {

	connection.sendNotification("custom/getParserXML");

	// Monitored files have change in VSCode
	console.log('We received an file change event');

});

connection.onCodeAction((params, token) :(Command | CodeAction)[] => {
	let doc = documents.get(params.textDocument.uri);
	if(doc) {
		let variable = doc.getText(params.range);

		return [{
			title: "Extract return and replace with isVariableDefined",
			diagnostics: params.context.diagnostics,
			kind: CodeActionKind.QuickFix,
			edit: {
				changes: {
					[params.textDocument.uri]: [{
						range: params.range,
						newText: "if(H.IsVariableDefined("+variable+")) {\n\t\t//Do Something to prevent execution\n\t}"
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

	if(param.context && param.context.triggerCharacter) {
		CurrentCompletionCharacter = param.context.triggerCharacter;
	}

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


connection.onCodeLens(async (params, token):Promise<CodeLens[]> => {
	let codelens :CodeLens[] = [];
	let doc = documents.get(params.textDocument.uri);
	if(doc && cachedCodeLensPos) {
		let setting = await documentSettings.get(params.textDocument.uri);
		if(setting && setting.CodeLens) {
			let script = GlobalAnalyzer.getCompleteCurrentScript({
				character: cachedCodeLensPos.character, line: cachedCodeLensPos.line
			}, doc, new Map(), false, false, false);
			let text = "";
			if(script) {
				let tempDoc = TextDocument.create(doc.uri, "futurec", 0, script.m_scripttext);
				text = script.m_scripttext;
				let pos = script.m_Position;
				codelens.push({
					range: {
						end: pos,
						start: pos
					},
					command: {
						command: "custom.add.create.design.entry",
						title: "Skript in Design einfügen",
						arguments: [{
							scriptNumber: script.m_scriptnumber
						}]
					}
				});
	
				codelens.push({
					range: {
						end: pos,
						start: pos
					},
					command: {
						command: "custom.delete.design.entry",
						title: "Skript aus Design entfernen",
						arguments: [{
							scriptNumber: script.m_scriptnumber
						}]
					}
				});
		
	
				let pattern2 = /^.*(\/\/ADDHOOK[^0-9]*[0-9]+.*)\s*.*$/gm;
				let m = pattern2.exec(text);
				while(m) {
					let pos2 = tempDoc.positionAt(m.index);
					codelens.push({
						range: {
							end: {
								character: pos2.character,
								line: pos.line + pos2.line
							},
							start: {
								character: pos2.character,
								line: pos.line + pos2.line
							}
						},
						command: { 
							title:"Hook suchen",
							command: "workbench.action.findInFiles",
							arguments: [{
								query: "INSERTINTOSCRIPT:" + script.m_scriptnumber.toString() + "," + m[1],
								triggerSearch: true,
								preserveCase: true,
								useExcludeSettingsAndIgnoreFiles: true,
								isRegex: false,
								isCaseSensitive: true,
								matchWholeWord: true,
								filesToInclude: "**/*.cpp",
							}]
						}
					});
		
					m = pattern2.exec(text);
				}
			}
		}
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
