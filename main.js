/*
* Copyright (c) 2014 CrabCode
*
* Permission is hereby granted, free of charge, to any person obtaining a
* copy of this software and associated documentation files (the "Software"),
* to deal in the Software without restriction, including without limitation
* the rights to use, copy, modify, merge, publish, distribute, sublicense,
* and/or sell copies of the Software, and to permit persons to whom the
* Software is furnished to do so, subject to the following conditions:
*
* The above copyright notice and this permission notice shall be included in
* all copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
* FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
* DEALINGS IN THE SOFTWARE.
*/

/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets, window */
define(function (require, exports, module) {
	"use strict";
	
	var CommandManager	= brackets.getModule("command/CommandManager"),
		DocumentManager	= brackets.getModule('document/DocumentManager'),
		EditorManager	= brackets.getModule('editor/EditorManager'),
		ExtensionUtils	= brackets.getModule("utils/ExtensionUtils"),
		Menus			= brackets.getModule("command/Menus"),
		PanelManager	= brackets.getModule("view/PanelManager"),
		Preferences		= brackets.getModule("preferences/PreferencesManager"),
		Resizer			= brackets.getModule("utils/Resizer"),
		prefs			= Preferences.getExtensionPrefs("crabcode.outline");
	
	ExtensionUtils.loadStyleSheet(module, "styles.css");
	
	function findMatches(regex, lang, content) {
		if (content === null) {
			return [];
		}
		
		var i, j, l, match, name,
			lines = content.split("\n"),
			result = [];
		
		for (i = 0; i < lines.length; i++) {
			match = regex.exec(lines[i]);
			
			while (match !== null && typeof match !== "undefined") {
				switch (lang) {
				case "css":
					name = match[1];
					break;

				case "js":
					name = (match[3] || match[2] || "") + (match[4] || "");
					break;

				default:
					name = "";
					break;
				}
				
				result.push([name.trim(), i, lines[i].length]);
				
				match = regex.exec(lines[i]);
			}
		}
		
		result.sort();
		
		return result;
	}
	
	function goToLine(e) {
		var currentEditor = EditorManager.getActiveEditor();
		currentEditor.setCursorPos(e.data.line, e.data.ch, true);
		currentEditor.focus();
	}
	
	function handleResize() {
		if (prefs.get("sidebar")) {
			var offset = 0;

			if ($("#working-set-header").css("display") !== "none") {
				offset = $("#working-set-header").outerHeight() + $("#open-files-container").outerHeight();
			}

			$("#crabcode-outline").css("max-height", (window.innerHeight - offset - 80) + "px");
		} else {
			$("#crabcode-outline").css("max-width", ($("#editor-holder").width() - 50) + "px");
		}
	}
	
	function updateOutline() {
		var content, i, line, name, regex, type, fkt;
		var doc = DocumentManager.getCurrentDocument();
		
		$("#crabcode-outline-window").empty();
		
		if (doc !== null) {
			switch (doc.getLanguage().getName()) {
			
			case "PHP":
				if (prefs.get("args")) {
					regex = /((\w*)\s*[=:]\s*)?function\s*(\w*)\s*(\([\w,\s$=]*\))/g;
				} else {
					regex = /((\w*)\s*[=:]\s*)?function\s*(\w*)\s*()\(/g;
				}
				
				fkt = findMatches(regex, "js", doc.getText());
					
				fkt.forEach(function (match) {
					name = match[0];
					
					if (name.length === 0 || name[0] === "(") {
						if (prefs.get("unnamed")) {
							name = "function" + name;
						} else {
							return;
						}
					}
					
					$("#crabcode-outline-window").append($(document.createElement("div")).addClass("crabcode-outline-entry crabcode-outline-js-function").text(name).click({ line: match[1], ch: 0 }, goToLine));
				});
				break;
			
			case "JavaScript":
				if (prefs.get("args")) {
					regex = /((\w*)\s*[=:]\s*)?function\s*(\w*)\s*(\([\w,\s]*\))/g;
				} else {
					regex = /((\w*)\s*[=:]\s*)?function\s*(\w*)\s*()\(/g;
				}
				
				fkt = findMatches(regex, "js", doc.getText());

				fkt.forEach(function (match) {
					name = match[0];

					if (name.length === 0 || name[0] === "(") {
						if (prefs.get("unnamed")) {
							name = "function" + name;
						} else {
							return;
						}
					}

					$("#crabcode-outline-window").append($(document.createElement("div")).addClass("crabcode-outline-entry crabcode-outline-js-function").text(name).click({ line: match[1], ch: match[2] }, goToLine));
				});
				break;
			
			case "CSS":
				regex = /([^\r\n,{}]+)((?=[^}]*\{)|\s*\{)/g;
				
				var lines = findMatches(regex, "css", doc.getText());
				
				for (i = 0; i < lines.length; i++) {
					switch (lines[i][0][0]) {
					case "#":
						type = "id";
						break;
						
					case ".":
						type = "class";
						break;
						
					case "@":
						type = "font";
						break;
						
					default:
						type = "tag";
						break;
					}
					
					$("#crabcode-outline-window").append($(document.createElement("div")).addClass("crabcode-outline-entry crabcode-outline-css-" + type).text(lines[i][0]).click({ line: lines[i][1], ch: lines[i][2] }, goToLine));
				}
				break;
			}
		}
	}
	
	function loadOutline() {
		var sidebar = prefs.get("sidebar");
		
		var outline = $(document.createElement("div")).attr("id", "crabcode-outline").attr("class", (sidebar ? "left" : "right"));
		outline.append($(document.createElement("div")).attr("id", "crabcode-outline-header").text("Outline"));
		outline.append($(document.createElement("div")).attr("id", "crabcode-outline-window"));
		
        $("#outline-toolbar-icon").addClass("enabled");
        $("#outline-toolbar-icon").removeClass("disabled");
        
		if (sidebar) {
			$("#sidebar").append(outline);
			Resizer.makeResizable(outline, "vert", "top", 75);
		} else {
			$("#editor-holder").prepend(outline);
			Resizer.makeResizable(outline, "horz", "left", 64);
		}
		
		$(DocumentManager).on('currentDocumentChange.bracketsCodeOutline', updateOutline);
		$(DocumentManager).on('documentSaved', updateOutline);
		$(DocumentManager).on("workingSetAdd", handleResize);
		$(DocumentManager).on("workingSetRemove", handleResize);
		
		updateOutline();
	}
	
	function removeOutline() {
		$("#crabcode-outline").remove();
        $("#outline-toolbar-icon").addClass("disabled");
        $("#outline-toolbar-icon").removeClass("enabled");
		$(DocumentManager).off('currentDocumentChange.bracketsCodeOutline');
		$(DocumentManager).off('documentSaved');
		$(DocumentManager).off("workingSetAdd");
		$(DocumentManager).off("workingSetRemove");
	}
	
	function toggleOutline() {
		prefs.set("enabled", !prefs.get("enabled"));
		prefs.save();
		if (prefs.get("enabled")) {
			loadOutline();
		} else {
			removeOutline();
		}
	}
	
	function toggleUnnamed() {
		var check = !this.getChecked();
		this.setChecked(check);
		
		prefs.set("unnamed", check);
		prefs.save();
		
		if (prefs.get("enabled")) {
			updateOutline();
		}
	}
	
	function toggleArgs() {
		var check = !this.getChecked();
		this.setChecked(check);
		
		prefs.set("args", check);
		prefs.save();
		
		if (prefs.get("enabled")) {
			updateOutline();
		}
	}
	
	function toggleSidebar() {
		var check = !this.getChecked();
		this.setChecked(check);
		
		prefs.set("sidebar", check);
		prefs.save();
		
		removeOutline();
		
		if (prefs.get("enabled")) {
			loadOutline();
			handleResize();
		}
	}
	
	var cmdUnnamed	= CommandManager.register("Outline: Show Unnamed Functions", "crabcode.outline.unnamed", toggleUnnamed);
	var cmdArgs		= CommandManager.register("Outline: Show Arguments", "crabcode.outline.args", toggleArgs);
	var cmdSidebar	= CommandManager.register("Outline: In Sidebar", "crabcode.outline.sidebar", toggleSidebar);
	
	var menu = Menus.getMenu(Menus.AppMenuBar.VIEW_MENU);
	menu.addMenuDivider();
	menu.addMenuItem("crabcode.outline.sidebar");
	menu.addMenuItem("crabcode.outline.args");
	menu.addMenuItem("crabcode.outline.unnamed");
    
    $(document.createElement("a"))
        .attr("id", "outline-toolbar-icon")
        .attr("href", "#")
        .attr("title", "Toggle Outline")
        .on("click", toggleOutline)
        .appendTo($("#main-toolbar .buttons"));
	
	if (typeof prefs.get("enabled") !== "boolean") {
		prefs.definePreference("enabled", "boolean", true);
		prefs.set("enabled", true);
		prefs.save();
	}
	
	if (typeof prefs.get("unnamed") !== "boolean") {
		prefs.definePreference("unnamed", "boolean", true);
		prefs.set("unnamed", true);
		prefs.save();
	}
	
	if (typeof prefs.get("args") !== "boolean") {
		prefs.definePreference("args", "boolean", true);
		prefs.set("args", true);
		prefs.save();
	}
	
	if (typeof prefs.get("sidebar") !== "boolean") {
		prefs.definePreference("sidebar", "boolean", true);
		prefs.set("sidebar", true);
		prefs.save();
	}
	
	if (prefs.get("enabled")) {
		loadOutline();
	}
	
	if (prefs.get("unnamed")) {
		cmdUnnamed.setChecked(true);
	}
	
	if (prefs.get("args")) {
		cmdArgs.setChecked(true);
	}

	if (prefs.get("sidebar")) {
		cmdSidebar.setChecked(true);
	}
	
	window.addEventListener("resize", handleResize);
	handleResize();
});
