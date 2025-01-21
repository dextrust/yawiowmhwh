function GetSearchLinks()
{
    try
    {
        var links = document.querySelectorAll(".b_algo > h2 > a, .b_algo > div> div > h2 > a, .b_algo > div> h2 > a, .sb_tlst > h2 > a, .b_algo > .b_title > h2 > a");
        var results = [];
        for (var i = 0; i < links.length; ++i)
        {
            try
            {
                var linkElement = links[i];
                var cite = linkElement.parentElement.parentElement.parentElement.querySelector("cite")
                    || linkElement.parentElement.parentElement.parentElement.parentElement.querySelector("cite");
                var href = cite.innerText;
                results.push({ element: linkElement, href: href });
            }
            catch (e)
            {
                AvNs.SessionLog(e);
            }
        }
        return results;
    }
    catch (e)
    {
        AvNs.SessionError(e, "ua");
        return [];
    }
}

AvNs.GetSearchLinks = GetSearchLinks;

