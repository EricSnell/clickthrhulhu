const fetch = require('node-fetch');

const CM_API_ENDPOINT = 'https://www.campaignmonitor.com/marketing-includes/forms/inliner/';
const LT_API_ENDPOINT = 'https://putsmail.com/inliner';

// Docs on event and context https://www.netlify.com/docs/functions/#the-handler-method
exports.handler = async (event, context) => {
  const html = event.body;
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 200,
      body: JSON.stringify({ msg: 'THIS WAS NOT A POST REQUEST' })
    };
  }

  try {
    return fetch(CM_API_ENDPOINT, {
      method: 'POST',
      body: `code=${encodeURIComponent(html)}`,
      headers: {
        'Content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
    })
      .then((res) => {
        if (res.status == 403) {
          throw (new Error('Campaign Monitor Authorization Error'));
        } else if (res.status >= 500 && res.status < 600) {
          throw (new Error('Campaign Monitor is down'))
        } else {
          return res.json();
        }
      })
      .then(data => ({
        statusCode: 200,
        body: JSON.stringify(data),
      }))
      .catch(err => ({
        statusCode: 403,
        body: err.toString()
      }));
  } catch (err) {
    return { statusCode: 500, body: err.toString() };
  }
};
