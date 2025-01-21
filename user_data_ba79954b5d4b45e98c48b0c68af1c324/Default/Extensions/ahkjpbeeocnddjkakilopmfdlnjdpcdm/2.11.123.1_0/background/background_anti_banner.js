(function AntiBannerBackground()
{

let m_callFunction = () => {};

let m_popupRules = null;
let m_deactivateFunction = () => {};
const FromSameSiteRequestType = 0;
const FromAnotherSiteRequestType = 1;
let m_popupUrl = "";
let m_excludedDomains = null;
const m_navigatedFrames = {};
const m_pluginId = "abn_back";

let m_scriptletsRules = null;
let m_scriptletBase = null;

const m_contentFunction = (hostname, scriptlet) =>
{
    let m_observer = null;

    if (document.location === null || hostname !== document.location.hostname)
        return;

    const injectScriptlet = element =>
    {
        let scriptNode = null;
        try
        {
            scriptNode = document.createElement("script");
            scriptNode.setAttribute("type", "text/javascript");
            scriptNode.text = decodeURIComponent(scriptlet);
            (element.head || element.documentElement).appendChild(scriptNode);
        }
        catch (e) {}

        if (scriptNode)
        {
            if (scriptNode.parentNode)
                scriptNode.parentNode.removeChild(scriptNode);
        }
    };
    injectScriptlet(document);


    const processFrames = frames =>
    {
        if (!frames)
            return;
        for (const frame of frames)
        {
            if ((/^https?:\/\//).test(frame.src) === false)
                injectScriptlet(frame.contentDocument);
        }
    };

    const processElements = list =>
    {
        for (const elem of list)
        {
            if (elem.nodeType !== 1 || !elem.parentElement || !elem.contentDocument)
                return;
            if (elem.nodeName.toLowerCase() === "iframe")
                processFrames([elem]);

            if (elem.childElementCount === 0)
                return;
            processFrames(elem.querySelectorAll("iframe"));
        }
    };

    const startObserver = evt =>
    {
        if (typeof evt !== "undefined")
            window.removeEventListener("DOMContentLoaded", startObserver);

        processFrames(document.querySelectorAll("iframe"));

        m_observer = new MutationObserver(processElements);
        m_observer.observe(document, { childList: true, subtree: true });
    };

    if (document.readyState === "loading") 
        window.addEventListener("DOMContentLoaded", startObserver);
    else
        startObserver();
};

function GetRulesForHost(host)
{
    const rules = [];
    for (const rule of m_scriptletsRules)
    {
        if ((rule.include && rule.include.test(host)) && (rule.exclude ? !rule.exclude.test(host) : true))
            rules.push(rule.rule);
    }
    return rules;
}

function IsExcludedDomain(url)
{
    return m_excludedDomains !== null && m_excludedDomains.includes(url.hostname);
}

function ExecuteScript(rules, url, details)
{
    const scriptlet = encodeURIComponent(m_scriptletBase + "(" + JSON.stringify(rules) + ");");

    const contentScript = `(${m_contentFunction.toString()})("${url.hostname}", "${scriptlet}");`;

    ApiCall(browsersApi.tabs.executeScript)
        .OnSuccess(() => AvNs.SessionLog(`Scriplets for ${url.hostname} executed`))
        .OnError(err => AvNs.SessionLog(`Scriplets failed with error ${err.message}`))
        .Start(
            {
                target: { tabId: details.tabId, frameIds: [details.frameId] },
                func: m_contentFunction,
                args: [url.hostname, scriptlet],
                world: "MAIN",
                injectImmediately : true
            }
        );
}

function onCommitted(details)
{
    try
    {
        CheckLastError();

        if (details.frameId !== 0 && (details.transitionQualifiers.includes("client_redirect") || details.transitionQualifiers.includes("server_redirect")))
        {
            if (!m_navigatedFrames || (details.tabId in m_navigatedFrames === false))
                m_navigatedFrames[details.tabId] = [];
            m_navigatedFrames[details.tabId].push(details.frameId);
        }
        const url = AvNs.TryCreateUrl(details.url);
        if (!url)
            return;

        if (IsExcludedDomain(url))
        {
            AvNs.SessionLog(`scriptlets skip site by exclude domain: ${details.url}`);
            return;
        }

        const rules = GetRulesForHost(url.hostname);

        if (rules && rules.length)
        {
            AvNs.SessionLog(`Exist rules for ${url.hostname} (count: ${rules.length})`);

            if (!m_scriptletBase)
            {
                AvNs.SessionLog("Base scriptlet not loaded yet");
                AvNs.SetTimeout(() =>
                {
                    if (m_scriptletBase)
                        ExecuteScript(rules, url, details);
                    else
                        AvNs.SessionLog("Base scriptlet not loaded finally");
                }, 2000, m_pluginId);
                return;
            }
            ExecuteScript(rules, url, details);
        }
        else
        {
            AvNs.SessionLog(`No rules for ${url.hostname}`);
        }
    }
    catch (e)
    {
        AvNs.SessionError(e, m_pluginId);
    }
}


function Subscribe()
{
    if (!browsersApi.webNavigation.onCommitted.hasListener(onCommitted))
        browsersApi.webNavigation.onCommitted.addListener(onCommitted);
}

function Unsubscribe()
{
    if (browsersApi.webNavigation.onCommitted.hasListener(onCommitted))
        browsersApi.webNavigation.onCommitted.removeListener(onCommitted);
}

function RunnerImpl(ns, session, startSettings)
{
    function OnPing()
    {
        return ns.MaxRequestDelay;
    }
    function CreateRegExp(list)
    {
        if (!list || !list.length)
            return null;

        let result = "";
        for (const el of list)
        {
            if (result)
                result += "|";
            result += "^(.*\\.+)?" + el;
        }
        return new RegExp(result);
    }
    function OnSetSettings(settings)
    {
        m_excludedDomains = settings.excludedDomains ? settings.excludedDomains : null;
        SetScriptletsRules(settings);
        SetPopupRules(settings);
    }
    function SetPopupRules(settings)
    {
        const needSubscribe = !m_popupRules;

        if (!settings.popupRules)
            m_popupRules = null;
        else
            m_popupRules = settings.popupRules;
        if (needSubscribe && m_popupRules)
            SubscribePopups();
        if (!m_popupRules && !needSubscribe)
            UnsubscribePopups();
    }
    function SetScriptletsRules(settings)
    {
        const needSubscribe = !m_scriptletsRules;

        if (!settings.rules || !settings.rules.length)
        {
            m_scriptletsRules = null;
        }
        else
        {
            m_scriptletsRules = [];
            for (const rule of settings.rules)
            {
                m_scriptletsRules.push({
                    include: CreateRegExp(rule.includeDomains),
                    exclude: CreateRegExp(rule.excludeDomains),
                    rule: rule.rule
                });
            }
            if (!m_scriptletsRules.length)
                m_scriptletsRules = null;
        }
        if (needSubscribe && m_scriptletsRules)
            Subscribe();
        if (!m_scriptletsRules && !needSubscribe)
            Unsubscribe();
    }
    function InitScriptlets()
    {
        const path = browsersApi.runtime.getURL("/additional/scriptlets.js");
        fetch(path)
            .then(response =>
                {
                    if (response.status === 200)
                    {
                        ns.SessionLog("Get scriptlets.js response status 200");
                        response.text().then(text => { m_scriptletBase = text; });
                    }
                    else
                    {
                        ns.SessionError({ message: "Can't get scriptlets.js", details: `request status: ${response.status}` }, m_pluginId);
                    }
                })
            .catch(err => { ns.SessionError(err, m_pluginId); });
    }
    function CheckSite(parentUrl, targetUrl, targetTabId)
    {
        const siteFromBlackList = MatchPopupRules(m_popupRules.blackRules, parentUrl, targetUrl);
        if (!siteFromBlackList)
            return;

        const siteFromWhiteList = MatchPopupRules(m_popupRules.whiteRules, parentUrl, targetUrl);
        if (!siteFromWhiteList)
        {
            m_callFunction("abn_back.popupEvent", { url: targetUrl.href, isBlocked: true });
            ApiCall(browsersApi.tabs.remove)
                .OnError(err => ns.SessionLog({ message: "popup ab: remove tab", details: `Error: ${err.message}` }, m_pluginId))
                .Start(targetTabId);
        }
        else
        {
            m_callFunction("abn_back.popupEvent", { url: targetUrl.href, isBlocked: false });
        }
    }
    function MatchPopupRules(rules, parentUrl, targetUrl)
    {
        if (!rules)
            return false;

        for (const rule of rules)
        {
            if (MatchPopupRule(parentUrl, targetUrl, rule))
                return true;
        }

        return false;
    }
    function MatchPopupRule(parentUrl, targetUrl, rule)
    {
        const matchTargetUrl = targetUrl.href.match(rule.urlRegex);
        if (!matchTargetUrl || matchTargetUrl.length === 0 || matchTargetUrl[0].length === 0)
            return false;

        const parentDomain = parentUrl.host;
        const targetDomain = targetUrl.host;

        if (rule.requestType === FromSameSiteRequestType && parentDomain !== targetDomain)
            return false;
        else if (rule.requestType === FromAnotherSiteRequestType && parentDomain === targetDomain)
            return false;

        if (!rule.includedRefererDomains || rule.includedRefererDomains.length === 0)
            return true;

        for (const includedRefererDomain of rule.includedRefererDomains)
        {
            let match = parentDomain.match("^(.+\\.)?" + includedRefererDomain + "$");
            if (match && match.length > 0)
            {
                if (!rule.excludedRefererDomains || rule.excludedRefererDomains.length === 0)
                    return true;

                for (const excludedRefererDomain of rule.excludedRefererDomains)
                {
                    match = parentDomain.match("^(.+\\.)?" + excludedRefererDomain + "$");
                    if (match && match.length > 0)
                        return false;
                }
                return true;
            }
        }

        return false;
    }

    function ProcessError(details, message)
    {
        if (message.startsWith("No tab with id"))
            ns.SessionLog(`popup ab - Error on navigation event, details: ${ns.JSONStringify(details)}. Error: ${message}`);
        else
            ns.SessionError({ message: "ERR popup ab", details: `Error: ${message}` }, m_pluginId);
    }

    function OnCreatedNavigationTarget(details)
    {
        try
        {
            CheckLastError();

            if (details.sourceTabId < 0)
            {
                ns.SessionLog("Tab id less than 0, skip ab popup processing");
                return;
            }

            ApiCall(browsersApi.tabs.get)
                .OnSuccess(tab =>
                    {
                        try
                        {
                            const url = ns.TryCreateUrl(details.url);
                            if (!url)
                                return;
                            if (m_popupUrl && details.url === m_popupUrl)
                            {
                                ns.SessionLog(`popup ab - Skip site by url: ${m_popupUrl}`);
                            }
                            else if (IsExcludedDomain(url))
                            {
                                ns.SessionLog(`popup ab - Skip site by exclude domain: ${details.url}`);
                            }
                            else
                            {
                                const tabUrl = ns.TryCreateUrl(tab.url);
                                if (tabUrl)
                                    CheckSite(tabUrl, url, details.tabId);
                            }
                        }
                        catch (e)
                        {
                            ns.SessionError(e, m_pluginId);
                        }
                    })
                .OnError(err => ProcessError(details, err.message))
                .Start(details.sourceTabId);
        }
        catch (e)
        {
            ns.SessionError(e, m_pluginId);
        }
    }

    function OnMessage(request, sender, sendResponse)
    {
        try
        {
            CheckLastError();

            if (sender.id !== browsersApi.runtime.id)
            {
                ns.SessionError({ message: "Security error. Unexpected sender.", details: `sender.id: ${sender.id}\r\ncurrent.id: ${browsersApi.runtime.id}` }, m_pluginId);
                return;
            }

            if (request.command === "sendPopupUrl")
            {
                m_popupUrl = request.url || "";
            }
            else if (request.command === "isFrameRedirected")
            {
                const frames = sender.tab && m_navigatedFrames[sender.tab.id];
                if (frames)
                {
                    const redirected = typeof frames.find(element => element === sender.frameId) !== "undefined";
                    ns.TrySendResponse(sendResponse, { isRedirected: redirected });
                }
            }
        }
        catch (e)
        {
            ns.SessionError(e, m_pluginId);
        }
    }
    function SubscribePopups()
    {
        if (!browsersApi.webNavigation.onCreatedNavigationTarget.hasListener(OnCreatedNavigationTarget))
            browsersApi.webNavigation.onCreatedNavigationTarget.addListener(OnCreatedNavigationTarget);

        browsersApi.runtime.onMessage.addListener(OnMessage);
    }
    function UnsubscribePopups()
    {
        if (browsersApi.webNavigation.onCreatedNavigationTarget.hasListener(OnCreatedNavigationTarget))
            browsersApi.webNavigation.onCreatedNavigationTarget.removeListener(OnCreatedNavigationTarget);
    }
    function ClearNavigatedFrames(tabId)
    {
        try
        {
            CheckLastError();
            if (tabId in m_navigatedFrames)
                delete m_navigatedFrames[tabId];
        }
        catch (e)
        {
            ns.SessionError(e, m_pluginId);
        }
    }
    function TrackTabChanges()
    {
        browsersApi.tabs.onRemoved.addListener(ClearNavigatedFrames);
        browsersApi.tabs.onReplaced.addListener((newTabId, oldTabId) => { ClearNavigatedFrames(oldTabId); });
    }
    function Init()
    {
        InitScriptlets();
        TrackTabChanges();
        session.InitializePlugin((activatePlugin, registerMethod, callFunction, deactivateFunction) =>
            {
                m_callFunction = callFunction;
                activatePlugin(m_pluginId, OnPing);
                registerMethod("abn_back.setSettings", OnSetSettings);
                m_deactivateFunction = deactivateFunction;
            });
        OnSetSettings(startSettings);
    }

    Init();
}

function StopImpl()
{
    Unsubscribe();
    m_scriptletsRules = null;
    m_scriptletBase = null;
    m_deactivateFunction(m_pluginId);
}

AvNs.AddRunner2({
    name: m_pluginId,
    runner: RunnerImpl,
    stop: StopImpl
});
})();
