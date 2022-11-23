var fetch = require("node-fetch");
var FormData = require("form-data");
require('dotenv').config();
var config = {
  tenant_id: process.env.AAD_TENANT_ID,
  client_id: process.env.AAD_CLIENT_ID,
  client_secret: process.env.AAD_CLIENT_SECRET,
  ragic_url: process.env.RAGIC_URL,
  ragic_key: process.env.RAGIC_KEY
};

(async () => {
  var token = await getAadToken();
  var aad_users = await getAadUsers(token);
  var ragic_users = await getRagicUsers();
  var ragic_users_mail = ragic_users.map((v) => v["E-mail"]);
  for (var data of aad_users) {
    Object.keys(data).forEach(function (key, index) {
      if (this[key] == null) this[key] = "";
    }, data);

    var mail = data["userPrincipalName"];
    if (mail.endsWith("onmicrosoft.com")) {
      continue;
    }

    if (ragic_users_mail.includes(mail)) {
      var id = getUserId(mail, ragic_users);
      updateUser(data, id);
    } else {
      createUser(data);
    }
    await sleep(100);
  }

})();

async function getAadToken() {
  var url = `https://login.microsoftonline.com/${config.tenant_id}/oauth2/v2.0/token`;
  var headers = {
    "content-type": "application/x-www-form-urlencoded",
  };
  var data = {
    client_id: config.client_id,
    client_secret: config.client_secret,
    grant_type: "client_credentials",
    scope: "https://graph.microsoft.com/.default",
  };

  var response = await fetch(url, {
    method: "POST",
    headers: headers,
    body: new URLSearchParams(data).toString(),
  });
  var json = await response.json();
  var result = json["access_token"];
  console.log("✅ Get AAD token success");
  return result;
}

async function getAadUsers(token) {
  var url =
    "https://graph.microsoft.com/v1.0/users?$select=displayname,userPrincipalName,companyName,department,officeLocation,jobTitle&$top=999";
  var headers = {
    Authorization: `Bearer ${token}`,
  };

  var response = await fetch(url, {
    headers: headers,
  });
  var json = await response.json();
  var result = json["value"];
  console.log("✅ Get AAD users success");
  return result;
}

async function getRagicUsers() {
  var url = `${config.ragic_url}/default/ragic-setup/1`;
  var headers = {
    Authorization: `Basic ${config.ragic_key}`,
  };

  var response = await fetch(url, {
    headers: headers,
  });
  var json = await response.json();
  var result = Object.values(json);
  console.log("✅ Get Ragic users success");
  return result;
}

function createUser(data) {
  var url = `${config.ragic_url}/default/ragic-setup/1`;
  var headers = {
    Authorization: `Basic ${config.ragic_key}`,
  };
  var data = {
    1: data["userPrincipalName"],
    3: "AADUser",
    4: data["displayName"],
    31: "NORMAL",
    609: data["jobTitle"],
    610: data["companyName"],
    611: data["department"],
    612: data["officeLocation"],
  };

  fetch(url, {
    method: "POST",
    headers: headers,
    body: objToForm(data),
  })
    .then((resp) => resp.json())
    .then((resp) => console.log(resp.status + ": " + resp.rv));
}

function updateUser(data, id) {
  var url = `${config.ragic_url}/default/ragic-setup/1/${id}`;
  var headers = {
    Authorization: `Basic ${config.ragic_key}`,
    'Content-Type': 'application/json'
  };
  var data = {
    4: data["displayName"],
    609: data["jobTitle"],
    610: data["companyName"],
    611: data["department"],
    612: data["officeLocation"],
  };

  fetch(url, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(data),
  })
    .then((resp) => resp.json())
    .then((resp) => console.log(resp.status + ": " + resp.rv));
}

function objToForm(obj) {
  var formData = new FormData();
  for (const [key, value] of Object.entries(obj)) {
    formData.append(key, value);
  }
  return formData;
}

function getUserId(mail, list) {
  var find = list.filter((i) => i["E-mail"] == mail).map((i) => i["_ragicId"]);
  return find[0];
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
