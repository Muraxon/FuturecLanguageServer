# Future-C Language-Server:

Erste Version eines Language-Server für unsere Skriptsprache. Der Sinn dahinter ist, dass das Arbeiten in den Skripts im Laufe der Zeit extrem erleichtert wird.
- Bitte durchlesen und etwaige [Wünsche / Anregungen](https://github.com/Muraxon/FuturecLanguageServer/issues) gleich erstellen
- Bei Fehlern bitte gleich ein [Issue](https://github.com/Muraxon/FuturecLanguageServer/issues) erstellen
- Die Extension wird nur bei Dateien mit **.cpp**-Dateien aktiviert
  ___
- [Repository](https://github.com/Muraxon/FuturecLanguageServer)
  ___
## Features (laufend aktualisiert)
- [x] Syntaxhighlighting
  - für die wichtigsten Dinge einmal definiert
  ___
- [x] Userdefined Functions e.g.: `FUNCTION: void Test(int nZahl1, CTable tTable1);`
  - [x] **Defintion finden**
  - [x] **goto**
  - [x] alle Referenzen finden (macht das gleiche wie **Definition finden**)
  - [x] **Hovering**
  - [x] **Signaturhilfe** zeigt alle und gerade aktuellen Parameter an
  - [x] **Auto-completion** listet Functions auf wenn `Call:` eingegeben wurde
  ___
- [ ] Parserfunktionen e.g.: `S.Select(...)`
  - [ ] **Signaturhilfe** zeigt alle und gerade aktuellen Parameter an
  - [x] **Auto-completion**
    - Unterstützte Tags:
      - `keyword` - Text der angezeigt wird im UI
      - `notes` - Zeigt zusätzliche Info zur Funktion an. Wenn nicht vorhanden wird `keyword` als Dokumentation angezeigt
      - `text` - Text der dann eignefügt wird. Der Text unterstützt bei Parserfunktionen die Snippetsyntax
      - `signature` - Signaturliste für die eingegebene Methode
      - `returnvalue` - Gibt den Rückgabewert an
  ___
- [x] includescripts
  - [x] **goto**
  - [x] **Hovering**
  ___
- [x] Variablen
  - [x] **Hovering** Zeigt alle Usages im aktuellen Skript an - inklusive includescripts
  ___
- [ ] Hooks
  - [ ] Zu Kundenhook springen
  - [ ] Von Kundenhook zu Hook in Hauptskript springen
  - [ ] Hook für Kunden erstellen
  ___
- [ ] Datenbank
  - [ ] Spaltennamen anzeigen (bei Where-Strings / Funktionen die mit DB interagieren)
  - [ ] Where-Strings einfach erweiterbar
  ___
- [ ] Completion
  - [ ] Autocompletion bei Funkionen (Parser oder Userdefined)
  - [ ] Variablen-autocompletion
  ___
- [ ] Diagnostics
  - [ ] Skriptweit
  - [ ] Global
  - [ ] Check-Script Syntax in Language-Server integrieren
  ___
- [x] Snippets
  - [x] **Snippets Zum Erstellen von Functions / Scripts / Changekommentare**
  - [x] **Snippets für Set/GetElement**
  - [ ] *work in progress*
  ___
- [ ] Design
  - [ ] *work in progress*
  ___
- [ ] Importattributes
  - [ ] *work in progress*
  ___
- [ ] Importrecords
  - [ ] *work in progress*
  ___
  > Aktuell werden nur Dateien aus dem Standard-Ordner gecached.
  > Das heißt das Dateiübergreifende Finden / GoTo usw. wird erst dann funktionieren wenn man mehrere Dateien gleichzeitig offen hat
  ___
## Features
#### Keybindings
##### Ctrl + numpad0:
 ![](https://raw.githubusercontent.com/Muraxon/FuturecLanguageServer/master/demo/keybindingctrl0.gif)
  ___
##### Ctrl + numpad1:
 ![](https://raw.githubusercontent.com/Muraxon/FuturecLanguageServer/master/demo/keybindingctrl1.gif)
  ___
##### Ctrl + numpad2:
 ![](https://raw.githubusercontent.com/Muraxon/FuturecLanguageServer/master/demo/keybindingctrl2.gif)
  ___
#### Function:
 ![](https://raw.githubusercontent.com/Muraxon/FuturecLanguageServer/master/demo/functionSignatureHover.gif)
  ___
#### Function GoTo:
 ![](https://raw.githubusercontent.com/Muraxon/FuturecLanguageServer/master/demo/functionGoTo.gif)
  ___
#### Script:
 ![](https://raw.githubusercontent.com/Muraxon/FuturecLanguageServer/master/demo/ScriptHoverGoTo.gif)
  ___
#### Datenbankspalten:
Wird mit Ctrl+Space aktiviert wenn der Cursor über einer Zahl ist und in der aktuellen Zeile ein Befehl steht, der mit der Datenbank kommuniziert
  ![](https://raw.githubusercontent.com/Muraxon/FuturecLanguageServer/master/demo/databasecolumnsfind.gif)
  ___
#### Parserfunctions:
  ![](https://raw.githubusercontent.com/Muraxon/FuturecLanguageServer/master/demo/completionParserFunctions.gif)
  ___
  ![](https://raw.githubusercontent.com/Muraxon/FuturecLanguageServer/master/demo/completionParserObjectFunctions.gif)
  ___
  ![](https://raw.githubusercontent.com/Muraxon/FuturecLanguageServer/master/demo/completionUserFunction.gif)

### Config:
- Im Optionsmenü [`Ctrl + ,`] kann zwischen **Snippet** und **Signatur** gewählt werden
  - Signatur:
    - Einstellung:
      ![](https://raw.githubusercontent.com/Muraxon/FuturecLanguageServer/master/demo/configSignature.png)
    - Usage:
      ![](https://raw.githubusercontent.com/Muraxon/FuturecLanguageServer/master/demo/configSignatureHelp.gif)
  - Snippet:
    - Einstellung:
      ![](https://raw.githubusercontent.com/Muraxon/FuturecLanguageServer/master/demo/configSnippet.png)
    - Usage:
      ![](https://raw.githubusercontent.com/Muraxon/FuturecLanguageServer/master/demo/configSnippetHelp.gif)

 
