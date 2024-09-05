'use strict';
import { timSort, PokemonComparator } from './sort.mjs';
//Require the needed modules.
import express from "express";
import sqlite3 from "sqlite3";

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
    app.get("/cards/:set?", showSet); 
    app.get("/cards/:set/:number", showCard);
    app.get("/pokemon", showPokemon);
    app.listen(3000);
    console.log("Server listening at http://localhost:3000");
}

/*This function is responsible for sending the HTML for the homepage to the client.*/
function getHomePage(req, res, next){
    let message = "Welcome to the Pokemon Card Database website. Here you can search a database consisting of 2336 unique Pokemon cards from " +
    "20 unique sets. All cards have Pokemon on them; Energy and Trainer cards were not included in the database. All of the card data was " +
    "collected using a Python script which made requests to the 'Pokémon TCG API'. Here is a link to the webpage describing the API: https://pokemontcg.io/. " +
    "The website was created by me, Jake Taylor.";
    res.setHeader("Content-Type", "text/html");
    res.status(200);
    res.render('search', {data: {searchOptions:searchOptions, searchResults:[], message:message, set:null}});
    next();
}

/*This function handles all queries to the database made in the search bar. It sends back HTML for cards
and moves depending on the search type. The HTML for the results is generated on the client side using this data.*/
function queryDatabase(req, res, next){
    let requestType = Number(req.query.type);
    let requestValue = req.query.body;

    //Convert request value to a lowercase string for queries that involve strings.
    if(requestType !== 2){
         requestValue = requestValue.toLowerCase();                            //Convert to lowercase to make queries insensitive.
         requestValue = requestValue.concat("%");                              //% is a wildcard, matching any characters after the request 
                                                                               //value when LIKE is used
    }
    //Otherwise, convert to a number.
    else {
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
                "(SELECT cards.number as card_number, cards.pokemon_name, cards.set_id FROM cards INNER JOIN card_types ON " +
                "cards.number = card_types.card_number AND cards.set_id = card_types.card_set_id WHERE lower(card_types.card_type) LIKE ?) AS A " +
                "ON A.set_id = sets.id;", [requestValue], (err, rows)=>{
                
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
            db.all("SELECT sets.series as set_series, sets.name as set_name, A.set_id, A.card_number, A.pokemon_name FROM sets " +
                "INNER JOIN (SELECT cards.pokemon_name, attacks.card_number, attacks.set_id FROM attacks INNER JOIN cards ON " +
                "attacks.card_number = cards.number AND attacks.set_id = cards.set_id WHERE lower(attacks.name) LIKE ?) A ON " +
                "A.set_id = sets.id;", [requestValue], (err, rows)=>{
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
    }).then((searchResults)=> new Promise((resolve, reject) => {
        res.setHeader("Content-Type", "text/html");
        res.status(200);
        res.render('search', {"data": {searchOptions:searchOptions, searchResults:searchResults, message:null, set:null}});
        next();
    })).catch((err)=>{
        res.status(500);
        res.send(`SQLite Error: ${err.message}`);
        next(); 
    });
}

/*Purpose: This function is responsible for displaying a card. The information on the card includes:
    1. name                 5. HP
    2. type(s)              6. Level (may be undefined for newer cards)
    3. set series           7. Rarity
    4. set name             8. Attacks
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
        let typeQuery = "SELECT types.name AS type_name, types.image_url FROM card_types INNER JOIN types ON card_types.card_type = types.name " +
        "WHERE card_types.card_number = ? AND card_types.card_set_id=?;"
        db.all(typeQuery, [pokemon_number, set_id], (err, rows)=> {
            if(err) reject(err);
            

            //Get the different type(s) of the card and the Image icon for each type.
            let types = [];
            rows.forEach((row)=>{
                types.push({"Name": row.type_name, "Image": row.image_url});
            });

            cardData["Types"] = types;
            resolve(cardData);
        });
    })).then((cardData)=> new Promise ((resolve, reject) => {
        //Get the attack data for the card.
        let moveQuery = "SELECT * FROM attacks WHERE card_number=? AND set_id=?;";
        db.all(moveQuery, [pokemon_number, set_id], (err, rows) => {
            if(err) throw err;
            let attackData = [];                                  //Move object containing the move information.
            //Determine the cost of the attack.
            let costs = {}
            rows.forEach((row)=>{
                let costsKey = `${row.set_id}-${row.card_number}-${row.name}`;              //The key to used to access the cost.
                costs[costsKey] = [];
                for(let key in row) {
                    if(key.substring(key.length-4, key.length) === "cost" && row[key] > 0) {
                        //Add the cost type name to the array once for each of the amount that is required.
                        for(let i=0;i<row[key];i++){
                             costs[costsKey].unshift(key.substring(0, key.length-5));
                        }
                    }
                }
                //If the attack has no associated damage value, set the damage value to 0.
                if(row.damage.length === 0) {
                    attackData.push({"name": row.name, "text": row.description, 
                    "cost": costs[costsKey], "damage": 0});
                } else {
                    attackData.push({"name": row.name, "text": row.description, 
                    "cost": costs[costsKey], "damage": row.damage});
                }
            });
            
            res.status(200);
            res.setHeader("Content-Type", "text/html");
            res.render("card", {data: {"card":cardData, "attacks": attackData, "searchOptions":searchOptions}});
            next();
        })
    })).catch((err)=> {
        console.log(`Error getting card data: ${err.message}`);
        res.status(404);
        res.send(err.message);
        next();
    });
}

/*This function is responsible for showing all of the cards in a set if the set name is provided in the request. 
Otherwise, we display a table containing all sets and allow the user to choose one.*/
function showSet(req, res, next) {
    //List of all set ids.
    const SETS = ["base1", "base2", "bw1", "bw9","dp1", "dp7", "ex1", "ex6","ex9","neo1","neo2","pl4","sm1","sm8","sv1","sv4","swsh1","swsh10","xy1","xy6"];

    //If the request parameter is not a valid set id, we display all sets and allow the user to choose one. Otherwise, we display all cards 
    //in the requested set.
    let param = req.params.set;
    if(!param || !SETS.includes(param)) {
        new Promise((resolve, reject)=>{
            let setQuery = "SELECT * FROM sets;"
            db.all(setQuery, [], (err, rows)=>{
                if(err) throw err;
                else {
                    let setResults = [];
                    rows.forEach((row)=>{
                        setResults.push(row);
                    });
                    resolve(setResults);
                }
            });
        }).then((setResults)=> new Promise((resolve, reject)=>{
            res.status(200);
            res.setHeader("Content-Type", "text/html");
            res.render("sets", {data:{sets: setResults, searchOptions: searchOptions}});
            next();
        })).catch((err)=>{
            console.log(`Error getting set data: ${err.message}`);
            res.status(404);
            res.send(err.message);
            next();
        });
    } else if(SETS.includes(param) && param.length > 0) {
        param = param.toLowerCase().concat("%");
        //Handle similarly to how we would if the user searched for the set in the search bar,
        new Promise((resolve, reject) => {
            db.all("SELECT cards.number as card_number, cards.pokemon_name, cards.set_id, sets.series AS set_series, " +
                "sets.name AS set_name, sets.total_cards, sets.set_logo FROM cards INNER JOIN sets ON cards.set_id = sets.id WHERE sets.id " +
                " LIKE ?;", [param], (err, rows)=>{
            if(err) throw err;
            else {
                let searchResults = [];
                let setInfo = {};
                //Formulate the search results.
                rows.forEach((row)=>{
                    searchResults.push({text:`${row.pokemon_name} (Series: ${row.set_series}, Set: ${row.set_name})`, url:`/cards/${row.set_id}/${row.card_number}`});
                    if (Object.keys(setInfo).length === 0) {
                        setInfo["id"] = row.set_id;
                        setInfo["name"] = row.set_name;
                        setInfo["series"] = row.set_series;
                        setInfo["totalCards"] = row.total_cards;
                        setInfo["logo"] = row.set_logo;
                    }
                });
                
                //Need to add both to an object as passing two arguments to then will result in the second being used for reject().
                let result = {searchResults: searchResults, set: setInfo, searchOptions: searchOptions, message:null};
                
                resolve(result);
            }
        }
        )}).then((result) => new Promise((resolve, reject)=>{
            res.setHeader("Content-Type", "text/html");
            res.status(200);
            res.render('search', {data:result});
            next();
        })).catch((err)=>{
            res.status(500);
            res.send(`SQLite Error: ${err.message}`);
            next(); 
        });
    }
}

/*The purpsose of this function is to display all of the Pokemon in the database.
TODO: Table should be updated to allow sorting by the name and search.*/
function showPokemon(req, res, next) {
    //Find all Pokemon and their types.
    new Promise((resolve, reject)=>{
        db.all("SELECT cards.number, cards.set_id, cards.pokemon_name, sets.series AS set_series, sets.name as set_name FROM cards INNER JOIN sets " +
            "ON cards.set_id = sets.id ORDER BY cards.pokemon_name;", [], (err, rows)=>{
                if(err) throw err;
                else {
                    let pokemonResults = [];
                    rows.forEach((row)=>{
                        let set = `${row.set_series}-${row.set_name}`;
                        let card_url = `/cards/${row.set_id}/${row.number}`;
                        let info = {"set":set, "url": card_url};                            //Information for the card (Pokemon in the given set)
                        /*If the Pokemon has already been added but we are now adding a new set, do not push a new
                        record to results. We can simply check the previous record since they are being added in 
                        alphabetical order to see if the Pokemon has already been added.*/
                        if(pokemonResults.length > 0 && pokemonResults[pokemonResults.length - 1]["name"] == row.pokemon_name) 
                            pokemonResults[pokemonResults.length - 1]["appearsOn"].push(info);
                        else pokemonResults.push({"name": row.pokemon_name, "appearsOn":[info]});
                    });
                    resolve(pokemonResults);
                }
            });
    //Display the sets the Pokemon appears in (i.e. the sets it has cards in)
    }).then((pokemonResults) => new Promise((resolve, reject) => {
        res.setHeader("Content-Type", "text/html");
        res.status(200);
        res.render('pokemon', {data: {pokemon: pokemonResults, searchOptions:searchOptions}});
        next();
    })).catch((err)=>{
        res.status(500);
        res.send(`SQLite Error: ${err.message}`);
        next(); 
    });
}   