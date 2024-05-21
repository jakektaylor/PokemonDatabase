$(document).ready(function() {
    $("#search-button").click(search);
}) 

/*Purpose: The purpose of this function is to send a query to the server to be performed on the database. This
function does so using an AJAX request to get the JSON data for the search results, which comes in the form
{text:<text>, url:<url>}*/
function search(){
    //Get the currently selected option from the select box to know which search method is being used. 
    let choice=$("#search-options").prop("selectedIndex");
    console.log("The currently selected choice is: " + choice);

    //Get the text that was entered by the user in the search box.
    let searchText = $("#search-box").val();
    $("#search-box").val("");
    console.log("You are looking for: " + searchText);
    
    //Making an AJAX GET request.
    $.get(`http://localhost:3000/search?type=${choice}&body=${searchText}`, data="", success=displayResults, "json");
}

/*
Purpose: This function displays the results for a search query made to the database. It displays both moves and Pokemon cards the same.
*/
function displayResults(results){
    let resultDiv = $("#results-outer");
    resultDiv.html("");
    for(let result of results){
        //Create the inner container
        let container = $("<div></div>").attr("class", "search-result");

        //Create the link
        let link = $("<a></a>");
        link.attr("href", result.url);
        link.text(result.text);

        
        container.append(link);
        resultDiv.append(container);
    }
}