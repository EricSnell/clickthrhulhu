const testInput = `<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!--[if !mso]><!-->
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <!--<![endif]-->
  <title></title>
  <style type="text/css">
    #hello {font-size: 38px;}
    #red {color: red;}
  </style>
  </head>
  <body>
    <div id='hello'>Hello</div>
    <!--container-->
    <table>
    <tr><td>
    <a id="red" rilt="some_coupon" href="coupon.html" style="color:red;" >coupon page</a>
    <a rilt="some_link" href="\${clickthrough('some_link','utm_term=some_link','EMAIL_SHA256_HASH_','DWID')}">joann homepage</a>
    <a rilt="other_link1" href="https://www.joann.com">creativebug</a>
    <!-- module 11 -->
    <a rilt="other_link2" href="someplace.com" >creativebug</a>
    <!-- module 3 -->
    <a rilt="other_link3" href="anotherplace.com">creativebug</a>
    <!-- module 11 -->
    <a rilt="other_link4" href="whatplace.com">creativebug</a>
    <!-- module 11 -->
  <a rilt="other_link5" href="whatplace.com/cpn=sup">creativebug & ®' &reg; &ndash; - ¢ &cent;</a>
    </td></tr></table>
    <!--/container-->
  </body>
  </html>`;

export default testInput;
