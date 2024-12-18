import { Position, Diagnostic } from 'vscode-languageserver/node';
import { CParser } from '../Parser/CParser';
import { GlobalAnalyzer } from '../server';
import {
	TextDocument
} from 'vscode-languageserver-textdocument';

let diagnosticCached :Diagnostic[] = [];
let posCached :Position|null = null;

export function OnDiagnostic(docs :Map<string, TextDocument>, curDoc :TextDocument, pos :Position) :Diagnostic[] {
	if(posCached) {
		if(posCached.line == pos.line) {
			//return diagnosticCached;
		}
	}

	let script = GlobalAnalyzer.getCompleteCurrentScript(pos, curDoc, docs, true, false, false);
	if(script) {
		let parser = new CParser();
		diagnosticCached = parser.ParseText(docs, script, false).m_diagnostics;
	}

	posCached = pos;
	return diagnosticCached;
}
