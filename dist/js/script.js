(function main() {
  const app = {

    codeMirrorConfig: {
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
    },

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
      this.$code = CodeMirror.fromTextArea(document.getElementById("code"), this.codeMirrorConfig);
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
    },

    bindEvents() {
      this.$btn.addEventListener('click', this.run.bind(this));
      this.$resetBtn.addEventListener('click', this.reset.bind(this));
    },

    setState() {
      this.state = Object.assign({}, {
        html: this.$code.getValue(),
        barcodes: this.$barcodes.value,
        variables: this.$vars.value ?
          this.$vars.value.toUpperCase().replace(/ /g, '').split(',')
          : []
      });
      this.addCommonVars();
    },

    addCommonVars() {
      const commonVars = [
        'NAME',
        'GS_BARCODE',
        'PROMOCODE',
        'VERSION',
        'EMAIL_VERSION',
        'HASBANNER',
        'DISC',
        'DISC2',
        'DISC3',
        'TESTGROUP',
        'CONTACTS_LIST.EMAIL_ADDRESS_',
        'ENDDATE',
        'EXP_DATE',
        'F4H_BARCODE',
        'F4H_PROMOCODE',
        'JPLUS_BARCODE',
        'JPLUS_PROMOCODE',
        'AUDVERS',
        'BANNERGROUP',
        'EMAIL_BANNER_MESSAGE',
        'MISSION_DETAILS_EXCLUSIONS',
        'MISSION_HEADLINE_COPY',
        'EMAIL_SHA256_HASH_',
        'USM_BARCODE',
        'USM_PROMOCODE',
        'LOYALTY',
        'STOREGROUP',
        'BANNERGROUP1',
        'BANNERGROUP2',
        'BANNERGROUP3'
      ]
      this.state = Object.assign(this.state, {
        variables: [
          ...commonVars,
          ...this.state.variables,
        ]
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
      const anchors = [...doc.querySelectorAll('a[rilt]')];
      const clickthroughs = [...doc.querySelectorAll('a[href*="${clickthrough"]')];
      let html;
      let output;

      if (anchors.length) {
        const jsonData = anchors.map((a) => {
          const url = a.getAttribute('href') || '#'
          const branchURL = `https://joann.app.link/3p?%243p=e_rs&%24original_url=${encodeURIComponent(url)}`
          const isCouponLink = url.includes('coupon.html');
          const formName = `'!MASTER_COUPON_LP'`;
          const couponPageVars = [
            `'NAME'`,
            `'BODY'`,
            `'HASBANNER'`,
            `'GS_BARCODE'`,
            `'PROMOCODE'`,
            `'EMAIL_VERSION'`,
            `'VERSION'`,
            `'DISC'`,
            `'TESTGROUP'`,
            `'F4H_BARCODE'`,
            `'F4H_PROMOCODE'`,
            `'JPLUS_BARCODE'`,
            `'JPLUS_PROMOCODE'`,
            `'USM_BARCODE'`,
            `'USM_PROMOCODE'`,
            `'LOYALTY'`,
            `'STOREGROUP'`,
            `'BANNERGROUP1'`,
            `'BANNERGROUP2'`,
            `'BANNERGROUP3'`
          ];

          const deeplinkUrlExclusions = [
            'clickthrough',
            'cpn=',
            'weekly-ad',
            'sewing-studio',
            '/projects',
          ];

          const urlContainsExclusion = deeplinkUrlExclusions.some(excl => url.includes(excl));
          const deeplink = !isCouponLink && !urlContainsExclusion && url.includes('joann.com');
          let LINK_URL;
          let formLink;

          for (let i = 1; i <= this.state.barcodes; i += 1) {
            couponPageVars.push(`'BARCODE${i}'`);
          }

          formLink = `\${form(${formName},${[...couponPageVars]})}`;
          LINK_URL = deeplink ? branchURL : isCouponLink ? formLink : url;

          return {
            LINK_NAME: a.getAttribute('rilt'),
            LINK_URL,
            LINK_CATEGORY: this.getLinkCategory(url),
            IOS_LINK_URL: deeplink ? LINK_URL : null,
            ANDROID_LINK_URL: deeplink ? LINK_URL : null,
          };
        });

        const dedupedJSON = jsonData.reduce((acc, curr) => {
          if (!acc.find(({ LINK_NAME }) => LINK_NAME === curr.LINK_NAME)) {
            acc.push(curr);
          }
          return acc;
        }, []);

        const config = { quotes: true }
        const csv = Papa.unparse(dedupedJSON, config);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const filename = `LinkTable_${new Date().toDateString().replace(/  /g, '_')}`;

        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.update(anchors);
      } else {
        this.showError('No RILT Anchors Found');
      }

      if (clickthroughs.length) {
        this.find('Webview', clickthroughs, true, this.update.bind(this));
        this.find('Btm_Nav_Coupon', clickthroughs, true, this.update.bind(this));
      }

      html = this.addEntities(doc.documentElement.outerHTML)
      const inlinedCSS = await this.inlineCSS(html);
      console.log('INLINED:', inlinedCSS);
      return inlinedCSS;
    },

    getLinkCategory(url) {
      const urlParams = {
        'cpn=': 'onlinecode',
        'coupon.html': 'coupon',
        'buy-online-pickup-in-store': 'banner_joann_bopis',
        'plus.joann': 'banner_joann_plus',
        'kids_teachers': 'crafts_675_kidscrafts',
        '_books': 'hmseas_665_publications',
        'storage': 'hmseas_664_storage',
        'wedding': 'hmseas_663_bridal',
        'needle_arts': 'crafts_660_needlearts',
        'jewelry_making': 'crafts_343_jewelry',
        'crafts_hobbies/hobbies': 'crafts_605_traditionalcraft',
        'basic_craft': 'crafts_640_basiccraftcomponents',
        'baking_and_party': 'crafts_642_celebration',
        'craft_painting': 'crafts_645_decorativepainting',
        'tools_and_machine': 'crafts_650_papercraftingtechnology',
        'paper_crafting/': 'crafts_655_papercraftingsupplies',
        'fabric_crafting': 'crafts_780_crafttextiles',
        'floral_and_wedding': 'hmseas_663_bridal',
        'ribbons': 'hmseas_680_ribbon',
        'candles_warmers': 'hmseas_736_candlesanddecor',
        'frames': 'hmseas_746_frame',
        'spring_decor_floral': 'hmseas_804_springinspirations',
        'fall_decor_floral': 'hmseas_790_fallholiday',
        'holidays_seasons/christmas': 'hmseas_800_christmas',
        'summer_decor_floral': 'hmseas_805_summer',
        'classes/': 'service_750_classesservices',
        'custom_framing/': 'service_751_custom',
        'foam_and_fiber': 'sewing_776_foamfiber',
        'sewing/patterns': 'sewing_730_patterns',
        'sewing/': 'sewing_670_sewingconstruction',
        'fabric/fleece_fabric': 'sewing_693_fleece',
        'fabric/apparel_fabric': 'sewing_695_fashionapparelfabrics',
        'fabric/special_occasion_fabric': 'sewing_700_specialoccasion',
        'fabric/holiday_fabric': 'sewing_705_holiday',
        'fabric/quilting_fabric': 'sewing_710_cotton',
        'fabric/utility_fabric': 'sewing_710_cotton',
        'fabric/flannel_fabric': 'sewing_715_warm',
        'fabric/nursery_fabric': 'sewing_715_warm',
        'fabric/home_decor_fabric': 'sewing_761_homedecfabric',
        '_trims': 'sewing_766_trims',
        'fabric/team_shop': 'sewing_784_team',
        'fabric/character': 'sewing_785_licensed',
      }
      for (let i in urlParams) {
        if (url.includes(i)) return urlParams[i];
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

    createClickthrough(name, href, coupon = false) {
      const trackingParams = [
        `'utm_term=${name}'`,
        "'EMAIL_SHA256_HASH_'",
        "'DWID'",
      ];
      if (coupon) {
        for (let i = 1; i <= this.state.barcodes; i++) {
          trackingParams.push(`'BARCODE${i}='+BARCODE${i}`);
        }
        this.state.variables.forEach(i => trackingParams.push(`'${i}'`));
      }
      return `\${clickthrough('${name}',${[...trackingParams]})}`;
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
      this.$options.style.opacity = "0";
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

    showError(msg) {
      return alert(msg);
    },

    async inlineCSS(html) {
      const res = await fetch('/.netlify/functions/inliner/inliner.js', { method: 'POST', body: html });
      const stuff = await res.text();
      return JSON.parse(stuff)['HTML'];
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
</style>
</head>
<body>
  <div id='hello'>Hello</div>
</body>
</html>
*/
