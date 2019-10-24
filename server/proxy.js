const express = require('express');
const request = require('request');

const app = express();
const port = 3001;

const html = `<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<!--[if !mso]><!-->
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<!--<![endif]-->
<title></title>
<style type="text/css">
  #hello {font-size: 38px;}
  .dark { color: #000000; }
</style>
</head>
<body>
  <div id='hello' class="dark">Hello</div>
</body>
</html>`;
/*
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});
*/
app.get('/', (req, res) => {
  const url = 'https://www.campaignmonitor.com/forms/inliner/';
  const body = `code=${encodeURIComponent(html)}`;
  const options = {
    url,
    body,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  };

  request(options).pipe(res);
});

app.listen(port);
