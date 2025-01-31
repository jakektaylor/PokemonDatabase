$(document).ready(function() {
 let setRows = $(".set-row");
 for(let row of setRows) $(row).on("click", viewSet);
}); 

function viewSet() {
 let rowData = $(this).children("td")[0];
 let setId = $(rowData).prop("textContent");
 window.location.replace(`${window.location.origin}/cards/${setId}`);
}