import * as utilities from "./utilities.js";
import * as serverVariables from "./serverVariables.js";
import Repository from "./models/repository.js";

let requestsCachesExpirationTime = serverVariables.get("main.requests.CacheExpirationTime");

global.requestsCaches = [];
global.cachedRequestsCleanerStarted = false;

export default class CachedRequestsManager {
    static startCachedRequestsleaner() {
        // periodic cleaning of expired cached repository data
        setInterval(CachedRequestsManager.flushExpired, requestsCachesExpirationTime * 1000);
        console.log(BgWhite + FgRed, "[Periodic repositories data caches cleaning process started...]");

    }
    static add(url, data, ETag = "") {
        if (!cachedRequestsCleanerStarted) {
            cachedRequestsCleanerStarted = true;
            CachedRequestsManager.startCachedRequestsleaner();
        }
        if (url != "") {
            CachedRequestsManager.clear(url);
            requestsCaches.push({
                url,
                data,
                ETag,
                Expire_Time: utilities.nowInSeconds() + requestsCachesExpirationTime
            });
            console.log(BgWhite + FgRed, `[Data of ${url} has been cached]`);
        }
    }
    static find(url) {
        try {
            if (url != "") {
                for (let cache of requestsCaches) {
                    if (cache.url == url) {
                        return cache;
                    }
                }
            }
        } catch (error) {
            console.log(BgWhite + FgRed, "[requests cache error!]", error);
        }
        return null;
    }
    static clear(url) {
        if (url != "") {
            repositoryCaches = repositoryCaches.filter( cache => cache.url != url)
        }
    } 
    static flushExpired() {
        let now = utilities.nowInSeconds();
        for (let cache of requestsCaches) {
            if (cache.Expire_Time <= now) {
                console.log(BgWhite + FgRed, "Cached data of " + cache.url + " expired");
            }
        }
        requestsCaches = requestsCaches.filter( cache => cache.Expire_Time > now);
    }
    static get(HttpContext){
        let cache = CachedRequestsManager.find(HttpContext.req.url);

        if (cache != null && cache.ETag == Repository.getETag(HttpContext.path.model)){ //Cache existante et ETag pareil
            // renew cache
            cache.Expire_Time = utilities.nowInSeconds() + requestsCachesExpirationTime;
            console.log(BgWhite + FgRed, `[${cache.url} data retrieved from cache and renewed]`);

            HttpContext.response.JSON( cache.data, cache.ETag, true /* from cache */)
            return true;
        }
        return false;
    }
}
