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
	ViewColumn, 
	TextEditorRevealType, 
	CompletionItem,
	SnippetString,
	CompletionList,
	Range,
	TextEditorEdit,
	ProgressLocation,
	Selection,
	DocumentLink,
	TextEdit,
	Diagnostic,
	ThemeColor
} from 'vscode';

import {

	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind,
	CompletionRequest,
	CompletionItemKind
} from 'vscode-languageclient';


export let client: LanguageClient;
let x: SignatureHelp | null = null;
let lastPos: Position | null = null;

let resimportattributes = workspace.findFiles("**/*importattributes*");

let docDecoration = window.createTextEditorDecorationType({
	color: "grey"
})

let docDecoration2 = window.createTextEditorDecorationType({
	color: "#4EC9B0"
})

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
			fileEvents: workspace.createFileSystemWatcher("**/scriptautocompletedefs.json")
		},
		workspaceFolder: workspace.workspaceFolders[0],
		middleware: {
			handleDiagnostics: (uri, diag, next) => {

				// let diag_temp :Diagnostic[] = [];
				// let diag_temp2 :Diagnostic[] = [];
				// for(let x = 0; x < diag.length; x++) {
				// 	if(diag[x].code == 1000) {
				// 		diag_temp.push(diag[x]);
				// 	}
				// 	if(diag[x].code == 500) {
				// 		diag_temp2.push(diag[x]);
				// 	}
				// }
				window.activeTextEditor.setDecorations(docDecoration ,diag_temp);
				window.activeTextEditor.setDecorations(docDecoration2 ,diag_temp2);
				next(uri, diag);
			},
			provideCompletionItem: async (doc, pos, context, token, next) => {
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

					let items = <CompletionItem[]>await next(doc, pos, context, token);
					let config = workspace.getConfiguration();
					let completion = config.get<string>("future_c.SignaturhilfeBeiParserfunktionen");

					let newItems :CompletionItem[] = [];

					items.forEach(element => {
						if((element.kind == CompletionItemKind.Method || element.kind == CompletionItemKind.Snippet || element.kind == CompletionItemKind.Text)) {
							if(completion == "Snippet") {
								element.insertText = new SnippetString(element.insertText.toString());
							} else if(completion == "Signatur") {
								element.insertText = element.label;
							}
						}

						newItems.push(element);
					});
					return newItems;
				}

				return null;
			},
			provideSignatureHelp: async (doc, pos, token, next) => {
				if (!x || lastPos.line != pos.line) {
					x = null;

					lastPos = pos;
					let ret = await next(doc, pos, token);
					x = ret;
					return x;
				} else {
					if(!x) { return; }

					let line = doc.lineAt(pos);

					let lineBeforeCursor = line.text.substring(0, pos.character);

					let i = 0;
					let isInsideString = false;
					let activeParam = 0;
					let nBracePairs = 0;
					while(i < lineBeforeCursor.length) {
						let char = lineBeforeCursor.charAt(i++);
						if(char == "\"") {
							isInsideString = !isInsideString;
						} else if(char == "(" && !isInsideString){
							nBracePairs++;
						} 
						else if(char == ")" && !isInsideString) {
							nBracePairs--;
						}
						else if(char == "," && !isInsideString) {
							activeParam++;
						}
					}
					
					let exit = lineBeforeCursor.search(/\b[cC]all:.*\(.*\)/);
					let exit2 = lineBeforeCursor.search(/\b[cC]all:.*\(/);
					let exit3 = lineBeforeCursor.search(/\b(S|D|P|H|F|[a-zA-ZöÖäÄüÜ_1-9]*)\..*\(/);
					let exit4 = lineBeforeCursor.search(/\b(S|D|P|H|F|[a-zA-ZöÖäÄüÜ_1-9]*)\..*\(.*\)/);

					if (((exit >= 0 || exit2 < 0) && (exit3 < 0 || exit4 >= 0)) || (nBracePairs == 0) || (activeParam >= x.signatures[0].parameters.length)) {
						x = null;
						return {
							signatures: null,
							activeParameter: 0,
							activeSignature: 0
						};
					}

					x = {
						activeParameter: activeParam,
						activeSignature: x.activeSignature,
						signatures: x.signatures
					}
					return x;
				}
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
			let res2 = await workspace.findFiles(".futurec/scriptautocompletedefs.json");
			res2.forEach((value) => {
				filename = value.toString();
			});

			let root_path = workspace.workspaceFolders[0].uri.toString();
			client.sendNotification("custom/sendParserFunctionXML", {
				uri: filename,
				root: root_path
			});
		})

		client.onNotification("custom/getCursorPos", () => {
			client.sendNotification("custom/sendCursorPos", {uri: window.activeTextEditor.document.uri.toString(), pos: window.activeTextEditor.selection.active});
			client.sendNotification("custom/sendCursorPosReturn", {uri: window.activeTextEditor.document.uri.toString(), pos: window.activeTextEditor.selection.active});
		})

	});

	context.subscriptions.push(commands.registerCommand("Show.columns", async (args) => {
		
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
	}));

	context.subscriptions.push(commands.registerCommand("Check.Skript.Syntax", () => {
		let pos = new Position(window.activeTextEditor.selection.start.line, window.activeTextEditor.selection.start.character);
		let uri = window.activeTextEditor.document.uri;

		client.sendNotification("custom/GetDiagnostic", {pos: pos, uri: uri.toString()});
	}));

	context.subscriptions.push(commands.registerCommand("jump.to.start.of.script", () => {
		let param = client.code2ProtocolConverter.asTextDocumentPositionParams(window.activeTextEditor.document, new Position(window.activeTextEditor.selection.start.line,window.activeTextEditor.selection.start.character))
		client.sendRequest("custom/jump.to.start.of.script", param).then((pos :Position) => {
			try {
				let position = new Position(pos.line, pos.character);
				let range = new Range(position, position);
				
				window.activeTextEditor.revealRange(range, TextEditorRevealType.InCenter);
				//commands.executeCommand("editor.action.insertSnippet", {langId: 'futurec', name: 'log'})
			} catch (error) {
				
			}
		});
	}));

	

	context.subscriptions.push(commands.registerCommand("create.hook", async () => {
		
		let scriptNumber :number = await client.sendRequest("custom/GetScriptNumber", {
			doc: window.activeTextEditor.document.uri.toString(),
			pos: window.activeTextEditor.selection.active
		});
		
		if(scriptNumber > 0) {
			
			let info = "Bitte geben Sie den Namen des Hooks ein.";
			let hookPattern = new RegExp("^\\/\\/ADDHOOK\\-("+scriptNumber+")\\-[a-zA-ZöäüÖÄÜ_0-9]+$", "g");
			let hookname = await window.showInputBox({
				ignoreFocusOut: true,
				valueSelection: [11 + scriptNumber.toString().length, 11 + scriptNumber.toString().length],
				prompt: info,
				value: "//ADDHOOK-"+scriptNumber+"-",
				validateInput: (text :string) => {
					hookPattern.lastIndex = 0;
					if(!hookPattern.exec(text)) {
						return "Hookname muss Pattern " + hookPattern.source + " entsprechen";
					}
					return "";
				}
			});
	
			if(hookname) {
				hookname.trim();
				let uri = await window.showOpenDialog({
					canSelectFolders: false,
					canSelectMany: false,
					filters: { "Dateien": ["cpp"]},
					canSelectFiles: true,
					openLabel: "wählen"
				});
	
				if(uri) {
					let file = uri[0];
					let doc = await workspace.openTextDocument(file);

					window.withProgress({
						location: ProgressLocation.Notification,
						cancellable: false
					}, (progress, token) => {
						progress.report({message: "Es wird nach einer passenden Hookstelle gesucht..."});
						let pos :Thenable<Position> = client.sendRequest("custom/getHookStart", {
							uri: file.toString(),
							name: hookname,
							number: scriptNumber,
							pos: window.activeTextEditor.selection.active,
							oldDoc: window.activeTextEditor.document.uri.toString(),
							dontCheckOldDoc: false
						});

						setTimeout(() => {
							progress.report({message: "Jetzt samma dann gleich fertig..."});
						}, 4000);

						setTimeout(() => {
							progress.report({message: "Kann sich hoffentlich nur mehr um Stunden handeln..."});
						}, 8000);

						setTimeout(() => {
							progress.report({message: "Ziemlich großes Skript..."});
						}, 12000);

						setTimeout(() => {
							progress.report({message: "Jetzt reichts aber..."});
						}, 16000);

						setTimeout(() => {
							progress.report({message: "Ok ich geb auf..."});
						}, 30000);

						return pos.then((bothPos :any) => {
							if(bothPos.posScript.line >= 0) {
								progress.report({ message: "Datei wird geöffnet."});
								let snippet = new SnippetString(
									["",
									"//////////////////////////////////////////////////////////////////////////////",
									"",
									"CHANGE:\t$CURRENT_DATE.$CURRENT_MONTH.$CURRENT_YEAR\t${4:Name}\t$LINE_COMMENT AP-ID:${5:ID}",
									"\t\t${6:Erstellt ${7:asdasd}}",
									"",
									"//////////////////////////////////////////////////////////////////////////////",
									"INSERTINTOSCRIPT:"+scriptNumber+","+hookname,
									"",
									"\t$0",
									"",
									"ENDSCRIPT",
									"//////////////////////////////////////////////////////////////////////////////",
									""
									].join("\n"));
			
									
								window.activeTextEditor.edit((editbuilder) => {
									editbuilder.insert(window.activeTextEditor.selection.active, hookname);
								}).then((success) => {
									if(success) {
										window.showTextDocument(doc, ViewColumn.Beside).then((texteditor) => {
											progress.report({ message: "Hook wird erstellt."});
											let position = new Position(bothPos.posScript.line, bothPos.posScript.character);
											let range = new Range(position, position);
											texteditor.revealRange(range, TextEditorRevealType.InCenter);					
											texteditor.insertSnippet(snippet, position).then((success) => {
												if(success) {
													texteditor.edit((builder :TextEditorEdit) => {
														let position = new Position(bothPos.posToc.line, 0);
														builder.insert(position, "" + scriptNumber + "\t\t" + hookname + "\n");
													});
												} else {
													window.showErrorMessage("Snippet konnte nicht eingefügt werden...");
												}
											});
										});
									} else {
										window.showErrorMessage("Hookname konnte im aktuellen Skript nicht eingefügt werden...");
									}
								})

							} else {
								window.showErrorMessage("Hook konnte nicht angelegt werden, weil er bereits existiert");
							}
						});
						
					});
				}
			}
		} else {
			window.showErrorMessage("Kein gültiges Skript wird bearbeitet. Hook kann nicht erstellt werden.");
		}

	}));


	context.subscriptions.push(commands.registerCommand("create.script", async () => {
		let info = "Bitte geben Sie den Namen des neuen Skripts ein.";
		let scriptName = await window.showInputBox({
			ignoreFocusOut: true,
			prompt: info,
			validateInput: (text :string) => {
				let hookPattern = new RegExp("^[0-9]+,[a-zA-ZöäüÖÄÜ_ ]+$", "g");
				if(!hookPattern.exec(text)) {
					return "Skriptname muss Pattern " + hookPattern.source + " entsprechen";
				}
				return null;
			}
		});

		if(scriptName) {
			scriptName.trim();
			let hookPattern = new RegExp("^([0-9]+),([a-zA-ZöäüÖÄÜ_ ]+)$", "g");
			let m = hookPattern.exec(scriptName);

			let scriptNumber :number = Number.parseInt(m[1]);
			window.withProgress({
				location: ProgressLocation.Notification,
				cancellable: false
			}, (progress_skript_create, token) => {
				progress_skript_create.report({message: "Es wird nach passender Skriptstelle gesucht"})
				let pos :Thenable<Position> = client.sendRequest("custom/getHookStart", {
					uri: window.activeTextEditor.document.uri.toString(),
					name: m[2],
					number: scriptNumber,
					pos: window.activeTextEditor.selection.active,
					oldDoc: window.activeTextEditor.document.uri.toString(),
					dontCheckOldDoc: true
				});

				setTimeout(() => {
					progress_skript_create.report({message: "Jetzt samma dann gleich fertig..."});
				}, 4000);

				setTimeout(() => {
					progress_skript_create.report({message: "Kann sich hoffentlich nur mehr um Stunden handeln..."});
				}, 8000);

				setTimeout(() => {
					progress_skript_create.report({message: "Ziemlich großes Skript..."});
				}, 12000);

				setTimeout(() => {
					progress_skript_create.report({message: "Jetzt reichts aber..."});
				}, 16000);

				setTimeout(() => {
					progress_skript_create.report({message: "Ok ich geb auf..."});
				}, 30000);

				return pos.then((bothPos :any) => {
					if(bothPos.posScript.line >= 0) {

						let snippet  = new SnippetString([
							"",
							"///////////////////////////////////////////////////////////////////////////////",
							"",
							"CHANGE:\t$CURRENT_DATE.$CURRENT_MONTH.$CURRENT_YEAR\t${4:Name}\t$LINE_COMMENT AP-ID:${5:ID}",
							"\t\t${6:Erstellt ${7:asdasd}}",
							"",
							"///////////////////////////////////////////////////////////////////////////////",
							"SCRIPT:"+m[1]+","+m[2]+",0,0,0,${3:Scripticon}",
							"",
							"\tH.LockThisScript();",
							"\tS.RequestSaveAndUnlock(m_TabNr, m_RecNr);",
							"\tS.LockActualRecord();",
							"",
							"\t$0",
							"",
							"\tS.UpdateActualRecord();",
							"\tS.UnlockActualRecord();",
							"",
							"ENDSCRIPT",
							"///////////////////////////////////////////////////////////////////////////////",
							""
						].join("\n"));
	
						let positionScript = new Position(bothPos.posScript.line, bothPos.posScript.character);
						let range = new Range(positionScript, positionScript);
						window.activeTextEditor.revealRange(range, TextEditorRevealType.InCenter);
						window.activeTextEditor.insertSnippet(snippet, positionScript).then((success) => {
							if(success) {
								window.activeTextEditor.edit((editBuilder) => {
									let position = new Position(bothPos.posToc.line, 0);
									editBuilder.insert(position, m[1]+"\t\t"+m[2]+"\n");
								});
							} else {
								window.showErrorMessage("Snippet konnte nicht eingefügt werden...");
							}
						});
						
					} else {
						window.showErrorMessage("Es existiert bereits ein Skript / Hook mit dieser Nummer");
					}
				});
			});
		}
	}));

	context.subscriptions.push(commands.registerCommand("custom.add.create.design.entry", async ( obj :any) => {
		let allUris = await window.showOpenDialog({
			canSelectFiles: true,
			canSelectFolders: false,
			canSelectMany: false,
			filters: {
				Design: ["txt"]
			},
			openLabel: "Design wählen"
		});

		if(allUris && obj && obj.scriptNumber) {
			let tableNumber = await window.showInputBox({
				ignoreFocusOut: true,
				prompt: "Bitte geben Sie die Dialognummer ein, in der das Skript eingefügt werden soll",
				validateInput: (value) => {
					let test = /[0-9]+/g
					if(!test.exec(value)) {
						return "Eingabe muss Pattern " + test.source + " entsprechen";
					}
					return null;
				}
			});
				
			if(tableNumber) {
				let table :number = Number.parseInt(tableNumber);
				let uri = allUris[0];

				window.withProgress({
					location: ProgressLocation.Notification,
					cancellable: false
				}, (progressDesign) => {
					progressDesign.report({ message: "Passender Bereich wird für Designeintrag gesucht..."});

					let thenableDoc = workspace.openTextDocument(uri);
					return thenableDoc.then((doc) => {

						let docText = doc.getText();
						let reg = new RegExp("^(ADDDIALOGINFO:\\b"+table+"\\b.*SCRIPTS=).*\\b"+obj.scriptNumber+"\\b.*$", "gm");
						let m = reg.exec(docText);

						const columnCount = 400;
						const tableCount = 750;

						if(!m) {
							let textToAddAfter = "";
							let textToAddBefore = "";
							let index = -1;

							if(docText.length > 3000) {

								reg = new RegExp("^(ADDDIALOGINFO:\\b"+table+"\\b.*SCRIPTS=).*$", "gm");
								m = reg.exec(docText);
								if(m) {
									index = m.index + (<string>m[1]).length;
									textToAddAfter = ",";
								}

								if(index < 0) {
									reg = new RegExp("^(ADDDIALOGINFO:\\b"+table+"\\b.*).*$", "gm");
									m = reg.exec(docText);
									if(m) {
										index = m.index + (<string>m[1]).length;
									}
									textToAddBefore = "SCRIPTS=";
									textToAddAfter = ";";
								}
								
								if(index < 0) {
									let start = 0;
									while(index < 0 && start <= columnCount) {
										reg = new RegExp("^(CHANGEDIALOGELEMENT:\\b"+table+"\\b;\\b"+start+"\\b.*)$", "gm");
										m = reg.exec(docText);
										if(m) {
											index = m.index;
										}
										start++;
									}
									textToAddBefore = "ADDDIALOGINFO:"+tableNumber+";SCRIPTS=";
									textToAddAfter = ";\n";
									

									let tableStart = table - 1;
									while(index < 0 && tableStart > 0) {
										start = columnCount;
										while(index < 0 && start > 0) {
											reg = new RegExp("^(CHANGEDIALOGELEMENT:\\b"+tableStart+"\\b;\\b"+start+"\\b.*)$", "gm");
											m = reg.exec(docText);
											if(m) {
												index = m.index + (<string>m[1]).length;
												textToAddBefore = "\n\n\n// Eintrag für Tabelle "+table+"\n"+textToAddBefore;
											}
											start--;
										}
										tableStart--;
									}

									tableStart = table + 1;
									while(index < 0 && tableStart < tableCount) {
										start = 0;
										while(index < 0 && start < columnCount) {
											reg = new RegExp("^(CHANGEDIALOGELEMENT:\\b"+tableStart+"\\b;\\b"+start+"\\b.*)$", "gm");
											m = reg.exec(docText);
											if(m) {
												index = m.index + (<string>m[1]).length;
											}
											start++;
										}
										tableStart++;
									}

									if(index < 0) {
										index = 0;
									}
								}
							} else {
								textToAddBefore = "// Eintrag für Tabelle "+table+"\nADDDIALOGINFO:"+tableNumber+";SCRIPTS=";
								textToAddAfter = ";\n";
								index = 0;
							}


							if(index >= 0) {
								let position = doc.positionAt(index);
								let range = new Range(position, position);
								window.showTextDocument(doc, ViewColumn.Beside).then((editor) => {
									editor.revealRange(range, TextEditorRevealType.InCenter);
									
									editor.edit((builder) => {
										let string = ""+textToAddBefore+obj.scriptNumber+textToAddAfter;
										builder.insert(position, string);
									}).then((success) => {


										let string = ""+textToAddBefore+obj.scriptNumber+textToAddAfter;
										editor.selection = new Selection(position ,doc.positionAt(index+string.length));
										window.showInformationMessage("Designeintrag wurde erfolgreich erstellt.");
									})
								})
							} else {
								window.showErrorMessage("Skript kann nicht automatisch hinzugefügt werden...");
							}
						} else {
							window.showErrorMessage("Skript wurde bereits dieser Tabelle hinzugefügt");
						}
					});
				});
			}
		}
	}));

	context.subscriptions.push(commands.registerCommand("custom.delete.design.entry",  async ( obj :any) => {
		let allUris = await window.showOpenDialog({
			canSelectFiles: true,
			canSelectFolders: false,
			canSelectMany: false,
			filters: {
				"Design": ["txt"]
			},
			openLabel: "wählen"
		});

		if(allUris) {
			let tableNumber = await window.showInputBox({
				ignoreFocusOut: true,
				prompt: "Bitte geben Sie die Tabellenummer ein, aus der Sie das Skript entfernen wollen",
				validateInput: (text) => {
					let regex = /[0-9]+/g;
					if(!regex.exec(text)) {
						return "Tabellennummer muss Pattern " + regex.source + " entsprechen";
					}
					return null;
				}
			})

			if(tableNumber) {
				let tableNumberInt = Number.parseInt(tableNumber);
				let uri = allUris[0];
				let doc = await workspace.openTextDocument(uri);
				let docText = doc.getText();
				
				let regexDesign = new RegExp("^\\b(ADDDIALOGINFO|CHANGEDIALOGELEMENT):\\b"+tableNumberInt+"\\b;.*\\b(SCRIPTS=.*\\b"+obj.scriptNumber+"\\b.*)$", "gm");
				let m = regexDesign.exec(docText);
				if(m) {
					let pos = doc.positionAt(m.index);
					let pos2 = doc.positionAt(m.index + (<string>m[1]).length);
					let range = new Range(pos ,pos2);
					
					let editor = await window.showTextDocument(doc, ViewColumn.Beside, false);
					editor.revealRange(range, TextEditorRevealType.InCenter);
					editor.selection = new Selection(doc.lineAt(pos.line).range.start, doc.lineAt(pos.line).range.end);					
				} else {
					window.showErrorMessage("Skript ist bereits aus Tabelle entfernt worden");
				}
			}

		}

	}));


	//
	// Start the client. This will also launch the server
	client.start();
	window.showInformationMessage("activation finished");
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}

