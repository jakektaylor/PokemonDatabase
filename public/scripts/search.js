$(document).ready(function() {
    $("#search-button").click(search);
}); 

/*Purpose: The purpose of this function is to send a query to the server to be performed on the database. This
function does so using an AJAX request to get the JSON data for the search results, which comes in the form
{text:<text>, url:<url>} if the user us already on the search page. Otherwise, they are redirected and the
quwery is made.*/
function search(){
    //Get the currently selected option from the select box to know which search method is being used. 
    let choice=$("#select-option").prop("selectedIndex");
    
    //Get the text that was entered by the user in the search box.
    let searchText = $("#search-box").val();
    $("#search-box").val("");
    window.location.replace(`${window.location.origin}/search?type=${choice}&body=${searchText}`);
}