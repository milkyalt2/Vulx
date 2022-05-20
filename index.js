// library definitions
const path = require('path');
const fs = require('fs');
const open = require('open');
const express = require('express');
const portfinder = require('portfinder');

// local imports
const discord = require("./utils/discordHelper");
const logger = require('./utils/logger');
const configHelper = require('./utils/configHelper');
const { createJson } = require('./utils/jsonHelper');
const { axiosHelperInit, vulxAxios, lockFile } = require('./utils/axiosHelper');
const ValorantAPI = require('./utils/ValorantAPI');
const LookupAPI = require('./utils/LookupAPI');
const routes = require('./routes');

// TODO: Figure out why the actual fuck pkg doesn't include this in the compiled exe even after having it included through pkg config
path.join(__dirname, 'public/css/style.css');
path.join(__dirname, 'public/js/vulx.load.js');
path.join(__dirname, 'public/js/vulx.request.reset.js');
path.join(__dirname, 'public/js/vulx.request.session.js');
path.join(__dirname, 'public/js/vulx.request.settings.js');
path.join(__dirname, 'public/js/vulx.welcome.js');

const config = configHelper.getConfig();

portfinder.basePort = config.port;
portfinder.highestPort = config.port + 100;
let port;

process.argv.forEach(arg => {
	if (arg.includes("debug")) {
		logger.debugMode = true;
		logger.debug("You are in debug mode, this is a feature to print verbose debug information to the console.");
	}
})

// express definition
const app = express();

app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

app.use(express.urlencoded({ extended: true }));

app.use('/', routes);

(async function () {
	await discord.startRPC();

	await axiosHelperInit();

	port = await portfinder.getPortPromise();

	const valConfig = configHelper.getValConfig();
	const jsonData = await createJson(valConfig, false);

	await vulxAxios.put("/chat/v2/me", jsonData)
		.then((res) => {
			if (!res.isAxiosError) {
				logger.debug(`Successfully sent /me request to local Valorant API`)
			}
		})
	discord.update(valConfig.queueId, valConfig.competitiveTier);

	if (port != config.port)
		logger.info(`Dashboard port changed from ${config.port} to ${port}`);

	app.get("/", (req, res) => {
		res.set({ "Allow-access-Allow-Origin": "*" });
		res.sendFile(path.join(__dirname, '/public/welcome.html'));
	});

	app.listen(port, () => {
		logger.debug(`Vulx initialized on port ${port}`);
		if(process.pkg)
			open('http://127.0.0.1:' + port);
	});
})();