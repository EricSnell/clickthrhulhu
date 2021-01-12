/* eslint-disable prefer-const */
import codeMirrorConfig from './codemirror-config.mjs';
import linkCategories from './link-categories.mjs';
import appConfig from './app-config.mjs';

(function main() {
  const App = {

    codeMirrorConfig,

    state: {
      html: null,
      barcodes: null,
      variables: [],
    },

    init() {
      this.cacheDOM();
      this.bindEvents();
      this.reset();
    },

    cacheDOM() {
      // eslint-disable-next-line no-undef
      this.$code = CodeMirror.fromTextArea(document.getElementById('code'), this.codeMirrorConfig);
      [this.$codeMirror] = document.getElementsByClassName('CodeMirror');
      this.$app = document.getElementById('app-input');
      this.$btn = document.getElementById('btn');
      this.$loader = document.getElementById('loader');
      this.$resetBtn = document.getElementById('reset-btn');
      this.$options = document.getElementById('options-inner');
      this.$barcodes = document.getElementById('barcodes-dropdown');
      this.$vars = document.getElementById('variables-input');
      this.$logo = Array.from(document.getElementsByClassName('cthulhu'));
      this.$form = document.getElementById('code-form');
      this.$trackingParamsList = document.getElementById('settings-menu_trackinglist');
      this.$variableList = document.getElementById('settings-menu_variablelist');
      this.$addVarBtn = document.getElementById('btn_add-variable');
      this.$addTrackingBtn = document.getElementById('btn_add-tracking');
      this.$variableInput = document.getElementById('settings-menu_variableinput');
      this.$trackingInput = document.getElementById('settings-menu_trackinginput');
    },

    bindEvents() {
      this.$btn.addEventListener('click', this.run.bind(this));
      this.$resetBtn.addEventListener('click', this.reset.bind(this));
      this.$addVarBtn.addEventListener('click', this.addVariable.bind(this));
      this.$addTrackingBtn.addEventListener('click', this.addTracking.bind(this));
    },

    setInitialState() {
      this.state = Object.assign({}, {
        html: this.$code.getValue(),
        barcodes: this.$barcodes.value,
        variables: this.$vars.value ?
          [...this.$vars.value.toUpperCase().replace(/ /g, '').split(','), ...this.state.variables]
          : [...this.state.variables],
      });
    },

    addCommonVars() {
      this.state = Object.assign(this.state, {
        variables: [
          ...appConfig.variables,
          ...this.state.variables,
        ],
      });
    },

    async run() {
      if (this.validateInput()) {
        this.setInitialState();
        this.showLoader();
        let result = await this.generateOutput(this.state.html);
        setTimeout(this.showResults.bind(this, result));
      } else {
        this.showError('Need some HTML first!');
      }
    },

    validateInput() {
      let input = this.$code.getValue();
      return input;
    },

    createDOM(htmlString) {
      let parser = new DOMParser();
      let dom = parser.parseFromString(htmlString, 'text/html');
      return dom;
    },

    extract(dom, elm) {
      return [...dom.querySelectorAll(elm)];
    },

    stringAll(arr) {
      return arr.map(i => `'${i}'`);
    },

    assignLinkProperties(a) {
      // eslint-disable-next-line object-curly-newline
      let { branch, deeplinkUrlExclusions, supplementalVars, couponForm } = appConfig;
      let url = a.getAttribute('href') || '#';
      let branchedUrl = `${branch}${encodeURIComponent(url)}`;
      let isCouponLink = url.includes('coupon.html');
      let urlContainsExclusion = deeplinkUrlExclusions.some(excl => url.includes(excl));
      let formData = [...this.state.variables, ...supplementalVars];
      let deeplink = !isCouponLink && !urlContainsExclusion && url.includes('joann.com');
      let formLink = `\${form('${couponForm}',${[...this.stringAll(formData)]})}`;
      // eslint-disable-next-line no-nested-ternary
      let linkUrl = deeplink ? branchedUrl : isCouponLink ? formLink : url;

      return {
        LINK_NAME: a.getAttribute('rilt'),
        LINK_URL: linkUrl,
        LINK_CATEGORY: this.getLinkCategory(url),
        IOS_LINK_URL: deeplink ? linkUrl : null,
        ANDROID_LINK_URL: deeplink ? linkUrl : null,
      };
    },

    downloadCSV(tableData, name) {
      let config = { quotes: true };
      // eslint-disable-next-line no-undef
      let csv = Papa.unparse(tableData, config);
      let blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      let filename = `${name}_${new Date().toDateString().replace(/ /g, '_')}`;
      let link = document.createElement('a');
      let url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },

    createLinkTableData(arr) {
      let linkTableData = arr.map(this.assignLinkProperties.bind(this));
      let dedupedLinkTableData = linkTableData.reduce((acc, curr) => {
        if (!acc.find(({ LINK_NAME }) => LINK_NAME === curr.LINK_NAME)) {
          acc.push(curr);
        }
        return acc;
      }, []);
      return dedupedLinkTableData;
    },

    async generateOutput(input) {
      let doc = this.createDOM(input);
      let rilts = this.extract(doc, 'a[rilt]');
      let clickthroughs = this.extract(doc, 'a[href*="${clickthrough"]');
      let html;

      if (rilts.length) {
        let linkTableData = this.createLinkTableData(rilts);
        this.downloadCSV(linkTableData, 'LinkTable');
        this.update(rilts);
      } else {
        this.showError('No RILT Anchors Found');
      }

      if (clickthroughs.length) {
        this.find('Webview', clickthroughs, true, this.update.bind(this));
        this.find('Btm_Nav_Coupon', clickthroughs, true, this.update.bind(this));
      }

      html = await this.inlineCSS(doc.documentElement.outerHTML);
      return this.addEntities(html);
    },

    getLinkCategory(url) {
      // eslint-disable-next-line no-restricted-syntax
      for (let i in linkCategories) {
        if (url.includes(i)) return linkCategories[i];
      }
      return null;
    },

    find(name, loc, coupon = false, callback) {
      let itemArr = loc.filter((anchor) => {
        let href = anchor.getAttribute('href');
        return href.includes(name);
      });
      callback(itemArr, name, coupon);
    },

    update(arr, name = null, coupon = false) {
      arr.forEach((anchor) => {
        let linkName = anchor.getAttribute('rilt') || name;
        let url = anchor.getAttribute('href') || '#';
        let isCoupon = (url.includes('coupon') && url.includes('.html')) ||
          url.includes('BARCODE1=') ||
          coupon;
        let clickthrough = this.createClickthrough(linkName, isCoupon);
        anchor.setAttribute('href', clickthrough);
      });
    },

    createClickthrough(linkName, form = false) {
      let { supplementalVars } = appConfig;
      let trackingParams = [
        `utm_term=${linkName}`,
        'EMAIL_SHA256_HASH_',
        'DWID',
      ];
      let suppData = [];

      if (form) {
        suppData.push(...supplementalVars.map(i => `'${i}='+${i}`));
        trackingParams.push(...this.state.variables);
      }

      return `\${clickthrough('${linkName}',${[...this.stringAll(trackingParams), ...suppData]})}`;
    },

    addEntities(html) {
      let entities = {
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
      let regex = new RegExp(Object.keys(entities).join('|'), 'g');
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
      this.$resetBtn.style.display = 'block';
      this.$code.setValue(result);
      this.$code.focus();
    },

    reset() {
      this.$resetBtn.style.display = 'none';
      this.$options.style.opacity = '1';
      this.$code.setValue('');
      this.$btn.style.display = 'block';
      this.$btn.style.opacity = '1';
      this.$btn.disabled = false;
    },

    addVariable() {
      let newVariable = this.$variableInput.value;
      if (!newVariable) return;
      this.state = Object.assign(this.state, {
        variables: [
          ...this.state.variables,
          newVariable,
        ],
      });
      this.$variableInput.value = '';
      this.addElement('li', newVariable, 'settings-menu_variablelist', this.$variableList);
    },

    addElement(type, text, className, parent) {
      let elm = document.createElement(type);
      elm.textContent = text;
      elm.classList = className;
      parent.appendChild(elm);
    },

    addTracking() {
      alert('adding tracking');
    },

    updateLocalStorage() {

    },

    showError(msg) {
      return alert(msg);
    },

    async inlineCSS(html) {
      let url = '/inliner';
      let res = await fetch(url, { method: 'POST', body: html });
      let stuff = await res.text();
      return JSON.parse(stuff).HTML;
    },

  };

  App.init();
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
  #red {color: red;}
</style>
</head>
<body>
  <div id='hello'>Hello</div>
  <!--container-->
  <table>
  <tr><td>
  <a id="red" rilt="some_coupon" href="coupon.html" style="color:red;" >coupon page</a>
  <a rilt="some_link" href="${clickthrough('some_link','utm_term=some_link','EMAIL_SHA256_HASH_','DWID')}">joann homepage</a>
  <a rilt="other_link1" href="that.com">creativebug</a>
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
</html>
*/
