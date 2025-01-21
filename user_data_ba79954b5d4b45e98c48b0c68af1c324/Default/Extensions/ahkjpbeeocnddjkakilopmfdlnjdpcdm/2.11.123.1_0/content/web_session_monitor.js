AvNs.AddRunner("wsm", function AddRunnerWsm(ns, session)
{
    if (window !== window.top)
        return;

    var m_callFunction = null;

    var m_activatedState = 0;
    var m_activatedStateChangeTimeout = null;
    var m_documentTitleIsAvailable = false;
    var m_stateChangeDelayTimeout = null;
    var m_processActivate = null;
    var m_pluginId = "wsm";

    function OnPing()
    {
        return ns.MaxRequestDelay;
    }

    function ForceRedirect(args)
    {
        ns.SessionLog("Force reload to address: " + args.url);
        document.location.href = args.url;
    }

    function FireDeactivateEventImpl()
    {
        if (m_callFunction)
        {
            m_callFunction("wsm.sessionDeactivated", { title: document.title }, function SessionDeactivatedCallback()
            {
                if (m_activatedState === 1)
                    m_processActivate();
                m_activatedState = 0;
            });
        }

        m_activatedState = 3;
    }

    function FireDeactivateEvent()
    {
        if (m_documentTitleIsAvailable)
            FireDeactivateEventImpl();
        else
            clearTimeout(m_stateChangeDelayTimeout);
    }

    function ProcessDeactivate()
    {
        clearTimeout(m_activatedStateChangeTimeout);
        m_activatedStateChangeTimeout = ns.SetTimeout(function TimerCallback()
            {
                if (m_activatedState === 2)
                    FireDeactivateEvent();
                else if (m_activatedState === 1)
                    m_activatedState = 3;
            }, 0, m_pluginId);
    }

    function FireActivateEventImpl()
    {
        if (m_callFunction)
        {
            m_callFunction("wsm.sessionActivated", { title: document.title }, function SessionActivatedCallback()
            {
                if (m_activatedState === 3)
                    ProcessDeactivate();
                m_activatedState = 2;
            });
        }
        m_activatedState = 1;
    }

    function FireActivateEvent()
    {
        clearTimeout(m_stateChangeDelayTimeout);

        if (m_documentTitleIsAvailable || document.title)
        {
            m_documentTitleIsAvailable = true;
            FireActivateEventImpl();
        }
        else
        {
            m_stateChangeDelayTimeout = ns.SetTimeout(function TimerCallback()
                {
                    m_documentTitleIsAvailable = true;
                    m_processActivate();
                }, 500, m_pluginId);
        }
    }

    function ProcessActivate()
    {
        clearTimeout(m_activatedStateChangeTimeout);
        m_activatedStateChangeTimeout = ns.SetTimeout(function TimerCallback()
            {
                if (m_activatedState === 0)
                    FireActivateEvent();
                else if (m_activatedState === 3)
                    m_activatedState = 1;
            }, 0, m_pluginId);
    }

    function OnFocus()
    {
        if (m_callFunction)
            ProcessActivate();
    }

    function OnBlur()
    {
        if (m_callFunction && !document.hasFocus())
            ProcessDeactivate();
    }

    function OnHashChange()
    {
        var args = { newLocationUrl: document.location.href };
        if (m_callFunction)
            m_callFunction("wsm.onHashChange", args);
    }

    function DelayHashChange()
    {
        ns.SetTimeout(OnHashChange, 100, m_pluginId);
    }

    function OnSessionShutdown()
    {
        clearTimeout(m_activatedStateChangeTimeout);
        m_activatedStateChangeTimeout = null;
        m_callFunction = null;
    }

    function Initialize()
    {
        m_processActivate = ProcessActivate;
        session.InitializePlugin(function InitializePluginWsm(activatePlugin, registerMethod, callFunction)
        {
            m_callFunction = callFunction;
            activatePlugin(m_pluginId, OnPing, null, OnSessionShutdown);
            registerMethod("wsm.forceRedirect", ForceRedirect);
        });

        if (document.hasFocus())
        {
            FireActivateEvent();
            ns.AddEventListener(window, "load", function OnLoad()
                {
                    if (!document.hasFocus())
                        ProcessDeactivate();
                }, m_pluginId);
        }

        if (window.addEventListener)
        {
            ns.AddEventListener(window, "focus", OnFocus, m_pluginId);
            ns.AddEventListener(window, "blur", OnBlur, m_pluginId);
        }
        else
        {
            ns.AddEventListener(document, "focusin", OnFocus, m_pluginId);
            ns.AddEventListener(document, "focusout", OnBlur, m_pluginId);
        }

        if ("onhashchange" in window)
            ns.AddEventListener(window, "hashchange", OnHashChange);

        if (window.history)
        {
            var oldBack = window.history.back;
            var oldForward = window.history.forward;
            var oldGo = window.history.go;
            var oldPushState = window.history.pushState;
            var oldReplaceState = window.history.replaceState;

            window.history.back = function WrapperBack()
            {
                oldBack.apply(window.history);
                DelayHashChange();
            };
            window.history.forward = function WrapperForward()
            {
                oldForward.apply(window.history);
                DelayHashChange();
            };
            window.history.go = function WrapperGo()
            {
                oldGo.apply(window.history, arguments);
                DelayHashChange();
            };
            window.history.pushState = function WrapperPushState()
            {
                oldPushState.apply(window.history, arguments);
                DelayHashChange();
            };
            window.history.replaceState = function WrapperReplaceState()
            {
                oldReplaceState.apply(window.history, arguments);
                DelayHashChange();
            };
        }
    }

    Initialize();
}, {
    referrer: document.referrer,
    stubId: (function stubId()
    {
        var scripts = [];
        scripts = document.querySelectorAll("[stubid]");

        if (scripts && scripts.length > 0)
            return scripts[0].getAttribute("stubid");
        return "";
    })()
});
