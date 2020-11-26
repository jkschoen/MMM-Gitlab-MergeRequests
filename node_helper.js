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
			this.createFetcher(payload.url, payload.accessToken, payload.reloadInterval, payload.maxEntries, payload.combineNames, payload.id);
		}
	},

	createFetcher: function (url, accessToken, reloadInterval, maxEntries, combineNames, identifier) {
		var self = this;

		if (!validUrl.isUri(url)) {
			self.sendSocketNotification("MR_INCORRECT_URL", { id: identifier, url: url });
			return;
		}

		var fetcher;
		if (typeof self.fetchers[identifier + url] === "undefined") {
			Log.log("Create new Merge Request fetcher for url: " + url + " - Interval: " + reloadInterval);
			fetcher = new MergeRequestFetcher(url, accessToken, reloadInterval, maxEntries, combineNames);

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

			self.fetchers[identifier + url] = fetcher;
        } 
        else {
			Log.log("Use existing merge request fetcher for url: " + url);
			fetcher = self.fetchers[identifier + url];            
		}

		fetcher.startFetch();
	}
});