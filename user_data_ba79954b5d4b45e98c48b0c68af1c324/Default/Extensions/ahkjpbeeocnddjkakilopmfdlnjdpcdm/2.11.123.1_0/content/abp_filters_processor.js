(function AbpProcessor(ns)
{

function AddSelectorProcessor(selector, processors) 
{
    if (!selector)
        return;

    const trimmed = selector.trim();

    var str = ((trimmed[0] === ">") ? ":scope " : "* ") + trimmed;

    var selectorEnding = str.slice(-1);
    if (selectorEnding === ">" || selectorEnding === "+" || selectorEnding === "~")
        str += "*";

    processors.push(function pusher(objects) 
        {
            var resultObjects = [];
            for (var i = 0; i < objects.length; ++i) 
            {
                var list = objects[i].querySelectorAll(str);
                Array.prototype.push.apply(resultObjects, list);
            }
            return resultObjects;
        });
}

function GetTextInsideBracket(queryParts)
{
    var result = "";
    for (var parentheses = 1; queryParts.index < queryParts.parts.length; ++queryParts.index)
    {
        if (!queryParts.parts[queryParts.index])
            continue;

        var part = queryParts.parts[queryParts.index];
        if (part === ")")
        {
            --parentheses;
            if (!parentheses)
                break;
        }
        else if (part === "(")
        {
            ++parentheses;
        }
        result += part;
    }
    return result;
}

function GetQuotedText(queryParts)
{
    var result = "";
    for (; queryParts.index < queryParts.parts.length; ++queryParts.index)
    {
        if (!queryParts.parts[queryParts.index])
            continue;

        var part = queryParts.parts[queryParts.index];
        if (part === "\"")
            break;

        result += part;
    }
    return result;
}

function RemoveChilds(objects)
{
    for (var i = 0; i < objects.length;)
    {
        if (objects.some(
            function checker(element)  
            {
                var object = objects[i];
                if (element === object)
                    return false;

                return element.contains(object);
            }
            ))
            objects.splice(i, 1);
        else
            i++;
    }
}

function PreprocessProperties(properties)
{
    if (properties.length >= 2 && properties[0] === "/" && properties[properties.length - 1] === "/")
        return properties.substring(1, properties.length - 1);

    var props = properties.replace(/\*+/g, "*");
    props = props.replace(/\^\|$/, "^");
    props = props.replace(/\W/g, "\\$&");
    props = props.replace(/\\\*/g, ".*");
    props = props.replace(/^\\\|/, "^");
    return props.replace(/\\\|$/, "$");
}

function GetMatcherFromText(inputText)
{
    try 
    {
        var expression = "";
        var flags = ""; 
        var execResult = (/^\/(.*)\/([imu]*)$/).exec(inputText);
        if (execResult)
        {
            expression = execResult[1];
            if (execResult[2])
                flags = execResult[2];
        }
        else
        {
            expression = inputText.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"); 
        }
        return new RegExp(expression, flags);
    }
    catch (e)
    {
        return null;
    }
}

function GetMatchedStylesheetSelectors(stylesheet, propertiesMatcher)
{
    var selectors = [];
    try 
    {
        for (var i = 0; i < stylesheet.cssRules.length; ++i)
        {
            var rule = stylesheet.cssRules[i];
            if (rule.type !== rule.STYLE_RULE)
                continue;

            var properties = "";
            for (var j = 0; j < rule.style.length; j++)
            {
                var propertyName = rule.style.item(j);
                properties += propertyName + ": " + rule.style.getPropertyValue(propertyName) + ";";
            }

            if (!propertiesMatcher.test(properties))
                continue;

            selectors.push(rule.selectorText);
        }
    }
    catch (e)
    {
        return [];
    }
    return selectors;
}

function GetDomStylesStrings(propertiesMatcher)
{
    var matcher = new RegExp(propertiesMatcher, "i");
    var selectorsGroup = "";
    for (var i = 0; i < this.document.styleSheets.length; ++i)
    {
        var matchedSelectors = GetMatchedStylesheetSelectors(this.document.styleSheets[i], matcher);
        for (var selectorIndex = 0; selectorIndex < matchedSelectors.length; ++selectorIndex)
            selectorsGroup += matchedSelectors[selectorIndex] + ", ";
    }

    if (selectorsGroup.length)
        selectorsGroup = selectorsGroup.substring(0, selectorsGroup.length - 2);

    return selectorsGroup;
}


function AbpHasProcessorFactory(queryParts, queryParser)
{
    var innerSelectorsProcessor = queryParser(queryParts);
    return function AbpHasProcessor(objects)
    {
        var resultObjects = [];
        for (var i = 0; i < objects.length; ++i)
        {
            if (innerSelectorsProcessor([objects[i]]).length)
                resultObjects.push(objects[i]);
        }
        return resultObjects;
    };
}

function AbpContainsProcessorFactory(queryParts)
{
    var textInsideBracket = GetTextInsideBracket(queryParts);
    var matcher = GetMatcherFromText(textInsideBracket);
    return function AbpContainsProcessor(objects)
        {
            var resultObjects = [];
            if (!matcher)
                return resultObjects;

            RemoveChilds(objects);
            for (var i = 0; i < objects.length; ++i)
            {
                if (matcher.test(objects[i].textContent))
                    resultObjects.push(objects[i]);
            }
            return resultObjects;
        };
}

function IsObjectPropertiesMatch(object, selectors)
{
    var parent = object.parentNode || document;
    if (object === document)
        return false;

    var selectedObjects = Array.from(parent.querySelectorAll(selectors));
    return selectedObjects.some(function checker(item) { return item === object; });
}

function AbpPopertiesProcessorFactory(queryParts)
{
    var textInsideBracket = GetTextInsideBracket(queryParts);
    var selectorRegexp = PreprocessProperties(textInsideBracket);
    var selectorsGroup = GetDomStylesStrings(selectorRegexp);

    return function AbpPopertiesProcessor(objects)
    {
        var resultObjects = [];

        if (!selectorsGroup)
            return resultObjects;

        for (var i = 0; i < objects.length; ++i)
        {
            var object = objects[i];
            if (IsObjectPropertiesMatch(object, selectorsGroup))
                resultObjects.push(object);
        }
        return resultObjects;
    };
}

function ParseQuery(queryParts)
{
    var functions = [];
    var collectedPart = "";
    for (; queryParts.index < queryParts.parts.length; ++queryParts.index)
    {
        if (!queryParts.parts[queryParts.index])
            continue;

        var part = queryParts.parts[queryParts.index];
        if (part === ")")
            break;

        var processorFactory = void 0;
        if (part === ":-abp-has(" || part === ":has(")
            processorFactory = AbpHasProcessorFactory;
        else if (part === ":-abp-contains(")
            processorFactory = AbpContainsProcessorFactory;
        else if (part === ":-abp-properties(")
            processorFactory = AbpPopertiesProcessorFactory;

        if (processorFactory)
        {
            ++queryParts.index;
            AddSelectorProcessor(collectedPart, functions);
            collectedPart = "";
            functions.push(processorFactory(queryParts, ParseQuery));
            continue;
        }

        if (part === "(")
        {
            ++queryParts.index;
            part += GetTextInsideBracket(queryParts);
            if (queryParts.index < queryParts.parts.length)
                part += queryParts.parts[queryParts.index];
        }

        if (part === "\"")
        {
            ++queryParts.index;
            part += GetQuotedText(queryParts);
            if (queryParts.index < queryParts.parts.length)
                part += queryParts.parts[queryParts.index];
        }

        collectedPart += part;
    }

    AddSelectorProcessor(collectedPart, functions);
    return function parser(objects)
    {
        var outputObjects = objects;
        for (var i = 0; i < functions.length; ++i)
        {
            var tempObjects = functions[i](outputObjects);
            outputObjects = tempObjects;
        }

        return outputObjects;
    };
}

ns.FindElementsByAbpRule = function FindElementsByAbpRule(abpRule)
{
    var result = [];
    try 
    {
        var partsValues = abpRule.split(/(:has\()|(:-abp-has\()|(:-abp-contains\()|(:-abp-properties\()|(\()|(\))|(")/g);
        var operation = ParseQuery({ parts: partsValues, index: 0 });
        result = operation([document]);
    }
    catch (e)
    {
        ns.SessionError({ message: "ERR processing abp rule", details: "rule: " + abpRule + "\r\n" + (e.message || e) }, "ab_abp");
        return [];
    }
    return result;
};

return ns;

})(AvNs);
