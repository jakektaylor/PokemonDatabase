//Require the needed modules.
const express = require('express');
const sqlite3 = require('sqlite3');

const app = express();
app.set('view engine', 'pug');

app.use((req, res, next)=>{
    console.log(req.method+ " request to "+req.url);
    next();
});

//Constants are defined here.
const searchOptions = ["Cards, by name", "Cards, by type", "Cards by min. HP", "Cards, by set", "Cards, by move", 
"Moves, by name", "Moves, by type", "Moves, by min. damage"];

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
    app.get("/cards/:set/:pokemon", showCard);
    app.get("/moves/:name", showMove);
    app.listen(3000);
    console.log("Server listening at http://localhost:3000");
}

/*This function is responsible for sending the HTML for the homepage to the client.*/
function getHomePage(req, res, next){
    res.setHeader("Content-Type", "text/html");
    res.status(200);
    res.render('search', {searchOptions:searchOptions});
    //res.end();
}

/*This function handles all queries to the database made in the search bar. It sends back JSON data for cards
and moves depending on the search type. The HTML for the results is generated on the client side using this data.*/
function queryDatabase(req, res, next){
    //Log the query for debugging purposes.
    console.log("The type of query is: "+ searchOptions[req.query.type]);
    console.log("The keyword being search for is: " + req.query.body);

    let requestType = Number(req.query.type);
    let requestValue = req.query.body;

    //Convert request value to a lowercase string for queries that involve strings.
    if(requestValue!=="" && requestType !== 7 &&requestType !== 2){
         requestValue = requestValue.toLowerCase();                            //Convert to lowercase to make queries insensitive.
    }
    //Otherwise, convert to a number.
    else if(requestValue !== ""){
        requestValue = Number(requestValue)
    };
    //REQUEST TYPE 0: The user has requested to search for a card by the name of the Pokemon.
    if(requestType === 0){

        db.all("SELECT name, set_name FROM pokemon_cards WHERE lower(name) LIKE "+`'%${requestValue}%'`+";", [], (err, rows)=>{
            if(err){
                throw err;
            }

            //Formulate the search results in the form {text: <text to be url}
            let searchResults=[];
            rows.forEach((row)=>{
                searchResults.push({text:`${row.name}, ${row.set_name}`, url:`/cards/${row.set_name}/${row.name}`});
            });
            //Send back the response.
            res.setHeader("Content-Type", "application/json");
            res.status(200);
            res.send(JSON.stringify(searchResults));
            res.end();
        });
        
    }
    //REQUEST TYPE 1: In this case the user is searching for a card based on its type.
    else if(requestType === 1){
        db.all("SELECT name, set_name FROM pokemon_cards WHERE EXISTS (SELECT * FROM pokemon WHERE name=pokemon_cards.name AND lower(type)="+`'${requestValue}')`+";", [], (err, rows)=>{
            if(err){
                throw err;
            }

            //Formulate the search results in the form {text: <text to be url}
            let searchResults=[];
            rows.forEach((row)=>{
                searchResults.push({text:`${row.name}, ${row.set_name}`, url:`/cards/${row.set_name}/${row.name}`});
            });
            //Send back the response.
            res.setHeader("Content-Type", "application/json");
            res.status(200);
            res.send(JSON.stringify(searchResults));
            res.end();
        });
    }
    //REQUEST TYPE 2: In this case the user is searching for a card based on its HP.
    else if(requestType === 2 && !isNaN(requestValue)){
        db.all(`SELECT name, set_name FROM pokemon_cards WHERE HP >= '${requestValue}';`, [], (err, rows) => {
            if(err){
                throw err;
            }

            //Formulate the search results in the form {text: <text to be url}
            let searchResults=[];
            rows.forEach((row)=>{
                searchResults.push({text:`${row.name}, ${row.set_name}`, url:`/cards/${row.set_name}/${row.name}`});
            });
            //Send back the response.
            res.setHeader("Content-Type", "application/json");
            res.status(200);
            res.send(JSON.stringify(searchResults));
            res.end();
        });
    }

    //REQUEST TYPE 3: In this case the user is searching for a card based on the set it belongs to.
    else if(requestType === 3){
        db.all("SELECT name, set_name FROM pokemon_cards WHERE lower(set_name) LIKE "+`'%${requestValue}%'`+";", [], (err, rows)=>{
            if(err){
                throw err;
            }

            //Formulate the search results in the form {text: <text to be url}
            let searchResults=[];
            rows.forEach((row)=>{
                searchResults.push({text:`${row.name}, ${row.set_name}`, url:`/cards/${row.set_name}/${row.name}`});
            });
            //Send back the response.
            res.setHeader("Content-Type", "application/json");
            res.status(200);
            res.send(JSON.stringify(searchResults));
            res.end();
        });
    }
    //REQUEST TYPE 4: In this case the user is searching for a card based on a move that is on it.
    else if(requestType === 4){
        db.all("SELECT pokemon_name, set_name FROM card_movesets WHERE lower(move_name)="+`'${requestValue}'`+";", [], (err, rows)=>{
            if(err){
                throw err;
            }

            //Formulate the search results in the form {text: <text to be url}
            let searchResults=[];
            rows.forEach((row)=>{
                searchResults.push({text:`${row.pokemon_name}, ${row.set_name}`, url:`/cards/${row.set_name}/${row.pokemon_name}`});
            });
            //Send back the response.
            res.setHeader("Content-Type", "application/json");
            res.status(200);
            res.send(JSON.stringify(searchResults));
            res.end();
        });
    }

    //REQUEST TYPE 5: The user is searching for a move that appears on a card based on its name.
    else if (requestType === 5){
        db.all("SELECT name FROM  moves WHERE lower(name) LIKE "+`'%${requestValue}%'`+";", [], (err, rows)=>{
            if(err){
                throw err;
            }

            //Formulate the search results in the form {text: <text to be url>}
            let searchResults=[];
            rows.forEach((row)=>{
                searchResults.push({text:`${row.name}`, url:`/moves/${row.name}`});
            });
            //Send back the response.
            res.setHeader("Content-Type", "application/json");
            res.status(200);
            res.send(JSON.stringify(searchResults));
            res.end();
        });
    }
    //REQUEST TYPE 6: The user is searching for a move that appears on a card based on its type.
    else if (requestType === 6){
        db.all("SELECT name FROM moves WHERE lower(type)="+`'${requestValue}'`+";", [], (err, rows)=>{
            if(err){
                throw err;
            }

            //Formulate the search results in the form {text: <text to be url}
            let searchResults=[];
            rows.forEach((row)=>{
                searchResults.push({text:`${row.name}`, url:`/moves/${row.name}`});
            });
            //Send back the response.
            res.setHeader("Content-Type", "application/json");
            res.status(200);
            res.send(JSON.stringify(searchResults));
            res.end();
        });
    }
    //REQUEST TYPE 7: The user is searching moves that deal a minimum amount of damage.
    else if (!isNaN(requestValue)){
        db.all("SELECT name FROM  moves WHERE damage > "+`${requestValue}`+";", [], (err, rows)=>{
            if(err){
                throw err;
            }

            //Formulate the search results in the form {text: <text to be url}
            let searchResults=[];
            rows.forEach((row)=>{
                searchResults.push({text:`${row.name}`, url:`/moves/${row.name}`});
            });
            //Send back the response.
            res.setHeader("Content-Type", "application/json");
            res.status(200);
            res.send(JSON.stringify(searchResults));
            res.end();
        });
    }

}

/*Purpose: This function is responsible for displaying a card. The information on the card includes:
    1. name                 5. moves
    2. set_name             6. first generation appeared in
    3. rarity               7. Pokedex number
    4. HP                   8. Pokemon type

*/
function showCard(req, res, next){
    let set = req.params.set;
    let pokemon = req.params.pokemon;
    let cardData = {};
    let moveData = [];

    /*First get the data from the pokemon_cards table*/
    db.get("SELECT rarity, HP FROM  pokemon_cards WHERE name="+`'${pokemon}' AND set_name=`+`'${set}';`, [], (err, row)=>{
        if(err){
            throw err;
        }
        //Check to make sure a row was found. If not, return.
        if(row){
            /*We now add the name of nthe Pokemon and the name of the set to the cardData.*/
            cardData["Name"] = pokemon;
            cardData["Set Name"] = set;
            cardData["HP"]=row.HP;
            cardData["Rarity"]=row.rarity;
        }
        else{
            res.status(404);
            res.send();
            next();
            return;
        }

        /*Next get the Type of the Pokemon*/
        db.get(`SELECT type FROM pokemon WHERE name='${pokemon}';`, [], (err, row)=>{
            if(err){
                throw err;
            }
            if(row){
                cardData["Type"] = row.type;
            }
            else{
                res.status(404);
                res.send();
                next();
                return;
            }
            /*Next get the moves that appear on the card*/
            db.all("SELECT move_name, move_number FROM card_movesets WHERE pokemon_name=" 
            + `'${pokemon}' AND set_name=` + `'${set}';`, [], (err, rows)=>{
                if(err){
                    throw err;
                }
                //Add all of the moves to an array.
                let moves=[];
                rows.forEach((row)=>{
                    moves.push({number: row.move_number, text:`${row.move_name}`, url:`/moves/${row.move_name}`});
                });
                moveData = moves;

                /*Next we get the generation in which the card was released.*/
                db.get(`SELECT generation_number FROM card_sets WHERE name='${set}';`,
                [], (err, row)=>{
                    if(err){
                        throw err;
                    }
                    //Check to make sure a row was found. If not, return 
                    if(row){
                        cardData["Card Released in Generation"] = row.generation_number;
                    }
                    else{
                        res.status(404);
                        res.send();
                        next();
                        return;
                    }
                    /*Finally, we get the Pokedex data*/
                    db.get(`SELECT pokedex_number FROM pokedex WHERE pokemon_name='${pokemon}' AND isFirstAppearance;`,
                    [], (err, row)=>{
                        if(err){
                            throw err;
                        }
                        //Check to make sure a row was found. If not, return 
                        if(row){
                            cardData["Pokedex Number"] = row.pokedex_number;
                        }
                        else{
                            res.status(404);
                            res.send();
                            next();
                            return;
                        }
                        //Send back the HTML response.
                        res.status(200);
                        res.setHeader("Content-Type", "text/html");
                        res.render("card", data={card:cardData, moves:moveData});
                    });
                });
            });
        });
    });
}

/*Purpose: This function is responsible for sending an HTML page to represent a Pokemon move. The information
on this page will include:
    1. The name of the move.                5. A column consisting of a list of cards on which it appears.
    2. The type of the move
    3. The damage dealt by the move.
    4. A description of the move.
*/
function showMove(req, res, next){
    let moveName = req.params.name;
    let move = {};
    let cardsWithMove = [];
    /*First get the data from the moves table*/
    db.get(`SELECT * FROM moves WHERE name='${moveName}';`,[], (err, row)=>{
        if(err){
            throw err;
        }
        //Check to make sure a row was found. If not, return.
        if(row){
            move.name = row.name;
            move.type = row.type;
            move.damage = row.damage;
            move.description = row.description;
        }
        else{
            res.status(404);
            res.send();
            next();
            return;
        }

        /*Next we search for the Pokemon that know the move.*/
        db.all(`SELECT pokemon_name, set_name FROM card_movesets WHERE move_name='${moveName}';`, [], (err, rows)=>{
            if(err){
                throw err;
            }

            //Add all the Pokemon that know the move to an array.
            rows.forEach((row)=>{
                cardsWithMove.push({name: row.pokemon_name, set: row.set_name, url: `/cards/${row.set_name}/${row.pokemon_name}`});
            });

            //Send back the HTML response.
            res.status(200);
            res.setHeader("Content-Type", "text/html");
            res.render("move", data={move:move, cards:cardsWithMove});
        })
    });
}   

