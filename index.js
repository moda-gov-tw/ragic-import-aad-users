var fetch = require("node-fetch");
require('dotenv').config();
var config = {
  tenant_id: process.env.AAD_TENANT_ID,
  client_id: process.env.AAD_CLIENT_ID,
  client_secret: process.env.AAD_CLIENT_SECRET,
  ragic_url: process.env.RAGIC_URL,
  ragic_key: process.env.RAGIC_KEY,
  cf_id: process.env.CF_ID,
  cf_secret: process.env.CF_SECRET
};

(async () => {
  console.log(config);
  var token = await getAadToken();
  var aad_users = await getAadUsers(token);
  var ragic_users = await getRagicUsers();
  var add_users_same_name = aad_users.map((v) => v["displayName"]).filter((e, i, a) => a.indexOf(e) !== i);
  var ragic_users_mail = ragic_users.map((v) => v["E-mail"]);
  var suspend_users = ragic_users.filter((v) => v["Ragic Groups"].includes("AADUser")).map((v) => v["E-mail"]);
  for (var data of aad_users) {
    Object.keys(data).forEach(function (key) {
      if (this[key] == null) this[key] = "";
    }, data);

    var mail = data["userPrincipalName"];
    if (mail.endsWith("onmicrosoft.com")) {
      continue;
    }

    var same_name = add_users_same_name.includes(data["displayName"]);
    if (ragic_users_mail.includes(mail)) {
      var id = getUserId(mail, ragic_users);
      updateUser(data, id, same_name);
    } else {
      createUser(data, same_name);
    }

    suspend_users = suspend_users.filter(i => i !== mail);
    await sleep(100);
  }

  for (var mail of suspend_users) {
    var id = getUserId(mail, ragic_users);
    suspendUser(id, mail);
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

function createUser(data, same) {
  var url = `${config.ragic_url}/default/ragic-setup/1`;
  var headers = {
    Authorization: `Basic ${config.ragic_key}`,
    'Content-Type': 'application/json',
    'CF-Access-Client-Id': config.cf_id,
    'CF-Access-Client-Secret': config.cf_secret
  };
  var body = {
    1: data["userPrincipalName"],
    3: ["AADUser", data["companyName"], data["companyName"] + data["department"]],
    4: data["companyName"] + data["department"] + " " + data["displayName"],
    1001998: data["displayName"],
    31: "NORMAL",
    609: data["jobTitle"],
    610: data["companyName"],
    611: data["department"],
    612: data["officeLocation"],
  };

  fetch(url, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(body),
  })
    .then((resp) => resp.json())
    .then((resp) => {
      if (resp.status == "SUCCESS") {
        console.log("✅ Create " + data["userPrincipalName"]);
      }
      else {
        console.log("❌ Create " + data["userPrincipalName"]);
        console.log(resp);
      }
    })
    .catch((error) => {
      console.log("❌ Create " + data["userPrincipalName"]);
      console.error(error);
    });
}

function updateUser(data, id, same) {
  var url = `${config.ragic_url}/default/ragic-setup/1/${id}`;
  var headers = {
    Authorization: `Basic ${config.ragic_key}`,
    'Content-Type': 'application/json',
    'CF-Access-Client-Id': config.cf_id,
    'CF-Access-Client-Secret': config.cf_secret
  };
  var body = {
    4: data["companyName"] + data["department"] + " " + data["displayName"],
    1001998: data["displayName"],
    609: data["jobTitle"],
    610: data["companyName"],
    611: data["department"],
    612: data["officeLocation"],
  };

  fetch(url, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(body),
  })
    .then((resp) => resp.json())
    .then((resp) => {
      if (resp.status == "SUCCESS") {
        console.log("✅ Update " + data["userPrincipalName"]);
      }
      else {
        console.log("❌ Update " + data["userPrincipalName"]);
        console.log(resp);
      }
    })
    .catch((error) => {
      console.log("❌ Update " + data["userPrincipalName"]);
      console.error(error);
    });
}

function suspendUser(id, mail) {
  var url = `${config.ragic_url}/default/ragic-setup/1/${id}`;
  var headers = {
    Authorization: `Basic ${config.ragic_key}`,
    'Content-Type': 'application/json',
    'CF-Access-Client-Id': config.cf_id,
    'CF-Access-Client-Secret': config.cf_secret
  };
  var body = {
    31: "SUSPENDED",
  };

  fetch(url, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(body),
  })
    .then((resp) => resp.json())
    .then((resp) => {
      if (resp.status == "SUCCESS") {
        console.log("✅ Suspend " + mail);
      }
      else {
        console.log("❌ Suspend " + mail);
        console.log(resp);
      }
    })
    .catch((error) => {
      console.log("❌ Suspend " + mail);
      console.error(error);
    });
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
