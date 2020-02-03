const appConfig = {
  variables: [
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
    'BANNERGROUP3',
    'BODY',
    'ORCE_ID',
    'ORCE_FLAG',
    'JOANN_SMILES_REWARDNO',
    'BARCODE1',
    'BARCODE2',
    'BARCODE3',
    'BARCODE4',
    'BARCODE5',
    'BARCODE6',
    'BARCODE7',
    'BARCODE8',
    'BARCODE9',
    'BARCODE10',
    'BARCODE11',
    'BARCODE12',
  ],

  supplementalVars: [

  ],

  couponForm: '!MASTER_COUPON_LP',

  branch: 'https://joann.app.link/3p?%243p=e_rs&%24original_url=',

  deeplinkUrlExclusions: [
    'clickthrough',
    'cpn=',
    'sewing-studio',
    '/projects',
  ],

  htmlModules: {
    ai: `<!-- START AI CONTAINER -->
    <table align="center" border="0" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;-ms-text-size-adjust:100%;-webkit-text-size-adjust:100%;" >
    <tbody>
    <tr>
    <td style="padding-top:20px;mso-line-height-rule:exactly;-ms-text-size-adjust:100%;-webkit-text-size-adjust:100%;border-collapse:collapse;" >
        <#if TESTGROUP =='AI'>
            <#include 'cms://contentlibrary/!masterbanners/jas_oracle_ai_3rec_v2.htm'>
        </#if>
    </td>
    </tr>
    </tbody>
    </table>
    <!-- END AI CONTAINER -->`,
  },
};

export default appConfig;
