'use strict';

const winston = require('winston');

const useDevelopEndpoint = true; /* set to true if you want to use topcoder's dev instance,
"false" if you want to use production instance */

let config = {};

config.TC = {};
config.TC.AUTHN_URL = useDevelopEndpoint ?
  'https://topcoder-dev.auth0.com/oauth/ro' :
  'https://topcoder.auth0.com/oauth/ro';
config.TC.AUTHZ_URL = useDevelopEndpoint ?
  'https://api.topcoder-dev.com/v3/authorizations' :
  'https://api.topcoder.com/v3/authorizations';
config.TC.CHALLENGES_URL = useDevelopEndpoint ?
  'https://api.topcoder-dev.com/v4/challenges/?filter=status%3DACTIVE' :
  'https://api.topcoder.com/v4/challenges/?filter=status%3DACTIVE';
config.TC.TOKEN_REFRESH_URL = useDevelopEndpoint ?
'https://api.topcoder-dev.com/v3/authorizations/1' :
'https://api.topcoder.com/v3/authorizations/1';
config.TC.CHALLENGE_URL = useDevelopEndpoint ?
  'https://api.topcoder-dev.com/v4/challenges' :
  'https://api.topcoder.com/v4/challenges';
config.TC.UPLOAD_SUBMMISSION_URL = useDevelopEndpoint ?
  'https://api.topcoder-dev.com/v5/submissions' :
  'https://api.topcoder.com/v5/submissions';
config.TC.TOKEN_REFRESH_TIME = 10 * 60 * 1000;
config.TC.CLIENT_ID = useDevelopEndpoint ?
  'JFDo7HMkf0q2CkVFHojy3zHWafziprhT' :
  '6ZwZEUo2ZK4c50aLPpgupeg5v2Ffxp9P';
config.TC.CLIENT_V2CONNECTION = 'TC-User-Database';
config.TC.SUBMIT_TYPE = 'ContestSubmission';

config.LOG_LEVEL = 'info';
config.LOG_FILE = 'app.log';

config.EXT_NAME = 'topcoder-workflow';
config.WARN_MESSAGES = {
  MISSING_USERNAME: 'Missing username. Configure your username in package settings.',
  MISSING_PASSWORD: 'Missing password. Configure your password in package settings.'
};
config.INFO_MESSAGES = {
  LOGGING_IN: 'Logging in user.',
  LOGGED_IN: 'You are logged in.',
  LOGGED_OUT: 'Logged out.',
  LOADING_OPEN_CHALLENGES: 'Loading open challenges.',
  LOADING_CHALLENGE: 'Loading challenge detail.',
  EMPTY_PROJECT_TO_SUBMIT: 'Empty project to submit. You should open a project first.',
  MISS_TOPCODER_RCFILE: 'No .topcoderrc file detected in the current workspace.',
  INCORRECT_FORMAT_TOPCODERRC: 'Incorrect format of .topcoderrc, it should be JSON format.',
  MISS_CHALLENGE_ID: 'Missing challengeId in .topcoderrc.',
  USER_NOT_REGISTERED_FOR_CHALLENGE: 'You have not registered for this challenge.',
  SUBMISSION_PHASE_NOT_OPEN: 'The submission phase is not open for this challenge',
  CHALLENGE_NOT_FOUND: 'Could not find the requested challenge'
};

config.logger = new (winston.Logger)({
  level: config.LOG_LEVEL,
  transports: [
    new (winston.transports.Console)(),
    new (winston.transports.File)({
      filename: config.LOG_FILE
    })
  ]
});

module.exports = config;
