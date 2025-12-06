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
  "session_token",
  "op_player_id"
];