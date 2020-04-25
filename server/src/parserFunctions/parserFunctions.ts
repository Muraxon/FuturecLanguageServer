import { readFileSync } from 'fs';
import { uriToFilePath } from 'vscode-languageserver/lib/files';
import * as xml2js from "xml2js";
import { CompletionItem, CompletionItemKind, InsertTextFormat, Position, TextEdit, MarkupContent, MarkupKind } from 'vscode-languageserver';

export class ParserFunctions {

	m_CompletionItemDialog :CompletionItem[] = [];
	m_CompletionItemDatabase :CompletionItem[] = [];
	m_CompletionItemPrinter :CompletionItem[] = [];
	m_CompletionItemFile :CompletionItem[] = [];
	m_CompletionItemHelper :CompletionItem[] = [];
	m_CompletionItemCString :CompletionItem[] = [];
	m_CompletionItemTable :CompletionItem[] = [];
	m_CompletionItemCMoney :CompletionItem[] = [];
	m_CompletionItemCDateTime :CompletionItem[] = [];
	m_CompletionItemConstants :CompletionItem[] = [];

	constructor() {}

	async buildFunctions(uri :string) {
		let wholeFile = readFileSync(uriToFilePath(uri)!, "utf-8");

		xml2js.parseString(wholeFile, (err, result) => {

			let i = 0;
			while (result.root.snippet[i]) {

				let docu = "";
				if(result.root.snippet[i].docu) {
					docu = result.root.snippet[i].docu[0];
				} else {
					docu = result.root.snippet[i].keyword[0];
				}
				let item :CompletionItem = {
					label: result.root.snippet[i].keyword[0],
					documentation: docu,
					kind: CompletionItemKind.Function,
					insertTextFormat: InsertTextFormat.Snippet,
					insertText: result.root.snippet[i].text[0]
				}

				if(result.root.snippet[i].context != undefined) {
					if(result.root.snippet[i].context[0] == "D") {
						this.m_CompletionItemDialog.push(item);
					} else if(result.root.snippet[i].context[0] == "H") {
						this.m_CompletionItemHelper.push(item);
					} else if(result.root.snippet[i].context[0] == "F") {
						this.m_CompletionItemFile.push(item);
					} else if(result.root.snippet[i].context[0] == "S") {
						this.m_CompletionItemDatabase.push(item);
						
					} else if(result.root.snippet[i].context[0] == "CTable") {
						this.m_CompletionItemTable.push(item);
						
					} else if(result.root.snippet[i].context[0] == "CMoney") {
						this.m_CompletionItemCMoney.push(item);
						
					} else if(result.root.snippet[i].context[0] == "CString") {
						this.m_CompletionItemCString.push(item);
						
					} else if(result.root.snippet[i].context[0] == "CDateTime") {
						this.m_CompletionItemCDateTime.push(item);
					} else if(result.root.snippet[i].context[0] == "P") {
						this.m_CompletionItemPrinter.push(item);
					} else {
						item.kind = CompletionItemKind.Variable;
						if(item.documentation) {
							item.documentation = {
								kind: MarkupKind.Markdown,
								value: [item.documentation.toString()].join("\n")
							}
						}
						this.m_CompletionItemConstants.push(item);
					}
				} else {
					item.kind = CompletionItemKind.Constant;
					this.m_CompletionItemConstants.push(item);
				}

				i++;
			}
			
			
		});

	}

	adjustCompletionItem(items :CompletionItem[], pos :Position) {
		// items.forEach(element => {
		// 	element.textEdit = TextEdit.insert(pos, <string>element.documentation);
		// 	element.insertTextFormat = InsertTextFormat.Snippet;
		// });
		// console.log(items);
	}

	getDialogFunctions(pos :Position) {
		this.adjustCompletionItem(this.m_CompletionItemDialog, pos);
		return this.m_CompletionItemDialog
	}
	
	getDatabaseFunctions(pos :Position) {
		this.adjustCompletionItem(this.m_CompletionItemDatabase, pos);
		return this.m_CompletionItemDatabase
	}

	getFileFunctions(pos :Position) {
		this.adjustCompletionItem(this.m_CompletionItemFile, pos);
		return this.m_CompletionItemFile
	}

	getHelperFunctions(pos :Position) {
		this.adjustCompletionItem(this.m_CompletionItemHelper, pos);
		return this.m_CompletionItemHelper
	}

	getCStringFunctions(pos :Position) {
		this.adjustCompletionItem(this.m_CompletionItemCString, pos);
		return this.m_CompletionItemCString
	}

	getTableFunctions(pos :Position) {
		this.adjustCompletionItem(this.m_CompletionItemTable, pos);
		return this.m_CompletionItemTable
	}

	getMoneyFunctions(pos :Position) {
		this.adjustCompletionItem(this.m_CompletionItemCMoney, pos);
		return this.m_CompletionItemCMoney
	}

	getDateTimeFunctions(pos :Position) {
		this.adjustCompletionItem(this.m_CompletionItemCDateTime, pos);
		return this.m_CompletionItemCDateTime;
	}

	getPrinterFunctions(pos :Position) {
		this.adjustCompletionItem(this.m_CompletionItemPrinter, pos);
		return this.m_CompletionItemPrinter;
	}

	getConstantVariables() {
		return this.m_CompletionItemConstants
	}

}