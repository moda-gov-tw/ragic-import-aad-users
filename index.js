var fetch = require("node-fetch");
var FormData = require("form-data");
var config = require("./config");

(async () => {
  var token = await getAadToken();
  var aad_users = await getAadUsers(token);
  var ragic_users = await getRagicUsers();
  var ragic_users_mail = ragic_users.map((v) => v["E-mail"]);
  var fetch_list = [];
  for (var data of aad_users) {
    var mail = data["userPrincipalName"];
    if (mail.endsWith("onmicrosoft.com")) {
      continue;
    }

    if (ragic_users_mail.includes(mail)) {
      var id = getUserId(mail, ragic_users);
      fetch_list.push(updateUser(data, id));
    } else {
      fetch_list.push(createUser(data));
    }
  }

  Promise.all(
    fetch_list.map((i) =>
      fetch(i.url, i.option)
        .then((resp) => resp.json())
        .then((resp) => console.log(resp.status + ": " + resp.rv))
    )
  );
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
    1: data["userPrincipalName"] ?? "",
    3: "AADUser",
    4: data["displayName"] ?? "",
    31: "NORMAL",
    609: data["jobTitle"] ?? "",
    610: data["companyName"] ?? "",
    611: data["department"] ?? "",
    612: data["officeLocation"] ?? "",
  };

  return {
    url: url,
    option: {
      method: "POST",
      headers: headers,
      body: objToForm(data),
    },
  };
}

function updateUser(data, id) {
  var url = `${config.ragic_url}/default/ragic-setup/1/${id}`;
  var headers = {
    Authorization: `Basic ${config.ragic_key}`,
  };
  var data = {
    4: data["displayName"] ?? "",
    3: "AADUser",
    609: data["jobTitle"] ?? "",
    610: data["companyName"] ?? "",
    611: data["department"] ?? "",
    612: data["officeLocation"] ?? "",
  };
  return {
    url: url,
    option: {
      method: "POST",
      headers: headers,
      body: objToForm(data),
    },
  };
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
