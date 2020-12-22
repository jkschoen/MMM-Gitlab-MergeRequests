const Log = require("../../js/logger.js");
const request = require("request");

const MergeRequestFetcher = function (config) {
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
                "PRIVATE-TOKEN": config.accessToken
			},
			gzip: true
		};
		
	  
		const gitlabUrl = getMergeRequestUrl(config);
		console.log(`Merge request Url :'${gitlabUrl}'`);
        
        request(gitlabUrl, opts, async function (err, r, requestData) {
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
			var projectDictory = {};
			for(i in extraData){
				var item = extraData[i]
				if(!dataDictionary.combineNames || !dataDictionary[item.title]){
					if(config.showNamespace){
						if(!projectDictory[item.project_id]){
							var projectData = await getProject(item.project_id);
							projectDictory[item.project_id] = projectData.name_with_namespace;
						} 
						item.projectNamespace = projectDictory[item.project_id];
					}
					dataDictionary[item.title] = item;
				} else if(item.merge_status !== "can_be_merged" && item.merge_status !== "unchecked"){
					dataDictionary[item.title].merge_status = item.merge_status					
				} //otherwise we do not need to do anything
				if(Object.keys(dataDictionary).length == config.maxEntries){
					break;
				}
			}
			mergeRequests = Object.values(dataDictionary);	

            self.broadcastEvents();
			scheduleTimer();
        });
        scheduleTimer();
	};
	
	const getMergeRequestUrl = function(config) {
        let url = config.gitlabUrl;
        if(!url.endsWith('/') && !url.endsWith('\\')){
            url = url + "/api/v4/merge_requests?";
        }
        url = url + "page=1&per_page="+(config.maxEntries*2);
        url = url + "&state="+config.state;
        url = url + "&order_by="+config.orderBy;
        url = url + "&sort="+config.sort;
        url = url + "&scope="+config.scope;
        url = url + "&with_merge_status_recheck=true";

        if(config.milestone){
            url = url + "&milestone="+config.milestone;
        }
        if(config.labels){
            url = url + "&labels="+config.labels;
        }
        if(config.createdAfter){
            url = url + "&created_after="+config.createdAfter;
        }
        if(config.createdBefore){
            url = url + "&created_before="+config.createdBefore;
        }
        if(config.updatedAfter){
            url = url + "&updated_after="+config.updatedAfter;
        }
        if(config.updatedBefore){
            url = url + "&updated_before="+config.updatedBefore;
        }
        if(config.authorId){
            url = url + "&author_id="+config.authorId;
        }
        if(config.authorUsername){
            url = url + "&author_username="+config.authorUsername;
        }
        if(config.assigneeId){
            url = url + "&assignee_id="+config.assigneeId;
        }
        if(config.approverIds){
            url = url + "&approver_ids="+config.approverIds;
        }
        if(config.approvedByIds){
            url = url + "&approved_by_ids="+config.approvedByIds;
        }
        if(config.sourceBranch){
            url = url + "&source_branch="+config.sourceBranch;
        }
        if(config.targetBranch){
            url = url + "&target_branch="+config.targetBranch;
        }
        if(config.search){
            url = url + "&search="+config.search;
        }
        if(config.in){
            url = url + "&in="+config.in;
        }
        if(config.wip){
            url = url + "&wip="+config.wip;
        }
        if(config.not){
            url = url + "&not="+config.not;
        }
        if(config.environmnet){
            url = url + "&environmnet="+config.environmnet;
        }
        if(config.deployedBefore){
            url = url + "&deployed_before="+config.deployedBefore;
        }
        if(config.deployedAfter){
            url = url + "&deployed_after="+config.deployedAfter;
        }
        return url;
	};

	const getProject = function(projectId) {
		return new Promise((resolve, reject) => {
			const nodeVersion = Number(process.version.match(/^v(\d+\.\d+)/)[1]);
			const opts = {
				headers: {
					"User-Agent": "Mozilla/5.0 (Node.js " + nodeVersion + ") MagicMirror/" + global.version + " (https://github.com/MichMich/MagicMirror/)",
					"PRIVATE-TOKEN": config.accessToken
				},
				gzip: true
			};
			const projectUrl = getProjectUrl(projectId);
			console.log(`Project Url :'${projectUrl}'`);

			request(projectUrl, opts, function (err, r, requestData) {
				if (err) {
					console.log(`Err`);
					console.log(err);
					fetchFailedCallback(self, err);
					scheduleTimer();
					return;
				} else if (r.statusCode !== 200) {
					console.log(r.statusCode + ": " + r.statusMessage);
					fetchFailedCallback(self, r.statusCode + ": " + r.statusMessage);
					scheduleTimer();
					return;
				}
				
				var extraData = JSON.parse(requestData);
				resolve(extraData);
			});
		});
	}
	
	const getProjectUrl = function(projectId) {
        let url = config.gitlabUrl;
        if(!url.endsWith('/') && !url.endsWith('\\')){
            url = url + "/api/v4/projects/";
        }
        url = url + projectId;
        return url;
    };

    /**
	 * Schedule the timer for the next update.
	 */
	const scheduleTimer = function () {
		clearTimeout(reloadTimer);
		reloadTimer = setTimeout(function () {
			fetch();
		}, config.reloadInterval*1000);
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
		return config.gitlabUrl;
	};

	this.mergeRequests = function () {
		return mergeRequests;
	};
};

module.exports = MergeRequestFetcher;