import { TextDocuments, Position } from 'vscode-languageserver/node';
import { readFileSync } from 'fs';
import {
	TextDocument
} from 'vscode-languageserver-textdocument';
import { uriToFilePath } from 'vscode-languageserver/lib/node/files';

export class DocumentManager {

	// These are all documents that are not managed from the `documents` variable in server.ts
	private m_Documents :Map<string, TextDocument> = new Map();
	private m_AddedManagedDocuments :boolean = false;

	constructor(...initDocs :TextDocument[]) {
		initDocs.forEach(element => {
			this.m_Documents.set(element.uri, element);
		});
	}

	clear() {
		this.m_Documents.clear();
		this.m_AddedManagedDocuments = false;
	}

	add(...initDocs :TextDocument[]) {
		initDocs.forEach(element => {
			let doc = this.isManaged(element.uri);
			let found = element.uri.search(/Standard/);
			if(!doc && found >= 0) {
				this.m_Documents.set(element.uri, element);
				
			}
		});
	}

	addFromFile(...initDocs :string[]) {
		initDocs.forEach(element => {
			if(!this.m_Documents.has(element)) {
				let wholeFile = readFileSync(uriToFilePath(element)!, "latin1");
				let textDoc :TextDocument = TextDocument.create(element, "de", 1, wholeFile);

				this.m_Documents.set(element, textDoc);
			}
		});
	}
	delete(...initDocs :string[]) {
		initDocs.forEach(element => {
			let doc = this.isManaged(element);
			if(doc) {
				this.m_Documents.delete(doc.uri);
			}
		});
	}

	isManaged(uri :string) {
		return this.m_Documents.get(uri);
	}

	startEvent(...ManagedFromVsCode :TextDocument[]) {
		ManagedFromVsCode.forEach(element => {
			if(!this.m_Documents.has(element.uri)) {
				this.m_Documents.set(element.uri, element);
			}
		});
		
		this.m_AddedManagedDocuments = true;
	}
	endEvent(...ManagedFromVsCode :TextDocument[]) {
		ManagedFromVsCode.forEach(element => {
			this.m_Documents.delete(element.uri);
		});
		
		this.m_AddedManagedDocuments = false;
	}

	getDocuments() {
		if(!this.m_AddedManagedDocuments) {
			//throw new Error("Managed Documents from VSCode werent added before getting all of the documents");
		}
		return this.m_Documents;
	}

	doWithDocuments<T extends Function, ReturnValue>(managedDocs :TextDocuments<TextDocument>, curDoc :TextDocument, pos :Position, func :T) {
		this.startEvent(...managedDocs.all());
		
		let ret :ReturnValue = func(this.getDocuments(), curDoc, pos);	

		this.endEvent(...managedDocs.all());

		return ret;
	}


}