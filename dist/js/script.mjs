import codeMirrorConfig from './codemirror-config.mjs';
import linkCategories from './link-categories.mjs';
import appConfig from './app-config.mjs';

(function main() {
  const app = {

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
      this.$code = CodeMirror.fromTextArea(document.getElementById('code'), this.codeMirrorConfig);
      [this.$codeMirror] = document.getElementsByClassName('CodeMirror');
      this.$app = document.getElementById('app-input');
      this.$btn = document.getElementById('btn');
      this.$loader = document.getElementById('loader');
      this.$resetBtn = document.getElementById('reset-btn');
      this.$options = document.getElementById('options-inner');
      this.$barcodes = document.getElementById('barcodes-dropdown');
      this.$vars = document.getElementById('variables-input');
      this.$crop = document.getElementById('crop-html-checkbox');
      this.$ai = document.getElementById('ai-checkbox');
      this.$logo = Array.from(document.getElementsByClassName('cthulhu'));
      this.$form = document.getElementById('code-form');
    },

    bindEvents() {
      this.$btn.addEventListener('click', this.run.bind(this));
      this.$resetBtn.addEventListener('click', this.reset.bind(this));
    },

    setInitialState() {
      this.state = Object.assign({}, {
        html: this.$code.getValue(),
        barcodes: this.$barcodes.value,
        variables: this.$vars.value ?
          this.$vars.value.toUpperCase().replace(/ /g, '').split(',')
          : [],
      });
      this.addCommonVars();
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
        const output = await this.generateOutput();
        setTimeout(this.showResults.bind(this, output));
      } else {
        this.showError('Need some HTML first!');
      }
    },

    validateInput() {
      const input = this.$code.getValue();
      return input;
    },

    createDOM(htmlString) {
      const parser = new DOMParser();
      const dom = parser.parseFromString(htmlString, 'text/html');
      return dom;
    },

    extractRILTs(dom) {
      return [...dom.querySelectorAll('a[rilt]')];
    },

    extractClickthrus(dom) {
      return [...dom.querySelectorAll('a[href*="${clickthrough"]')];
    },

    assignLinkProperties(a) {
      const url = a.getAttribute('href') || '#';
      const branchURL = `https://joann.app.link/3p?%243p=e_rs&%24original_url=${encodeURIComponent(url)}`;
      const isCouponLink = url.includes('coupon.html');
      const { deeplinkUrlExclusions } = appConfig;
      const urlContainsExclusion = deeplinkUrlExclusions.some(excl => url.includes(excl));
      const deeplink = !isCouponLink && !urlContainsExclusion && url.includes('joann.com');
      const formName = '!MASTER_COUPON_LP';
      const couponVars = [];
      let LINK_URL;
      let formLink;

      for (let i = 1; i <= this.state.barcodes; i += 1) {
        couponVars.push(`BARCODE${i}`);
      }

      formLink = `\${form(${formName},${[...this.state.variables, ...couponVars]})}`;
      LINK_URL = deeplink ? branchURL : isCouponLink ? formLink : url;

      return {
        LINK_NAME: a.getAttribute('rilt'),
        LINK_URL,
        LINK_CATEGORY: this.getLinkCategory(url),
        IOS_LINK_URL: deeplink ? LINK_URL : null,
        ANDROID_LINK_URL: deeplink ? LINK_URL : null,
      };
    },

    downloadCSV(tableData, name = 'LinkTable') {
      const config = { quotes: true };
      const csv = Papa.unparse(tableData, config);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const filename = `${name}_${new Date().toDateString().replace(/  /g, '_')}`;
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      // link.click();
      document.body.removeChild(link);
    },

    async generateOutput() {
      const doc = this.createDOM(this.state.html);
      const anchors = this.extractRILTs(doc);
      const clickthroughs = this.extractClickthrus(doc);
      let html;

      if (anchors.length) {
        const linkTableData = anchors
          .map(this.assignLinkProperties.bind(this))
          .reduce((acc, curr) => {
            if (!acc.find(({ LINK_NAME }) => LINK_NAME === curr.LINK_NAME)) {
              acc.push(curr);
            }
            return acc;
          }, []);

        this.downloadCSV(linkTableData);
        this.update(anchors);
      } else {
        this.showError('No RILT Anchors Found');
      }

      if (clickthroughs.length) {
        this.find('Webview', clickthroughs, true, this.update.bind(this));
        this.find('Btm_Nav_Coupon', clickthroughs, true, this.update.bind(this));
      }

      html = await this.inlineCSS(doc.documentElement.outerHTML);
      // html = this.$crop.checked ? this.trimHTML(html) : html;
      // html = this.$ai.checked ? this.addHTML(html) : html;
      return this.addEntities(html);
    },

    getLinkCategory(url) {
      // eslint-disable-next-line no-restricted-syntax
      for (const i in linkCategories) {
        if (url.includes(i)) return linkCategories[i];
      }
      return null;
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
        const linkName = anchor.getAttribute('rilt') || name;
        const href = anchor.getAttribute('href') || '#';
        const isCoupon = (href.includes('coupon') && href.includes('.html')) ||
          href.includes(`'BARCODE1='+BARCODE1`) ||
          coupon;

        if (isCoupon) {
          const couponClickthrough = this.createClickthrough(linkName, href, true);
          anchor.setAttribute('href', couponClickthrough);
        } else {
          const clickthrough = this.createClickthrough(linkName, href);
          anchor.setAttribute('href', clickthrough);
        }
      });
    },

    createClickthrough(linkName, href, coupon = false) {
      const trackingParams = [
        `'utm_term=${linkName}'`,
        "'EMAIL_SHA256_HASH_'",
        "'DWID'",
      ];
      if (coupon) {
        for (let i = 1; i <= this.state.barcodes; i += 1) {
          trackingParams.push(`'BARCODE${i}='+BARCODE${i}`);
        }
        this.state.variables.forEach(i => trackingParams.push(`'${i}'`));
      }
      return `\${clickthrough('${linkName}',${[...trackingParams]})}`;
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
      console.clear();
    },

    showError(msg) {
      return alert(msg);
    },

    async inlineCSS(html) {
      const url = '/inliner';
      const res = await fetch(url, { method: 'POST', body: html });
      const stuff = await res.text();
      return JSON.parse(stuff).HTML;
    },

    // BETTER IMPLEMENTATION IN PROGRESS FOR CROPPING + ADDING HTML
    trimHTML(html) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const treewalker = doc.createTreeWalker(
        doc.body,
        NodeFilter.SHOW_COMMENT,
        {
          acceptNode(node) {
            return node.nodeValue !== 'container' ? NodeFilter.FILTER_SKIP : NodeFilter.FILTER_ACCEPT;
          },
        },
        false,
      );
      treewalker.nextNode();
      return treewalker.currentNode.nextElementSibling.outerHTML;
    },

    addHTML(html) {
      const doc = this.createDOM(html);
      const arr = [];
      let result;
      let target;
      const { ai } = appConfig.html;
      const frag = doc.createRange().createContextualFragment(ai);
      const treewalker = doc.createTreeWalker(
        doc,
        NodeFilter.SHOW_COMMENT,
        {
          acceptNode(node) {
            return node.nodeValue.includes('module') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
          },
        },
        false,
      );

      do {
        arr.push(treewalker.currentNode);
      } while (treewalker.nextNode());
      arr.shift(); // removes body element from array
      arr.reverse(); // put coupon modules first
      for (let i = 0; i < arr.length; i += 1) {
        // if there is a coupon module, we want to check that it's the last one before injecting the AI module
        if (arr[i].nodeValue.includes('3') ||
          arr[i].nodeValue.includes('3b') ||
          arr[i].nodeValue.includes('6') ||
          arr[i].nodeValue.includes('9')) {
          if (!arr[i + 1].nodeValue.includes('3') &&
            !arr[i + 1].nodeValue.includes('3b') &&
            !arr[i + 1].nodeValue.includes('6') &&
            !arr[i + 1].nodeValue.includes('9')) {
            arr[i].nextElementSibling.classList.add('clickthrhulu__ai-target');
            [target] = doc.querySelectorAll('.clickthrhulu__ai-target');
            target.parentElement.insertBefore(frag, target);
            result = doc.body.innerHTML.replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/<!--#if-->/g, '</#if>');
            break;
          }
        }
      }
      return result || html;
    },

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
