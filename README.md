# API Tester
A simple TDD unit testing framework for APIs.

<img width="700" alt="API Tester Landing Page" src="https://github.com/user-attachments/assets/33f58485-9b2c-4374-9928-b76df38acaca" />

🚀 Test the beta version live here: https://tdd.upstr.dev.

## Getting started
API Tester lets you create API tests in a simple YAML file with detailed test assertions for APIs. Here is an example test:

```yaml
name: apigee httpbin test
tests:
  - name: test httpbin get
    url: https://httpbin.org
    path: /get
    method: GET
    headers:
      Test-Header: test123
    assertions:
      - $.headers.Host==httpbin.org
      - $.headers["Test-Header"]==test123
  - name: test apigee proxy httpbin get
    url: https://35-190-86-107.nip.io/v1/httpbin
    path: /get
    method: GET
    headers:
      Test-Header: test123
    variables:
      testVar: test456
    assertions:
      - $.headers.Host==httpbin.org
      - $.headers["Test-Header"]==test123
      - testVar===test456
```

The above test suite shows two tests in a test suite. 
1.  **test httpbin get** does a direct test to `https://httpbin.org/get`, first setting the header `Test-Header` and then testing the payload (in JPATH format) properties in the response. This first type of test can be run on any API just using request / response data.
2. **test apigee proxy httpbin get** tests an apigee proxy to `https://httpbin.org/get`, and has the additional unit testing capability of setting and testing `variables`. In this test we set the variable `testVar` to test456, and then assert that value in the assertions.

## Running tests
### Web client
You can run your tests in the web client by pressing the "Run" button. All tests created and run on the web client are saved in **stateful mode** on the web server as described below, and can also be run via API. You can access the web client at the root URL of your deployment, or the public test version here: https://tdd.upstr.dev.

<img width="700" alt="API Tester Dashboard" src="https://github.com/user-attachments/assets/c623a2ff-ee5e-49ed-b4cd-bf43d282b77d" />

### Web server
You can run tests on the web server either in **stateful mode** which saves all tests and results on the server, or **stateless mode** which just runs the tests and returns the results, but doesn't persist any tests or results.

#### Stateful mode
To create, save and run tests in stateful mode, you first need to create a test suite and then run the tests. The returned **id** is the admin id with which you can edit / run / delete the tests, or the shortened **viewId** with which you can only view the results (can be shared publicly).
```sh
# create a test suite, get yaml version with accept header
curl -X POST https://tdd.upstr.dev/tests
# you can also post a test body if wanted, or start with a default example:
# {
#  "name": "Mock Target Tests v1",
#  "tests": [
#    {
#      "name": "test response payload",
#      "url": "https://mocktarget.apigee.net",
#      "path": "/json",
#      "method": "GET",
#      "assertions": [
#        "$.firstName==john",
#        "$.city==San Jose",
#        "response.header.content-length==68"
#      ]
#    }
#  ],
#  "id": "fdf0a78b-3a13-47a3-a2fb-66cfd66ab238",
#  "viewId": "fdf0a78b-3a13-47a3-a2fb"
# }

# run tests
curl -X POST https://tdd.upstr.dev/tests/:id/run

# update tests either in json or yaml formats
curl -X PUT https://tdd.upstr.dev/tests/:id -H "Content-Type: application/json" -d '{...updated tests...}'

# delete tests
curl -X DELETE https://tdd.upstr.dev/tests/:id
```

#### Stateless mode
You can just run any tests in stateless mode without saving anything to the server, and just get the results back as JSON or YAML (just set the `accept` header). You can run this test below and see the results in real-time (try it out!).

```sh
# post tests either in JSON or YAML formats (just set the content-type header)
curl -X POST https://tdd.upstr.dev/tests/run \
  -H "Content-Type: application/yaml" \
  -d '
tests:
  - name: test httpbin.org hostname
    url: https://httpbin.org
    path: /get
    verb: get
    assertions:
      - $.headers.Host===httpbin.org
'
```

## API proxy unit tests
Your API proxy gateways can execute the assertions on local variables in the test definitions, and provide detailed unit test results to the test server. The Apigee shared flow implementation below provides a reference for how to do this, and other proxy platforms might be added in the future.

The implementation for an API proxy platform looks something like this:
1. The proxy checks in the request headers if the header **x-upstream-id** is set, and if so fetches the test cases from the **/tests/:id** endpoint. This is done in Apigee in the **Pre Proxyflow** flow hook.
2. After proxy processing, the test cases are tested and validated, and the results posted back to the **/tests/:id/results** endpoint. This is done in Apigee in the **Post Proxyflow**.

### Apigee proxy unit tests
You can do detailed unit tests on Apigee proxies by deploying the **Shared Flow** from this repository into your Apigee org, and then setting the **Pre-proxy** and **Post-proxy** Flow hooks in your environment. This will check if the **x-upstream-id** header is set, and if so run the configured unit tests in the proxy. If no header is set, then nothing is done.

Deploy the shared flow using the [apigeecli](https://github.com/apigee/apigeecli).
```sh
# clone this repo and import the shared flow
PROJECT_ID=YOUR_APIGEE_ORG
ENV=YOUR_APIGEE_ENV
# create and deploy the shared flow
apigeecli sharedflows create bundle -n SF-Tester-v1 -f ./apigee/sharedflowbundle -o $PROJECT_ID -e $ENV --ovr -t $(gcloud auth print-access-token)

# attach pre-proxy and post-proxy flowhooks for the environment
apigeecli flowhooks attach -n PreProxyFlowHook -s SF-Tester-v1 -o $PROJECT_ID -e $ENV -t $(gcloud auth print-access-token)
apigeecli flowhooks attach -n PostProxyFlowHook -s SF-Tester-v1 -o $PROJECT_ID -e $ENV -t $(gcloud auth print-access-token)
```
In case you already have shared flows in the Pre-proxy and Post-proxy hooks, then you will have to add a new shared flow that calls both flows.

After you have added the shared flow and the flow-hooks, you can run tests, and the shared flow will validate the assertions in the proxy process if the **x-upstream-id** header is set with a test id.

## Configuration guide
### Headers
You can both set and assert header values in tests. This test defnition both sets a header and asserts the `content-length` header, and then tests the mirrored request headers in the response as well was the response header value itself.
```yaml
name: httpbin.org test
tests:
  - name: test httpbin get
    url: https://httpbin.org
    path: /get
    method: GET
    headers:
      Test-Header: test123
    assertions:
      - $.headers["Test-Header"]==test123
      - response.header.Test-Header==test123
```
### Method and Body
You can both set and assert payload values, as well as set the method. Assertions only work for JSON response payloads using JSONPath. This example POSTS a payload and validates response JSON properties.
```yaml
name: httpbin.org test
tests:
  - name: test httpbin post
    url: https://httpbin.org
    path: /post
    method: POST
    headers:
      Content-Type: application/json
    body: '{"test1": "test2"}'
    assertions:
      - $.headers.Host==httpbin.org
      - $.json.test1==test2
```
### Variables
Variables can only be set and tested if using the Apigee shared flow above, since only then do we have access to the runtime processing information. 

In this example we both set a variable in the **variables** collection and test variable values in the **assertions**.

```yaml
name: LLM Feature Proxy Tests
tests:
  - name: test openai prompt input simple
    runner: external
    body: '{"messages": [{"role": "user", "content": "why is the sky blue?"}]}'
    variables:
      llm.promptInput: why is the sky blue?
    assertions:
      - llm.promptInput===why is the sky blue?
      - llm.promptEstimatedTokenCount===6.666666666666667
```

### Assertion operations
These operations are available for assertions.
- "==" - loosely equals, not accounting for data type or string case.
- "===" - strictly equals, so data type and string case must be identical.
- "!=" - loosely not equals
- "!==" - strictly not equals
- ":" - string includes
## Deployment
You can easily deploy this service into your own environment with just one container and a filesystem for storage. The default deployment in **2.deploy.sh** deploys to **Google Cloud Run** for easy/free/cheap running and **Google Cloud Storage** for easy/free/cheap persistence.
## Credits
- The frontend code was initially generated by [Gemini 2.5 Flash](https://deepmind.google/models/gemini/flash/), and then adapted and polished based on the requirements.
- The amazing [CodeMirror](https://codemirror.net/) project is used for test YAML editing in the web client.
