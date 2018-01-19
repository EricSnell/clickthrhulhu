
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

    run() {
      const input = this.$code.getValue();
      this.setState();
      if (input) {
        this.showLoader();
        const output = this.generateOutput();
        setTimeout(this.showResults.bind(this, output), 2200);
      } else {
        this.showError('Need some HTML first!');
      }
    },

    generateOutput() {
      const parser = new DOMParser();
      const doc = parser.parseFromString(this.state.html, 'text/html');
      const anchorNodes = doc.querySelectorAll('a[rilt]');
      const clickthroughNodes = doc.querySelectorAll('a[href*="${clickthrough"]');
      const anchors = Array.from(anchorNodes);
      const clickthroughs = Array.from(clickthroughNodes);
      const html = doc.documentElement.outerHTML;
      const output = this.addEntities(html);

      if (anchors.length) {
        this.update(anchors);
      } else {
        this.showError('No RILT Anchors Found');
      }

      if (clickthroughs.length) {
        this.find('Webview', clickthroughs, true, this.update.bind(this));
        this.find('Btm_Nav_Coupon', clickthroughs, true, this.update.bind(this));
      }

      return output;
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
      let clickthrough = "${clickthrough('" + name + "','utm_term=" + name + "'";
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
  };

  app.init();
}());


/* test input

  <!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"
  "http://www.w3.org/TR/html4/loose.dtd">
  <html><head></head><body><a rilt="Anchor01" href="${clickthrough('Anchor01','utm_term=Anchor01','BARCODE1='+BARCODE1,'BARCODE2='+BARCODE2,'BARCODE3='+BARCODE3,'BARCODE4='+BARCODE4,'BARCODE5='+BARCODE5,'BARCODE6='+BARCODE6,'ONLINECODE1','ONLINECODE2','A','B','C','D','E','GS_BARCODE','PROMOCODE','VERSION','EMAIL_VERSION','DISC','TESTGROUP','CONTACTS_LIST.EMAIL_ADDRESS_')}">Link</a>
  <a rilt="Anchor02" href="coupon.html">&reg;</a>
  <a rilt="Anchor03" href="${clickthrough('Anchor03','utm_term=Anchor03')}">&trade;</a>
  <a rilt="Anchor04" href="https://www.somewhere.com">&Prime;</a>
  <a href="${clickthrough('Webview','utm_term=Webview')}">Link</a>
  <a href="${clickthrough('Btm_Nav_Coupon','utm_term=Btm_Nav_Coupon')}">Link</a></body></html>

*/
