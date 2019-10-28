
(function App() {
  const app = {
    state: {
      html: null,
      barcodes: null,
      promocodes: null,
      variables: [],
    },
    init() {
      this.cacheDOM();
      this.bindEvents();
      this.reset();
    },
    cacheDOM() {
      this.$code = CodeMirror.fromTextArea(document.getElementById('code'), {
        lineNumbers: true,
        mode: 'htmlmixed',
        theme: 'material',
        indentWithTabs: true,
        fixedGutter: true,
        coverGutterNextToScrollbar: true,
        showCursorWhenSelecting: true,
        allowDropFileTypes: ['.htm', '.html', '.htmls', '.htt', '.htx', 'shtml'],
        autoCloseBrackets: true,
        autoCloseTags: true,
        lineWrapping: true,
        autoFocus: true,
      });
      [this.$codeMirror] = document.getElementsByClassName('CodeMirror');
      this.$app = document.getElementById('app');
      this.$btn = document.getElementById('btn--go');
      this.$loader = document.getElementById('loader');
      this.$resetBtn = document.getElementById('btn--reset');
      this.$options = document.getElementById('options__inner');
      this.$barcodes = document.getElementById('options__barcodes-dropdown');
      this.$promocodes = document.getElementById('options__promocodes-dropdown');
      this.$vars = document.getElementById('options__variables-input');
      this.$logo = Array.from(document.getElementsByClassName('cthulhu'));
    },

    bindEvents() {
      this.$btn.addEventListener('click', this.run.bind(this));
      this.$resetBtn.addEventListener('click', this.reset.bind(this));
    },

    setState() {
      this.state = Object.assign({}, {
        html: this.$code.getValue(),
        barcodes: this.$barcodes.value,
        promocodes: this.$promocodes.value,
        variables: this.$vars.value ?
          this.$vars.value.toUpperCase().replace(/ /g, '').split(',')
          : [],
      });
      this.addCommonVars();
    },

    addCommonVars() {
      this.state = Object.assign(this.state, {
        variables: [
          'GS_BARCODE',
          'PROMOCODE',
          'VERSION',
          'EMAIL_VERSION',
          'DISC',
          'TESTGROUP',
          'CONTACTS_LIST.EMAIL_ADDRESS_',
          'ENDDATE',
        ].concat(this.state.variables),
      });
    },

    async run() {
      const input = this.$code.getValue();
      this.setState();
      if (input) {
        this.showLoader();
        const output = await this.generateOutput();
        console.log(output);
        setTimeout(this.showResults.bind(this, output), 2200);
      } else {
        this.showError('Need some HTML first!');
      }
    },

    async generateOutput() {
      const parser = new DOMParser();
      const doc = parser.parseFromString(this.state.html, 'text/html');
      const anchorNodes = doc.querySelectorAll('a[rilt]');
      const clickthroughNodes = doc.querySelectorAll('a[href*="${clickthrough"]');
      const anchors = Array.from(anchorNodes);
      const clickthroughs = Array.from(clickthroughNodes);

      if (anchors.length) {
        this.update(anchors);
      } else {
        this.showError('No RILT Anchors Found');
      }

      if (clickthroughs.length) {
        this.find('Webview', clickthroughs, true, this.update.bind(this));
        this.find('Btm_Nav_Coupon', clickthroughs, true, this.update.bind(this));
      }

      const html = doc.documentElement.outerHTML;
      const html_cleaned = this.addEntities(html);
      const inlinedCSS = await this.inlineCSS(html_cleaned);
      console.log('INLINED:', inlinedCSS);
      return inlinedCSS;
    },

    find(name, loc, coupon = false, callback) {
      const itemArr = loc.filter((anchor) => {
        const href = anchor.getAttribute('href');
        return href.includes(name);
      });
      callback(itemArr, name, coupon);
    },

    update(arr, name = null, coupon = false) {
      arr.forEach((anchor) => {
        const anchorName = anchor.getAttribute('rilt') || name;
        const href = anchor.getAttribute('href');
        const isCoupon = href.includes('coupon.html') ||
          href.includes('\'BARCODE1=\'+BARCODE1') ||
          coupon;

        if (isCoupon) {
          const couponClickthrough = this.createClickthrough(anchorName, href, true);
          anchor.setAttribute('href', couponClickthrough);
        } else {
          const clickthrough = this.createClickthrough(anchorName, href);
          anchor.setAttribute('href', clickthrough);
        }
      });
    },

    createClickthrough(name, href, coupon = false) {
      const utmTerm = `utm_term=${name}`;
      let clickthrough = `\${clickthrough('${name}','${utmTerm}`;
      if (coupon) {
        const barcodes = this.barcodeString();
        const promocodes = this.promocodeString();
        const variables = this.varString();

        clickthrough += barcodes + promocodes + variables;
      }
      clickthrough += ')}';
      return clickthrough;
    },

    varString() {
      let varStr = '';
      this.state.variables.forEach((i) => {
        varStr += `,'${i}'`;
      });
      return varStr;
    },

    promocodeString() {
      let promocodeStr = '';
      for (let i = 1; i <= this.state.promocodes; i += 1) {
        promocodeStr += `,'ONLINECODE${i}'`;
      }
      return promocodeStr;
    },

    barcodeString() {
      let barcodeStr = '';
      for (let i = 1; i <= this.state.barcodes; i += 1) {
        barcodeStr += `,'BARCODE${i}='+BARCODE${i}`;
      }
      return barcodeStr;
    },

    addEntities(html) {
      const entities = {
        '®': '&reg;',
        '™': '&trade;',
        '″': '&Prime;',
        '′': '&prime;',
        '–': '&ndash;',
        '•': '&bull;',
        '©': '&copy;',
        '—': '&#8212;',
        '¢': '&cent;',
      };
      const regex = new RegExp(Object.keys(entities).join('|'), 'g');
      return html.replace(regex, match => entities[match]);
    },

    showLoader() {
      this.$code.setValue('');
      this.$options.style.opacity = '0';
      this.$btn.style.opacity = '0';
      this.$btn.disabled = true;
      this.$codeMirror.style.opacity = '0.9';
      this.$loader.style.display = 'block';
    },

    showResults(result) {
      this.$codeMirror.style.opacity = '1';
      this.$loader.style.display = 'none';
      this.$btn.style.display = 'none';
      this.$code.setValue('');
      // this.$logo.forEach(path => path.style.fill = "#02a356");
      this.$resetBtn.style.display = 'block';
      this.$code.setValue(result);
      this.$code.focus();
    },

    reset() {
      this.$resetBtn.style.display = 'none';
      this.$options.style.opacity = '1';
      this.$logo.forEach((path) => {
        path.style.fill = '#333333';
      });
      this.$code.setValue('');
      this.$btn.style.display = 'block';
      this.$btn.style.opacity = '1';
      this.$btn.disabled = false;
    },

    showError(msg) {
      alert(msg);
    },

    async inlineCSS(html) {
      const res = await fetch('/.netlify/functions/inliner/inliner.js', { method: 'POST', body: html });
      const stuff = await res.text();
      return JSON.parse(stuff)['HTML'];
    }
  };


  app.init();
}());


/* test input
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><head>
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
</html>
*/

