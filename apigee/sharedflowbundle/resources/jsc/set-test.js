var upstreamId = context.getVariable("upstream.testId");
var testCaseId = context.getVariable("upstream.testCaseId");
var testContent = context.getVariable("upstreamResponse.content");
var testContentCode = context.getVariable("upstreamResponse.status.code");
var proxyUrl = context.getVariable("proxy.url");
var pathSuffix = context.getVariable("proxy.pathsuffix");
var requestVerb = context.getVariable("request.verb");
if (requestVerb) 
  requestVerb = requestVerb.toUpperCase();
else
  requestVerb = "GET";

if (upstreamId && testContent && testContentCode == 200) {
  var testCases = JSON.parse(testContent);
  if (testCases) {
    var testCase = findTest(testCaseId, testCases, proxyUrl, pathSuffix, requestVerb, request.content);
    if (testCase) {
      context.setVariable("upstream.testCase", JSON.stringify(testCase));
      // request
      if (testCase.body)
        context.setVariable("request.content", testCase.body);

      // variables
      if (testCase.variables) {
        // set variables
        var varNames = Object.keys(testCase.variables);
        for (var i = 0; i < varNames.length; i++) {
          var varName = varNames[i];
          context.setVariable(varName, testCase.variables[varName]);
        }
      }

      // headers
      if (testCase.headers) {
        var headerNames = Object.keys(testCase.headers);
        for (var i = 0; i < headerNames.length; i++) {
          var headerName = headerNames[i];
          context.setVariable("request.header." + headerName, testCase.headers[headerName]);
        }
      }
    }
  }
}

function findTest(testId, testCases, proxyUrl, requestPath, requestVerb, requestContent) {
  print("Finding test with requestPath: " + requestPath + " and requestVerb " + requestVerb + " and proxyUrl " + proxyUrl);
  var result = undefined;

  if (testCases && testCases.tests && testCases.tests.length > 0) {
    var filteredArray = testCases.tests.filter((x) => x.name == testId);
    if (filteredArray.length > 0) {
      print("Found test case using name: " + testId);
      result = filteredArray[0];
    }
    else {
      filteredArray = testCases.tests.filter((x) => (proxyUrl == x.url + x.path) && (stringCompare(x.method, requestVerb)));
      if (filteredArray.length > 0) {
        print("Found test case using url: " + proxyUrl);
        result = filteredArray[0];
        print(JSON.stringify(result));
      } else {
        filteredArray = testCases.tests.filter((x) => (stringCompare(x.method, requestVerb) && x.path == requestPath));
        if (filteredArray.length > 0) {
          print("Found test case using path and verb: " + requestVerb + " - " + requestPath);
          result = filteredArray[0];
        }
        else if (testCases.tests.length > 0) {
          print("Did not find test case, taking first one.");
          result = testCases.tests[0];
        }
      }
    }
  }

  return result;
}

function stringCompare(var1, var2) {
  var testVar1 = var1;
  if (!testVar1) testVar1 = "";
  var testVar2 = var2;
  if (!testVar2) testVar2 = "";

  var result = true;
  print("Testing stringCompare testVar1: " + testVar1.toUpperCase() + " and testVar2: " + testVar2.toUpperCase());
  if (testVar1.toUpperCase() != testVar2.toUpperCase())
    result = false;
  return result;
}