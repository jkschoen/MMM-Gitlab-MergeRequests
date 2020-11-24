const Log = require("../../js/logger.js");
const request = require("request");

const MergeRequestFetcher = function (url, accessToken, reloadInterval, maxEntries, combineName) {
    const self = this;
    let reloadTimer = null;

    let mergeRequests = [];

    let fetchFailedCallback = function () {};
    let receivedCallback = function () {};
    
    const fetch = function () {
        const nodeVersion = Number(process.version.match(/^v(\d+\.\d+)/)[1]);
		const opts = {
			headers: {
                "User-Agent": "Mozilla/5.0 (Node.js " + nodeVersion + ") MagicMirror/" + global.version + " (https://github.com/MichMich/MagicMirror/)",
                "PRIVATE-TOKEN": accessToken
			},
			gzip: true
        };
      
        
        request(url, opts, function (err, r, requestData) {
            if (err) {
				fetchFailedCallback(self, err);
				scheduleTimer();
				return;
			} else if (r.statusCode !== 200) {
				fetchFailedCallback(self, r.statusCode + ": " + r.statusMessage);
				scheduleTimer();
				return;
            }
            
			var extraData = JSON.parse(requestData);
			
			var dataDictionary = {};
			for(i in extraData){
				var item = extraData[i]
				if(!dataDictionary[item.title]){
					dataDictionary[item.title] = item;
				} else if(item.merge_status !== "can_be_merged" && item.merge_status !== "unchecked"){
					dataDictionary[item.title].merge_status = item.merge_status
					
				} //otherwise we do not need to do anything
				if(Object.keys(dataDictionary).length == maxEntries){
					break;
				}
			}
			mergeRequests = Object.values(dataDictionary);	

            self.broadcastEvents();
			scheduleTimer();
        });
    };

    /**
	 * Schedule the timer for the next update.
	 */
	const scheduleTimer = function () {
		clearTimeout(reloadTimer);
		reloadTimer = setTimeout(function () {
			fetch();
		}, reloadInterval*1000);
    };
    
    /* public methods */

	this.startFetch = function () {
		fetch();
	};

	this.broadcastEvents = function () {
        Log.info("MergeRequestFetcher: Broadcasting " + mergeRequests.length + " Merge Requests.");
		receivedCallback(self);
	};

	this.onReceive = function (callback) {
		receivedCallback = callback;
	};

	this.onError = function (callback) {
		fetchFailedCallback = callback;
	};

	this.url = function () {
		return url;
	};

	this.mergeRequests = function () {
		return mergeRequests;
	};
};

module.exports = MergeRequestFetcher;