/* eslint-disable object-curly-newline */
/* eslint-disable no-nested-ternary */
/* eslint-disable no-console */
/* eslint-disable prefer-const */
import codeMirrorConfig from './codemirror-config.mjs';
import linkCategories from './link-categories.mjs';
import appConfig from './app-config.mjs';
import testInput from './testInput.mjs';

(() => {
  let testing = false;

  const ClickthrhulhuApp = {
    codeMirrorConfig,

    test: {
      testInput,
    },

    state: {
      html: null,
      variables: JSON.parse(localStorage.getItem('variables')) || [],
    },

    init(defaultConfig) {
      console.log('initializing app...');
      this.cacheDOM();
      this.bindEvents();
      if (localStorage.length !== 5) { // implement more elegant local storage validation
        console.log('no storage...updating with config');
        this.setInitialLocalStorage(defaultConfig);
        this.state = Object.assign({}, this.state, {
          variables: JSON.parse(localStorage.getItem('variables')),
        });
      }
      this.reset();
      this.updateUISettings();
      if (testing) this.$code.setValue(testInput);
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
      // this.$trackingParamsList = document.getElementById('settings-menu_trackinglist');
      // this.$trackingInput = document.getElementById('settings-menu_trackinginput');
      // this.$addTrackingBtn = document.getElementById('btn_add-tracking');
      this.$variableList = document.getElementById('settings-menu_variablelist');
      this.$variableForm = document.getElementById('settings-form-addvariable');
      this.$formName = document.getElementById('settings-menu_currentformname');
      this.$formNameForm = document.getElementById('settings-form-updatename');
      this.$branchURL = document.getElementById('settings-menu_branchurl');
      this.$branchURLForm = document.getElementById('settings-form-updatebranchurl');
    },

    bindEvents() {
      this.$btn.addEventListener('click', this.run.bind(this));
      this.$resetBtn.addEventListener('click', this.reset.bind(this));
      // this.$addTrackingBtn.addEventListener('click', this.addTracking.bind(this));
      this.$variableList.addEventListener('click', this.handleVariableListClick.bind(this));
      this.$variableForm.addEventListener('submit', this.addVariable.bind(this));
      this.$formNameForm.addEventListener('submit', this.updateFormName.bind(this));
      this.$branchURLForm.addEventListener('submit', this.updateBranchURL.bind(this));
    },

    updateBranchURL(e) {
      e.preventDefault();
      let input = e.target.elements['branchurl-input'].value;
      if (input) {
        this.addToLocalStorage('branch', input);
        e.target.elements['branchurl-input'].value = '';
        this.updateUISettings();
      }
    },

    updateFormName(e) {
      e.preventDefault();
      let input = e.target.elements['formname-input'].value;
      if (input) {
        this.addToLocalStorage('couponForm', input);
        e.target.elements['formname-input'].value = '';
        this.updateUISettings();
      }
    },

    setSessionState() {
      this.state = Object.assign({}, {
        html: this.$code.getValue(),
        variables: this.$vars.value ?
          [...this.$vars.value.toUpperCase().replace(/ /g, '').split(','), ...this.state.variables]
          : [...this.state.variables],
      });
    },

    async run() {
      if (this.validateInput()) {
        this.setSessionState();
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

    handleVariableListClick(e) {
      let elm = e.target;
      switch (elm.className) {
        case 'settings-menu_variablelistitem':
          this.editListItem(elm);
          break;
        case 'settings-menu_listitemdelete':
          this.deleteListItem(elm);
          break;
        default:
          break;
      }
    },

    editListItem(elm) {
      let variableToEdit = elm.innerText;
      if (this.state.variables.includes(variableToEdit)) {
        // COMING SOON
      }
    },

    deleteListItem(elm) {
      let variableToDel = elm.parentElement.innerText;
      if (this.state.variables.includes(variableToDel)) {
        let filteredVars = this.state.variables.filter(i => i !== variableToDel);
        this.state = Object.assign({}, this.state, { variables: [...filteredVars] });
        this.addToLocalStorage('variables', this.state.variables);
        this.updateUISettings();
      }
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
      let branch = JSON.parse(localStorage.getItem('branch'));
      let deeplinkUrlExclusions = JSON.parse(localStorage.getItem('deeplinkUrlExclusions'));
      let supplementalVars = JSON.parse(localStorage.getItem('supplementalVars'));
      let couponForm = JSON.parse(localStorage.getItem('couponForm'));
      let url = a.getAttribute('href') || '#';
      let branchedUrl = `${branch}${encodeURIComponent(url)}`;
      let isCouponLink = url.includes('coupon.html');
      let urlContainsExclusion = deeplinkUrlExclusions.some(excl => url.includes(excl));
      let formData = [...this.state.variables, ...supplementalVars];
      let deeplink = !isCouponLink && !urlContainsExclusion && url.includes('joann.com');
      let formLink = `\${form('${couponForm}',${[...this.stringAll(formData)]})}`;
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
      let keys = Object.keys(linkCategories);
      keys.forEach((item) => {
        if (url.includes(item)) {
          return linkCategories[item];
        }
        return null;
      });

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
      let supplementalVars = JSON.parse(localStorage.getItem('supplementalVars')) || [];
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

    updateUISettings() {
      this.$variableList.innerHTML = '';
      this.$formName.innerHTML = '';
      this.$branchURL.innerHTML = '';
      this.$formName.innerText = JSON.parse(localStorage.getItem('couponForm'));
      this.$branchURL.innerText = JSON.parse(localStorage.getItem('branch'));
      this.state.variables.forEach((item) => {
        this.addSettingsListItem({

          text: item,
          className: 'settings-menu_variablelistitem',
          parent: this.$variableList,
        });
      });
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

    addVariable(e) {
      e.preventDefault();
      let newVariable = e.target.elements['variable-input'].value;
      if (!newVariable) return;
      if (this.state.variables.includes(newVariable)) return;
      this.state = Object.assign(this.state, {
        variables: [
          ...this.state.variables,
          newVariable,
        ],
      });
      this.$variableForm.elements['variable-input'].value = '';
      this.addSettingsListItem({
        text: newVariable,
        className: 'settings-menu_variablelistitem',
        parent: this.$variableList,
      });
      this.addToLocalStorage('variables', this.state.variables);
      console.log(localStorage);
    },

    addSettingsListItem({ text, className, parent }) {
      let elm = document.createElement('li');
      let delIcon = document.createElement('span');
      elm.textContent = text;
      elm.classList = className;
      delIcon.classList = 'settings-menu_listitemdelete';
      elm.appendChild(delIcon);
      parent.appendChild(elm);
    },

    addTracking() {
      console.log('adding tracking');
    },

    setInitialLocalStorage(config) {
      let keys = Object.keys(config);
      keys.forEach(key => this.addToLocalStorage(key, config[key]));
      console.log(localStorage);
    },

    addToLocalStorage(key, value) {
      localStorage.setItem(key, JSON.stringify(value));
    },

    showError(msg) {
      console.log(msg);
    },

    async inlineCSS(html) {
      let url = '/inliner';
      let res = await fetch(url, { method: 'POST', body: html });
      let json = await res.text();
      return JSON.parse(json).HTML;
    },
  };

  ClickthrhulhuApp.init(appConfig);
})();

