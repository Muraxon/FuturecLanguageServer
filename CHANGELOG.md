# Changelog
All notable changes to this project will be documented in this file.


## [1.3.0] - 23.10.2021
- new option inside scriptautocompletedefs.json for marking parameters as optional with an '?'. All parameters are by default required
  - an example would be: be sure to adjust the "signature" value inside the json  
  ```futurec  
  "signature": "CString strValue, BOOL bSetNoBlank?, BOOL bSetZeroForBlank?, BOOL bShowZeroDate?, int nLanguage?"  
  ```  
  - errormessage if a function is used incorrectly
- massive performance-boost because documents are synced incremental now
- if a function from the namespace 'S' is used always after the first paramter the importattributes gets opened
- new files for snippets instead of hardcoded ones. These are located at ".futurec"
  - .futurec/snippetForScript.txt
  - .futurec/snippetForHook.txt
- Ctrl + space now works for most of the functions to get the parameterlist (before that you had to write the function again to get the popup)
- many other changes see [Commit](https://github.com/Muraxon/FuturecLanguageServer/commit/1d023345d91cf9b1922caeaff4120b37ff92ff45), [Commit](https://github.com/Muraxon/FuturecLanguageServer/commit/637b40b42eadd9832c28066c2ac7a18fc2574a84) for more information


## [1.2.0] - 18.04.2021
- changed xml-file to json-file for better readability and maintainability
- implemented simple diagnostic
  - added option disabling and enabling it
- other small changes see [Commit](https://github.com/Muraxon/FuturecLanguageServer/commit/1d023345d91cf9b1922caeaff4120b37ff92ff45), [Commit](https://github.com/Muraxon/FuturecLanguageServer/commit/637b40b42eadd9832c28066c2ac7a18fc2574a84) for more information


## [1.1.4] - 29.07.2020
- added functionality adding images / gifs / filelinks inside the hover
- fixed bug indendation is not correct
  - if you go inside curly brackets
- Hovering now shows at the start of the given *word*
- other small changes see [Commit](https://github.com/Muraxon/FuturecLanguageServer/commit/0d912194adc2a1581ff339a23c3837e0c4e8c2ed) for more information


## [1.1.3] - 26.07.2020
- added functionality for creating / deleting entries in design-files
  - for more details see [README](README.md)
  - Code Lenses were implemented
- fixed bug where onHover shows garbage
  - `FUNCTION: CTable tTestung(...)`
    - Hovering over a call of that function resulted in garbage info
- improved hovering over Parserfunctions
  - they now show the documentation
- improved signature-help
  - now does show proper documentation for that function
- other small changes see [Commit](https://github.com/Muraxon/FuturecLanguageServer/commit/129f19241ec761439a8a7e41c3e141de6a45f626) for more information


## [1.1.2] - 25.07.2020
- changed the functionality for createing hooks / scripts
  - for more details see [README](README.md)
- removed pure snippets for hooks / scripts
- improved `onSignature`
  - now `,` inside literals like `"Hello, i am robot, haha"` dont get recognized anymore (better usability for specific functions)
  - only *pure* `,` which are not inside an *string* get recognized to correct parameter
- improved possible documentation for parserfunctions
  - now the `<notes>`-tag gets parsed properly for popups


## [1.1.1] - 19.07.2020
- new snippet for hooks - [Issue](https://github.com/Muraxon/FuturecLanguageServer/issues/7)
- small fixes where completion or hovering does not fire
  - e.g. `F.` or `"+nVariable ..`
- small performance improvements
- support for `ADDTOSCRIPT`
- hover-support for parserfunctions
- added rudimentary support for variable in `foreachrow` and `foreachrowreverse` - [Issue](https://github.com/Muraxon/FuturecLanguageServer/issues/5)
- other small changes see [Commit](https://github.com/Muraxon/FuturecLanguageServer/commit/405da8a3232a9745c1eceed404203f9d1662ef6a) for more information


## [1.1.0] - 02.05.2020
- added support for Signaturehelp in parserfunctions
  - new config for `snippet` or `signature` help. For detailed information see **README**
- new tag in xml `<signature>` - is necessary for signaturehelp on parserfunctions
- shown information for variables and functions improved
- when `{` is entered `};` is automaticly added aswell - [Issue](https://github.com/Muraxon/FuturecLanguageServer/issues/1)
- now autocompletion does not trigger when `.` is entered - [Issue](https://github.com/Muraxon/FuturecLanguageServer/issues/2)


## [1.0.2] - 27.04.2020
- fixed issue when autocompletion should trigger, but doesn't


## [1.0.1] - 26.04.2020
- Added rudimentary support for parser-functions (auto-completion | ***signature-help is coming soon***)
  - snippet-functionality is possible
- improved includescriptparsing - prevent loop
- Added auto-completion for userdefined-functions inside the current script

## [1.0.0] - 24.04.2020
- Init Release
  - features *as is*
