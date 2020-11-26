Module.register("MMM-Gitlab-MergeRequests",{
	// Default module config.
	defaults: {
        gitlabUrl: "https://gitlab.com",
        accessToken: "",
        tableClass: "small",
        reloadInterval: 300,
        maxEntries: 10,
        maxTitleLength: 25,
        wrapEvents: false, // wrap events to multiple lines breaking at maxTitleLength        
		    fade: true,
        fadePoint: 0.25,
        state: "opened",
        orderBy: "created_at",
        sort: "desc",
        scope: "created_by_me",
        animationSpeed: 2000,
        combineNames: false,
        milestone: "",
        labels: "",
        createdAfter: "",
        createdBefore: "",
        updatedAfter: "",
        updatedBefore: "",
        authorId: "",
        authorUsername: "",
        assigneeId: "",
        approverIds: "",
        approvedByIds: "",
        sourceBranch: "",
        targetBranch: "",
        search: "",
        in: "",
        wip: "",
        not: "",
        environmnet: "",
        deployedBefore: "",
        deployedAfter: "",
    },
    
    // Define required scripts.
	getStyles: function () {
		return ["MMM-Gitlab-MergeRequests.css", "font-awesome.css"];
    },
    
    getScripts: function () {
		return ["moment.js"];
    },
    start: function () {
        Log.log("Starting module: " + this.name);
        const url = this.getRequestUrl();
        this.addGitlab(url, this.config.accessToken, this.config.reloadInterval, this.config.maxEntries, this.config.combineNames);
        
        this.mergeRequestData = [];
        this.loaded = false;
    },
	// Override socket notification handler.
	socketNotificationReceived: function (notification, payload) {
		if (this.identifier !== payload.id) {
			return;
		}
    Log.warn("here 2");
		if (notification === "MERGE_REQUESTS") {		
				this.mergeRequestData = payload.mergeRequests;
				this.loaded = true;

				if (this.config.broadcastEvents) {
					this.broadcastEvents();
				}
		} else if (notification === "MR_FETCH_ERROR") {
			Log.error("Merge Request Error. Could not fetch calendar: " + payload.url);
			this.loaded = true;
		} else if (notification === "MR_INCORRECT_URL") {
			Log.error("Merge Request Error. Incorrect url: " + payload.url);
		}

		this.updateDom(this.config.animationSpeed);
	},
	// Override dom generator.
	getDom: function() {
        Log.log("getDom: " + this.name);
        var mergeRequests = this.mergeRequestData;
            var wrapper = document.createElement("table");
        wrapper.className = this.config.tableClass;
            
        if (mergeRequests.length === 0) {
                wrapper.innerHTML = this.loaded ? "No matching Merge Requests." : "Loading Merge Requests";
                wrapper.className = this.config.tableClass + " dimmed";
                return wrapper;
        }
            
        if (this.config.fade && this.config.fadePoint < 1) {
                if (this.config.fadePoint < 0) {
                    this.config.fadePoint = 0;
                }
                var startFade = mergeRequests.length * this.config.fadePoint;
                var fadeSteps = mergeRequests.length - startFade;
        }

        var currentFadeStep = 0;

        for (var mr in mergeRequests){
            var mergeRequest = mergeRequests[mr];
            // var dateAsString = moment(mergeRequest.created_at, "x").format(this.config.dateFormat);

            var mrWrapper = document.createElement("tr");
            mrWrapper.className = "normal";
            if (mr >= startFade) {
            currentFadeStep = mr - startFade;
            mrWrapper.style.opacity = 1 - (1 / fadeSteps) * currentFadeStep;
            }

            //author
            var avatarWrapper = document.createElement("td");
            var avatar = document.createElement("img");
            avatar.src = mergeRequest.author.avatar_url;
            avatar.alt = "Author"
            avatar.className = "avatar"
            avatarWrapper.appendChild(avatar);
            mrWrapper.appendChild(avatarWrapper);

            //title
            var titleWrapper = document.createElement("td");
            titleWrapper.innerHTML = this.titleTransform(mergeRequest.title, this.config.wrapEvents, this.config.maxTitleLength, this.config.maxTitleLines);
            titleWrapper.className = "title"
            mrWrapper.appendChild(titleWrapper);

            var timeWrapper = document.createElement("td");
            moment.utc(mergeRequest.created_at,"YYYY-MM-DDTHH:mm:ss")
            timeWrapper.innerHTML = this.capFirst(moment.utc(mergeRequest.created_at,"YYYY-MM-DDTHH:mm:ss").fromNow()); //gitlab returns time utc by default
            timeWrapper.className = "time light";
            mrWrapper.appendChild(timeWrapper);

            var symbolWrapper = document.createElement("td");
            symbolWrapper.className = "symbol align-right";
            var symbol = document.createElement("span");
            if(mergeRequest.merge_status === 'can_be_merged'){
                symbol.className = "fa fa-fw fa-check-circle canMerge";
            } else if(mergeRequest.merge_status === 'unchecked'){
                //this means the merge request has no checks, so it is good to go
                symbol.className = "fa fa-fw fa-check-circle canMerge";
            } else if(mergeRequest.merge_status === 'cannot_be_merged_recheck' || mergeRequest.merge_status === 'cannot_be_merged'){
                symbol.className = "fa fa-fw fa-times-circle canNotMerge";
            }
            symbolWrapper.appendChild(symbol);
            mrWrapper.appendChild(symbolWrapper);

            wrapper.appendChild(mrWrapper);
        }
            return wrapper;
    },
        
    getRequestUrl: function() {
        let url = this.config.gitlabUrl;
        if(!url.endsWith('/') && !url.endsWith('\\')){
            url = url + "/api/v4/merge_requests?";
        }
        url = url + "page=1&per_page="+(this.config.maxEntries*2);
        url = url + "&state="+this.config.state;
        url = url + "&order_by="+this.config.orderBy;
        url = url + "&sort="+this.config.sort;
        url = url + "&scope="+this.config.scope;
        url = url + "&with_merge_status_recheck=true";

        if(this.config.milestone){
            url = url + "&milestone="+this.config.milestone;
        }
        if(this.config.labels){
            url = url + "&labels="+this.config.labels;
        }
        if(this.config.createdAfter){
            url = url + "&created_after="+this.config.createdAfter;
        }
        if(this.config.createdBefore){
            url = url + "&created_before="+this.config.createdBefore;
        }
        if(this.config.updatedAfter){
            url = url + "&updated_after="+this.config.updatedAfter;
        }
        if(this.config.updatedBefore){
            url = url + "&updated_before="+this.config.updatedBefore;
        }
        if(this.config.authorId){
            url = url + "&author_id="+this.config.authorId;
        }
        if(this.config.authorUsername){
            url = url + "&author_username="+this.config.authorUsername;
        }
        if(this.config.assigneeId){
            url = url + "&assignee_id="+this.config.assigneeId;
        }
        if(this.config.approverIds){
            url = url + "&approver_ids="+this.config.approverIds;
        }
        if(this.config.approvedByIds){
            url = url + "&approved_by_ids="+this.config.approvedByIds;
        }
        if(this.config.sourceBranch){
            url = url + "&source_branch="+this.config.sourceBranch;
        }
        if(this.config.targetBranch){
            url = url + "&target_branch="+this.config.targetBranch;
        }
        if(this.config.search){
            url = url + "&search="+this.config.search;
        }
        if(this.config.in){
            url = url + "&in="+this.config.in;
        }
        if(this.config.wip){
            url = url + "&wip="+this.config.wip;
        }
        if(this.config.not){
            url = url + "&not="+this.config.not;
        }
        if(this.config.environmnet){
            url = url + "&environmnet="+this.config.environmnet;
        }
        if(this.config.deployedBefore){
            url = url + "&deployed_before="+this.config.deployedBefore;
        }
        if(this.config.deployedAfter){
            url = url + "&deployed_after="+this.config.deployedAfter;
        }
        return url;
    },
    addGitlab: function (url, accessToken, reloadInterval, maxEntries, combineNames) {
            this.sendSocketNotification("ADD_GITLAB_INSTANCE", {
                id: this.identifier,
                url: url,
                accessToken: accessToken,
        reloadInterval: reloadInterval,
        maxEntries: maxEntries,
        combineNames: combineNames
            });
        },
    titleTransform: function (string, wrapEvents, maxLength, maxTitleLines) {
        if (typeof string !== "string") {
                return "";
            }

            if (wrapEvents === true) {
                var temp = "";
                var currentLine = "";
                var words = string.split(" ");
                var line = 0;

                for (var i = 0; i < words.length; i++) {
                    var word = words[i];
                    if (currentLine.length + word.length < (typeof maxLength === "number" ? maxLength : 25) - 1) {
                        // max - 1 to account for a space
                        currentLine += word + " ";
                    } else {
                        line++;
                        if (line > maxTitleLines - 1) {
                            if (i < words.length) {
                                currentLine += "&hellip;";
                            }
                            break;
                        }

                        if (currentLine.length > 0) {
                            temp += currentLine + "<br>" + word + " ";
                        } else {
                            temp += word + "<br>";
                        }
                        currentLine = "";
                    }
                }

                return (temp + currentLine).trim();
            } else {
                if (maxLength && typeof maxLength === "number" && string.length > maxLength) {
                    return string.trim().slice(0, maxLength) + "&hellip;";
                } else {
                    return string.trim();
                }
            }
    },
    capFirst: function (string) {
            return string.charAt(0).toUpperCase() + string.slice(1);
        },

	/**
	 * Broadcasts the events to all other modules for reuse.
	 * The all events available in one array, sorted on startdate.
	 */
	broadcastEvents: function () {
		var eventList = [];
		for (var url in this.calendarData) {
			var calendar = this.calendarData[url];
			for (var e in calendar) {
				var event = cloneObject(calendar[e]);
				event.symbol = this.symbolsForEvent(event);
				event.calendarName = this.calendarNameForUrl(url);
				event.color = this.colorForUrl(url);
				delete event.url;
				eventList.push(event);
			}
		}

		eventList.sort(function (a, b) {
			return a.startDate - b.startDate;
		});

		this.sendNotification("MERGE_REQUESTS", this.mergeRequestData);
	}
});