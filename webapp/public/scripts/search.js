/*Purpose: This function is called when the page is first loaded to add all necessary event listeners.*/
function init(){
    document.getElementById("search-button").addEventListener("click", search);
}

/*Purpose: The purpose of this function is to send a query to the server to be performed on the database. This
function does so using an AJAX request to get the JSON data for the search results, which comes in the form
{text:<text>, url:<url>}*/
function search(){
    //Get the currently selected option from the select box to know which 
    let choice=document.getElementById("search-options").selectedIndex;
    console.log("The currently selected choice is: " + choice);

    //Get the text that was entered by the user in the search box.
    let searchText = document.getElementById("search-box").value;
    document.getElementById("search-box").value = "";
    console.log("You are looking for: " + searchText);

    //Create the XMLHttpRequest.
    let xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function() {
		if (this.readyState === 4 && this.status === 200) {
            //Display the response.
            let response = JSON.parse(this.responseText);
            displayResults(response);
		}
	};

	//Create the request.
	xhttp.open("GET", `http://localhost:3000/search?type=${choice}&body=${searchText}`, true);
    xhttp.setRequestHeader("Accept", "application/json");
    xhttp.send();
}

/*
Purpose: This function displays the results for a search query made to the database. It displays both moves and Pokemon cards the same.
*/
function displayResults(results){
    let resultDiv = document.getElementById("results-outer");
    resultDiv.innerHTML="";
    for(let result of results){
        //Create the inner container
        let container = document.createElement("div");
        container.className = "search-result";

        //Create the link
        let link = document.createElement("a");
        link.href=result.url;
        link.appendChild(document.createTextNode(result.text));

        
        container.appendChild(link);
        resultDiv.appendChild(container);
    }
}