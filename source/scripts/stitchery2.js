var stitcherydoo = {};
stitcherydoo.webdb = {};
stitcherydoo.webdb.db = null;

var tempProjThreadList = [];
var tempProjThreadCnt = 0;


stitcherydoo.webdb.open = function(){
	var dbSize = 5 * 1024 * 1024; // 5MB
	stitcherydoo.webdb.db = openDatabase('Threads', '1.0', 'thread inventory', dbSize);
	
}

stitcherydoo.webdb.onError = function(tx, e){
	alert('Something unexpected happened: ' + e.message);
}

stitcherydoo.webdb.onSuccess = function(tx, r){
}

/**
 *	recordcnt counts down after every add, then renders swatch list
 **/
stitcherydoo.webdb.onMasterThreadAddSuccess = function(tx, r){
	stitcherydoo.webdb.recordcnt--;
	if (stitcherydoo.webdb.recordcnt <= 0){
		stitcherydoo.webdb.getMasterThreadList(loadMasterSwatches);
	}
}

stitcherydoo.webdb.onInventoryAddSuccess = function(tx, r){
	stitcherydoo.webdb.getInventoryThreadList(loadInventorySwatches);
	stitcherydoo.webdb.getShoppingList(loadShoppingListSwatches);
}

stitcherydoo.webdb.onShoppingListAddSuccess = function(tx, r){
	stitcherydoo.webdb.getShoppingList(loadShoppingListSwatches);
}



stitcherydoo.webdb.createTable = function(){
	stitcherydoo.webdb.db.transaction(function(tx){
		tx.executeSql('CREATE TABLE IF NOT EXISTS ' + 'threadchart(ID INTEGER PRIMARY KEY ASC, manufacturer TEXT, threadID TEXT, hexvalue TEXT, colordesc TEXT)', []);
		tx.executeSql('CREATE TABLE IF NOT EXISTS ' + 'inventory(ID INTEGER PRIMARY KEY ASC, threadKey TEXT)', []);
		tx.executeSql('CREATE TABLE IF NOT EXISTS ' + 'shoppinglist(ID INTEGER PRIMARY KEY ASC, threadKey TEXT)', []);
	});
}

stitcherydoo.webdb.initDB = function(){	
	stitcherydoo.webdb.db.transaction(function(tx){
		tx.executeSql('SELECT COUNT(*) AS cnt FROM threadchart', [], function(tx, result){
			if(result.rows.item(0).cnt == 0){
				stitcherydoo.webdb.recordcnt = threads.length;
				for (var i=0; i<threads.length; i++){
						tx.executeSql('INSERT INTO threadchart(manufacturer, threadID, hexvalue, colordesc) VALUES (?, ?, ?, ?)', 
										[threads[i].manufacturer, threads[i].threadID, threads[i].hexvalue, threads[i].colordesc], 
										stitcherydoo.webdb.onMasterThreadAddSuccess, stitcherydoo.webdb.onError);
				}
			}
			else if(result.rows.item(0).cnt == threads.length){
				stitcherydoo.webdb.onMasterThreadAddSuccess(null, null);
			}
			else if(result.rows.item(0).cnt < threads.length){
				stitcherydoo.webdb.recordcnt = threads.length - (result.rows.item(0).cnt);
				for (var i=(result.rows.item(0).cnt-1); i<threads.length; i++){
					tx.executeSql('INSERT INTO threadchart(manufacturer, threadID, hexvalue, colordesc) VALUES (?, ?, ?, ?)', 
									[threads[i].manufacturer, threads[i].threadID, threads[i].hexvalue, threads[i].colordesc], 
									stitcherydoo.webdb.onMasterThreadAddSuccess, stitcherydoo.webdb.onError);
				}
			}
		}, stitcherydoo.webdb.onError);
	});
}

stitcherydoo.webdb.addInventoryItem = function(threadNum){	
	stitcherydoo.webdb.checkAgainstMaster(threadNum, stitcherydoo.webdb.addInventoryItemFallout);
} // end addInventoryItem function
stitcherydoo.webdb.addInventoryItemFallout = function(exists, threadNum){
	if(exists){
		stitcherydoo.webdb.checkAgainstInventory(threadNum, stitcherydoo.webdb.addInventoryItemSelfCheckFallout);
	}
}// end addInventoryItemFallout
stitcherydoo.webdb.addInventoryItemSelfCheckFallout = function(exists, threadNum){
	if(!exists){
		stitcherydoo.webdb.db.transaction(function(tx){
			tx.executeSql('INSERT INTO inventory(threadKey) VALUES (?)',
				[threadNum], stitcherydoo.webdb.onInventoryAddSuccess, stitcherydoo.webdb.onError);
		});
	}
}//end addInventoryItemSelfCheckFallout

stitcherydoo.webdb.addShoppingListItem = function(threadNum){
	stitcherydoo.webdb.checkAgainstShoppingList(threadNum, stitcherydoo.webdb.addShoppingListItemSelfCheckFallout);
}
stitcherydoo.webdb.addShoppingListItemSelfCheckFallout = function(exists, threadNum){
	if(!exists){
		stitcherydoo.webdb.db.transaction(function(tx){
			tx.executeSql('INSERT INTO shoppinglist(threadKey) VALUES (?)',
				[threadNum], stitcherydoo.webdb.onShoppingListAddSuccess, stitcherydoo.webdb.onError);
		});
	}
}

stitcherydoo.webdb.deleteShoppingListItem = function(threadNum){
	stitcherydoo.webdb.db.transaction(function(tx){
		tx.executeSql('DELETE FROM shoppinglist WHERE threadKey = ?', [threadNum], stitcherydoo.webdb.onShoppingListAddSuccess, stitcherydoo.webdb.onError);
	});
}
stitcherydoo.webdb.deleteInventoryItem = function(threadNum){
	stitcherydoo.webdb.db.transaction(function(tx){
		tx.executeSql('DELETE FROM inventory WHERE threadKey = ?', [threadNum], stitcherydoo.webdb.onInventoryAddSuccess, stitcherydoo.webdb.onError);
	});
}

stitcherydoo.webdb.getMasterThreadList = function(renderFunc){
	stitcherydoo.webdb.db.transaction(function(tx){
		tx.executeSql('SELECT * FROM threadchart', [], renderFunc, stitcherydoo.webdb.onError);
	});
}

stitcherydoo.webdb.checkAgainstMaster = function(threadNum, onResult){
	stitcherydoo.webdb.db.transaction(function(tx){
		tx.executeSql('SELECT COUNT(*) AS cnt FROM threadchart WHERE threadchart.threadID = ?', [threadNum],
			function(tx, result) {
				if(result.rows.item(0).cnt == 0){
					onResult(false, threadNum);
				}
				else{
					onResult(true, threadNum);
				}
			}, stitcherydoo.webdb.onError);
	});
}
stitcherydoo.webdb.checkAgainstInventory = function(threadNum, onResult){
	stitcherydoo.webdb.db.transaction(function(tx){
	tx.executeSql('SELECT COUNT(*) AS cnt FROM inventory WHERE inventory.threadKey = ?', [threadNum],
		function(tx, result) {
			if(result.rows.item(0).cnt==0){
				onResult(false, threadNum);
			}
			else{
				onResult(true, threadNum);
			}
		}, stitcherydoo.webdb.onError);
	});
}
stitcherydoo.webdb.checkAgainstShoppingList = function(threadNum, onResult){
	console.log("stitcherydoo.webdb.checkAgainstShoppingList");
	stitcherydoo.webdb.db.transaction(function(tx){
		tx.executeSql('SELECT COUNT(*) AS cnt FROM shoppinglist WHERE shoppinglist.threadKey = ?', [threadNum],
		function(tx, result) {
			if(result.rows.item(0).cnt==0){
				onResult(false, threadNum);
			}
			else{
				onResult(true, threadNum);
			}
		}, stitcherydoo.webdb.onError);
	});
}

stitcherydoo.webdb.getInventoryThreadList = function(renderFunc){
	stitcherydoo.webdb.db.transaction(function(tx){
		tx.executeSql('SELECT * FROM inventory INNER JOIN threadchart ON inventory.threadKey = threadchart.threadID', [],
			renderFunc, stitcherydoo.webdb.onError);
	});
}
stitcherydoo.webdb.getShoppingList = function(renderFunc){
	//console.log("stitcherydoo.webdb.getShoppingList");
	stitcherydoo.webdb.db.transaction(function(tx){
		tx.executeSql('SELECT shoppinglist.*, threadchart.*, inventory.threadKey AS isinInventory FROM shoppinglist INNER JOIN threadchart ON shoppinglist.threadKey = threadchart.threadID LEFT JOIN inventory ON shoppinglist.threadKey = inventory.threadKey', [],
			renderFunc, stitcherydoo.webdb.onError);
	});
}

stitcherydoo.webdb.getThread = function(threadNum, callback){
	//console.log("In getThread");
	stitcherydoo.webdb.db.transaction(function(tx){
			tx.executeSql('SELECT * FROM threadchart WHERE threadchart.threadID = ?', [threadNum],
			callback, stitcherydoo.webdb.onError);
	});
	
}



$(document).ready(function(e){
	stitcherydoo.webdb.open();
	stitcherydoo.webdb.createTable();
	stitcherydoo.webdb.initDB();
	stitcherydoo.webdb.getMasterThreadList(loadMasterSwatches);
	stitcherydoo.webdb.getInventoryThreadList(loadInventorySwatches);
	stitcherydoo.webdb.getShoppingList(loadShoppingListSwatches);
	
	bindPageEvents();
});




function loadMasterSwatches(tx, rs){
		var rowOutput = "<tr><td></td><td>#</td><td>Description</td></tr>";
		for( var i=0; i<rs.rows.length; i++) { 
			rowOutput += renderMasterThreadList(rs.rows.item(i));
  		}
		var swatches = document.getElementById('masterthreadtable');
		swatches.innerHTML = rowOutput;
}
function loadInventorySwatches(tx, rs){
	var rowOutput = "";
	for (var i=0; i<rs.rows.length; i++){
		rowOutput += renderInventoryThreadList(rs.rows.item(i));
	}
	var swatches = document.getElementById('inventorythreadtable');
	swatches.innerHTML = rowOutput;
}
function loadShoppingListSwatches(tx, rs){
	//console.log("loadShoppingListSwatches");
	var rowOutput = "";
	for (var i=0; i<rs.rows.length; i++){
		rowOutput += renderUnsavedShoppingList(rs.rows.item(i));
	}
	var swatches = document.getElementById('shoppinglisttable');
	swatches.innerHTML = rowOutput;
}




function renderMasterThreadList(row){
	return ('<tr><td style="width:15px; height:30px; background-color:#' + row.hexvalue + ';"></td><td>' 
		+ row.threadID + '</td><td><div class="columnColorDesc">' + row.colordesc + '</div></td></tr>');
}
function renderInventoryThreadList(row){
	return ('<tr><td style="width:15px; height:30px; background-color:#' + row.hexvalue + ';"></td><td>'
	 	+ row.threadKey + '</td><td>' + row.colordesc + '</td><td>' + '<div class="btnRemInv" value="' 
		+ row.threadKey + '">' + "Remove" + '</div>' + '</td></tr>');
}
function renderUnsavedShoppingList(row){	
	var inventoryCheck = "";
	if (row.isinInventory != null){
		inventoryCheck = "*****";
	}
	return ('<tr><td><input type="checkbox" class="chkShopping" value="' + row.threadKey + '">'
		+ '</td><td style="width:15px; height: 30px; background-color:#' + row.hexvalue + ';"></td><td>' 
		+ row.threadKey + '</td><td>' + row.colordesc + '</td><td>' + '<div class="btnRemShop" value="' 
		+ row.threadKey + '">' + "Remove" + '</div>' + '</td><td>' + inventoryCheck + '</td></tr>');
}



function addInventoryItem(){
	var inventoryItem = document.getElementById('threadKey');
	stitcherydoo.webdb.addInventoryItem(inventoryItem.value.toUpperCase());
	inventoryItem.value='';
}

function addShoppingListItem(){
	var shoppingListItem = document.getElementById('shopThreadKey');
	console.log("addShoppingListItem: ", shoppingListItem.value);
	stitcherydoo.webdb.addShoppingListItem(shoppingListItem.value.toUpperCase());
	shoppingListItem.value='';
}


function bindPageEvents(){
	$("#navigation li").click(function(e){
		//console.log($(this));
		
		//graphic details - gradient on select
		$("#navigation li").css("background-image", "none");
		$(this).css("background-image", "-webkit-gradient(linear, right bottom, left bottom, from(#FFDD8F), to(#e5c680))");
		
		//close down all subpages
		var pageToShow = $(this).attr("page");
		$(".subpage").each(function(e){$(this).css("display","none");});
		
		//switch to selected nav page
		$(".page").each(function(e){
			if ($(this).attr("id") != pageToShow){
				$(this).css("display", "none");
			}
			else{
				$(this).css("display", "inline");
			}
		});
	});
	
	$(".btnRemInv").live('click', function(e){
		console.log("deleting from inventory: ", $(this).attr("value"));
		stitcherydoo.webdb.deleteInventoryItem($(this).attr("value"));
	});
	
	$(".btnRemShop").live('click',function(e){
		console.log("deleting from shopping list: ", $(this).attr("value"));
		stitcherydoo.webdb.deleteShoppingListItem($(this).attr("value"));
	});
	
	$(".subnav").click(function(e){
		var subPageToShow = $(this).attr("page");
		if(subPageToShow == "previous"){$(this).css("display","none");}
		$(".subpage").each(function(e){
			if ($(this).attr("id") != subPageToShow){
				$(this).css("display", "none");
			}
			else{
				$(this).css("display", "inline");
			}
		});
	});
	
	$("#btnFinishedShopping").click(function(e){
		console.log("Clicked Finished Shopping");
		$(".chkShopping").each(function(e){
			if($(this).is(":checked")){
				stitcherydoo.webdb.addInventoryItem($(this).attr("value"));
				stitcherydoo.webdb.deleteShoppingListItem($(this).attr("value"));
			}	
		});
	});

	
}