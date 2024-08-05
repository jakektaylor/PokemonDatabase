$(document).ready(function() {
    let attackItems = $("#move-table").find("input");
    for(let attack of attackItems) $(attack).on("click", toggleExpand);
}); 

function toggleExpand() {
    
    /*Change the label icon depending on whether or not the attack is currently expanded. We can
    determine if it is expanded by checking the 'max-height' CSS style property.*/
    let labelIcon = $(this).siblings("label").children("span");
    let maxHeight = $(this).siblings(".description").css("max-height");
    maxHeight = Number(maxHeight.substring(0, maxHeight.length-1));

    //In this case, we have clicked on it when it is not expanded so now we are expanding it. 
    if(maxHeight == 0) {
        labelIcon.html("&#x2212");
    } 
    //Now, we are collapsing it since it was expanded when we clicked on it.
    else {
        $(this).prop("checked", false);
        setTimeout(()=>labelIcon.html("&#x2b"), 500);
    }
}
