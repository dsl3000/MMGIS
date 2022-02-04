const logger = require("../../../logger");
const fetch = require("node-fetch");

const webhookutils = require("../../Webhooks/routes/webhookutils.js");
const webhookEntries = webhookutils.entries;

const INJECT_REGEX = /{(.*?)}/;

// Save the webhook config to local memory
var webhooksConfig;

function getWebhooks() {
  var res = {};
  res.send = function (payload) {
    if (payload.status == "success") {
      if (payload?.body?.entries && payload.body.entries.length > 0) {
        var config = JSON.parse(payload.body.entries[0].config);
        webhooksConfig = config.webhooks;
      }
    } else {
      logger(
        "error",
        "Unable to get webhook entries",
        "TriggerWebhooks",
        null,
        "Unable to get webhook entries"
      );
    }
  };

  webhookEntries({}, res);
}

function triggerWebhooks(action, payload) {
  if (action === "getConfiguration") {
    getWebhooks();
  }

  if (!webhooksConfig) {
    return;
  }

  webhooksConfig.forEach((wh) => {
    switch (wh.action) {
      case "DrawFileChange":
        if (action === "drawFileChange") {
          drawFileUpdate(wh, payload);
        }
        break;
      case "DrawFileAdd":
        if (action === "drawFileAdd") {
          drawFileUpdate(wh, payload);
        }
        break;
      case "DrawFileDelete":
        if (action === "drawFileDelete") {
          drawFileDelete(wh, payload);
        }
        break;
    }
  });
}

function drawFileUpdate(webhook, payload) {
  var file_id = payload.id;
  var data = {
    body: {
      id: payload.id,
      quick_published: false,
      published: false,
    },
    user: payload.res.req.user,
    session: {
      user: payload.res.req.user,
    },
  };

  var response = {};
  response.send = function (res) {
    var webhookHeader = JSON.parse(webhook.header);
    var webhookBody = JSON.parse(webhook.body);
    var file_name = res.body?.file[0]?.file_name || null;
    var geojson = res.body.geojson;

    const injectableVariables = {
      file_id,
      file_name,
      geojson,
    };

    // Build the body
    buildBody(webhookBody, injectableVariables);

    // Build the url
    var url = buildUrl(webhook.url, injectableVariables);

    // Push to the remote webhook
    pushToRemote(url, webhook.type, webhookHeader, webhookBody);
  };

  getfile(data, response);
}

function buildBody(webhookBody, injectableVariables) {
  // Fill in the body
  for (var i in webhookBody) {
    var match = INJECT_REGEX.exec(webhookBody[i]);
    // Match for curly braces. If the value contains no curly braces, assume the value is hardcoded so leave the value as is
    if (match) {
      var variable = match[1];
      if (!injectableVariables[variable]) {
        logger(
          "error",
          "The variable '" + variable + "' is not an injectable variable",
          "Webhooks",
          null,
          "The variable '" + variable + "' is not an injectable variable"
        );
      }
      webhookBody[i] = injectableVariables[variable];
    }
  }
}

function drawFileDelete(webhook, payload) {
  var file_id = payload.id;
  var data = {
    body: {
      id: payload.id,
      quick_published: false,
      published: false,
    },
    user: payload.res.req.user,
    session: {
      user: payload.res.req.user,
    },
  };

  var response = {};
  response.send = function (res) {
    var webhookHeader = JSON.parse(webhook.header);
    var geojson = res.body.geojson;
    var file_name = res.body?.file[0]?.file_name || null;

    const injectableVariables = {
      file_id,
      file_name,
      geojson,
    };

    // Build the url
    var url = buildUrl(webhook.url, injectableVariables);

    // Push to the remote webhook
    pushToRemote(url, webhook.type, webhookHeader, {});
  };

  getfile(data, response);
}

function buildUrl(url, injectableVariables) {
  var updatedUrl = url;
  var match;
  while (null !== (match = INJECT_REGEX.exec(updatedUrl))) {
    var variable = match[1];
    if (!injectableVariables[variable]) {
      logger(
        "error",
        "The variable '" + variable + "' is not an injectable variable",
        "Webhooks",
        null,
        "The variable '" + variable + "' is not an injectable variable"
      );
    }

    // Stringify if the injectable variable is an object
    var newVariable = injectableVariables[variable];
    if (typeof newVariable === "object" && newVariable !== null) {
      newVariable = JSON.stringify(newVariable);
    }

    updatedUrl = updatedUrl.replace(match[0], newVariable);
  }
  return updatedUrl;
}

function pushToRemote(url, type, header, body) {
  fetch(url, {
    method: type,
    headers: header,
    body: JSON.stringify(body),
  })
    .then((res) => {
      if (!res.ok) {
        return res.text().then((text) => {
          throw new Error(text);
        });
      } else {
        return res.json();
      }
    })
    .then((json) => {
      if (json.status == "success") {
        logger("info", "Successful webhook call to " + url, "TriggerWebhooks");
      }
    })
    .catch(function (err) {
      logger(
        "error",
        "Failed webhook call to " + url,
        "TriggerWebhooks",
        null,
        err
      );
      return null;
    });
}

module.exports = triggerWebhooks;

const files = require("./files");
const getfile = files.getfile;
