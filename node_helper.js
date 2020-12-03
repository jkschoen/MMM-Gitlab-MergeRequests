const NodeHelper = require("node_helper");
const validUrl = require("valid-url");
const MergeRequestFetcher = require("./MergeRequestFetcher.js");
const Log = require("../../js/logger");

module.exports = NodeHelper.create({
	// Override start method.
	start: function () {
		Log.log("Starting node helper for: " + this.name);
		this.fetchers = [];
	},

	// Override socketNotificationReceived method.
	socketNotificationReceived: function (notification, payload) {
		if (notification === "ADD_GITLAB_INSTANCE") {
			this.createFetcher(payload.config, payload.id);
		}
	},

	createFetcher: function (config, identifier) {
		var self = this;

		if (!validUrl.isUri(config.gitlabUrl)) {
			self.sendSocketNotification("MR_INCORRECT_URL", { id: identifier, url: config.gitlabUrl });
			return;
		}

		var fetcher;
		if (typeof self.fetchers[identifier + config.gitlabUrl] === "undefined") {
			Log.log("Create new Merge Request fetcher for url: " + config.gitlabUrl + " - Interval: " + config.reloadInterval);
			fetcher = new MergeRequestFetcher(config);

			fetcher.onReceive(function (fetcher) {                
				self.sendSocketNotification("MERGE_REQUESTS", {
					id: identifier,
					url: fetcher.url(),
					mergeRequests: fetcher.mergeRequests()
				});
			});

			fetcher.onError(function (fetcher, error) {
				Log.error("Merge Request Fetcher Error. Could not fetch merge requests: ", fetcher.url(), error);
				self.sendSocketNotification("MR_FETCH_ERROR", {
					id: identifier,
					url: fetcher.url(),
					error: error
				});
			});

			self.fetchers[identifier + config.gitlabUrl] = fetcher;
        } 
        else {
			Log.log("Use existing merge request fetcher for url: " + config.gitlabUrlrl);
			fetcher = self.fetchers[identifier + config.gitlabUrl];            
		}

		fetcher.startFetch();
	}
});