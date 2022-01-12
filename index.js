const request = require('request');
const AWS = require('aws-sdk');

const shopid = 603028193;

const cookieWL = '';
const cookieGL = '';

let cookie;

const sendSNS = (cb) => {
  const sns = new AWS.SNS();
  sns.publish({
    Message: `https://shopee.sg/product/${shopid}/${itemid}`,
    Subject: `Ticket Available`,
    TopicArn: 'arn:aws:sns:ap-southeast-1:xxxxxx:test-ses'
  }, cb);
};

const searchItem = (title, titleEncoded) => {
  return new Promise((resolve, reject) => {
    console.log(`looking for item ${titleEncoded}`);
    request({
      url: `https://shopee.sg/api/v4/search/search_items?by=relevancy&keyword=${titleEncoded}&limit=60&newest=0&order=desc&page_type=search&scenario=PAGE_GLOBAL_SEARCH&version=2`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8'
      },
      json: true
    }, (error, response, body) => {
      if (error) {
        return reject(error);
      }
      if (body && body.items) {
        const items = body.items;
        for (const item of items) {
          if (item.item_basic.name.includes(title)) {
            return resolve(item.item_basic.itemid);
          }
        }
      }
      return resolve();
    });
  });
}

const searchShop = (title) => {
  return new Promise((resolve, reject) => {
    console.log(`looking for item ${title} - avail`);
    request({
      url: `https://shopee.sg/api/v4/search/search_items?by=latest&limit=100&match_id=${shopid}&order=desc&page_type=shop&scenario=PAGE_OTHERS&version=2`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8'
      },
      json: true
    }, (error, response, body) => {
      if (error) {
        return reject(error);
      }
      if (body && body.items) {
        const items = body.items;
        for (const item of items) {
          if (item.item_basic.name.includes(title)) {
            return resolve(item.item_basic.itemid);
          }
        }
      }
      return resolve();
    });
  });
}

const searchSold = (title) => {
  return new Promise((resolve, reject) => {
    console.log(`looking for item ${title} - sold`);
    request({
      url: `https://shopee.sg/api/v4/search/search_items?by=latest&limit=100&match_id=${shopid}&only_soldout=1&order=desc&page_type=shop&scenario=PAGE_OTHERS&version=2`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8'
      },
      json: true
    }, (error, response, body) => {
      if (error) {
        return reject(error);
      }
      if (body && body.items) {
        const items = body.items;
        for (const item of items) {
          if (item.item_basic.name.includes(title)) {
            return resolve(item.item_basic.itemid);
          }
        }
      }
      return resolve();
    });
  });
}

const addToCart = (itemid, modelid) => {
  request({
    url: 'https://shopee.sg/api/v4/cart/add_to_cart',
    method: 'POST',
    headers: {
      "content-type": "application/json",
      "cookie": cookie
    },
    body: JSON.stringify({
      "quantity":1,
      "checkout":true,
      "update_checkout_only":false,
      "donot_add_quantity":false,
      "source":"{\"refer_urls\":[]}",
      "client_source":1,
      "shopid":shopid,
      "itemid":itemid,
      "modelid":modelid
    })
  }, (error, response, body) => {
    if (error) {
      console.error(error);
    }
    console.log(body);
  });
};

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// exports.handler = (event) => {
(async () => {
  let date, itemid = 0, title, titleEncoded;

  const argv = process.argv.slice(2);
  if (argv[0] == 'gl') {
    cookie = cookieGL;
  } else {
    cookie = cookieWL;
  }
  if (isNaN(argv[2])) {
    date = argv[2];
    if (argv[1] == 'my') {
      title = `Transtar VTL Land Bus Service (${date}) - Malaysia to Singapore`;
      titleEncoded = `transtar%20vtl%20land%20bus%20service%20(${encodeURI(date.toLowerCase())})%20-%20malaysia%20to%20singapore`;
    } else {
      title = `Transtar VTL Land Bus Service (${date}) - Singapore to Malaysia`;
      titleEncoded = `transtar%20vtl%20land%20bus%20service%20(${encodeURI(date.toLowerCase())})%20-%20singapore%20to%20malaysia`;
    }
  } else {
    itemid = parseInt(argv[2]);
  }

  while(itemid == 0) {
    await Promise.all([
      searchItem(title, titleEncoded),
      searchShop(title),
      searchSold(title)
    ]).then((itemids) => {
      for (const id of itemids) {
        if (id) {
          itemid = id;
          console.log(itemid);
          break;
        }
      };
    }).catch((err) => {
      console.error(err);
    });
    await sleep(500);
  }

  while(true) {
    request({
      url: `https://shopee.sg/api/v4/item/get?itemid=${itemid}&shopid=${shopid}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8'
      },
      json: true
    }, (error, response, body) => {
      if (error) {
        console.error(error);
      }
      if (body && body.data) {
        console.log(`${(date) ? date : body.data.name} - ${itemid} - ${body.data.item_status} - ${body.data.historical_sold}`);
        const models = body.data.models;
        for (const model of models) {
          if (model.stock > 0 && !model.name.includes("Child")) {
            addToCart(itemid, model.modelid);
          }
        }
      }
    });
    await sleep(500);
  }
})();
// }