import { TextDocument, Position, Diagnostic } from 'vscode-languageserver';
import { CParser } from '../Parser/CParser';
import { GlobalAnalyzer } from '../server';



export function OnDiagnostic(docs :Map<string, TextDocument>, curDoc :TextDocument, pos :Position) :Diagnostic[] {
	let diagnosticCached :Diagnostic[] = [];
	let script = GlobalAnalyzer.getCompleteCurrentScript(pos, curDoc, docs, false, false);
	
	if(script) {
		let parser = new CParser();
		return parser.ParseText(script);
	}

	return diagnosticCached;
}
