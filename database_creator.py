import sqlite3
import requests as req
import json

API_KEY = "97c730ea-8317-4012-b56b-b0c6888364ef"
SETS_URL = "https://api.pokemontcg.io/v2/sets/"
TYPES_URL = "https://api.pokemontcg.io/v2/types"
CARD_URL = "https://api.pokemontcg.io/v2/cards/"

''' Purpose: This method is responsible for making a request to the Pokemon database.
    Parameters: -url: The URL to make the request to.
                -param: The parameter to add to the request, such as the set or card id.
    Returns: A dictionary representing the JSON response, provided that a ConnectionError was not thrown.
'''
def make_request(url: str, param: str) -> dict: 
  response = req.get(f"{url}{param}", headers={"X-Api-Key": API_KEY})
  status = response.status_code
  if status != 200:
   #Handle rejected requests by raising a connection error.
   if status == 400:
    print("Bad Request: The request was unacceptable, often due to an incorrect query" +
          "string parameter.")
   elif status == 402:
    print("Request Failed: The parameters were valid but the request failed.")
   elif status == 403:
    print("Forbidden: The user doesn't have permissions to perform the request.")
   elif status == 404:
    print("Not Found: The requested resource doesn't exist.")
   elif status == 429:
    print(f"Too Many Requests: The rate limit of 20000 requests/day has been exceeded.\nCurrent ID: {id}.\nExiting...")
    exit(-1)                     #Exit since this error is critical
   elif status in [500, 502, 503, 504]:
    print("Server Error")
   else:
    print("Connection failed due to undefined reasons.")
   print(f"Connection Error: The URL requested was: {url}{param}")
   raise ConnectionError
  else:
   #Converts the JSON into a dictionary.
   return json.loads(response.content)

'''Purpose: This method is responsible for creating the 6 tables a part of the sqlite database that is 
   used to store the required data for the application.
'''
def create_tables(con: sqlite3.Connection) -> None:
 cursor = con.cursor() 

 #Drop previosuly created tables.
 cursor.execute("DROP TABLE IF EXISTS sets;")
 cursor.execute("DROP TABLE IF EXISTS pokemon;")
 cursor.execute("DROP TABLE IF EXISTS types;")
 cursor.execute("DROP TABLE IF EXISTS pokemon_types;")
 cursor.execute("DROP TABLE IF EXISTS cards;")
 cursor.execute("DROP TABLE IF EXISTS attacks;")

 #Create the 'sets' table.
 cursor.execute('''
		CREATE TABLE sets(
   id TEXT PRIMARY KEY,
			series TEXT NOT NULL,		        --ex. Base, Sword and Shield etc.
			name TEXT NOT NULL,				      --The particular set within the series.
			total_cards INTEGER NOT NULL,   --Modified it to be only the number of cards added to the database from the set.
			set_logo TEXT NOT NULL	        --URL of the set logo image
  ); 
		''')
  
	#Create the 'pokemon' table.
 cursor.execute('''
		CREATE TABLE pokemon(
			name TEXT PRIMARY KEY
  );
	''')

 #Create the 'types' table.
 cursor.execute('''
  CREATE TABLE types(
   name TEXT PRIMARY KEY,
   image_url TEXT NOT NULL
  );
 ''')

 #Create the 'pokemon_types' table.
 cursor.execute('''
  CREATE TABLE pokemon_types(
   pokemon_name TEXT NOT NULL,
   pokemon_type TEXT NOT NULL, 
   PRIMARY KEY (pokemon_name, pokemon_type),
   FOREIGN KEY (pokemon_name) REFERENCES pokemon(name) ON DELETE CASCADE,
   FOREIGN KEY (pokemon_type) REFERENCES types(name) ON DELETE CASCADE
  );          
 ''')

 #Create the 'cards' table. Need to assign an ID to each card since the same pokemon can have more than 1 
 #card in the same set. Ex. Clefable in base2 (Jungle) has a regular and a holo version.
 cursor.execute('''
  CREATE TABLE cards(
   number INTEGER,                --The number of the card in the set as assigned by me. 
   set_id TEXT NOT NULL,          --The id of the set to which the card belongs.
   pokemon_name TEXT NOT NULL,    
   hp INTEGER NOT NULL, 
   level INTEGER,               --Can be NULL since it only appears on older cards.
   rarity TEXT NOT NULL,
   image_url TEXT NOT NULL,     --URL of the image.
   PRIMARY KEY (number, set_id),
   FOREIGN KEY (pokemon_name) REFERENCES pokemon(name) ON DELETE CASCADE,
   FOREIGN KEY (set_id) REFERENCES sets(id) ON DELETE CASCADE
  );          
 ''')

 #Create the 'attacks' table. Attacks with the same name have different costs depending on the card. Therefore, need
 #to specify the associated card.
 cursor.execute('''
  CREATE TABLE attacks(
   name TEXT NOT NULL,
   card_number INTEGER NOT NULL,
   set_id TEXT NOT NULL,
   description TEXT,
   damage TEXT,             --Text because can have damage values such as "10x"
   colorless_cost INTEGER,  --The cost of the attack (can be multiple types, many columns will be NULL)
   darkness_cost INTEGER,
   dragon_cost INTEGER,
   fairy_cost INTEGER,
   fighting_cost INTEGER,
   fire_cost INTEGER,
   grass_cost INTEGER,
   lightning_cost INTEGER,
   metal_cost INTEGER,
   psychic_cost INTEGER,
   water_cost INTEGER,
   PRIMARY KEY (name, card_number, set_id),
   FOREIGN KEY (card_number, set_id) REFERENCES cards(number, set_id) ON DELETE CASCADE
  );
 ''')
 
 cursor.close()

''' Purpose: This method is responsible for adding a row to the 'sets' table in the sqlite database containing all 
    of the information for the set with the given id.
    Parameters: -con: The connection to the sqlite3 database
                -set_id: The ID of the set.
    NOTE: A row will fail to be added if the call to 'make_request' results in a ConnectionError.
'''
def store_set_data(con: sqlite3.Connection, set_id: str) -> None:
 set_data = make_request(SETS_URL, set_id)
 set_data = set_data["data"]
 #Add a new row in the database for the set.
 cursor = con.cursor()
 cursor.execute("INSERT INTO sets(id,series,name,total_cards,set_logo) VALUES (?,?,?,?,?)", 
 (set_data["id"], set_data["series"], set_data["name"], set_data["total"], set_data["images"]["logo"]))
 con.commit()
 cursor.close()

''' Purpose: This method is responsible for populating the 'types' table in the sqlite database.
    Parameters: con: sqlite3.Connection to the sqlite3 database.
    NOTE: The table will fail to be populated if the call to 'make_request' results in a ConnectionError.
''' 
def store_types_data(con: sqlite3.Connection) -> None:
 types_data = make_request(TYPES_URL, "")
 types_data = types_data["data"]
 cursor = con.cursor()
 for t in types_data:
  cursor.execute("INSERT INTO types(name, image_url) VALUES (?, ?)",
  (t, f"/images/types/{t.lower()}.png"))
 con.commit()
 cursor.close()

''' Purpose: This method is responsible for storing all of the data for all of the Pokemon cards
    (not energy cards etc.) in a given set. This will end up adding data to the 'pokemon', 'pokemon_types',
    'cards' and 'attacks' tables in the sqlite database.
    Parameters: con: Connection to the sqlite3 database
                set_id: Id of the set to which the card belongs
                card_number: Number of the card in the set (actual)
                db_number: The number of the card as it has been added to the database. (number field in
                'cards' table)
    Returns: 0 if a card is added and -1 if not.
                
'''
def store_card_data(con:sqlite3.Connection, set_id: str, card_number: int, db_number: int) -> int: 

 #Get the data from the API.
 cursor = con.cursor()
 card_data = make_request(CARD_URL, f"{set_id}-{card_number}")
 card_data = card_data["data"]

 #Make sure the card is a Pokémon card and not a energy or trainer card.
 if(card_data["supertype"] != "Pokémon"): return -1

 #Add the name of the Pokémon to the 'pokemon' table and the pokemon name and its type(s) to the 
 #'pokemon_types' table. If we have already added this info. for this Pokemon from another card, simply
 #move on.
 try:
  cursor.execute("INSERT INTO pokemon(name) VALUES (?);", (card_data["name"], ))
  for type in card_data["types"]:
   cursor.execute("INSERT INTO pokemon_types(pokemon_name, pokemon_type) VALUES (?,?);", (card_data["name"], type))
 except sqlite3.IntegrityError as e:
  pass
 
 #Add the card to the 'cards' table.
 card_table_data = {}
 card_table_data["number"] = db_number
 card_table_data["set_id"] = card_data["set"]["id"]
 card_table_data["name"] = card_data["name"]

 #Check if the other values are given, if not set them to None (which will be NULL in the field for the record)
 try:
  card_table_data["hp"] = card_data["hp"]
 except KeyError:
  card_table_data["hp"] = None
 
 try:
  card_table_data["level"] = card_data["level"]
 except KeyError:
  card_table_data["level"] = None

 try:
  card_table_data["rarity"] = card_data["rarity"]
  if card_table_data["rarity"] == "":
   card_table_data["rarity"] = None
 except KeyError:
  card_table_data["rarity"] = None

 try:
  card_table_data["image"] = card_data["images"]["large"]
  if card_table_data["image"] == "":
   card_table_data["image"] = "/images/default_image.png"
 except KeyError:
  card_table_data["image"] = "/images/default_image.png"

 
 cursor.execute("INSERT INTO cards(number,set_id,pokemon_name,hp,level,rarity,image_url) VALUES (?,?,?,?,?,?,?)", 
 (card_table_data["number"], card_table_data["set_id"], card_table_data["name"], card_table_data["hp"], 
 card_table_data["level"], card_table_data["rarity"], card_table_data["image"]))
 
 #Store the data related to the card's attacks. It adds data to the 'attacks' and 'card_attacks' tables. 
 #Note: Not all Pokemon cards have attacks.
 try:
  attack_data = card_data["attacks"]
  store_attack_data(cursor, db_number, card_table_data["set_id"], attack_data)
 except KeyError:
  pass
 con.commit()
 cursor.close()
 return 0 

''' Purpose: Helper method for the 'store_card_data" method used to store the data related to the attacks 
    that appear on a given Pokemon card. This means adding data to the 'attacks' and table in the DB.
    Parameters: -cursor: cursor in the Pokemon database
                -db_number: The number of the Pokemon in the set as assigned by me.
                -set_id: id of the set to which the card belongs
                -attack_data: list of attacks on the card, where each attack is a dictionary containing information about it
'''
def store_attack_data(cursor: sqlite3.Connection.cursor, db_number: int, set_id:str, attack_data:list) -> None:
 for attack in attack_data:
  #Calculate the attack cost for each type of energy.
  types = cursor.execute("SELECT name FROM types;").fetchall()
  types = [type[0] for type in types]
  attack_cost = {key: attack["cost"].count(key) for key in types}

  #Store the information for the attack in the 'attacks' table.
  try: 
   cursor.execute("INSERT INTO attacks(name,card_number,set_id,description,damage,colorless_cost,darkness_cost,dragon_cost,fairy_cost," +
                  "fighting_cost,fire_cost,grass_cost,lightning_cost,metal_cost,psychic_cost,water_cost) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);",
   (attack["name"], db_number, set_id, attack["text"], attack["damage"], attack_cost["Colorless"], attack_cost["Darkness"], 
    attack_cost["Dragon"], attack_cost["Fairy"], attack_cost["Fighting"], attack_cost["Fire"], attack_cost["Grass"], attack_cost["Lightning"],
    attack_cost["Metal"], attack_cost["Psychic"], attack_cost["Water"]))
  except sqlite3.IntegrityError:
   pass

#Main method.
def main():
 #The ids of the sets from which we will be getting cards (can add more later)
 #NOTE: Some cards which should be in the set based on the total are not available (Request results in 'Not Found' error)
 sets = ["base1", "base2", "neo1", "neo2", "ex1", "ex6", "ex9", "dp1", "dp7", "pl4", "bw1", "bw9", "xy1", 
         "xy6", "sm1", "sm8", "swsh1", "swsh10", "sv1", "sv4"]
	#Create a new database.
 try:
  con = sqlite3.connect("pokemon.db")
  
  create_tables(con)

  store_types_data(con)       #Populate the 'types' table.

  #Store the 'sets' table.
  for set in sets:
   store_set_data(con, set)
  
  #Store the cards in each set.
  for set in sets:
   #Determine the number of cards in the provided set.
   cursor = con.cursor()
   set_info = cursor.execute("SELECT total_cards FROM sets WHERE sets.id = ?;", (set,))
   set_info = set_info.fetchone()
   cursor.close()
   if set_info is None:
    print("Invalid set_id was provided.")
    raise ValueError                                              #ValueError to indicate an invalid set id was used.
   total_cards = set_info[0]                                      #The total number of cards in the set.
   curr_card = 1                                                  #The current card from the set we are adding.
   for i in range(1, total_cards+1):
    try:
      rc = store_card_data(con, set, i, curr_card)
      if rc == 0: curr_card+=1
    except ConnectionError as card_error:
     print(f"{card_error}")
     print("Continuing...")
  con.close()
 except (sqlite3.Error, ValueError, ConnectionError) as e:
  print(f"{e}\n")
  print("Exiting the program...")
  exit(-1)

if __name__ == "__main__":
 main()


