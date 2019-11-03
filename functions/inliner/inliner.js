const fetch = require('node-fetch');

const API_ENDPOINT = 'https://www.campaignmonitor.com/forms/inliner/';

// Docs on event and context https://www.netlify.com/docs/functions/#the-handler-method
exports.handler = async (event, context) => {
  const html = event.body;

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 200,
      body: JSON.stringify({ msg: 'THIS WAS NOT A POST REQUEST' })
    }
  }

  try {
    return fetch(API_ENDPOINT, {
      method: 'POST',
      body: `code=${encodeURIComponent(html)}`,
      headers: {
        'Content-type': 'application/x-www-form-urlencoded',
      },
    })
      .then(res => res.json())
      .then(data => ({
        statusCode: 200,
        body: JSON.stringify(data),
      }))
  } catch (err) {
    return { statusCode: 500, body: err.toString() }
  }
}
