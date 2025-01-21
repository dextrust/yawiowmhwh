(ns =>
{
ns.FocusChangeObserver = function FocusChangeObserver(focusHandler, blurHandler, settingsChangedHandler, selectors)
{
    function tryToGetFocusedInput()
    {
        const element = document.activeElement;
        return (document.hasFocus() && isFocusAllowedElement(element)) ? element : null;
    }

    function isFocusAllowedElement(element)
    {
        return element && selectors.some(selector =>
            {
                if (selector.tagName && selector.types)
                {
                    return element.tagName && selector.tagName === element.tagName.toLowerCase()
                        && (element.type ? selector.types.includes(element.type.toLowerCase()) : true);
                }
                else if (selector.tagName)
                {
                    return element.tagName && selector.tagName === element.tagName.toLowerCase();
                }
                return element.matches && element.matches(selector);
            });
    }

    function onBlur()
    {
        if (m_focusedElement)
        {
            const element = m_focusedElement;
            m_focusedElement = null;
            blurHandler(element);
        }
    }

    function onFocus(event)
    {
        const element = event.target;
        if (isFocusAllowedElement(element))
        {
            m_focusedElement = element;
            focusHandler(element);
        }
        else if (element.shadowRoot)
        {
            for (const selector of selectors)
            {
                for (const elementType of selector.types)
                {
                    const innerElement = element.shadowRoot.querySelector(`${selector.tagName}[type=${elementType}]`);
                    if (innerElement)
                    {
                        m_focusedElement = innerElement;
                        focusHandler(innerElement);
                        return;
                    }
                }
            }
        }
    }

    let m_focusedElement = tryToGetFocusedInput();

    ns.AddEventListener(document, "focus", onFocus);
    ns.AddEventListener(document, "blur", onBlur);

    if (m_focusedElement)
        focusHandler(m_focusedElement);

    this.settingsChanged = () =>
    {
        if (m_focusedElement)
            settingsChangedHandler(m_focusedElement);
    };

    this.unbind = () =>
    {
        if (document.removeEventListener)
        {
            document.removeEventListener("focus", onFocus, true);
            document.removeEventListener("blur", onBlur, true);
        }
        if (m_focusedElement)
        {
            blurHandler(m_focusedElement);
            m_focusedElement = null;
        }
    };
};
})(AvNs);
