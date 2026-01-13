// staticData\queryParams.js

// Список обязательных параметров Launch URL
export const REQUIRED_PARAMS = ["user", "token", "currency", "operator"];

// Список необязательных параметров Launch URL
export const OPTIONAL_PARAMS = [
  "return_url",
  "lang",
  "game",
  "account_history_url",
  "irc_duration",
  "irc_elapsed",
];

export const ROUND_DETAILS_PARAMS = [
  "round_id",
  "game",
  "provider",
  "operator",
  "player_token",
  "op_player_id"
];

export const SG_DIGITAL_PARAMS = [
    "nogsgameid",
    "nogsoperatorid",
    "nogscurrency",
    "nogslang",
    "accountid",
    "nogsmode",
    "device",
    "lobbyurl",
    "jurisdiction",
    "sessionid",
    "ticket",
    "clienttype",
    "winloss",
    "elapsedtime",
    "domain",
    "iframemode",
    "depositurl",
    "gameUrl",
    "gameName",
    "exitUrl",
    "showhome",
    "playslot",
    "operatorid",
    "gameid",
    "currency",
    "lang",
    "mode",
    "ogsgameid"
];