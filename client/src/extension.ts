/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from 'path';
import { workspace, 
	ExtensionContext, 
	ProviderResult, 
	SignatureHelp, 
	Position, 
	commands, 
	window,
	Uri, 
	ViewColumn, 
	TextEditorRevealType, 
	CodeLens, 
	CompletionItem, 
	ProgressLocation,
	StatusBarAlignment,
	CancellationToken,
	Progress,
	SnippetString,
	CompletionList,
	Range
	
} from 'vscode';

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind,
	Diagnostic,
	CompletionRequest,
	CompletionItemKind,
	NextSignature,
	TextDocumentChangeEvent,
} from 'vscode-languageclient';

export let client: LanguageClient;
let x: SignatureHelp | null = null;
let lastPos: Position | null = null;
let currentNumber :number|null = null;
let codeLens :CodeLens[]|null = null;
let resimportattributes = workspace.findFiles("**/*importattributes*");



export function activate(context: ExtensionContext) {
	// The server is implemented in node
	let serverModule = context.asAbsolutePath(
		path.join('server', 'out', 'server.js')
	);
	// The debug options for the server
	// --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging
	let debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

	// If the extension is launched in debug mode then the debug server options are used
	// Otherwise the run options are used
	let serverOptions: ServerOptions = {
		run: { module: serverModule, transport: TransportKind.ipc },
		debug: {
			module: serverModule,
			transport: TransportKind.ipc,
			options: debugOptions
		}
	};

	// Options to control the language client
	let clientOptions: LanguageClientOptions = {
		// Register the server for plain text documents
		documentSelector: [{ scheme: 'file', language: 'futurec'}],
		synchronize: {
			// Notify the server about file changes to '.clientrc files contained in the workspace
			fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
		},
		workspaceFolder: workspace.workspaceFolders[0],
		middleware: {
			provideCompletionItem: async (doc, pos, context) => {
				
				let rangeAtPos = doc.getWordRangeAtPosition(pos);
				let text = "";
				if(rangeAtPos) {
					text = doc.getText(rangeAtPos);
				}
				let number = parseInt(text);
				if(!isNaN(number) && number > 30) {
					let line = doc.lineAt(pos);
					if(line.text.search(/\bS\..*\(.*\);/) >= 0) {
						commands.executeCommand("Show.columns", number);
					}
				} else {

					let t = client.code2ProtocolConverter.asCompletionParams(doc, pos, context);
					let items = await client.sendRequest<CompletionItem[]>(CompletionRequest.type.method, t);
					
					let config = workspace.getConfiguration("future_c");
					
					let completion = config.get<string>("signaturhilfeBeiParserfunktionen");

					items.forEach(element => {
						if((element.kind == CompletionItemKind.Method || element.kind == CompletionItemKind.Snippet)) {
							if(completion == "Snippet") {
								element.insertText = new SnippetString(element.insertText.toString());
							} else if(completion == "Signatur") {
								element.insertText = element.label;
							}
						}
					});
					return new CompletionList(items, false);
				}

				return;
			},
			provideSignatureHelp: (doc, pos, token, next): ProviderResult<SignatureHelp> => {
				if (!x || lastPos.line != pos.line) {
					x = null;
					let t = client.code2ProtocolConverter.asTextDocumentPositionParams(doc, pos);
					let ret = client.sendRequest<SignatureHelp>("textDocument/signatureHelp", t);
					lastPos = pos;
					ret.then(value => {
						x = value;
					})
					return ret;
				} else {
					let line = doc.lineAt(pos);

					let lineBeforeCursor = line.text.substring(0, pos.character);

					let i = lineBeforeCursor.split(",").length - 1;
					let exit = lineBeforeCursor.search(/\b[cC]all:.*\(.*\)/);
					let exit2 = lineBeforeCursor.search(/\b[cC]all:.*\(/);
					let exit3 = lineBeforeCursor.search(/\b(S|D|P|H|F|[a-zA-ZöÖäÄüÜ_1-9]*)\..*\(/);
					let exit4 = lineBeforeCursor.search(/\b(S|D|P|H|F|[a-zA-ZöÖäÄüÜ_1-9]*)\..*\(.*\)/);
					if (((exit >= 0 || exit2 < 0) && (exit3 < 0 || exit4 >= 0)) || (i >= x.signatures[0].parameters.length)) {
						x = null;
						return;
					}

					x = {
						activeParameter: i,
						activeSignature: x.activeSignature,
						signatures: x.signatures
					}
					return x;
				}
			},
			provideCodeLenses: (doc, token, next):ProviderResult<CodeLens[]> => {
				return;
				if(window.activeTextEditor) {

					let editor = window.activeTextEditor;

					let pos = new Position(editor.selection.start.line, editor.selection.start.character);

					let line = doc.lineAt(pos);
					
					let found = line.text.indexOf("S.");
					if(found >= 0 || !codeLens) {

						let pattern = /\(/gm;
						pattern.lastIndex = found;
						let m = pattern.exec(line.text);
						if(m) {
							let patternEnd = /\,/g;
							patternEnd.lastIndex = m.index + 1;
							let endNumber = patternEnd.exec(line.text);
							if(endNumber) {
								let newNumber = parseInt(line.text.substring(m.index + 1, endNumber.index));
								if(newNumber != currentNumber) {
									currentNumber = newNumber
							
									
									let t = client.code2ProtocolConverter.asCodeLensParams(doc);
									let ret = client.sendRequest<CodeLens[]>("textDocument/codeLens", t);
									ret.then(value => {
										codeLens = value;
									});
									return ret;
								}
								else {
									return codeLens;
								}
							}
						}
					}
					return codeLens;
				}
				return;
			}
		}
	};

	// Create the language client and start the client.
	client = new LanguageClient(
		'Future C',
		'Language Server für unsere Hausinterne Skriptsprache',
		serverOptions,
		clientOptions
	);

	client.onReady().then(() => {
		client.onNotification("custom/getFilenames", async () => {
			let res = await workspace.findFiles("Standard/*.cpp");
			let files: string[] = [];
			for (let i = 0; i < res.length; i++) {
				files[i] = res[i].toString();
			}

			client.sendNotification("custom/sendFilename", [files]);
		});

		client.onNotification("custom/getParserXML", async () => {
			let filename = "";
			let res2 = await workspace.findFiles("scriptautocompletedefs.xml");
			res2.forEach((value) => {
				filename = value.toString();
			});
			client.sendNotification("custom/sendParserFunctionXML", filename);
		})
	});


	workspace.onDidCloseTextDocument((e) => {
		
	})
	
	workspace.onDidOpenTextDocument((e) => {
		
	});


	let disp = commands.registerCommand("Show.columns", async (args) => {
		
		let found = false;
		(await resimportattributes).forEach((value) => {
			if(found) {  return; }

			workspace.openTextDocument(value).then((value) => {

				let text = value.getText();
				
				let pos = text.search(new RegExp("^" + args + "\\t5", "gm"));
				if(pos >= 0) {
					found = true;						
					let pos2 = value.positionAt(pos);
					let range = value.getWordRangeAtPosition(pos2);
					window.showTextDocument(value, ViewColumn.Beside, true).then((value) => {
						value.revealRange(range, TextEditorRevealType.AtTop);
					});
				}
			});
		});
		return;

		const editor = window.activeTextEditor;
		
		

				const panel = window.createWebviewPanel(
					'type_id', // Identifies the type of the webview. Used internally
					'Title', // Title of the panel displayed to the user
					ViewColumn.Beside, // Editor column to show the new webview panel in.
					{
						// Enable scripts in the webview
						enableScripts: true
					} // Webview options. More on these later.
				);
				panel.webview.html = "<!DOCTYPE html>\
				<html lang='en'>\
				  <head>\
					<meta charset='UTF-8'>\
					<meta name='viewport' content='width=device-width, initial-scale=1.0'>\
					<title>Title</title>\
					<script src='https://code.jquery.com/jquery-3.3.1.slim.min.js' integrity='sha384-q8i/X+965DzO0rT7abK41JStQIAqVgRVzpbzo5smXKp4YfRvH+8abtTE1Pi6jizo' crossorigin='anonymous'></script>\
					<style>\
					p:hover {\
					background-color: grey;\
					cursor: pointer;\
					color: white;\
					}\
					</style>\
				  </head>\
				  <body>\
					<p class='test' value='6'>Kunde</p>\
					<p class='test' value='2'>Auftrag</p>\
					<p class='test' value='4'>Rechnung</p>\
					<p class='test' value='5'>Lieferschein</p>\
					<button onclick='hideAdvise()'>Hide</button>\
					<script>\
					$('.test').click(function() {\
						let text_ = $(this).attr('value');\
						vscode.postMessage({command: 'use',text: text_})\
					});\
					const vscode = acquireVsCodeApi();\
					  function hideAdvise(){\
						vscode.postMessage({command: 'hide'})\
					  }\
					</script>\
				  </body>\
				</html>";
		
		
				// Handle messages from the webview
				window.onDidChangeActiveTextEditor(ev => {
					// 
					ev && ev && ev != editor && panel.dispose();
				});
		
				workspace.onDidCloseTextDocument(
					textDocument => {
						console.log("closed => " + textDocument.isClosed)
						panel.dispose();
					},
					null,
					context.subscriptions
				);
		
				workspace.onDidChangeTextDocument((ev) => {
						
		
						if (ev && ev.contentChanges && ev.contentChanges.length && (ev.contentChanges[0].text || ev.contentChanges[0].rangeLength)) {
							
						} else {
							console.error('No changes detected. But it must be.', ev);
						}
					},
					null,
					context.subscriptions
				);
		
				panel.webview.onDidReceiveMessage((message) => {
						switch (message.command) {
							case 'use':
								
								editor.edit((edit) => {
									let pos = new Position(editor.selection.start.line, editor.selection.start.character)
									edit.insert(pos, message.text);
									//panel.dispose()
								});
								
								return;
							case 'hide':
								panel.dispose();
								
								
								return;
						}
					},
					undefined,
					context.subscriptions
				);
		
				panel.onDidDispose(
					() => {
						
					},
					null,
					context.subscriptions
				)

	});

	const command = 'Check.Skript.Syntax';
	const commandHandler = () => {
		let pos = new Position(window.activeTextEditor.selection.start.line, window.activeTextEditor.selection.start.character);
		let uri = window.activeTextEditor.document.uri;

		client.sendNotification("custom/GetDiagnostic", [pos, uri.toString()]);
	};
  
	context.subscriptions.push(commands.registerCommand(command, commandHandler));
	
	context.subscriptions.push(disp);

	let disp2 = commands.registerCommand("jump.to.start.of.script", () => {
		let param = client.code2ProtocolConverter.asTextDocumentPositionParams(window.activeTextEditor.document, new Position(window.activeTextEditor.selection.start.line,window.activeTextEditor.selection.start.character))
		client.sendRequest("custom/jump.to.start.of.script", param).then((pos :Position) => {
			try {
				let position = new Position(pos.line, pos.character);
				let range = new Range(position, position);

				window.activeTextEditor.revealRange(range, TextEditorRevealType.InCenter);
			} catch (error) {
				
			}
		});
	});
	context.subscriptions.push(disp2);

	//
	// Start the client. This will also launch the server
	client.start();
	window.showInformationMessage("activation finished");
	
};


export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}
