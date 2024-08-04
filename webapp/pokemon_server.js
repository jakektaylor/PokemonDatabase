//Require the needed modules.
const express = require('express');
const sqlite3 = require('sqlite3');

const app = express();
app.set('view engine', 'pug');

app.use((req, res, next)=>{
    console.log(req.method+ " request to " +req.url);
    next();
});

//Constants are defined here.
const searchOptions = ["Cards, by name", "Cards, by type", "Cards by min. HP", "Cards, by set", "Cards, by move"];

//Accessing the database.
let db = new sqlite3.Database('./pokemon.db', (err)=>{
    if(err){
        return console.log("Error");
    }
    console.log("Connected to the pokemon.db database.");
    init();
});

function init(){
    //EXPRESS SETUP
    app.use(express.json());
    app.use(express.static('public'));

    app.get("/", getHomePage);
    app.get("/search", queryDatabase);
    app.get("/cards/:set/:number", showCard);
    app.listen(3000);
    console.log("Server listening at http://localhost:3000");
}

/*This function is responsible for sending the HTML for the homepage to the client.*/
function getHomePage(req, res, next){
    res.setHeader("Content-Type", "text/html");
    res.status(200);
    res.render('search', {searchOptions:searchOptions, searchResults:[]});
    next();
}

/*This function handles all queries to the database made in the search bar. It sends back JSON data for cards
and moves depending on the search type. The HTML for the results is generated on the client side using this data.*/
function queryDatabase(req, res, next){
    let requestType = Number(req.query.type);
    let requestValue = req.query.body;
    let isJsonReq = req.accepts()[0] === "application/json";               //JSON is requested if we are already on the search page 

    //Convert request value to a lowercase string for queries that involve strings.
    if(requestType !== 2){
         requestValue = requestValue.toLowerCase();                            //Convert to lowercase to make queries insensitive.
         requestValue = requestValue.concat("%");                              //% is a wildcard, matching any characters after the request 
                                                                               //value when LIKE is used
    }
    //Otherwise, convert to a number.
    else if (requestType === 2) {
        requestValue = Number(requestValue);
        if(isNaN(requestValue)) requestValue = 0;
    }

    new Promise((resolve, reject) => {
        let searchResults = [];
        //REQUEST TYPE 0: The user has requested to search for a card by the name of the Pokemon.
        if(requestType === 0){

            db.all("SELECT cards.number AS card_number, cards.pokemon_name, cards.set_id, sets.series AS set_series, " +
                "sets.name AS set_name FROM cards INNER JOIN sets ON cards.set_id = sets.id WHERE lower(pokemon_name) LIKE ?;", [requestValue], (err, rows)=>{
                if(err){
                    reject(err);
                }

                //Formulate the search results.
                rows.forEach((row)=>{
                    searchResults.push({text:`${row.pokemon_name} (Series: ${row.set_series}, Set: ${row.set_name})`, url:`/cards/${row.set_id}/${row.card_number}`});
                });
                resolve(searchResults);
            });
        }
        //REQUEST TYPE 1: In this case the user is searching for a card based on its type.
        else if(requestType === 1){

            db.all("SELECT A.card_number, A.pokemon_name, A.set_id, sets.name AS set_name, sets.series AS set_series FROM sets INNER JOIN " +
                "(SELECT cards.number as card_number, cards.pokemon_name, cards.set_id FROM cards INNER JOIN pokemon_types ON " +
                "pokemon_types.pokemon_name = cards.pokemon_name WHERE lower(pokemon_type) LIKE ?) AS A ON A.set_id = sets.id;", [requestValue], (err, rows)=>{
                
                if(err){
                    reject(err);
                }

                //Formulate the search results.
                rows.forEach((row)=>{
                    searchResults.push({text:`${row.pokemon_name} (Series: ${row.set_series}, Set: ${row.set_name})`, url:`/cards/${row.set_id}/${row.card_number}`});
                });
                resolve(searchResults);
            });
        }
        //REQUEST TYPE 2: In this case the user is searching for a card based on its min HP.
        else if(requestType === 2){
            
            db.all("SELECT cards.number AS card_number, cards.pokemon_name, cards.set_id, sets.series AS set_series, sets.name AS set_name FROM cards INNER JOIN sets "+
                "ON cards.set_id = sets.id WHERE cards.hp >= ?;", [requestValue], (err, rows) => {
                if(err){
                    reject(err);
                }

                //Formulate the search results.
                rows.forEach((row)=>{
                    searchResults.push({text:`${row.pokemon_name} (Series: ${row.set_series}, Set: ${row.set_name})`, url:`/cards/${row.set_id}/${row.card_number}`});
                });
                resolve(searchResults);
            });
        }

        //REQUEST TYPE 3: In this case the user is searching for a card based on the set it belongs to. They can search based on set series
        //or set name.
        else if(requestType === 3){
            db.all("SELECT cards.number as card_number, cards.pokemon_name, cards.set_id, sets.series AS set_series, sets.name AS set_name " + 
                "FROM cards INNER JOIN sets ON cards.set_id = sets.id WHERE lower(sets.series) LIKE ? OR lower(sets.name) LIKE ?", [requestValue, requestValue], 
            (err, rows)=>{
                if(err){
                    reject(err);
                }

                //Formulate the search results.
                rows.forEach((row)=>{
                    searchResults.push({text:`${row.pokemon_name} (Series: ${row.set_series}, Set: ${row.set_name})`, url:`/cards/${row.set_id}/${row.card_number}`});
                });
                resolve(searchResults);
            });
        }

        //REQUEST TYPE 4: In this case the user is searching for a card based on a move that is on it. NOTE: Not providing a requestValue will
        //not return all cards because not all cards have attacks.
        else if(requestType === 4){
            db.all("SELECT A.card_number, A.pokemon_name, A.set_id, sets.series AS set_series, sets.name as set_name FROM sets INNER JOIN " +
            "(SELECT DISTINCT cards.number as card_number, cards.pokemon_name, cards.set_id FROM cards INNER JOIN card_attacks WHERE " +
            "cards.number = card_attacks.card_number AND cards.set_id = card_attacks.set_id AND card_attacks.attack_name LIKE ?) AS A ON " +
            "A.set_id = sets.id;", [requestValue], (err, rows)=>{
                if(err){
                    reject(err);
                }
                console.log(rows);
                //Formulate the search results.
                rows.forEach((row)=>{
                    searchResults.push({text:`${row.pokemon_name} (Series: ${row.set_series}, Set: ${row.set_name})`, url:`/cards/${row.set_id}/${row.card_number}`});
                });
                resolve(searchResults);
            });
        }
    }).then((searchResults)=> {
        //Send back the response.
        if(isJsonReq) {
            res.setHeader("Content-Type", "application/json");
            res.status(200);
            res.send(JSON.stringify({searchResults: searchResults}));
        }
        else {
            res.setHeader("Content-Type", "text/html");
            res.status(200);
            res.render('search', {searchOptions:searchOptions, searchResults:searchResults});
        }
        next();
    }).catch((err)=>{
        res.status(500);
        res.send(`SQLite Error: ${err.message}`);
        next(); 
    });
}

/*Purpose: This function is responsible for displaying a card. The information on the card includes:
    1. name                 5. moves
    2. set_name             6. first generation appeared in
    3. rarity               7. Pokedex number
    4. HP                   8. Pokemon type

*/
function showCard(req, res, next){
    let set_id = req.params.set;
    let pokemon_number = req.params.number;

    new Promise((resolve, reject)=>{
        /*First get the data from the pokemon_cards table*/
        let cardQuery = "SELECT cards.pokemon_name, cards.hp, cards.level, cards.rarity, cards.image_url, " + 
        "sets.series AS set_series, sets.name AS set_name FROM cards INNER JOIN sets ON cards.set_id = sets.id " + 
        "WHERE cards.number=? AND cards.set_id=?;"
        db.get(cardQuery, [pokemon_number, set_id], (err, card_row)=>{
            let cardData = {};
            if(err) reject(err);

            //Check to make sure a row was found. If not, return.
            if(!card_row) reject(new Error("Card not found."));
            
            
            /*We now add all of the relevant card data*/
            cardData["Name"] = card_row.pokemon_name;
            cardData["Set Series"] = card_row.set_series;
            cardData["Set Name"] = card_row.set_name;
            cardData["HP"] = card_row.hp;
            cardData["Level"] = card_row.level == null ? "Undefined" : card_row.level;
            cardData["Image"] = card_row.image_url;
            cardData["Rarity"] = card_row.rarity;
            
            resolve(cardData);
        });
    })
    //Need to return new Promise here. Can use return statement instead of implicit return and will still work.
    .then((cardData) => new Promise((resolve, reject)=>{
        //Next, get the type info for the card.
        let typeQuery = "SELECT pokemon_types.pokemon_name, types.name AS type_name, types.image_url FROM " + 
        "pokemon_types INNER JOIN types ON pokemon_types.pokemon_type = types.name WHERE pokemon_name = ?;"
        db.all(typeQuery, [cardData["Name"]], (err, rows)=> {
            if(err) reject(err);
            

            //Get the different type(s) of the card and the Image icon for each type.
            let types = [];
            rows.forEach((row)=>{;
                types.push({"Name": row.type_name, "Image": row.image_url});
            });

            cardData["Types"] = types;
            resolve(cardData);
        });
    })).then((cardData)=>{
        //Get the move data for the card.
        let moveQuery = "SELECT * FROM card_attacks INNER JOIN attacks on card_attacks.attack_name = attacks.name WHERE " +
        "card_attacks.card_number = ? AND card_attacks.set_id = ?;"
        db.all(moveQuery, [pokemon_number, set_id], (err, rows) => {
            if(err) throw err;
            let attackData = [];                                  //Move object containing the move information.
            rows.forEach((row) => {
                //If the attack has no associated damage value, set the damage value to 0.
                if(row.damage.length === 0) {
                    attackData.unshift({"name": row.attack_name, "text": row.description, "damage": 0});
                } else {
                    attackData.unshift({"name": row.attack_name, "text": row.description, "damage": row.damage});
                }
            });
            res.status(200);
            res.setHeader("Content-Type", "text/html");
            res.render("card", data={"card":cardData, "attacks": attackData, "searchOptions":searchOptions});
            next();
        });

    }).catch((err)=> {
        console.log(`Error getting card data: ${err.message}`);
        res.status(404);
        res.send(err.message);
        next();
    });

}

