﻿(function(){function c(a){try{if("function"==typeof a&&d("toString"))return!0;if("object"==typeof a){if((a instanceof f||g.includes(a.constructor))&&d("toString"))return!0;if(e)for(var b of Object.values(e(a)))if(b.get&&!b.set&&!b.enumerable)return!0}}catch(l){}return!1}if(!window._cf_chl_opt){var f=Function,h=console.dir,k=console.log,d=Object.hasOwn,e=Object.getOwnPropertyDescriptors,g=[Object,RegExp,Date];console.log=function(a,b){"string"==typeof a||(b=a);c(b)?console.debug("DEBUG LOG",typeof b):
k.apply(this,arguments)};console.dir=function(a){c(a)?console.debug("DEBUG DIR",typeof a):h.apply(this,arguments)};console.table=function(){};console.clear=function(){}}})();
