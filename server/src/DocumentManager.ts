import { TextDocument, TextDocuments, Position } from 'vscode-languageserver';
import { uriToFilePath } from 'vscode-languageserver/lib/files';
import { readFileSync } from 'fs';

export class DocumentManager {

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
		//console.log(this.m_Documents);
		initDocs.forEach(element => {
			let doc = this.isManaged(element.uri);
			let found = element.uri.search(/Standard/);
			if(!doc && found >= 0) {
				this.m_Documents.set(element.uri, element);
				console.log("onDidClose adding to notmanaged: " + element.uri);
			}
			else {
				if(found > 0) {
				   console.log("onDidClose already in notmanaged: " + element.uri);
				}
			    else {
				   console.log("Do nothing with not-standard file " + element.uri);
				   //console.log(notManageddocuments);
			    }
			}	
		});
	}

	addFromFile(...initDocs :string[]) {
		initDocs.forEach(element => {
			if(!this.m_Documents.has(element)) {
				let wholeFile = readFileSync(uriToFilePath(element)!, "ascii");
				let textDoc :TextDocument = TextDocument.create(element, "de", 1, wholeFile);

				
				//console.log(wholeFile);
				this.m_Documents.set(element, textDoc);
				//console.log("reading file: " + element);
			}
		});
	}
	delete(...initDocs :string[]) {
		//console.log(this.m_Documents);
		initDocs.forEach(element => {
			let doc = this.isManaged(element);
			if(doc) {
				//console.log(notManageddocuments);
				this.m_Documents.delete(doc.uri);
				//console.log(notManageddocuments);
				console.log("onDidOpen deleting from notmanaged: " + doc.uri);
			}
		});
	}

	isManaged(uri :string) {
		return this.m_Documents.get(uri);
	}

	startEvent(...ManagedFromVsCode :TextDocument[]) {
		ManagedFromVsCode.forEach(element => {
			this.m_Documents.set(element.uri, element);
		});
		/*console.log("Mit VSOCDE");
		this.m_Documents.forEach((key, value) => {
			console.log(value);
		});*/
		this.m_AddedManagedDocuments = true;
	}
	endEvent(...ManagedFromVsCode :TextDocument[]) {
		ManagedFromVsCode.forEach(element => {
			this.m_Documents.delete(element.uri);
		});
		/*console.log("Ausgangszustand");
		this.m_Documents.forEach((key, value) => {
			console.log(value);
		});*/
		this.m_AddedManagedDocuments = false;
	}

	getDocuments() {
		if(!this.m_AddedManagedDocuments) {
			//throw new Error("Managed Documents from VSCode werent added before getting all of the documents");
		}
		return this.m_Documents;
	}

	doWithDocuments<T extends Function, ReturnValue>(managedDocs :TextDocuments, curDoc :TextDocument, pos :Position, func :T) {
		this.startEvent(...managedDocs.all());
		
		let ret :ReturnValue = func(this.getDocuments(), curDoc, pos);	

		this.endEvent(...managedDocs.all());

		return ret;
	}


}