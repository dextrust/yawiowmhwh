AvNs.AddEventListener(document, "click", function onClick(event)
    {
        var element = null;
        if (event.target.closest)
            element = event.target.closest("a[href]");
        if (element !== null && typeof element.href === "string")
        {
            ApiCall(browsersApi.runtime.sendMessage)
                .OnError(err => AvNs.SessionLog(`sendPopupUrl failed with error ${err.message}`))
                .Start({ command: "sendPopupUrl", url: element.href });
        }
        else
        {
            ApiCall(browsersApi.runtime.sendMessage)
                .OnError(err => AvNs.SessionLog(`sendPopupUrl empty url failed with error ${err.message}`))
                .Start({ command: "sendPopupUrl", url: "" });
        }
    }, "abn");

function GetCommonLink()
{
    var commonLink = AvNs.GetResourceSrc("/abn/main.css");
    if (!AvNs.IsRelativeTransport())
        return commonLink;

    return "/" + commonLink.substr(AvNs.GetBaseUrl().length);
}

function FindCommonLink()
{
    if (document.querySelector)
        return document.querySelector("link[href^=\"" + GetCommonLink() + "\"]");

    for (var i = 0; i < document.styleSheets.length; ++i)
    {
        var currentStyleSheet = document.styleSheets[i];
        if (currentStyleSheet.href && currentStyleSheet.href.indexOf(GetCommonLink()) !== -1)
            return document.styleSheets[i].ownerNode || document.styleSheets[i].owningElement;
    }

    return null;
}

var abnRunner = function abnRunner(ns, session, settings)
{
    function AntiBanner()
    {
        var m_callFunction = ns.EmptyFunc;
        var m_usingStyles = [];
        var m_deferredProcess = null;
        var m_processedIdentifier = "kl_abn_" + ns.GetCurrentTime();
        var m_firstRun = true;
        var m_randColorAttribute = settings.randomColor;
        var m_randBackgroundColorAttribute = settings.randomBackgroundColor;
        var m_observer = null;
        var m_abpRulesApplyTimeout = null;
        var m_pluginId = "abn";

        function OnPing()
        {
            return ns.MaxRequestDelay;
        }

        function GetStyleSheetFromNode(node)
        {
            return node.sheet || node.styleSheet;
        }

        function AddAntiBannerStyleSheet(styleSheet)
        {
            if (!styleSheet)
                return;

            m_usingStyles.push(styleSheet);
        }

        function AddUsingStyle(sheetNodes)
        {
            for (var i = 0; i < document.styleSheets.length; ++i)
            {
                var ownerNode = ns.GetOwnerNode(document.styleSheets[i]);
                if (sheetNodes.indexOf(ownerNode) !== -1)
                    AddAntiBannerStyleSheet(document.styleSheets[i]);
            }
        }

        function SendAntibannerStat(newProcessedCount)
        {
            if (m_firstRun || newProcessedCount !== 0)
            {
                m_callFunction("abn.statInfo", { count: newProcessedCount });
                m_firstRun = false;
            }
        }

        function ApplyAbpRulesDelay(rule)
        {
            ns.SetTimeout(function ApplyAbpRulesTimerCallback()
                {
                    var elements = ns.FindElementsByAbpRule(rule);
                    var newProcessedCount = 0;
                    for (var i = 0; i < elements.length; ++i)
                    {
                        if (!elements[i][m_processedIdentifier])
                        {
                            elements[i][m_processedIdentifier] = true;
                            elements[i].style.display = "none";
                            ++newProcessedCount;
                        }
                    }
                    if (newProcessedCount)
                        SendAntibannerStat(newProcessedCount);
                }, 0, m_pluginId);
        }

        function ApplyAbpRules(rules)
        {
            if (!ns.FindElementsByAbpRule)
            {
                ns.SessionError("Function for abp rules is not defined", m_pluginId);
                return;
            }

            for (var i = 0; i < rules.length; i++)
                ApplyAbpRulesDelay(rules[i]);
        }

        function CalculateNewProcessedItemsBySelector(selector)
        {
            var newProcessedCount = 0;
            var elementList = document.querySelectorAll(selector);
            for (var i = 0; i < elementList.length; ++i)
            {
                if (!elementList[i][m_processedIdentifier])
                {
                    elementList[i][m_processedIdentifier] = true;
                    ++newProcessedCount;
                }
            }
            return newProcessedCount;
        }

        function DeferredProcessCssRules(rules, i)
        {
            try
            {
                SendAntibannerStat(CalculateNewProcessedItemsBySelector(rules[i].selectorText));
            }
            catch (e)
            {
                e.details = "number: " + i + "\r\nrule: " + rules[i].selectorText;
                ns.SessionError(e, m_pluginId);
            }
        }

        function GetDeferredHandler(rules, i)
        {
            return function GetDeferredHandlerImpl() { DeferredProcessCssRules(rules, i); };
        }

        function ProcessCssRules(rules)
        {
            for (var i = 0; i < rules.length; ++i)
                ns.SetTimeout(GetDeferredHandler(rules, i), 0, m_pluginId);
        }

        function CalculateNewProcessedItemsByStyle()
        {
            var newProcessedCount = 0;
            var elementList = document.getElementsByTagName("*");
            for (var i = 0; i < elementList.length; ++i)
            {
                if (!elementList[i][m_processedIdentifier]
                    && elementList[i].currentStyle.color === m_randColorAttribute
                    && elementList[i].currentStyle.backgroundColor === m_randBackgroundColorAttribute)
                {
                    elementList[i][m_processedIdentifier] = true;
                    ++newProcessedCount;
                }
            }
            return newProcessedCount;
        }

        function CalculateNewProcessedItems()
        {
            if (document.querySelectorAll)
            {
                var atLeastOneStyleExist = false;
                for (var i = 0; i < m_usingStyles.length; ++i)
                {
                    try
                    {
                        var cssRules = m_usingStyles[i].cssRules || m_usingStyles[i].rules;
                        if (cssRules && cssRules.length)
                        {
                            ProcessCssRules(cssRules);
                            atLeastOneStyleExist = true;
                        }
                    }
                    catch (e)
                    {
                        ns.SessionLog(e);
                    }
                }
                if (!atLeastOneStyleExist)
                {
                    SendAntibannerStat(0);
                    ns.SessionLog("No one style exist. Count of using styles nodes: " + m_usingStyles.length);
                }
            }
            else
            {
                SendAntibannerStat(CalculateNewProcessedItemsByStyle());
            }
        }

        function ScheduleCalculateProcessedItems()
        {
            clearTimeout(m_deferredProcess);
            m_deferredProcess = ns.SetTimeout(CalculateNewProcessedItems, 500, m_pluginId);
        }

        function SetCss(rules)
        {
            if (rules.rules)
            {
                var sheetNodes = ns.AddStyles(rules.rules);
                ns.SetTimeout(function SetCssTimerCallback() { AddUsingStyle(sheetNodes); }, 0, m_pluginId);
            }

            if (rules.abpRules && rules.abpRules.length)
            {
                var applyRulesFunc = function ApplyAbpRulesFunc() { ApplyAbpRules(rules.abpRules); };
                applyRulesFunc();
                ns.AddEventListener(window, "load", applyRulesFunc, m_pluginId);
                if (m_observer)
                    m_observer.Stop();
                m_observer = ns.GetDomChangeObserver("*", m_pluginId);
                m_observer.Start(function AntiBannerMutationObserver()
                    {
                        clearTimeout(m_abpRulesApplyTimeout);
                        m_abpRulesApplyTimeout = ns.SetTimeout(applyRulesFunc, 2000, m_pluginId);
                    });
            }

            ns.SessionLog("Calculate processed items when setting css");
            ScheduleCalculateProcessedItems();
        }

        function OnLoadCommonCss(arg)
        {
            var target = arg.target || arg.srcElement;
            var sheetNode = GetStyleSheetFromNode(target);
            if (!sheetNode)
            {
                ns.SessionError("OnLoadCommonCss fail with not exist sheet", m_pluginId);
                return;
            }
            AddAntiBannerStyleSheet(sheetNode);
            ns.SessionLog("Calculate processed items when loading common css");
            ScheduleCalculateProcessedItems();
        }

        session.InitializePlugin(
            function InitializePluginABN(activatePlugin, registerMethod, callFunction)
            {
                m_callFunction = callFunction;
                activatePlugin(m_pluginId, OnPing);
            }
            );

        if (settings.insertCommonLink)
        {
            var link = document.createElement("link");
            link.setAttribute("type", "text/css");
            link.setAttribute("rel", "stylesheet");
            link.setAttribute("href", ns.GetResourceSrc("/abn/main.css"));
            link.setAttribute("crossorigin", "anonymous");
            ns.AddEventListener(link, "load", OnLoadCommonCss, m_pluginId);
            if (document.head)
                document.head.appendChild(link);
            else
                document.getElementsByTagName("head")[0].appendChild(link);
        }

        SetCss(settings);
    }


    var instance = null;
    ns.RunModule(function RunModuleAB()
    {
        if (!instance)
            instance = new AntiBanner();
    });
};

var abnOptions = {
    name: "abn",
    runner: abnRunner,
    getParameters: function getParameters() { return { isCssUrlInjected: Boolean(FindCommonLink()) }; }
};

AvNs.AddRunner2(abnOptions);
