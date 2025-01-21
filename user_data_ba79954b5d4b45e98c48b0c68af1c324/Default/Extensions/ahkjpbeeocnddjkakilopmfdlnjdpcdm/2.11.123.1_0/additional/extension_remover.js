
const browsersApi = {
    cookies: chrome.cookies,
    extension: {
        getURL: chrome.runtime.getURL
    },
    i18n: chrome.i18n,
    management: chrome.management,
    tabs: chrome.tabs,
    windows: chrome.windows,
    runtime: chrome.runtime
};

function IsBrowserShuttingDown(err)
{
    return err.message === "The browser is shutting down.";
}

const ApiCallType = Object.freeze({
    WITH_PROMISE: Symbol("with_promise"),
    WITH_CALLBACK: Symbol("with_callback"),
    DETACHED: Symbol("detached")
});
function ApiCall(fn, type = ApiCallType.WITH_PROMISE)
{
    let m_onSuccess = null;
    let m_onError = null;

    this.OnError = onError =>
    {
        m_onError = onError;
        return this;
    };

    this.OnSuccess = onSuccess =>
    {
        m_onSuccess = onSuccess;
        return this;
    };

    function CallWithCallback(...args)
    {
        fn(...args, (...resultArgs) =>
            {
                if (browsersApi.runtime.lastError)
                {
                    if (!IsBrowserShuttingDown(browsersApi.runtime.lastError))
                        m_onError && m_onError(browsersApi.runtime.lastError);
                    return;
                }
                try
                {
                    m_onSuccess && m_onSuccess(...resultArgs);
                }
                catch (err)
                {
                    m_onError && m_onError(err);
                }
            });
    }

    this.Start = (...args) =>
    {
        switch (type)
        {
            case ApiCallType.WITH_PROMISE:
                {
                    const apiCall = fn(...args);
                    if (apiCall)
                    {
                        apiCall.then((...resultArgs) => m_onSuccess && m_onSuccess(...resultArgs))
                        .catch(err =>
                            {
                                if (!IsBrowserShuttingDown(err))
                                    m_onError && m_onError(err);
                            });
                    }
                    break;
                }
            case ApiCallType.WITH_CALLBACK:
                {
                    CallWithCallback(...args);
                    break;
                }
            case ApiCallType.DETACHED:
                {
                    fn(...args);
                    break;
                }
            default:
                break;
        }
    };

    return this;
}
 var AvNs = (function IeJsonMain(context) 
{
    context["JSONStringify"] = JSON.stringify;
    context["JSONParse"] = JSON.parse;
    return context;
})(AvNs || {});

(function CommonMain(ns)
{
    ns.XMLHttpRequest = window.XMLHttpRequest;
    ns.XDomainRequest = window.XDomainRequest;
    ns.XMLHttpRequestOpen = window.XMLHttpRequest && window.XMLHttpRequest.prototype.open;
    ns.XMLHttpRequestSend = window.XMLHttpRequest && window.XMLHttpRequest.prototype.send;
    ns.XMLHttpRequestAbort = window.XMLHttpRequest && window.XMLHttpRequest.prototype.abort;
    ns.XMLHttpRequestSetRequestHeader = window.XMLHttpRequest && window.XMLHttpRequest.prototype.setRequestHeader;

    var originalCreateTreeWalker = document.createTreeWalker;
    ns.CreateTreeWalker = function CreateTreeWalker(root, whatToShow, filter, entityReferenceExpansion)
    {   
        if (typeof (originalCreateTreeWalker) !== "function")
            throw new Error("document.createTreeWalker not implemented");

        return originalCreateTreeWalker.call(document, root, whatToShow, filter, entityReferenceExpansion);
    };

    ns.EmptyFunc = function EmptyFunc()
    {
    };

    ns.MaxRequestDelay = 2000;

    ns.Log = ns.EmptyFunc;

    ns.SessionLog = ns.Log;

    ns.SessionError = ns.Log;

    function GetHostAndPort(url)
    {
        if (!url)
            return "";

        var urlString = typeof url !== "string" ? url.toString() : url;
        var hostBeginPos = urlString.indexOf("//");
        if (hostBeginPos === -1)
        {
            urlString = document.baseURI || "";
            hostBeginPos = urlString.indexOf("//");
            if (hostBeginPos === -1)
                return "";
        }
        hostBeginPos += 2;
        var hostEndPos = urlString.indexOf("/", hostBeginPos);
        if (hostEndPos === -1)
            hostEndPos = urlString.length;
        var originParts = urlString.substring(0, hostEndPos).split("@");
        var origin = originParts.length > 1 ? originParts[1] : originParts[0];
        return origin[0] === "/" ? document.location.protocol + origin : origin;
    }

    ns.IsCorsRequest = function IsCorsRequest(url, initiator)
    {
        try
        {
            var urlOrigin = GetHostAndPort(url);
            var initiatorOrigin = GetHostAndPort(initiator);

            return Boolean(urlOrigin) && Boolean(initiatorOrigin) && urlOrigin !== initiatorOrigin;
        }
        catch (e)
        {
            ns.SessionLog("Error check CORS request, url: " + url + " , initiator: " + initiator + ", error: " + e.message);
            return false;
        }
    };

    ns.TryCreateUrl = function TryCreateUrl(url)
    {
        try
        {
            return new URL(url);
        }
        catch (e)
        {
            ns.SessionLog("Can't create URL from " + url);
            return null;
        }
    };

    ns.TrySendMessage = function TrySendMessage(port, message)
    {
        try
        {
            port.postMessage(message);
        }
        catch (e)
        {
            if (e.message && e.message.startsWith("Attempt to postMessage on disconnected port"))
                ns.SessionLog("Attempt to postMessage on disconnected port: " + JSON.stringify(message));
            else
                ns.SessionError(e, "nms_back");
        }
    };

    ns.GetResourceSrc = function GetResourceSrc(resourceName)
    {
        return ns.GetBaseUrl() + ns.RESOURCE_ID + resourceName;
    };

    ns.IsRelativeTransport = function IsRelativeTransport()
    {
        return ns.PREFIX === "/";
    };

    ns.GetBaseUrl = function GetBaseUrl()
    {
        if (!ns.IsRelativeTransport())
            return ns.PREFIX;
        return document.location.protocol + "//" + document.location.host + "/";
    };

    ns.AddEventListener = function AddEventListener(element, name, func, pluginId)
    {
        element.addEventListener(name,
            e =>
            {
                try
                {
                    func(e || window.event);
                }
                catch (ex)
                {
                    ns.SessionError(ex, pluginId);
                }
            }, 
            true);
    };

    ns.AddRemovableEventListener = function AddRemovableEventListener(element, name, func)
    {
        element.addEventListener(name, func, true);
    };

    ns.RemoveElement = function RemoveElement(element)
    {
        element && element.parentNode && element.parentNode.removeChild(element);
    };

    ns.RunModule = function RunModule(func, timeout)
    {
        if (document.readyState === "loading")
        {
            if (timeout)
                ns.SetTimeout(func, timeout);

            var delayFunc = function DelayFunc() { ns.SetTimeout(func, 0); };

            if (document.addEventListener)
                ns.AddEventListener(document, "DOMContentLoaded", delayFunc);

            ns.AddEventListener(window, "load", delayFunc);
        }
        else
        {
            try
            {
                func();
            }
            catch (e)
            {
                ns.SessionError(e);
            }
        }
    };

    ns.RemoveEventListener = function RemoveEventListener(element,  name, func)
    {
        if (element.removeEventListener)
            element.removeEventListener(name, func, true);
        else
            element.detachEvent("on" + name, func);
    };

    var oldSetTimeout = setTimeout;
    ns.SetTimeout = function SetTimeout(func, timeout, pluginId)
    {
        return oldSetTimeout(function TimerCallback()
            {
                try
                {
                    func();
                }
                catch (e)
                {
                    ns.SessionError(e, pluginId);
                }
            },
            timeout);
    };

    var oldSetInterval = setInterval;
    ns.SetInterval = function SetInterval(func, interval, pluginId)
    {
        return oldSetInterval(function IntervalCallback()
            {
                try
                {
                    func();
                }
                catch (e)
                {
                    ns.SessionError(e, pluginId);
                }
            },
            interval);
    };

    ns.GetOwnerNode = function GetOwnerNode(element)
    {
        return element.ownerNode || element.owningElement;
    };

    function InsertStyleRule(style, rule)
    {
        if (style.styleSheet)
        {
            style.styleSheet.cssText += rule + "\n";
        }
        else
        {
            style.appendChild(document.createTextNode(rule));
            ns.SetTimeout(function TimerCallback()
                {
                    if (!style.sheet)
                        return;
                    var rules = style.sheet.cssRules || style.sheet.rules;
                    if (rules && rules.length === 0)
                        style.sheet.insertRule(rule);
                }, 500);
        }
    }

    function FindStyle(document, style)
    {
        for (var i = 0; i < document.styleSheets.length; ++i)
        {
            var ownerNode = ns.GetOwnerNode(document.styleSheets[i]);
            if (ownerNode && ownerNode.className === "abn_style" && ownerNode.textContent === style.textContent)
                return ownerNode;
        }
        return null;
    }

    function AddDocumentStyles(document, rules)
    {
        if (typeof rules !== "object" || rules.constructor !== Array)
            return [];

        var styles = [];
        for (var i = 0, len = rules.length; i < len;)
        {
            var style = document.createElement("style");
            style.type = "text/css";
            style.className = "abn_style";
            style.setAttribute("nonce", ns.ContentSecurityPolicyNonceAttribute);

            for (var n = 0; n < 4 && i < len; ++n, ++i)
            {
                var rule = rules[i];
                if (document.querySelectorAll)
                {
                    InsertStyleRule(style, rule);
                }
                else
                {
                    var styleBegin = rule.lastIndexOf("{");
                    if (styleBegin === -1)
                        continue;

                    var styleText = rule.substr(styleBegin);
                    var selectors = rule.substr(0, styleBegin).split(",");
                    if (style.styleSheet)
                    {
                        var cssText = "";
                        for (var j = 0; j !== selectors.length; ++j)
                            cssText += selectors[j] + styleText + "\n";

                        style.styleSheet.cssText += cssText;
                    }
                    else
                    {
                        for (var k = 0; k !== selectors.length; ++k)
                            style.appendChild(document.createTextNode(selectors[k] + styleText));
                    }
                }
            }

            var inserted = FindStyle(document, style);
            if (inserted && inserted.parentNode)
                inserted.parentNode.removeChild(inserted);

            if (document.head)
            {
                document.head.appendChild(style);
            }
            else
            {
                var head = document.getElementsByTagName("head")[0];
                if (head)
                {
                    head.appendChild(style);
                }
                else
                {
                    ns.AddEventListener(document, "load", function AddStyle()
                    {
                        var element = document.head || document.getElementsByTagName("head")[0];
                        if (!element)
                            return;
                        for (var l = 0; l !== styles.length; ++l)
                            element.appendChild(styles[l]); 
                    });
                }
            }

            styles.push(style);
        }

        return styles;
    }

    ns.AddStyles = function AddStyles(rules)
    {
        return AddDocumentStyles(document, rules);
    };

    ns.GetCurrentTime = function GetCurrentTime()
    {
        try
        {
            var date = new Date();

            if (date && date.getTime)
                return date.getTime();
            throw new Error("Cannot call getTime for date: " + date);
        }
        catch (e)
        {
            ns.SessionError(e);
            return 0;
        }
    };

    ns.GetPageScroll = function GetPageScroll()
    {
        if (document.documentElement && ns.IsDefined(document.documentElement.scrollLeft) && ns.IsDefined(document.documentElement.scrollTop))
            return { left: document.documentElement.scrollLeft, top: document.documentElement.scrollTop };
        if (document.body && ns.IsDefined(document.body.scrollLeft) && ns.IsDefined(document.body.scrollTop))
            return { left: document.body.scrollLeft, top: document.body.scrollTop };
        return { left: 0, top: 0 };
    };

    ns.GetPageHeight = function GetPageHeight()
    {
        return document.documentElement.clientHeight || document.body.clientHeight;
    };

    ns.GetPageWidth = function GetPageWidth()
    {
        return document.documentElement.clientWidth || document.body.clientWidth;
    };

    ns.IsDefined = function IsDefined(variable)
    {
        return typeof variable !== "undefined";
    };

    ns.StopProcessingEvent = function StopProcessingEvent(evt)
    {
        if (evt.preventDefault)
            evt.preventDefault();
        else
            evt.returnValue = false;
        if (evt.stopPropagation)
            evt.stopPropagation();
        if (ns.IsDefined(evt.cancelBubble))
            evt.cancelBubble = true;
    };

    function Base64EncodeUnicode(str)
    {
        return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
            function toSolidBytes(match, p1)
            {
                return String.fromCharCode("0x" + p1);
            }));
    }

    ns.ToBase64 = function ToBase64(value)
    {
        return Base64EncodeUnicode(value);
    };

    ns.IsSenderPopup = sender => sender.id === browsersApi.runtime.id && sender.url === browsersApi.runtime.getURL("popup/popup.html");

    ns.TrySendResponse = (sendResponse, responseObject) =>
    {
        try
        {
            sendResponse(responseObject);
        }
        catch (e)
        {
            AvNs.Log("Response was not sent, sender page was closed or redirected: ", e);
        }
    };

    ns.BrowserName = "chrome";

    ns.EncodeTabId = (windowId, tabId, frameId) => `${AvNs.BrowserName}.tab.${windowId}:${tabId}.${frameId}`;

    ns.SplitTabId = encodedTabId =>
    {
        const result = encodedTabId.match(/(\w*).tab.(\d*):(\d*).(\d*)/);
        const browser = result[1];
        const windowId = parseInt(result[2], 10);
        const tabId = parseInt(result[3], 10);
        const frameId = parseInt(result[4], 10);
        return { browser: browser, windowId: windowId, tabId: tabId, frameId: frameId };
    };

    ns.ValidateTabId = encodedTabId =>
    {
        try
        {
            const parts = ns.SplitTabId(encodedTabId);
            return parts.browser === AvNs.BrowserName;
        }
        catch (e)
        {
            ns.SessionLog(e);
            return false;
        }
    };


    ns.StartLocationHref = document.location.href;
    ns.IsTopLevel = window && window === window.top;

    ns.IsElementVisibleCheckApplicable = function IsElementVisibleCheckApplicable()
    {
        return window && window.getComputedStyle;
    };

    ns.IsElementVisible = function IsElementVisible(element)
    {
        return window.getComputedStyle(element).visibility === "visible";
    };

    ns.GetPageStartTime = function GetPageStartTime()
    {
        return window && window.performance && window.performance.timing && window.performance.timing.domContentLoadedEventStart
            ? window.performance.timing.domContentLoadedEventStart
            : 0;
    };

    return ns;
})(AvNs);

(function CommonMutation(ns)
{
    function IsElementNode(node)
    {
        return node.nodeType === 1; 
    }

    function IsNodeContainsElementWithTag(node, observeTag)
    {
        try
        {
            return observeTag === "*" || (IsElementNode(node) && ((node.tagName && node.tagName.toLowerCase() === observeTag) || node.getElementsByTagName(observeTag).length > 0));
        }
        catch (e)
        {
            return false;
        }
    }

    function MutationChangeObserver(observeTag, pluginId)
    {
        var m_observer = null;
        var m_callback = null;
        var m_functionCheckInteresting = observeTag ? function functionCheckInteresting(node) { return IsNodeContainsElementWithTag(node, observeTag); } : IsElementNode;

        function ProcessNodeList(nodeList)
        {
            for (var i = 0; i < nodeList.length; ++i)
            {
                if (m_functionCheckInteresting(nodeList[i]))
                    return true;
            }
            return false;
        }

        function ProcessDomChange(records)
        {
            try
            {
                if (!m_callback)
                    return;

                for (var i = 0; i < records.length; ++i)
                {
                    var record = records[i];
                    if ((record.addedNodes.length && ProcessNodeList(record.addedNodes))
                        || (record.removedNodes.length && ProcessNodeList(record.removedNodes)))
                    {
                        m_callback();
                        return;
                    }
                }
            }
            catch (e)
            {
                ns.SessionError(e, pluginId);
            }
        }

        this.Start = function Start(callback)
        {
            m_callback = callback;
            m_observer = new MutationObserver(ProcessDomChange);
            m_observer.observe(document, { childList: true, subtree: true });
        };
        this.Stop = function Stop()
        {
            m_observer.disconnect();
            m_callback = null;
        };
    }

    ns.GetDomChangeObserver = function GetDomChangeObserver(observeTag, pluginId)
    {
        var observeTagLowerCase = observeTag ? observeTag.toLowerCase() : observeTag;
        return new MutationChangeObserver(observeTagLowerCase, pluginId);
    };

    return ns;
})(AvNs);
(function Md5Main(ns) {
    function md5cycle(x, k) {
        var a = x[0],
        b = x[1],
        c = x[2],
        d = x[3];

        a = ff(a, b, c, d, k[0], 7, -680876936);
        d = ff(d, a, b, c, k[1], 12, -389564586);
        c = ff(c, d, a, b, k[2], 17, 606105819);
        b = ff(b, c, d, a, k[3], 22, -1044525330);
        a = ff(a, b, c, d, k[4], 7, -176418897);
        d = ff(d, a, b, c, k[5], 12, 1200080426);
        c = ff(c, d, a, b, k[6], 17, -1473231341);
        b = ff(b, c, d, a, k[7], 22, -45705983);
        a = ff(a, b, c, d, k[8], 7, 1770035416);
        d = ff(d, a, b, c, k[9], 12, -1958414417);
        c = ff(c, d, a, b, k[10], 17, -42063);
        b = ff(b, c, d, a, k[11], 22, -1990404162);
        a = ff(a, b, c, d, k[12], 7, 1804603682);
        d = ff(d, a, b, c, k[13], 12, -40341101);
        c = ff(c, d, a, b, k[14], 17, -1502002290);
        b = ff(b, c, d, a, k[15], 22, 1236535329);

        a = gg(a, b, c, d, k[1], 5, -165796510);
        d = gg(d, a, b, c, k[6], 9, -1069501632);
        c = gg(c, d, a, b, k[11], 14, 643717713);
        b = gg(b, c, d, a, k[0], 20, -373897302);
        a = gg(a, b, c, d, k[5], 5, -701558691);
        d = gg(d, a, b, c, k[10], 9, 38016083);
        c = gg(c, d, a, b, k[15], 14, -660478335);
        b = gg(b, c, d, a, k[4], 20, -405537848);
        a = gg(a, b, c, d, k[9], 5, 568446438);
        d = gg(d, a, b, c, k[14], 9, -1019803690);
        c = gg(c, d, a, b, k[3], 14, -187363961);
        b = gg(b, c, d, a, k[8], 20, 1163531501);
        a = gg(a, b, c, d, k[13], 5, -1444681467);
        d = gg(d, a, b, c, k[2], 9, -51403784);
        c = gg(c, d, a, b, k[7], 14, 1735328473);
        b = gg(b, c, d, a, k[12], 20, -1926607734);

        a = hh(a, b, c, d, k[5], 4, -378558);
        d = hh(d, a, b, c, k[8], 11, -2022574463);
        c = hh(c, d, a, b, k[11], 16, 1839030562);
        b = hh(b, c, d, a, k[14], 23, -35309556);
        a = hh(a, b, c, d, k[1], 4, -1530992060);
        d = hh(d, a, b, c, k[4], 11, 1272893353);
        c = hh(c, d, a, b, k[7], 16, -155497632);
        b = hh(b, c, d, a, k[10], 23, -1094730640);
        a = hh(a, b, c, d, k[13], 4, 681279174);
        d = hh(d, a, b, c, k[0], 11, -358537222);
        c = hh(c, d, a, b, k[3], 16, -722521979);
        b = hh(b, c, d, a, k[6], 23, 76029189);
        a = hh(a, b, c, d, k[9], 4, -640364487);
        d = hh(d, a, b, c, k[12], 11, -421815835);
        c = hh(c, d, a, b, k[15], 16, 530742520);
        b = hh(b, c, d, a, k[2], 23, -995338651);

        a = ii(a, b, c, d, k[0], 6, -198630844);
        d = ii(d, a, b, c, k[7], 10, 1126891415);
        c = ii(c, d, a, b, k[14], 15, -1416354905);
        b = ii(b, c, d, a, k[5], 21, -57434055);
        a = ii(a, b, c, d, k[12], 6, 1700485571);
        d = ii(d, a, b, c, k[3], 10, -1894986606);
        c = ii(c, d, a, b, k[10], 15, -1051523);
        b = ii(b, c, d, a, k[1], 21, -2054922799);
        a = ii(a, b, c, d, k[8], 6, 1873313359);
        d = ii(d, a, b, c, k[15], 10, -30611744);
        c = ii(c, d, a, b, k[6], 15, -1560198380);
        b = ii(b, c, d, a, k[13], 21, 1309151649);
        a = ii(a, b, c, d, k[4], 6, -145523070);
        d = ii(d, a, b, c, k[11], 10, -1120210379);
        c = ii(c, d, a, b, k[2], 15, 718787259);
        b = ii(b, c, d, a, k[9], 21, -343485551);

        x[0] = add32(a, x[0]);
        x[1] = add32(b, x[1]);
        x[2] = add32(c, x[2]);
        x[3] = add32(d, x[3]);

    }

    function cmn(q, a, b, x, s, t) {
        a = add32(add32(a, q), add32(x, t));
        return add32((a << s) | (a >>> (32 - s)), b);
    }

    function ff(a, b, c, d, x, s, t) {
        return cmn((b & c) | ((~b) & d), a, b, x, s, t);
    }

    function gg(a, b, c, d, x, s, t) {
        return cmn((b & d) | (c & (~d)), a, b, x, s, t);
    }

    function hh(a, b, c, d, x, s, t) {
        return cmn(b^c^d, a, b, x, s, t);
    }

    function ii(a, b, c, d, x, s, t) {
        return cmn(c^(b | (~d)), a, b, x, s, t);
    }

    function md51(s) {
        var n = s.length,
        state = [1732584193, -271733879, -1732584194, 271733878],
        i;
        for (i = 64; i <= s.length; i += 64) {
            md5cycle(state, md5blk(s.substring(i - 64, i)));
        }
        s = s.substring(i - 64);
        var tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        for (i = 0; i < s.length; i++)
            tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);
        tail[i >> 2] |= 0x80 << ((i % 4) << 3);
        if (i > 55) {
            md5cycle(state, tail);
            for (i = 0; i < 16; i++)
                tail[i] = 0;
        }
        tail[14] = n * 8;
        md5cycle(state, tail);
        return state;
    }

    function md5blk(s) {
        var md5blks = [],
        i;
        for (i = 0; i < 64; i += 4) {
            md5blks[i >> 2] = s.charCodeAt(i) +
                 (s.charCodeAt(i + 1) << 8) +
                 (s.charCodeAt(i + 2) << 16) +
                 (s.charCodeAt(i + 3) << 24);
        }
        return md5blks;
    }

    var hex_chr = '0123456789abcdef'.split('');

    function rhex(n) {
        var s = '',
        j = 0;
        for (; j < 4; j++)
            s += hex_chr[(n >> (j * 8 + 4)) & 0x0F]+hex_chr[(n >> (j * 8)) & 0x0F];
        return s;
    }

    function hex(x) {
        for (var i = 0; i < x.length; i++)
            x[i] = rhex(x[i]);
        return x.join('');
    }

    ns.md5 = function md5(s) {
        return hex(md51(s));
    };


    function add32(a, b) {
        return (a + b) & 0xFFFFFFFF;
    }

    if (ns.md5('hello') != '5d41402abc4b2a76b9719d911017c592') {
        add32 = function add32(x, y) {
            var lsw = (x & 0xFFFF) + (y & 0xFFFF),
            msw = (x >> 16) + (y >> 16) + (lsw >> 16);
            return (msw << 16) | (lsw & 0xFFFF);
        }
    }

})(AvNs);

var avSessionInstance = null;
(function SessionMain(ns)
{
    var runners = {};
    var lastPostponedInitTime = (new Date()).getTime();
    var postponedInitTimeout = null;
    var enableTracing = false;
    var initPending = false;


    var CallReceiver = function CallReceiver(caller)
    {
        var m_plugins = {};
        var m_receiver = caller.GetReceiver();
        var m_caller = caller;
        var m_selfMethods = {};

        function GetPluginIdFromMethodName(methodName)
        {
            if (methodName)
            {
                var names = methodName.split(".", 2);
                if (names.length === 2)
                    return names[0];
            }
            return null;
        }

        function GetPluginMethods(pluginId)
        {
            var plugin = m_plugins[pluginId];
            return plugin ? plugin.methods : null;
        }

        function CheckCommonMethodName(methodName)
        {
            if (methodName)
            {
                var names = methodName.split(".", 2);
                if (names.length === 1 && names[0] === methodName)
                    return true;
            }
            return false;
        }

        this.RegisterMethod = function RegisterMethod(methodName, callback)
        {
            var pluginId = GetPluginIdFromMethodName(methodName);
            if (pluginId)
            {
                var methods = GetPluginMethods(pluginId);
                if (methods)
                {
                    if (methods[methodName])
                        return;

                    methods[methodName] = callback;
                }
                else
                {
                    throw new Error("Cannot registered " + methodName);
                }
            }
            else if (CheckCommonMethodName(methodName))
            {
                if (m_selfMethods[methodName])
                    throw new Error("Already registered method " + methodName);
                m_selfMethods[methodName] = callback;
            }
        };

        function CallPluginMethod(pluginId, methodName, args)
        {
            var callback = null;
            if (pluginId)
            {
                var methods = GetPluginMethods(pluginId);
                if (methods) 
                    callback = methods[methodName];
            } 
            else
            {
                callback = m_selfMethods[methodName];
            }
            if (callback)
            {
                var result = {};
                try 
                {
                    if (args)
                        callback(ns.JSONParse(args));
                    else
                        callback();
                    result.success = true;
                    m_caller.SendResult(methodName, ns.JSONStringify(result));
                    return true;
                }
                catch (e)
                {
                    result.success = false;
                    m_caller.SendResult(methodName, ns.JSONStringify(result));
                    ns.SessionError(e, (pluginId ? pluginId : "common"));
                    return false;
                }
            }
            ns.SessionLog("Cannot call " + methodName + " for plugin " + (pluginId ? pluginId : "common"));
            return false;
        }

        function CallMethod(methodName, args)
        {
            var pluginId = GetPluginIdFromMethodName(methodName);
            if (pluginId || CheckCommonMethodName(methodName))
                CallPluginMethod(pluginId, methodName, args);
        }

        function ReportPluginError(pluginId, status)
        {
            var onError = m_plugins[pluginId].onError;
            if (onError)
                onError(status);
        }

        function ReportError(status)
        {
            for (var pluginId in m_plugins)
            {
                if (Object.prototype.hasOwnProperty.call(m_plugins, pluginId))
                    ReportPluginError(pluginId, status);
            }
        }

        function UpdateDelay()
        {
            var newDelay = ns.MaxRequestDelay;
            var currentTime = ns.GetCurrentTime();

            for (var pluginId in m_plugins)
            {
                if (!Object.prototype.hasOwnProperty.call(m_plugins, pluginId))
                    continue;

                try 
                {   
                    var onPing = m_plugins[pluginId].onPing;
                    if (onPing)
                    {
                        var delay = onPing(currentTime);
                        if (delay < newDelay && delay > 0 && delay < ns.MaxRequestDelay)
                            newDelay = delay;
                    }
                }
                catch (e)
                {
                    ReportPluginError(pluginId, "UpdateDelay: " + (e.message || e));
                }
            }

            return newDelay;
        }

        this.RegisterPlugin = function RegisterPlugin(pluginId, callbackPing, callbackError, callbackShutdown)
        {
            if (m_plugins[pluginId])
                return;

            var plugin = {
                onError: callbackError,
                onPing: callbackPing,
                onShutdown: callbackShutdown,
                methods: {}
            };

            m_plugins[pluginId] = plugin;

            if (!m_receiver.IsStarted())
                m_receiver.StartReceive(CallMethod, ReportError, UpdateDelay);
        };

        function IsPluginListEmpty()
        {
            for (var key in m_plugins)
            {
                if (Object.prototype.hasOwnProperty.call(m_plugins, key))
                    return false;
            }
            return true;
        }

        this.UnregisterPlugin = function UnregisterPlugin(pluginId)
        {
            delete m_plugins[pluginId];

            if (IsPluginListEmpty())
                m_receiver.StopReceive();
        };

        this.ForceReceive = function ForceReceive()
        {
            m_receiver.ForceReceive();
        };

        this.StopReceive = function StopReceive()
        {
            m_receiver.StopReceive();
        };

        this.UnregisterAll = function UnregisterAll()
        {
            if (IsPluginListEmpty())
                return;

            for (var key in m_plugins)
            {
                if (Object.prototype.hasOwnProperty.call(m_plugins, key)) 
                    m_plugins[key].onShutdown();
            }

            m_plugins = {};
        };

        this.IsEmpty = IsPluginListEmpty;
        this.IsProductConnected = function IsProductConnected()
        {
            return m_receiver.IsProductConnected();
        };
    };

    function LocalizationObjectFromDictionary(dictionary)
    {
        var object = {};
        if (dictionary)
        {
            for (var i = 0; i < dictionary.length; i++)
                object[dictionary[i].name] = dictionary[i].value;
        }
        return object;
    }

    function SettingsObjectFromSettingsJson(settingsJson)
    {
        var object = {};
        if (settingsJson)
            object = ns.JSONParse(settingsJson);
        return object;
    }

    var AvSessionClass = function AvSessionClass(caller)
    {
        var self = this;
        var m_caller = caller;
        var m_callReceiver = new CallReceiver(caller);


        function Call(methodName, argsObj, callbackResult, callbackError)
        {
            if (!m_callReceiver.IsProductConnected())
                return;

            if (methodName === "nms")
            {
                if (!m_caller.nmsCallSupported)
                {
                    ns.LogError("Unsupported nms call", "common");
                    return;
                }

                const method = typeof argsObj === "object" ? "nms" + ns.JSONStringify(argsObj) : argsObj;
                m_caller.Call("nms", method, null, null, null);
                return;
            }
            var callback = function callback(result, args, method)
                {
                    if (callbackResult)
                        callbackResult(result, args ? ns.JSONParse(args) : null, method);
                };
            var data = (argsObj)
                ? ns.JSONStringify(
                    {
                        result: 0,
                        method: methodName,
                        parameters: ns.JSONStringify(argsObj)
                    }
                    )
                : null;

            m_caller.Call("to", methodName, data, callback, callbackError);
        }

        function OnUnloadCall()
        {
            return false;
        }

        function StopImpl(reason)
        {
            try
            {
                m_callReceiver.UnregisterAll();

                if (m_callReceiver.IsProductConnected())
                    m_caller.Call("shutdown", reason);
                m_callReceiver.StopReceive();

                if (m_caller.Shutdown)
                    m_caller.Shutdown();
            }
            catch (e)
            {
            }
        }

        function DeactivatePlugin(pluginId)
        {
            m_callReceiver.UnregisterPlugin(pluginId);
            if (m_callReceiver.IsEmpty())
                StopImpl();
        }

        function ActivatePlugin(pluginId, callbackPing, callbackError, callbackShutdown)
        {
            m_callReceiver.RegisterPlugin(
                pluginId,
                callbackPing,
                function RegisterPluginOnError(e)
                {
                    callbackError && callbackError(e);
                    m_callReceiver.UnregisterPlugin(pluginId);
                    if (m_callReceiver.IsEmpty())
                        StopImpl();
                },
                function RegisterPluginOnShutdown()
                {
                    try
                    {
                        callbackShutdown && callbackShutdown();
                    }
                    catch (ex)
                    {
                        ns.SessionError(ex, pluginId);
                    }
                }
            );
        }

        function RegisterMethod(methodName, callback)
        {
            m_callReceiver.RegisterMethod(methodName, callback);
        }

        function ReloadImpl()
        {
            window.location.reload(true);
        }

        function ServiceWorkerAllowed()
        {
            try
            {
                return navigator && navigator.serviceWorker && navigator.serviceWorker.controller && navigator.serviceWorker.controller.state === "activated";
            }
            catch (e)
            {
                ns.SessionLog("Service worker not allowed. Error: " + e.message);
                return false;
            }
        }

        function ReloadPage()
        {
            if (ServiceWorkerAllowed())
            {
                ns.SetTimeout(ReloadImpl, 1000);
                navigator.serviceWorker.getRegistrations()
                    .then(function getRegistrationsThen(regs)
                        {
                            var countUnregistered = 0;
                            var rest = function rest()
                                {
                                    ++countUnregistered;
                                    if (countUnregistered === regs.length)
                                        ReloadImpl();
                                }; 
                            for (var i = 0; i < regs.length; ++i)
                            {
                                regs[i].unregister()
                                    .then(rest, rest);
                            }
                        }, ReloadImpl);
            }
            else
            {
                ns.SetTimeout(ReloadImpl, 300);
            }
        }

        function OnStartError(injectorName)
        {
            try 
            {
                var connectionErrorCallback = runners[injectorName].onConnectionError;
                if (connectionErrorCallback)
                    connectionErrorCallback();
            }
            catch (e)
            {
                ns.Log(e);
            }
        }

        function StartInjector(param)
        {
            var pluginStartData = {};
            var runner = runners[param.injectorName];
            if (runner && runner.getParameters)
                pluginStartData = { plugin: runner, parameters: ns.JSONStringify(runner.getParameters()) };

            var startData =
                {
                    url: ns.StartLocationHref,
                    plugins: param.injectorName,
                    data: { data: pluginStartData },
                    isTopLevel: ns.IsTopLevel,
                    pageStartTime: ns.GetPageStartTime()
                };

            m_caller.StartCall(
                startData,
                function StartCallCallback(plugin)
                {
                    if (runner && plugin)
                    {
                        var settings = ns.IsDefined(plugin.settingsJson) ? SettingsObjectFromSettingsJson(plugin.settingsJson) : plugin.settings;
                        var localization = ns.IsDefined(plugin.localizationDictionary) ? LocalizationObjectFromDictionary(plugin.localizationDictionary) : {};
                        runner.runner(AvNs, avSessionInstance, settings, localization);
                    }
                },
                function StartCallOnError()
                { 
                    OnStartError(param.injectorName);
                }
                );
        }

        function OnStopError(injectorName)
        {
            ns.Log("Stop " + injectorName + "injector failed");
        }

        function StopInjector(param)
        {
            var runner = runners[param.injectorName];

            m_caller.StopCall(
                param.injectorName,
                function StopCallCallback(plugin)
                {
                    try
                    {
                        if (runner && plugin && runner.stop)
                            runner.stop(AvNs, avSessionInstance);
                    }
                    catch (e)
                    {
                        ns.SessionError(e, plugin);
                    }
                },
                function StopCallOnError() { OnStopError(param.injectorName); }
                );
        }

        function GetErrorMessage(error)
        {
            var msg = "";
            if (error instanceof Error)
            {
                msg = error.message;
                if (error.stack)
                    msg += "\r\n" + error.stack;
            }
            else if (error instanceof Object)
            {
                msg = ns.JSONStringify(error);
            }
            else
            {
                msg = String(error);
            }
            return msg.length <= 2048 ? msg : (msg.substring(0, 2048) + "<...>");
        }

        function ExtractStackWithRegexp(stack, regexp)
        {
            const resultArray = [...stack.matchAll(regexp)];
            return resultArray.map(m => m[1]);
        }

        function ExtractStack(error)
        {
            if (!error.stack)
                return "";

            const extractedStack = ExtractStackWithRegexp(error.stack, /at ([\w\s.]*) \(chrome-extension:\/\/\w*((?:\/[\w.]*)*(?::\d*){2})\)/g);
            if (extractedStack)
                return extractedStack.join("\n");

            return error.stack;
        }

        RegisterMethod("reload", ReloadPage);
        RegisterMethod("start", StartInjector);
        RegisterMethod("stop", StopInjector);


        this.Reload = function Reload()
        {
            ReloadPage();
        };

        this.Log = function Log(error)
        {
            try
            {
                if (!(this.IsProductConnected() && enableTracing))
                    return;

                m_caller.SendLog(GetErrorMessage(error));
            }
            catch (e)
            {
                ns.Log(e.message || e);
            }
        };

        this.LogError = function LogError(error, injector)
        {
            try
            {
                if (!m_callReceiver.IsProductConnected())
                    return;
                if (!injector)
                    injector = "common"; 

                var result = { injector: injector };

                if (typeof error === "object")
                {
                    result.error2 = error.message ? error.message : "unknown";
                    result.stack = ExtractStack(error);
                    result.details = { errorDetails: error.details }; 
                    result.error = result.error2;
                    if (result.details.errorDetails)
                        result.error += "\n" + result.details.errorDetails;
                    if (result.stack)
                        result.error += "\n" + result.stack;
                }
                else
                {
                    result.error  = error;
                    var m = error.split("\n");
                    result.error2 = m[0];
                    result.details = { errorDetails: m.slice(1).join("\n") };
                }
                result.details.manifestVersion = browsersApi.runtime.getManifest().version;

                m_caller.SessionErrorCall(ns.JSONStringify(result));
            }
            catch (e)
            {
                ns.Log(e.message || e);
            }
        };

        function IsScriptletsException(message)
        {
            var match = message.match(/^([\w]*\s)?ReferenceError:\s([a-z\d]{7,9})$/);
            return match && match[2] && (match[2].length === 7 || match[2].length === 9);
        }

        function IsKnownError(message)
        {
            var knownErrors = [/^NetworkError[\s\W]/];

            return knownErrors.some(
                function MatchPattern(pattern)
                {
                    return message.match(pattern);
                }
            );
        }

        function IsNeedSkipError(e)
        {
            if (!m_callReceiver.IsProductConnected())
                return true;

            if (!e.filename)
                return true;

            if (e.klSkipUnhandled)
                return true;

            var val = browsersApi.runtime.id;
            if (!val || e.filename.indexOf(val) === -1)
                return true;

            if (!e.message || typeof e.message !== "string")
                return false;

            return IsScriptletsException(e.message) || IsKnownError(e.message);
        }

        this.UnhandledException = function UnhandledException(e)
        {
            try
            {
                if (IsNeedSkipError(e))
                    return;

                var errInfo = {};
                errInfo.error = e.message && e.message.length > 1024 ? (e.message.substring(0, 1019) + "<...>") : e.message;
                errInfo.script = e.filename && e.filename.length > 1024 ? (e.filename.substring(0, 1019) + "<...>") : e.filename;
                errInfo.line = e.lineno;
                errInfo.column = e.colno;
                if (e.error)
                    errInfo.stack = e.error.stack && e.error.stack.length > 2048 ? (e.error.stack.substring(0, 2043) + "<...>") : e.error.stack;

                m_caller.UnhandledExceptionCall(ns.JSONStringify(errInfo));
                return;
            }
            catch (ex)
            {
                ns.Log(ex.message || ex);
            }
        };

        this.ForceReceive = function ForceReceive()
        {
            m_callReceiver.ForceReceive();
        };

        this.IsProductConnected = function IsProductConnected()
        {
            return m_callReceiver.IsProductConnected();
        };

        this.InitializePlugin = function InitializePlugin(init)
        {
            init(
                function OnInitActivatePlugin()
                {
                    ActivatePlugin.apply(self, arguments);
                },
                function OnInitRegisterMethod()
                {
                    RegisterMethod.apply(self, arguments);
                },
                function OnInitCall()
                {
                    Call.apply(self, arguments);
                },
                function OnInitDeactivatePlugin()
                {
                    DeactivatePlugin.apply(self, arguments);
                },
                function OnInitOnUnloadCall()
                {
                    return OnUnloadCall.apply(self, arguments);
                }
            );
        };

        this.GetResource = function GetResource(resourcePostfix, callbackSuccess, callbackError)
        {
            if (!m_caller.ResourceCall)
                throw new Error("Not implemented on transport GetResource");

            m_caller.ResourceCall(resourcePostfix, callbackSuccess, callbackError);
        };

        this.Stop = function Stop(reason)
        {
            StopImpl(reason);
        };
    };

    ns.AddRunner = function AddRunner(pluginName, runnerFunc, initParameters, onConnectionError)
    {
        var options = {
            name: pluginName,
            runner: runnerFunc
        };
        if (initParameters)
            options.getParameters = function getParameters() { return initParameters; };
        if (onConnectionError)
            options.onConnectionError = onConnectionError;
        ns.AddRunner2(options);
    };

    ns.AddRunner2 = function AddRunner2(options)
    {
        var runnerItem = {
            runner: options.runner
        };
        if (options.stop)
            runnerItem.stop = options.stop;
        if (options.onConnectionError)
            runnerItem.onConnectionError = options.onConnectionError;
        if (options.getParameters)
            runnerItem.getParameters = options.getParameters;
        if (options.reject)
            runnerItem.reject = options.reject;
        runners[options.name] = runnerItem;
    };

    ns.SessionLog = function SessionLog(e)
    {
        if (avSessionInstance)
        {
            avSessionInstance.Log(e);
            return;
        }

        ns.Log(e);
    };

    ns.SessionError = function SessionError(e, injector)
    {
        if (avSessionInstance && avSessionInstance.IsProductConnected())
            avSessionInstance.LogError(e, injector);
        else
            ns.Log(e);
    };

    ns.AddEventListener(window, "error", function onError(e)
    {
        if (avSessionInstance)
            avSessionInstance.UnhandledException(e);
        else
            ns.Log(e);
    });

    ns.ContentSecurityPolicyNonceAttribute = ns.CSP_NONCE;

    function Init()
    {
        if (initPending)
            return;

        if (avSessionInstance && avSessionInstance.IsProductConnected())
            return;

        initPending = true;

        var caller = new ns.Caller();
        caller.Start(
            function StartCallback() 
            {
                var injectors = "";
                var pluginsInitData = [];
                var injectorNames = [];
                for (var runner in runners)
                {
                    if (!Object.prototype.hasOwnProperty.call(runners, runner))
                        continue;

                    if (injectors)
                        injectors += "&";
                    injectors += runner;
                    injectorNames.push(runner);

                    if (runners[runner].getParameters)
                        pluginsInitData.push({ plugin: runner, parameters: ns.JSONStringify(runners[runner].getParameters()) });
                }

                var initData = 
                    {
                        url: ns.StartLocationHref,
                        plugins: injectors,
                        data: { data: pluginsInitData },
                        isTopLevel: ns.IsTopLevel,
                        pageStartTime: ns.GetPageStartTime()
                    };

                caller.InitCall(
                    initData,
                    function InitCallCallback(initSettings)
                    {
                        ns.IsRtl = initSettings.rtl;
                        enableTracing = ns.IsDefined(initSettings.enableTracing) ? initSettings.enableTracing : true;
                        avSessionInstance = new AvSessionClass(caller);
                        var plugins = initSettings.plugins || [];
                        for (var i = 0, pluginsCount = plugins.length; i < pluginsCount; ++i)
                        {
                            try
                            {
                                var plugin = plugins[i];
                                var runnerItem = runners[plugin.name];

                                if (runnerItem)
                                {
                                    var settings = ns.IsDefined(plugin.settingsJson) ? SettingsObjectFromSettingsJson(plugin.settingsJson) : plugin.settings;
                                    var localization = ns.IsDefined(plugin.localizationDictionary) 
                                        ? LocalizationObjectFromDictionary(plugin.localizationDictionary) 
                                        : plugin.localization;
                                    runnerItem.runner(AvNs, avSessionInstance, settings, localization);
                                }
                            }
                            catch (e)
                            {
                                ns.SessionError("error for " + plugins[i].name + " :" + e);
                            }
                        }
                        for (var j = 0; j < injectorNames.length; ++j)
                        {
                            try
                            {
                                var injectorName = injectorNames[j];
                                var runnerItemHolder = runners[injectorName];
                                if (!IsInjectorInActiveList(plugins, injectorName) && runnerItemHolder.reject)
                                    runnerItemHolder.reject();
                            }
                            catch (e)
                            {
                                ns.SessionError(e);
                            }
                        }

                        initPending = false;
                        var date = new Date();
                        ns.SessionLog("Session: " + initSettings.sessionId + " initialization complete time: " + date.toISOString() +
                            " document.readyState is " + document.readyState);
                    },
                    OnInitError
                    );
            },
            OnInitError
            );
    }

    function IsInjectorInActiveList(plugins, injectorName)
    {
        for (var i = 0; i < plugins.length; ++i)
        {
            if (plugins[i].name === injectorName)
                return true;
        }
        return false;
    }

    function PostponeInit()
    {
        var nowPostponeTime = (new Date()).getTime();
        var postponeDelay = (nowPostponeTime - lastPostponedInitTime) > 5000 ? 200 : 60 * 1000;
        lastPostponedInitTime = nowPostponeTime;
        clearTimeout(postponedInitTimeout);
        postponedInitTimeout = ns.SetTimeout(Init, postponeDelay);
    }

    function OnInitError()
    {
        PostponeInit();
        for (var runner in runners)
        {
            if (!Object.prototype.hasOwnProperty.call(runners, runner))
                continue;
            try
            {
                var connectionErrorCallback = runners[runner].onConnectionError;
                if (connectionErrorCallback)
                    connectionErrorCallback();
            }
            catch (e)
            {
                ns.Log(e);
            }
        }

        initPending = false;
    }

    ns.StartSession = function StartSession()
    {
        Init();
    };

    ns.StopSession = function StopSession(reason)
    {
        if (avSessionInstance)
            avSessionInstance.Stop(reason);
    };

    if ("onpageshow" in window)
    {
        ns.AddEventListener(
            window,
            "pageshow",
            function onPageShow(event)
            {
                if (event.persisted)
                    ns.StartSession();
            }
        );
    }

    ns.AddEventListener(
        window,
        ("onpagehide" in window) ? "pagehide" : "unload",
        function onShutdownEvent(evt)
        {
            ns.StopSession(evt.type);
        }
    );
    ns.SetInterval(PostponeInit, 30000);

})(AvNs);

(function NmsTransportMain(ns)
{

ns.Caller = function ContentTransportCaller()
{
    let m_port = null;

    const m_waitResponse = {};
    let m_callReceiver = ns.EmptyFunc;
    let m_callReceiverEnabled = false;
    let m_connected = false;
    let m_initialized = false;
    let m_deferredCalls = [];
    let m_callId = 0;

    function ProcessMessage(message)
    {
        try
        {
            const response = JSON.parse(message);
            if (m_waitResponse[response.callId])
            {
                const callWaiter = m_waitResponse[response.callId];
                delete m_waitResponse[response.callId];
                clearTimeout(callWaiter.timeout);

                if (callWaiter.callbackResult)
                    callWaiter.callbackResult(response.commandData);
                return;
            }

            if (!m_initialized)
            {
                m_deferredCalls.push(message);
                return;
            }

            if (response.command === "from")
            {
                const command = ns.JSONParse(response.commandData);
                m_callReceiver(command.method, command.parameters);
            }
        }
        catch (e)
        {
            ns.SessionError(e, "nms");
        }
    }

    function ConnectToBackground(callbackSuccess, callbackError)
    {
        const onConnect = msg =>
        {
            const connectData = ns.JSONParse(msg);
            ns.GetNmsId = () => connectData.portId;
            ns.GetNmsVersion = () => connectData.version;
            m_port.onMessage.addListener(ProcessMessage);
            m_port.onMessage.removeListener(onConnect);
            m_connected = true;
            if (callbackSuccess)
                callbackSuccess();
        };

        const onDisconnect = () =>
        {
            let reason = "unknown";
            if (browsersApi.runtime.lastError)
                reason = browsersApi.runtime.lastError.message;
            m_connected = false;
            callbackError(`Connection was disconnect: ${reason}`);

            m_port.onMessage.removeListener(onConnect);
            m_port.onMessage.removeListener(ProcessMessage);
            m_port.onDisconnect.removeListener(onDisconnect);
        };

        m_port = browsersApi.runtime.connect({ name: "content_transport" });
        m_port.onDisconnect.addListener(onDisconnect);
        m_port.onMessage.addListener(onConnect);
    }

    function CallImpl(command, commandAttribute, data, callbackResult, callbackError)
    {
        try
        {
            if (++m_callId % 0x100000000 === 0)
                m_callId = 1;

            const callId = m_callId;
            if (callbackResult || callbackError)
            {
                const timeout = ns.SetTimeout(() =>
                    {
                        delete m_waitResponse[callId];
                        callbackError && callbackError(`NMS call timeout for ${command}/${commandAttribute}`);
                    }, 120000, "nms");
                const callWaiter = 
                    {
                        callbackResult: callbackResult,
                        timeout: timeout
                    };
                m_waitResponse[callId] = callWaiter;
            }

            m_port.postMessage(
                {
                    callId: callId,
                    command: command,
                    commandAttribute: commandAttribute || "",
                    commandData: data || "",
                    timestamp: (new Date()).toISOString()
                }
            );
        }
        catch (e)
        {
            callbackError && callbackError(`Connection call ${command}/${commandAttribute} exception: ${e}`);
        }
    }

    this.Start = (callbackSuccess, callbackError) =>
    {
        try
        {
            ConnectToBackground(callbackSuccess, callbackError);
        }
        catch (e)
        {
            callbackError && callbackError(`Connection start exception: ${e}`);
        }
    };

    this.SendLog = message => { CallImpl("log", null, message); };
    this.SendResult = (methodName, data) => { CallImpl("callResult", methodName, data); };
    this.SessionErrorCall = message => { CallImpl("logerr", null, message); };
    this.UnhandledExceptionCall = message => { CallImpl("except", null, message); };
    this.Call = (command, commandAttribute, data, callbackResult, callbackError) =>
    {
        CallImpl(
            command,
            commandAttribute,
            data,
            callbackResult
                ? responseText =>
                    {
                        if (callbackResult)
                        {
                            try
                            {
                                const response = ns.JSONParse(responseText);
                                callbackResult(response.result, response.parameters, response.method);
                            }
                            catch (e)
                            {
                                CallImpl("log", null, `error on parse message: ${responseText} error: ${e}`);
                                callbackError && callbackError(e);
                            }
                        }
                    }
                : null,
            callbackError
            );
    };

    this.nmsCallSupported = true;

    this.ResourceCall = (resourcePostfix, callbackResult, callbackError) =>
    {
        CallImpl("resource", "", resourcePostfix, callbackResult, callbackError);
    };

    this.InitCall = (initData, callbackResult, callbackError) =>
    {
        if (ns.StartLocationHref === "data:text/html,chromewebdata")
        {
            callbackError();
            return;
        }

        CallImpl("init", null, ns.JSONStringify(initData), responseText =>
            {
                m_initialized = true;
                const initSettings = ns.JSONParse(responseText);

                if (ns.IsDefined(initSettings.Shutdown))
                    return;

                callbackResult(initSettings);

                for (let i = 0; i < m_deferredCalls.length; ++i)
                    ProcessMessage(m_deferredCalls[i]);
                m_deferredCalls = [];
            }, callbackError);
    };

    this.StartCall = (startData, callbackResult, callbackError) =>
    {
        CallImpl(
            "start",
            null,
            ns.JSONStringify(startData),
            responseText => { callbackResult(ns.JSONParse(responseText)); },
            callbackError
        );
    };
    this.StopCall = (injector, callbackResult, callbackError) =>
    {
        CallImpl(
            "stop",
            null,
            ns.JSONStringify({ injectorName: injector }),
            responseText => { callbackResult(ns.JSONParse(responseText)); },
            callbackError
        );
    };
    this.GetReceiver = () => this;
    this.StartReceive = callMethod =>
    {
        m_callReceiverEnabled = true;
        m_callReceiver = callMethod;
    };
    this.ForceReceive = ns.EmptyFunc;
    this.StopReceive = () =>
    {
        m_callReceiverEnabled = false;
        m_callReceiver = ns.EmptyFunc;

        if (m_port)
        {
            m_connected = false;
            m_port.disconnect();
            m_port = null;
        }
    };
    this.IsStarted = () => m_callReceiverEnabled;
    this.IsProductConnected = () => m_connected;
};

return ns;
})(AvNs);

const m_globalTimer = AvNs.SetTimeout(() => { document.getElementsByTagName("body")[0].className = "failed"; }, 15000, "er");

function RunnerImpl(ns, session, settings, locales)
{
    let m_callFunction = () => {};
    const m_pluginId = "er";

    const ReadyState = 1;
    const SuccessState = 2;
    const FailState = 3;

    const Fail = 0x8000004b;

    function GetStringState(state)
    {
        switch (state)
        {
        case ReadyState:
            return "ready";
        case SuccessState:
            return "success";
        case FailState:
            return "failed";
        default:
            return "";
        }
    }

    function SetState(state)
    {
        try
        {
            document.getElementsByTagName("body")[0].className = GetStringState(state);
        }
        catch (e)
        {
            ns.SessionError(e, m_pluginId);
        }
    }

    function DeletePluginClick(evt)
    {
        ns.StopProcessingEvent(evt);
        ns.SessionLog(`Call management.uninstall for ${settings.id}`);
        ApiCall(browsersApi.management.uninstall)
            .OnSuccess(() =>
                {
                    m_callFunction("er.removed");
                    SetState(SuccessState);
                })
            .OnError(err => ProcessFail(Fail, `management.uninstall error: ${err.message} Result: eFail`))
            .Start(settings.id);
    }

    function ExitClick(evt)
    {
        ns.StopProcessingEvent(evt);
        window.close();
    }

    function ProcessFail(result, errorText)
    {
        m_callFunction("er.failedRemove", { code: result, errorText: errorText });
        SetState(FailState);
    }

    function OnPluginInfoReceived(info)
    {
        if (!info.name)
            return;

        if (info.icons && info.icons[0] && info.icons[0].url)
            document.getElementById("extension-ico").src = info.icons[0].url;
        document.getElementById("extension-name").appendChild(document.createTextNode(info.name));
        SetState(ReadyState);
    }

    function Initialize()
    {
        clearTimeout(m_globalTimer);
        session.InitializePlugin((activatePlugin, registerMethod, callFunction) => { m_callFunction = callFunction; });

        ns.AddEventListener(document.getElementById("dbutton"), "click", DeletePluginClick, m_pluginId);
        ns.AddEventListener(document.getElementById("cbutton"), "click", ExitClick, m_pluginId);
        ns.AddEventListener(document.getElementById("ebutton"), "click", ExitClick, m_pluginId);

        document.getElementById("ExtRemoverSuccessWindowLinkAboutText").href = settings.urlAbout;
        const liElem = document.getElementById("delete-reason-element");
        if (settings.verdicts)
        {
            for (const descriptor in settings.verdicts)
            {
                if ({}.hasOwnProperty.call(settings.verdicts, descriptor))
                {
                    const newElem = liElem.cloneNode(true);
                    newElem.getElementsByClassName("delete-reason-element-verdict")[0].childNodes[0].appendChild(document.createTextNode(descriptor.verdict));
                    liElem.parentNode.insertBefore(newElem, liElem);
                }
            }
            liElem.parentNode.removeChild(liElem);
        }

        for (const name in locales)
        {
            if ({}.hasOwnProperty.call(locales, name))
            {
                const elem = document.getElementById(name);
                if (elem)
                    elem.innerText = locales[name];
            }
        }

        const addingStyles = [];
        addingStyles.push(locales["ExtensionRemoverCss"]);
        ns.AddStyles(addingStyles);

        ns.SessionLog(`Call management.get for ${settings.id}`);
        ApiCall(browsersApi.management.get)
            .OnSuccess(OnPluginInfoReceived)
            .OnError(err => ProcessFail(-1, `management.get error: ${err.message}`))
            .Start(settings.id);
    }

    Initialize();
}

function GetRemoveId()
{
    const result = document.location.search.match(/\?id=([\d-\w]*)/);
    return { removeId: result[1] };
}

AvNs.AddRunner2({
    name: "er2",
    runner: RunnerImpl,
    getParameters: GetRemoveId
});

AvNs.StartSession();
