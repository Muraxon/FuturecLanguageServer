import { TextDocument, Position, Diagnostic } from 'vscode-languageserver';
import { GlobalAnalyzer } from '../server';



export function OnDiagnostic(docs :Map<string, TextDocument>, curDoc :TextDocument, pos :Position) :Diagnostic[] {
	let diagnosticCached :Diagnostic[] = [];


	let script = GlobalAnalyzer.getCompleteCurrentScript(pos, curDoc, docs);

	
	// if(script) {

	// 	console.log(script);
	// }


	return diagnosticCached;
}
