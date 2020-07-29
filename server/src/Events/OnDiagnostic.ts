import { TextDocument, CompletionItem, Position, Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';
import { GlobalAnalyzer, parserFunctions } from '../server';



export function OnDiagnostic(docs :Map<string, TextDocument>, curDoc :TextDocument, pos :Position) :Diagnostic[] {
	let diagnosticCached :Diagnostic[] = [];


	let script = GlobalAnalyzer.getEditedScript(pos, curDoc, false, false);
	let symbols :string[] = [];
	if(script) {
		let reg = /\b(.+)\b/gm;	
		let m :RegExpExecArray|null = null;
		let i = 0;
		while((m = reg.exec(script.m_scripttext)) && i < 100) {
			symbols.push(<string>m[1]);
			i++;
		}
	}

	console.log(symbols);


	return diagnosticCached;
}
