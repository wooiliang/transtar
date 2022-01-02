const request = require('request');
const AWS = require('aws-sdk');

const shopid = 603028193;
const itemid = 10679227021;

const sendSNS = (cb) => {
  const sns = new AWS.SNS();
  sns.publish({
    Message: `https://shopee.sg/product/${shopid}/${itemid}`,
    Subject: `Ticket Available`,
    TopicArn: 'arn:aws:sns:ap-southeast-1:xxxxxx:test-ses'
  }, cb);
};

const addToCart = (modelid) => {
  request({
    url: 'https://shopee.sg/api/v4/cart/add_to_cart',
    method: 'POST',
    headers: {
      "content-type": "application/json",
      "cookie": 'xxxxxx'
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
    console.log(`${body.data.item_status} - ${body.data.historical_sold}`);
    const models = body.data.models;
    for (const model of models) {
      // console.log(model);
      if (model.stock > 0 && !model.name.includes("Child")) {
        addToCart(model.modelid);
        // sendSNS((err) => {
        //   if (err) {
        //     console.error(err);
        //   } else {
        //     console.log('Email sent.')
        //   }
        // });
        process.exit(0);
      }
    }
  });
  await sleep(500);
}
})();
// }