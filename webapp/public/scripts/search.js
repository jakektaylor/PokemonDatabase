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
    
    //Determine whether to make an AJAX request or navigate to the search page.
    let searchString = window.location.href;
    let urlIndex = Array.from(searchString.matchAll(new RegExp("/", "g")))[2]["index"];
    let url = searchString.substring(0, urlIndex+1);
    let page = searchString.substring(searchString.search(new RegExp("https?:\/\/localhost:3000\/")) + url.length, 
    searchString.search(new RegExp("\\?")));

    if(page !== "search" && searchString !== url) window.location.replace(`http://localhost:3000/search?type=${choice}&body=${searchText}`);
    else {
        //Make an AJAX request to get the seach data.
        $.get(`http://localhost:3000/search?type=${choice}&body=${searchText}`, null, function(data, success, jqXHR) {
            if(jqXHR.status === 200) populateSearchResults(data);
        }, "json");
    }
}

/*  Purpose: Helper method which is used to fill the search page with the results of the search upon a successful AJAX request being made
    in the search method.
    Parameters: -data: The data returned by the server as a response to the request, containing the search results in an 
                array.*/
function populateSearchResults(data) {
    let resultsDiv = $("#results-outer");
    resultsDiv.empty();
    let results = data["searchResults"];
    for(let result of results) {
        let resultDiv = $("<div></div>").addClass("search-result");
        let resultLink = $("<a></a>").text(result.text).attr("href", result.url);
        resultDiv.append(resultLink);
        resultsDiv.append(resultDiv);
    }
}