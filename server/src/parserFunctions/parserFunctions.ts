import * as fs from 'fs';
import { 
	CompletionItem, 
	CompletionItemKind, 
	InsertTextFormat,
	Position, 
	MarkupKind, 
	SignatureInformation, 
	ParameterInformation, 
	MarkupContent, 
	TextEdit
} from 'vscode-languageserver';
import { uriToFilePath } from 'vscode-languageserver/lib/files';
import { CursorPositionInformation, } from './../CursorPositionInformation';

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

	m_FunctionHoverStringsDialog :Map<string, string> = new Map();
	m_FunctionHoverStringsDatabase :Map<string, string> = new Map();
	m_FunctionHoverStringsPrinter :Map<string, string> = new Map();
	m_FunctionHoverStringsFile :Map<string, string> = new Map();
	m_FunctionHoverStringsHelper :Map<string, string> = new Map();
	m_FunctionHoverStringsCString :Map<string, string> = new Map();
	m_FunctionHoverStringsTable :Map<string, string> = new Map();
	m_FunctionHoverStringsCMoney :Map<string, string> = new Map();
	m_FunctionHoverStringsCDateTime :Map<string, string> = new Map();
	m_FunctionHoverStringsConstants :Map<string, string> = new Map();

	m_FunctionSignatureMapDialog :Map<string, SignatureInformation> = new Map();
	m_FunctionSignatureMapDatabase :Map<string, SignatureInformation> = new Map();
	m_FunctionSignatureMapPrinter :Map<string, SignatureInformation> = new Map();
	m_FunctionSignatureMapFile :Map<string, SignatureInformation> = new Map();
	m_FunctionSignatureMapHelper :Map<string, SignatureInformation> = new Map();
	m_FunctionSignatureMapCString :Map<string, SignatureInformation> = new Map();
	m_FunctionSignatureMapTable :Map<string, SignatureInformation> = new Map();
	m_FunctionSignatureMapCMoney :Map<string, SignatureInformation> = new Map();
	m_FunctionSignatureMapCDateTime :Map<string, SignatureInformation> = new Map();

	constructor() {}

	addEntries(jsonObject :any, root_path :string, functionSignature :Map<string, SignatureInformation>, functionHoverString :Map<string, string>, completionItems :CompletionItem[]) {
		for(let functionName in jsonObject) {
			let sigInfo :SignatureInformation;
			let hoverString :string = "";
			let completionItem :CompletionItem;

			let singleFunction = jsonObject[functionName];

			let notes = "";
			let returnValue = "";
			let returnValuePlain = "";
			let signature = "";
			let signaturePlain = [];
			let completionText = "";
			for(let y in singleFunction) {
				if(hoverString.length > 0 && y != "context") { hoverString = hoverString + "  \n"; }
				if(y == "notes") {
					notes = singleFunction[y].join("  \n");
					while(notes.search(<string>"__BASE__") > 0) {
						notes = notes.replace("__BASE__", root_path);
					}
				}
				else if(y == "returnvalue") {
					returnValue = "`@return " + this.getMappedReturnValue(singleFunction[y]) + "`";
					returnValuePlain = this.getMappedReturnValue(singleFunction[y]);
				} else if(y == "signature") {
					if((<string>singleFunction[y]).length > 3) {
						signature = "`" + singleFunction[y] + "`";
						signaturePlain = singleFunction[y].split(",");
					} else {
						signature = "`void`";
						signaturePlain = [];
					}
				} else if(y == "text") {
					completionText = singleFunction[y];
				} else if(y == "keyword") {

				}
			}
			hoverString = signature + "  \n___  \n" + returnValue + "  \n___  \n" + notes;
			
			completionItem = {
				label: functionName,
				documentation: {
					kind: MarkupKind.Markdown,
					value: hoverString
				},
				kind: CompletionItemKind.Method,
				insertTextFormat: InsertTextFormat.Snippet,
				data: returnValuePlain,
				insertText: completionText
			}

			let paramInfo :ParameterInformation[] = [];
			for(let x in signaturePlain) {
				paramInfo.push({
					label: signaturePlain[x],
					documentation: {
						value: "`current: " + signaturePlain[x] + "`",
						kind: MarkupKind.Markdown
					}
				})
			}

			sigInfo = {
				label: returnValuePlain + " " + functionName,
				documentation: { 
					kind: MarkupKind.Markdown,
					value: signaturePlain.join("  \n") + "  \n___  \n" + notes
				},
				parameters: paramInfo
			}

			functionSignature.set(functionName, sigInfo);
			completionItems.push(completionItem);
			functionHoverString.set(functionName, hoverString);
		}

	}

	async buildFunctions(uri :string, root_path :string) {

		try {

			let wholeFile = fs.readFileSync(uriToFilePath(uri)!, "utf-8");
		
			let result = JSON.parse(wholeFile);

			if(result.CString) {
				this.addEntries(result.CString, root_path, this.m_FunctionSignatureMapCString, this.m_FunctionHoverStringsCString, this.m_CompletionItemCString);
			}
			if(result.CDateTime) {
				this.addEntries(result.CDateTime,root_path,  this.m_FunctionSignatureMapCDateTime, this.m_FunctionHoverStringsCDateTime, this.m_CompletionItemCDateTime);
			}
			if(result.CTable) {
				this.addEntries(result.CTable, root_path, this.m_FunctionSignatureMapTable, this.m_FunctionHoverStringsTable, this.m_CompletionItemTable);
			}
			if(result.CMoney) {
				this.addEntries(result.CMoney, root_path, this.m_FunctionSignatureMapCMoney, this.m_FunctionHoverStringsCMoney, this.m_CompletionItemCMoney);
			}
			if(result.H) {
				this.addEntries(result.H, root_path, this.m_FunctionSignatureMapHelper, this.m_FunctionHoverStringsHelper, this.m_CompletionItemHelper);
			}
			if(result.D) {
				this.addEntries(result.D, root_path, this.m_FunctionSignatureMapDialog, this.m_FunctionHoverStringsDialog, this.m_CompletionItemDialog);
			}
			if(result.F) {
				this.addEntries(result.F, root_path, this.m_FunctionSignatureMapFile, this.m_FunctionHoverStringsFile, this.m_CompletionItemFile);
			}
			if(result.P) {
				this.addEntries(result.P, root_path, this.m_FunctionSignatureMapPrinter, this.m_FunctionHoverStringsPrinter, this.m_CompletionItemPrinter);
			}
			if(result.S) {
				this.addEntries(result.S, root_path, this.m_FunctionSignatureMapDatabase, this.m_FunctionHoverStringsDatabase, this.m_CompletionItemDatabase);
			}

		} catch(e) {
			console.log(e);
		}
	}

	getMappedReturnValue(val :string) :string{
		if(val == "TYPE_CSTRING") {
			return "CString";
		} else if(val == "TYPE_INT") {
			return "int";
		} else if(val == "TYPE_CTABLE") {
			return "CTable";
		} else if(val == "TYPE_MONEY") {
			return "CMoney";
		} else if(val == "TYPE_DATETIME") {
			return "CDateTime";
		} else if(val == "TYPE_DOUBLE") {
			return "double";
		} else if(val == "TYPE_BOOL") {
			return "BOOL";
		} else if(val == "void") {
			return "void";
		}
		return "undefined (" + val + ")";
	}

	getHover(posInfo :CursorPositionInformation) :string | undefined {
		switch(posInfo.m_context) {
			case "P":
				return this.m_FunctionHoverStringsPrinter.get(posInfo.m_word);
			case "D":
				return this.m_FunctionHoverStringsDialog.get(posInfo.m_word);
			case "F":
				return this.m_FunctionHoverStringsFile.get(posInfo.m_word);
			case "S":
				return this.m_FunctionHoverStringsDatabase.get(posInfo.m_word);
			case "H":
				return this.m_FunctionHoverStringsHelper.get(posInfo.m_word);
			case "CTable":
				return this.m_FunctionHoverStringsTable.get(posInfo.m_word);
			case "CString":
				return this.m_FunctionHoverStringsCString.get(posInfo.m_word);
			case "CDateTime":
				return this.m_FunctionHoverStringsCDateTime.get(posInfo.m_word);
			case "CMoney":
				return this.m_FunctionHoverStringsCMoney.get(posInfo.m_word);
			default:
				return this.m_FunctionHoverStringsConstants.get(posInfo.m_word);
		}
	}

	getSignature(posInfo :CursorPositionInformation) :SignatureInformation | undefined {
		switch(posInfo.m_context) {
			case "P":
				return this.m_FunctionSignatureMapPrinter.get(posInfo.m_word);
			case "D":
				return this.m_FunctionSignatureMapDialog.get(posInfo.m_word);
			case "F":
				return this.m_FunctionSignatureMapFile.get(posInfo.m_word);
			case "S":
				return this.m_FunctionSignatureMapDatabase.get(posInfo.m_word);
			case "H":
				return this.m_FunctionSignatureMapHelper.get(posInfo.m_word);
			case "m_Rec":
			case "m_Rec2":
			case "CTable":
				return this.m_FunctionSignatureMapTable.get(posInfo.m_word);
			case "CString":
				return this.m_FunctionSignatureMapCString.get(posInfo.m_word);
			case "CDateTime":
				return this.m_FunctionSignatureMapCDateTime.get(posInfo.m_word);
			case "CMoney":
				return this.m_FunctionSignatureMapCMoney.get(posInfo.m_word);
			default:
				return undefined;
		}
	}

	adjustCompletionItem(items :CompletionItem[], pos :Position, posInfo :CursorPositionInformation, lineText :string, adjust :Boolean) {
		items.forEach(element => {
			if(element.data) {
				let m = lineText.search(/^.*(foreachrowreverse|foreachrow|while|if|.*=.*).*$/gm);
				if(m < 0 && adjust) {
					if(element.data == "CString" || element.data == "CMoney" || element.data == "CDateTime" || element.data == "CTable" || element.data == "double" || element.data == "int" || element.data == "BOOL") {
						let edit = TextEdit.insert(Position.create(pos.line, pos.character - posInfo.m_word.length - 1 - posInfo.m_context.length), element.data + " " + this.getPrefixFromReturnType(element.data) +  element.label + " = ");
						element.additionalTextEdits = [edit];
					} else {
						element.additionalTextEdits = [];
					}
				} else {
					element.additionalTextEdits = [];
				}
			}
		});
	}

	getPrefixFromReturnType(returnType :string) :string {
		if(returnType == "CString") {
			return "str";
		} else if(returnType == "int") {
			return "n";
		} else if(returnType == "CTable") {
			return "t";
		} else if(returnType == "CMoney") {
			return "m";
		} else if(returnType == "CDateTime") {
			return "dt";
		} else if(returnType == "double") {
			return "d";
		} else if(returnType == "BOOL") {
			return "b";
		} else {
			return "FAILED_RETURN_TYPE";
		}
	}

	getDialogFunctions(pos :Position, posInfo :CursorPositionInformation, lineText :string, adjust :Boolean) {
		this.adjustCompletionItem(this.m_CompletionItemDialog, pos, posInfo, lineText, adjust);
		return this.m_CompletionItemDialog;
	}
	
	getDatabaseFunctions(pos :Position, posInfo :CursorPositionInformation, lineText :string, adjust :Boolean) {
		this.adjustCompletionItem(this.m_CompletionItemDatabase, pos, posInfo, lineText, adjust);
		return this.m_CompletionItemDatabase;
	}

	getFileFunctions(pos :Position, posInfo :CursorPositionInformation, lineText :string, adjust :Boolean) {
		this.adjustCompletionItem(this.m_CompletionItemFile, pos, posInfo, lineText, adjust);
		return this.m_CompletionItemFile;
	}

	getHelperFunctions(pos :Position, posInfo :CursorPositionInformation, lineText :string, adjust :Boolean) {
		this.adjustCompletionItem(this.m_CompletionItemHelper, pos, posInfo, lineText, adjust);
		return this.m_CompletionItemHelper;
	}

	getCStringFunctions(pos :Position, posInfo :CursorPositionInformation, lineText :string, adjust :Boolean) {
		this.adjustCompletionItem(this.m_CompletionItemCString, pos, posInfo, lineText, adjust);
		return this.m_CompletionItemCString;
	}

	getTableFunctions(pos :Position, posInfo :CursorPositionInformation, lineText :string, adjust :Boolean) {
		this.adjustCompletionItem(this.m_CompletionItemTable, pos, posInfo, lineText, adjust);
		return this.m_CompletionItemTable;
	}

	getMoneyFunctions(pos :Position, posInfo :CursorPositionInformation, lineText :string, adjust :Boolean) {
		this.adjustCompletionItem(this.m_CompletionItemCMoney, pos, posInfo, lineText, adjust);
		return this.m_CompletionItemCMoney;
	}

	getDateTimeFunctions(pos :Position, posInfo :CursorPositionInformation, lineText :string, adjust :Boolean) {
		this.adjustCompletionItem(this.m_CompletionItemCDateTime, pos, posInfo, lineText, adjust);
		return this.m_CompletionItemCDateTime;
	}

	getPrinterFunctions(pos :Position, posInfo :CursorPositionInformation, lineText :string, adjust :Boolean) {
		this.adjustCompletionItem(this.m_CompletionItemPrinter, pos, posInfo, lineText, adjust);
		return this.m_CompletionItemPrinter;
	}

	getConstantVariables() {
		return this.m_CompletionItemConstants;
	}
}