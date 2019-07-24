'use babel';

const config = require('../config');
const logger = config.logger;
const TCAuth = require('./auth/TCAuth');

const ignore = require('ignore');

const _ = require('lodash');
const path = require('path');
const fs = require('fs');
const {
    log,
    generateHtmlFromChallenges,
    generateHtmlFromChallenge,
    api
} = require('./utils.js');
const { listAllFilesInDir, zipFiles } = require('./zipUtils.js');
const jwt = require('jsonwebtoken');
const FormData = require('form-data');

import TopcoderWebView from './topcoder-web-view'

import { CompositeDisposable } from 'atom';

/**
 * Control class of topcoder-workflow package
 *
 */
export default {
    subscriptions: null,
    openChallengesView: null,
    challenges: [],
    challenge: null,
    uriPattern: 'atom://topcoder-workflow/challenges',

    activate (state) {

        this.clearCache();

        // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
        this.subscriptions = new CompositeDisposable();

        // Register command that inserts this view
        this.subscriptions.add(atom.commands.add('atom-workspace', {
            'topcoder:login': () => this.login(),
            'topcoder:logout': () => this.logout(),
            'topcoder:viewOpenChallenges': () => this.viewOpenChallenges(),
            'topcoder:uploadSubmmission': () => this.uploadSubmmission()

        }));

        this.subscriptions.add(atom.workspace.addOpener((uri) => {
            if (uri.startsWith(this.uriPattern)) {
                if (uri.length === this.uriPattern.length) {
                    if (this.openChallengesView) {
                        this.openChallengesView.reload(generateHtmlFromChallenges(this.challenges));
                        return this.openChallengesView;
                    } else {
                        this.openChallengesView = new TopcoderWebView({ html: generateHtmlFromChallenges(this.challenges) });
                        return this.openChallengesView;
                    }
                } else {
                    if (this.challenge) {
                        const param = { html: generateHtmlFromChallenge(this.challenge), title: this.challenge.challengeTitle }
                        this.challenge = null;
                        return new TopcoderWebView(param);
                    } else {
                        let challengeId = uri.substring(this.uriPattern.length + 1)
                        this.viewChallenge(challengeId)
                    }
                }
            }
        }));

        // create token refresh timeer
        this.refreshTimer = setInterval(() => {
            this.refreshToken();
        }, config.TC.TOKEN_REFRESH_TIME);
    },

    deactivate () {
        this.subscriptions.dispose();
        clearInterval(this.refreshTimer);
    },

    /**
     * [refreshToken send request to config.TC.TOKEN_REFRESH_URL to refresh the token]
     */
    refreshToken () {
        const token = this.getToken()
        if (token === null) {
            return;
        }
        api.get(config.TC.TOKEN_REFRESH_URL, token, (res) => {
            const response = JSON.parse(res.response);
            const newToken = response.result.content.token;
            log('getting refresh token', newToken);
            if (newToken) {
                this.saveToken(newToken);
            }
        });
    },

    /**
     * [login function]
     * @param  {[string]} lastAction [What user is doing before login(method name)]
     * @param  {[array]}  parameters [lastAction method parameters]
     */
    login (lastAction, parameters) {
        const username = atom.config.get(`${config.EXT_NAME}.username`);
        const password = atom.config.get(`${config.EXT_NAME}.password`);

        if (username.trim().length === 0) {
            atom.notifications.addWarning(config.WARN_MESSAGES.MISSING_USERNAME);
            return;
        }
        if (password.trim().length === 0) {
            atom.notifications.addWarning(config.WARN_MESSAGES.MISSING_PASSWORD);
            return;
        }

        atom.notifications.addInfo(config.INFO_MESSAGES.LOGGING_IN, { dismissable: true });

        let tca = new TCAuth(config.TC, logger);
        tca.login(username, password, (err, accessToken) => {
            if (err) {
                atom.notifications.addError(`Login failed, ${err}, please check your username/password in configuration`, { dismissable: true });
            } else {
                _.last(atom.notifications.getNotifications()).dismiss();
                this.saveToken(accessToken);

                // when login success,
                // if user comes to login from loading challenges/challenge detail,
                // jump back to load challenges/challenge detail
                if (lastAction) {
                    atom.notifications.addSuccess(config.INFO_MESSAGES.LOGGED_IN, { dismissable: true });
                    const loginSuccessNotification = _.last(atom.notifications.getNotifications());
                    setTimeout(() => { loginSuccessNotification.dismiss(); }, 1000);

                    switch (lastAction) {
                        case 'viewOpenChallenges':
                            return this.viewOpenChallenges();
                        case 'viewChallenge':
                            return this.viewChallenge(...parameters);
                        case 'uploadSubmission':
                            return this.uploadSubmmission();
                    }

                } else {
                    atom.notifications.addSuccess(config.INFO_MESSAGES.LOGGED_IN);
                }

            }
        });
    },

    /**
     * [logout function]
     */
    logout () {
        this.clearCache();
        atom.notifications.addSuccess(config.INFO_MESSAGES.LOGGED_OUT);
    },

    /**
     * [viewOpenChallenges render open challenges]
     */
    viewOpenChallenges () {
        const token = this.getToken();
        // if not logged in, send login request
        if (token === null) {
            this.login('viewOpenChallenges');
            return;
        }

        atom.notifications.addInfo(config.INFO_MESSAGES.LOADING_OPEN_CHALLENGES, { dismissable: true });

        api.get(config.TC.CHALLENGES_URL, token, (res) => {
            _.last(atom.notifications.getNotifications()).dismiss();
            if (res.status !== 200) {
                atom.notifications.addError(`Fetch open challenges failed, ${res.response}`, { dismissable: true });
                return;
            }

            const response = JSON.parse(res.response);
            this.challenges = response.result.content;

            return atom.workspace.open(this.uriPattern, { searchAllPanes: true });
        });
    },



    /**
     * [viewChallenge render challenge detail]
     * @param  {[string]} challengeId [the challenge id]
     */
    viewChallenge (challengeId) {
        const token = this.getToken();
        // if not logged in, send login request
        if (token === null) {
            this.login('viewChallenge', [challengeId]);
            return;
        }

        atom.notifications.addInfo(config.INFO_MESSAGES.LOADING_CHALLENGE, { dismissable: true });

        api.get(`${config.TC.CHALLENGE_URL}/${challengeId}`, token, (res) => {
            _.last(atom.notifications.getNotifications()).dismiss();
            if (res.status !== 200) {
                atom.notifications.addError(`Fetch challenge detail failed, ${res.response}`, { dismissable: true });
                return;
            }

            const response = JSON.parse(res.response);
            this.challenge = response.result.content;

            return atom.workspace.open(`${this.uriPattern}/${challengeId}`);
        });
    },

    uploadSubmmission () {
        const token = this.getToken();
        // if not logged in, send login request
        if (token === null) {
            this.login('uploadSubmission');
            return;
        }
        // get all existing paths in the project. if none is retrieve, means that
        // no files can be zipped to be uploaded
        const paths = atom.project.getPaths();
        if (_.size(paths) === 0) {
            atom.notifications.addError(config.INFO_MESSAGES.EMPTY_PROJECT_TO_SUBMIT, { dismissable: true });
            return;
        }
        // checks if there is one topcoderrc on any project directory
        var projectDirectories = atom.project.getDirectories();
        const projectContainsTopcoderRc = projectDirectories.find((directory) => fs.existsSync(path.join(directory.getPath(), '.topcoderrc')));
        if (!projectContainsTopcoderRc) {
            atom.notifications.addError(config.INFO_MESSAGES.MISS_TOPCODER_RCFILE, { dismissable: true });
            return;
        }
        const projectPath = projectContainsTopcoderRc.getPath();
        const rcContent = fs.readFileSync(path.join(projectPath, '.topcoderrc'), 'utf-8');
        let challengeId = '';
        // check if it's a valid number that exists in topcoderrc file under challengeId prop.
        try {
            challengeId = JSON.parse(rcContent).challengeId;
            if (typeof challengeId === 'number') {
                challengeId = challengeId + '';
            }
        } catch (err) {
            atom.notifications.addError(config.INFO_MESSAGES.INCORRECT_FORMAT_TOPCODERRC, { dismissable: true });
            return;
        }
        // if challenge id is not filled, also show an error.
        if (typeof challengeId !== 'string' || !(challengeId.trim())) {
            atom.notifications.addError(config.INFO_MESSAGES.MISS_CHALLENGE_ID, { dismissable: true });
            return;
        }
        /* First validate if user can submit: */
        // get challenge details if challenge exists
        api.get(`${config.TC.CHALLENGE_URL}/${challengeId}`, token, async (res) => {
            if (res.status === 404) {
                atom.notifications.addError(config.INFO_MESSAGES.CHALLENGE_NOT_FOUND, { dismissable: true });
                return;
            }
            if (res.status !== 200) {
                atom.notifications.addError(`Fetch open challenges failed, ${res.response}`, { dismissable: true });
                return;
            }

            const response = JSON.parse(res.response);
            // check if this user has registered for this challenge
            const decodedToken = jwt.decode(token);
            const registrants = _.get(response, 'result.content.registrants', []);
            const hasUserRegistered = registrants.find((profile) => profile.handle === decodedToken.handle) !== undefined;
            if (!hasUserRegistered) {
                atom.notifications.addError(config.INFO_MESSAGES.USER_NOT_REGISTERED_FOR_CHALLENGE, { dismissable: true });
                return;
            }
            // check if this challenge is open for submission
            const phases = _.get(response, 'result.content.phases', []);
            const isChallengeOpenForSubmission = phases.find((phase) => phase.type === 'Submission'
                && phase.status === 'Open') !== undefined;
            if (!isChallengeOpenForSubmission) {
                atom.notifications.addError(config.INFO_MESSAGES.SUBMISSION_PHASE_NOT_OPEN, { dismissable: true });
                return;
            }

            /* Proceed with submission */
            const ig = ignore();
            if (fs.existsSync(path.join(projectPath, '.gitignore'))) {
                // load the .gitignore and add .git folder
                ig.add(fs.readFileSync(path.join(projectPath, '.gitignore')).toString()).add('.git');
            } else {
                // always ignore .git folder
                ig.add('.git');
            }
            // get all files which not ignored
            const filesToSubmit = listAllFilesInDir(projectPath, projectPath, ig);
            // zip all files and save to local temp file
            const zipFilePath = path.join(projectPath, 'submit.zip');
            await zipFiles(projectPath, filesToSubmit, zipFilePath);
            // submit the file to topcoder endpoint
            let responseSubmission;
            this.submitFileToChallenge(zipFilePath, challengeId, token, () => {
                if (fs.existsSync(zipFilePath)) {
                    fs.unlinkSync(zipFilePath);
                }
                return responseSubmission;
            });


        });


    },

    /**
  * Submit the file to topcoder challenge
  * @param filePath the file path
  * @param challengeId the challenge id
  * @param savedToken the token
  * @return the response of submit endpoint
  */
    submitFileToChallenge (filePath, challengeId, savedToken, callback) {
        const decodedToken = jwt.decode(savedToken);
        const fd = new FormData();
        //        fd.append('buffer', Buffer.from([0x00, 0x4a, 0x45, 0x46, 0x46, 0x52, 0x45, 0x59, 0x255]));
        fd.append('type', `${config.TC.SUBMIT_TYPE}`);
        fd.append('memberId', `${decodedToken.userId}`);
        fd.append('challengeId', `${challengeId}`);
        const xxx = fs.createReadStream(filePath);
        console.log(xxx);
        fd.append('submission', xxx);

        xxx.on('open', (fxd) => {
            api.post(config.TC.UPLOAD_SUBMMISSION_URL, fd, savedToken, callback);
        });



        //   var formData = new FormData();

        //   var stringName = 'String';
        //   var stringValue = 'This is a random string';
        //   var intName = 'Int';
        //   var intValue = 1549873167987;
        //   var bufferName = 'Buffer';
        //   var bufferValue = Buffer.from([0x00,0x4a,0x45,0x46,0x46,0x52,0x45,0x59,0x255]);

        //   // Fill the formData object
        //   formData.append( stringName, stringValue );
        //   formData.append( intName, intValue );
        //   formData.append( bufferName, bufferValue );

       // api.post(config.TC.UPLOAD_SUBMMISSION_URL, fd, savedToken, callback);
    },

    /**
     * [saveToken store the token]
     * @param  {[string]} token [latest token]
     */
    saveToken (token) {
        localStorage.setItem('atom_topcoder_token', token);
    },

    /**
     * [getToken get the stored token]
     * @return {[string]} [token]
     */
    getToken () {
        const t = localStorage.getItem('atom_topcoder_token');
        return t;
    },

    /**
     * [clearCache delete stored token]
     */
    clearCache () {
        localStorage.removeItem('atom_topcoder_token');
    }
};
