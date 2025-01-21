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
