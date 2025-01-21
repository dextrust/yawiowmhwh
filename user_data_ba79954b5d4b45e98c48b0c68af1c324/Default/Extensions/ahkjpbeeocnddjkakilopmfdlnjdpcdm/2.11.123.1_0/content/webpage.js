AvNs.AddRunner("wp", (ns, session) =>
{
function Webpage()
{
    let m_callFunction = ns.EmptyFunc;

    function OnPing()
    {
        return ns.MaxRequestDelay;
    }

    function isFrameRedirected(callback)
    {
        ApiCall(browsersApi.runtime.sendMessage)
            .OnSuccess(response => callback(response.isRedirected))
            .OnError(err => ns.SessionLog(`Failed isFrameRedirected with error ${err.message}`))
            .Start({ command: "isFrameRedirected" });
    }

    function Process()
    {
        m_callFunction("wp.content", { dom: document.documentElement.innerHTML });
    }

    function DelayProcess()
    {
        if (document.readyState === "complete")
            Process();
        else
            ns.SetTimeout(Process, 1000, "wp");
    }

    session.InitializePlugin((activatePlugin, registerMethod, callFunction) =>
        {
            m_callFunction = callFunction;
            activatePlugin("wp", OnPing);
            registerMethod("wp.getFrameContent", Process);
        });

    if (window !== window.top)
    {
        isFrameRedirected(isRedirected =>
        {
            if (isRedirected)
                m_callFunction("wp.createProcessors", null, DelayProcess);
        });
    }
    else
    {
        DelayProcess();
    }
}

let instance = null;
ns.RunModule(() =>
{
    if (!instance)
        instance = new Webpage();
});
});
