/* 地区参数表 —— 自动生成，请勿手工改动结构
 * ============================================================================
 * 政策基准日：2026-10-24
 * 数据来源：research/地区参数表.md（详见该文件的出处清单与存疑清单）
 *
 * 【单位约定 —— 全表严格一致，前端请勿二次换算】
 *   landUseTax        : 数组，元素为「元/㎡·年」，按土地等级 1..N 严格递减
 *                       （null 表示该市税额标准未查到）
 *   landUseTaxIndustrial : 数组（可选），元素为「元/㎡·年」，工业用地优惠标准；
 *                       仅深圳、广州等少数城市有；未查到则不设该字段
 *   propertyTaxDeduct : 百分数整数，房产税从价计征减除比例，30 表示 30%
 *   lvatApprovedRate  : 百分数整数，土地增值税核定征收率，5 表示 5%
 *   iitApprovedRate   : 百分数整数，个人所得税核定征收比例，1 表示 1%
 *   localEduSurtax    : 百分数整数，地方教育附加率，2 表示 2%
 *   devExpenseRate    : 百分数整数，省级土地增值税开发费用扣除比例，
 *                       5 表示 5%（有利息据实扣除口径），10 表示 10%
 *   deedTaxRate       : 小数，契税属地法定税率，0.03 表示 3%
 *
 * 【其他约定】
 *   null = 未查到（前端应提示用户手工填写），禁止用 0 冒充。
 *   province 字段为省级行政区全称，与 provinces 表的键完全一致。
 * ============================================================================
 */
const REGIONS = {
  meta: {
    version: '2026-10-24',
    note: '未查到的值以 null 表示，前端应提示用户手工填写',
    sources: 'research/地区参数表.md',
  },

  // ===== 城市级参数 =====
  cities: {
    // ---------- 江苏 ----------
    nj: {
      name: '南京市', province: '江苏省',
      landUseTax: [18, 15, 10, 7, 5, 3, 1.5],
      landUseTaxNote: '宁政办发〔2019〕28号，2019-01-01 起执行（依据苏财税〔2019〕18号）',
      propertyTaxDeduct: 30,
      deedTaxRate: 0.03,
      lvatApprovedRate: null,
      iitApprovedRate: null,
      localEduSurtax: 2,
      devExpenseRate: null,
    },
    sz1: {
      name: '苏州市', province: '江苏省',
      landUseTax: [18, 16, 14, 10, 6, 5, 3, 1.5],
      landUseTaxNote: '苏府办〔2019〕24号，2019-01-01 起执行（市区「大城市」八等；常熟/张家港/昆山/太仓为「中等城市」六等 14/10/6/5/3/1.2）',
      propertyTaxDeduct: 30,
      deedTaxRate: 0.03,
      lvatApprovedRate: null,
      iitApprovedRate: null,
      localEduSurtax: 2,
      devExpenseRate: null,
    },
    wx: {
      name: '无锡市', province: '江苏省',
      landUseTax: [18, 14, 9, 6, 3, 1.5],
      landUseTaxNote: '锡政办发〔2019〕7号，2019-01-01 起执行（市区六等；江阴/宜兴为五等 14/9/6/3/1.2）',
      propertyTaxDeduct: 30,
      deedTaxRate: 0.03,
      lvatApprovedRate: null,
      iitApprovedRate: null,
      localEduSurtax: 2,
      devExpenseRate: null,
    },
    cz: {
      name: '常州市', province: '江苏省',
      landUseTax: [18, 14, 10, 8, 6, 4, 1.5],
      landUseTaxNote: '常政办发〔2019〕35号，2019-01-01 起执行（市区含金坛、武进七等）',
      propertyTaxDeduct: 30,
      deedTaxRate: 0.03,
      lvatApprovedRate: null,
      iitApprovedRate: null,
      localEduSurtax: 2,
      devExpenseRate: null,
    },

    // ---------- 北京 / 上海 / 天津 ----------
    bj: {
      name: '北京市', province: '北京市',
      landUseTax: [30, 24, 18, 12, 3, 1.5],
      landUseTaxNote: '北京市实施《城镇土地使用税暂行条例》办法（北京市人民政府令第188号，2007-04-27 修改），现行有效',
      propertyTaxDeduct: 30,
      deedTaxRate: 0.03,
      lvatApprovedRate: 5,
      lvatApprovedRateNote: '北京市地方税务局公告2013年第8号第三条：个人转让存量房，既无评估报告又无购房发票的，按交易价格全额 5% 核定征收；个人销售住房暂免土增税',
      iitApprovedRate: 1,
      iitApprovedRateNote: '京地税个〔2006〕348号，核定征收率暂按 1%；2024 年取消非普通住房 2% 口径',
      localEduSurtax: 2,
      devExpenseRate: null,
    },
    sh: {
      name: '上海市', province: '上海市',
      landUseTax: [15, 10, 6, 3, 1.5],
      landUseTaxNote: '上海市城镇土地使用税实施规定（沪府规〔2019〕6号），经沪府〔2023〕63号延长有效期至 2028-12-31',
      propertyTaxDeduct: 30,
      deedTaxRate: 0.03,
      lvatApprovedRate: null,
      iitApprovedRate: 1,
      iitApprovedRateNote: '沪地税个〔2006〕1号；取消普通/非普通住宅标准后统一为 1%',
      localEduSurtax: 2,
      devExpenseRate: null,
    },
    tj: {
      name: '天津市', province: '天津市',
      landUseTax: [25, 20, 15, 10, 5, 1.5],
      landUseTaxNote: '《天津市实施〈中华人民共和国城镇土地使用税暂行条例〉办法》（津政令第119号，2007-07-27 公布；经津政令第20号 2020 修正，由七等改为六等）',
      propertyTaxDeduct: null,
      deedTaxRate: 0.03,
      lvatApprovedRate: null,
      iitApprovedRate: null,
      localEduSurtax: 2,
      devExpenseRate: null,
    },

    // ---------- 广东 ----------
    gz: {
      name: '广州市', province: '广东省',
      landUseTax: [15, 12, 9, 6, 3],
      landUseTaxIndustrial: [8, 6, 5, 3, 2],
      landUseTaxNote: '穗府规〔2022〕3号，2023-01-01 起施行，有效期至 2027-12-31（上游：粤财规〔2017〕4号、粤财规〔2022〕5号）',
      propertyTaxDeduct: 30,
      deedTaxRate: 0.03,
      lvatApprovedRate: 5,
      lvatApprovedRateNote: '穗地税发〔2013〕152号：个人转让旧房按 5% 核定征收',
      iitApprovedRate: 1,
      iitApprovedRateNote: '广州税务 12366 口径：核定征收按转让收入 1%',
      localEduSurtax: 2,
      devExpenseRate: null,
    },
    sz: {
      name: '深圳市', province: '广东省',
      landUseTax: [15, 12, 9, 6, 3],
      landUseTaxIndustrial: [8, 6, 5, 3, 2],
      landUseTaxNote: '深圳市地方税务局公告2017年第3号，2017-01-01 起执行（⚠️ 原有效期5年至2021-12-31，是否已延续待确认）',
      propertyTaxDeduct: 30,
      deedTaxRate: 0.03,
      lvatApprovedRate: null,
      iitApprovedRate: 1,
      iitApprovedRateNote: '取消普通/非普通住宅标准后统一为 1%（原非普通住房 1.5%）',
      localEduSurtax: 2,
      devExpenseRate: null,
    },

    // ---------- 浙江 ----------
    hz: {
      name: '杭州市', province: '浙江省',
      landUseTax: [15, 10, 5],
      landUseTaxNote: '杭州市区全面开展调整城镇土地使用税政策实施方案（杭政办函〔2015〕167号）；市区三等 15/10/5；萧山、余杭、富阳执行统一标准但等级范围由各区自定',
      propertyTaxDeduct: 30,
      deedTaxRate: 0.03,
      lvatApprovedRate: null,
      iitApprovedRate: null,
      localEduSurtax: 2,
      devExpenseRate: null,
    },
    nb: {
      name: '宁波市', province: '浙江省',
      landUseTax: [15, 10, 5],
      landUseTaxNote: '宁波市人民政府办公厅关于调整宁波市区城镇土地使用税等级范围的通知（甬政办发〔2018〕12号），2018-01-01 起施行',
      propertyTaxDeduct: 30,
      deedTaxRate: 0.03,
      lvatApprovedRate: null,
      iitApprovedRate: null,
      localEduSurtax: 2,
      devExpenseRate: null,
    },

    // ---------- 四川 / 湖北 / 陕西 ----------
    cd: {
      name: '成都市', province: '四川省',
      landUseTax: [20, 16, 12, 8],
      landUseTaxNote: '《成都市城镇土地使用税征税范围和税额标准》（成府规〔2026〕2号），2026-07-01 起施行，有效期3年（经四川省人民政府批准）；成府发〔2008〕27号同时废止。⚠️ 附表为「征求意见稿」文本，正式执行请以省府批复版为准',
      propertyTaxDeduct: 30,
      deedTaxRate: 0.03,
      lvatApprovedRate: null,
      iitApprovedRate: null,
      localEduSurtax: 2,
      devExpenseRate: null,
    },
    wh: {
      name: '武汉市', province: '湖北省',
      landUseTax: [20, 16, 12, 8, 5, 4, 3.5, 3, 2.5],
      landUseTaxNote: '《省人民政府办公厅关于印发湖北省城镇土地使用税适用税额标准的通知》（鄂政办发〔2007〕37号），武汉市中心城区及开发区九等；远城区为 4/3/2',
      propertyTaxDeduct: 25,
      propertyTaxDeductNote: '武汉市地方税务局公告2023年第5号：武汉市房产原值减除比例 25%（湖北省级为城市20%/县城25%/建制镇及工矿区30%，鄂政发〔1987〕64号）',
      deedTaxRate: 0.03,
      lvatApprovedRate: 7,
      lvatApprovedRateNote: '国家税务总局武汉市税务局公告2018年第3号第三条：对个人转让非住宅存量房、未能提供凭证的，统一按计税价格 7% 核定；住房按财税〔2008〕137号暂免',
      iitApprovedRate: null,
      localEduSurtax: 2,
      devExpenseRate: null,
    },
    xa: {
      name: '西安市', province: '陕西省',
      landUseTax: [27, 24, 14, 9, 6],
      landUseTaxNote: '《西安市地方税务局 西安市财政局关于明确城镇土地使用税等级范围和单位税额标准的通知》（西地税发〔2016〕151号）；省级幅度依据《陕西省城镇土地使用税实施办法》（陕政发〔2022〕15号，2022-07-18 起施行）：西安 1.5–27 元',
      propertyTaxDeduct: 20,
      propertyTaxDeductNote: '《陕西省房产税实施细则》（陕政发〔2022〕15号）：房产原值一次减除 20% 后的余值计算缴纳',
      deedTaxRate: 0.03,
      lvatApprovedRate: null,
      iitApprovedRate: 1,
      iitApprovedRateNote: '国家税务总局陕西省税务局公告2018年第8号：按住房转让收入 1% 核定',
      localEduSurtax: 2,
      devExpenseRate: null,
    },

    // ---------- 山东 ----------
    qd: {
      name: '青岛市', province: '山东省',
      landUseTax: [12.8, 9.6, 8, 6.4, 4.8],
      landUseTaxNote: '《山东省人民政府关于调整青岛市城镇土地使用税税额标准的批复》（鲁政字〔2021〕225号）+ 青财税〔2021〕27号，2022-01-01 起执行；原7等简并为5等，最高标准由19.2元降至12.8元',
      propertyTaxDeduct: 30,
      deedTaxRate: 0.03,
      lvatApprovedRate: null,
      iitApprovedRate: 1,
      iitApprovedRateNote: '《关于明确个人住房转让有关个人所得税问题的通知》（鲁财税〔2006〕32号）第四条：按住房转让收入 1% 核定',
      localEduSurtax: 2,
      devExpenseRate: null,
    },
    jn: {
      name: '济南市', province: '山东省',
      landUseTax: null,
      landUseTaxNote: '未查到济南市现行（2026年有效）城镇土地使用税土地等级税额标准的官方文件，留空待补',
      propertyTaxDeduct: 30,
      deedTaxRate: 0.03,
      lvatApprovedRate: null,
      iitApprovedRate: null,
      localEduSurtax: 2,
      devExpenseRate: null,
    },

    // ---------- 安徽 ----------
    hf: {
      name: '合肥市', province: '安徽省',
      landUseTax: [18, 14, 9, 5],
      landUseTaxNote: '合肥市人民政府办公室关于调整市区城镇土地使用税等级税额标准的通知（合政办〔2023〕21号），2023-07-01 起施行',
      propertyTaxDeduct: null,
      deedTaxRate: 0.03,
      lvatApprovedRate: null,
      iitApprovedRate: null,
      localEduSurtax: 2,
      devExpenseRate: null,
    },

    // ---------- 辽宁 / 吉林 / 黑龙江 ----------
    dl: {
      name: '大连市', province: '辽宁省',
      landUseTax: [24, 18, 12, 9, 7.5, 6, 4.5, 3, 2.4],
      landUseTaxNote: '《大连市人民政府关于调整城镇土地使用税有关政策的通知》（大政发〔2007〕13号），2007-01-01 起执行，市内四区及高新园区按十等标准适用；⚠️ 检索原文中个别数额存在排版讹误（"五等75元""七等45元"应为 7.5/4.5），且县级市/县城/建制镇另按各档次执行，建议以主管税务机关最新核定为准',
      propertyTaxDeduct: 30,
      deedTaxRate: 0.04,
      deedTaxRateNote: '辽宁省人大常委会决定：契税税率 4%，其中个人购买普通住房适用 3%',
      lvatApprovedRate: 5,
      lvatApprovedRateNote: '大连市税务局2019年第1号公告：个人转让旧房及建筑物（不含住房）核定征收率 5%',
      iitApprovedRate: null,
      localEduSurtax: 2,
      devExpenseRate: null,
    },
    sy: {
      name: '沈阳市', province: '辽宁省',
      landUseTax: [24, 21, 16, 10.5, 7.5, 6],
      landUseTaxNote: '国家税务总局沈阳市税务局关于我市城镇土地使用税地段等级和税额标准调整的说明，2024-01-01 起执行（经辽宁省人民政府批准；原城市1等30元调整为24元，新增城市5等7.5元，建制镇工矿区由6元调为2.4元）',
      propertyTaxDeduct: 30,
      deedTaxRate: 0.04,
      deedTaxRateNote: '辽宁省人大常委会决定：契税税率 4%，其中个人购买普通住房适用 3%',
      lvatApprovedRate: null,
      iitApprovedRate: null,
      localEduSurtax: 2,
      devExpenseRate: null,
    },
    cc: {
      name: '长春市', province: '吉林省',
      landUseTax: [24, 21, 18, 14, 9, 6, 4, 3, 2],
      landUseTaxNote: '《长春市人民政府关于调整城镇土地使用税土地纳税等级范围和税额标准的通知》（长府发〔2007〕25号），2007-01-01 起执行，九等',
      propertyTaxDeduct: 30,
      deedTaxRate: 0.03,
      lvatApprovedRate: null,
      iitApprovedRate: null,
      localEduSurtax: 2,
      devExpenseRate: null,
    },
    heb: {
      name: '哈尔滨市', province: '黑龙江省',
      landUseTax: [24, 18, 14, 12, 10, 8, 6, 4, 2],
      landUseTaxNote: '哈尔滨市财政局 国家税务总局哈尔滨市税务局关于公布我市市区城镇土地使用税税额标准的公告，2018-01-01 起施行（一至三等保持不变，四等至十等各下调2元；黑政规〔2017〕35号、黑财税〔2018〕17号）。⚠️ 原公告为十等，其中九等与十等税额同为 2 元/㎡，本表按"同额合并为同一档"处理为九档，实际档数以主管税务机关为准',
      propertyTaxDeduct: 30,
      deedTaxRate: 0.03,
      lvatApprovedRate: null,
      iitApprovedRate: null,
      localEduSurtax: 2,
      devExpenseRate: null,
    },

    // ---------- 河北 / 山西 ----------
    sjz: {
      name: '石家庄市', province: '河北省',
      landUseTax: [30, 20, 10],
      landUseTaxNote: '《石家庄市人民政府关于明确我市部分行政区划调整后主城区城镇土地使用税地段等级有关问题的通知》；⚠️ 另有冀财税〔2021〕36号将部分设区市标准调整为 12/8/7.5/4.5/3/2/1.5 等档，与此处三档口径不一致，以主管税务机关最新核定为准',
      propertyTaxDeduct: 30,
      deedTaxRate: 0.04,
      deedTaxRateNote: '河北省人大常委会决定：契税税率 4%，其中个人购买普通住房（≤144㎡）适用 3%',
      lvatApprovedRate: null,
      iitApprovedRate: null,
      localEduSurtax: 2,
      devExpenseRate: null,
    },
    ty: {
      name: '太原市', province: '山西省',
      landUseTax: null,
      landUseTaxNote: '未查到太原市现行城镇土地使用税土地等级税额标准的官方文件，留空待补',
      propertyTaxDeduct: 30,
      propertyTaxDeductNote: '晋地税发〔2017〕118号：房产计税余值扣除标准统一为 30%（原 20%、30% 两档）',
      deedTaxRate: 0.03,
      lvatApprovedRate: null,
      iitApprovedRate: null,
      localEduSurtax: 2,
      devExpenseRate: null,
    },

    // ---------- 福建 / 江西 / 湖南 ----------
    xm: {
      name: '厦门市', province: '福建省',
      landUseTax: [25, 18, 10, 6, 4],
      landUseTaxNote: '《厦门市地方税务局关于征收城镇土地使用税的通告》，2007-01-01 起执行；依据《厦门市人民政府关于印发厦门市城镇土地使用税实施办法的通知》（厦府〔2007〕441号）。⚠️ 未检索到 2011 年后的调整文件，是否现行有效待确认',
      propertyTaxDeduct: 30,
      deedTaxRate: 0.03,
      lvatApprovedRate: null,
      iitApprovedRate: null,
      localEduSurtax: 2,
      devExpenseRate: null,
    },
    fz: {
      name: '福州市', province: '福建省',
      landUseTax: [25, 18, 12, 8, 3],
      landUseTaxNote: '《福州市人民政府关于调整城镇土地使用税土地纳税等级及税额标准的通知》（榕政综〔2008〕26号），2007-01-01 起执行，城区五等',
      propertyTaxDeduct: 30,
      deedTaxRate: 0.03,
      lvatApprovedRate: null,
      iitApprovedRate: null,
      localEduSurtax: 2,
      devExpenseRate: null,
    },
    nc: {
      name: '南昌市', province: '江西省',
      landUseTax: null,
      landUseTaxNote: '未查到南昌市现行城镇土地使用税土地等级税额标准的官方文件，留空待补',
      propertyTaxDeduct: null,
      deedTaxRate: 0.03,
      lvatApprovedRate: 5,
      lvatApprovedRateNote: '国家税务总局江西省税务局公告（2025-01-01 起施行）：对个人转让存量非住宅实行核定征收的，核定征收率为 5%',
      iitApprovedRate: null,
      localEduSurtax: 2,
      devExpenseRate: null,
    },
    cs: {
      name: '长沙市', province: '湖南省',
      landUseTax: [16, 12, 9, 6, 4, 2],
      landUseTaxNote: '《长沙市城镇土地使用税分级与适用税额标准规定》（长政办发〔2008〕12号）；市区按三级至八级适用（⚠️ 原表十等中县级市档位在检索文本中不完整，取用时以原附件为准）',
      propertyTaxDeduct: 20,
      propertyTaxDeductNote: '湖南省房产税减除比例 20%',
      deedTaxRate: 0.04,
      deedTaxRateNote: '湖南省人大常委会决定：契税税率 4%（非优惠档）',
      lvatApprovedRate: null,
      iitApprovedRate: null,
      localEduSurtax: 2,
      devExpenseRate: null,
    },

    // ---------- 河南 / 云南 / 贵州 ----------
    zz: {
      name: '郑州市', province: '河南省',
      landUseTax: null,
      landUseTaxNote: '未查到郑州市现行城镇土地使用税土地等级税额标准的官方文件；《河南省城镇土地使用税实施办法》仅规定郑州市幅度 0.5–5 元/㎡，留空待补',
      propertyTaxDeduct: null,
      deedTaxRate: 0.03,
      deedTaxRateNonResidential: 0.04,
      deedTaxRateNote: '河南省人大常委会决定：契税适用税率为 3%（住房权属转移）与 4%（其他房屋）两档；本表住宅取 3%，非住宅取 4%',
      lvatApprovedRate: null,
      iitApprovedRate: null,
      localEduSurtax: 2,
      devExpenseRate: null,
    },
    km: {
      name: '昆明市', province: '云南省',
      landUseTax: [22, 16, 10, 6, 3.5],
      landUseTaxNote: '昆明市财政局 云南省地方税务局批复（2015-12-24），2016-01-01 起执行；市城区五等，税额 3.5–22 元；呈贡区/高新区/滇池度假区为 8/10，昆明经开区 6/8，空港经济区 6/7，安宁市 3.5–6，县城 4/5，建制镇 2/3.5',
      propertyTaxDeduct: null,
      deedTaxRate: 0.03,
      lvatApprovedRate: null,
      iitApprovedRate: null,
      localEduSurtax: 2,
      devExpenseRate: null,
    },
    gy: {
      name: '贵阳市', province: '贵州省',
      landUseTax: null,
      landUseTaxNote: '未查到贵阳市现行城镇土地使用税土地等级税额标准的官方文件，留空待补',
      propertyTaxDeduct: null,
      deedTaxRate: 0.03,
      lvatApprovedRate: null,
      iitApprovedRate: null,
      localEduSurtax: 2,
      devExpenseRate: null,
    },

    // ---------- 广西 / 海南 / 甘肃 / 宁夏 / 青海 ----------
    nn: {
      name: '南宁市', province: '广西壮族自治区',
      landUseTax: null,
      landUseTaxNote: '未查到南宁市现行城镇土地使用税土地等级税额标准的官方文件，留空待补',
      propertyTaxDeduct: null,
      deedTaxRate: 0.03,
      lvatApprovedRate: null,
      iitApprovedRate: null,
      localEduSurtax: 2,
      devExpenseRate: null,
    },
    hk: {
      name: '海口市', province: '海南省',
      landUseTax: null,
      landUseTaxNote: '未查到海口市现行城镇土地使用税土地等级税额标准的官方文件，留空待补',
      propertyTaxDeduct: null,
      deedTaxRate: 0.03,
      lvatApprovedRate: null,
      iitApprovedRate: null,
      localEduSurtax: 2,
      devExpenseRate: null,
    },
    lz: {
      name: '兰州市', province: '甘肃省',
      landUseTax: null,
      landUseTaxNote: '未查到兰州市现行城镇土地使用税土地等级税额标准的官方文件；甘肃省大幅度为大城市 12–18 元，留空待补',
      propertyTaxDeduct: null,
      deedTaxRate: 0.03,
      lvatApprovedRate: null,
      iitApprovedRate: null,
      localEduSurtax: 2,
      devExpenseRate: null,
    },
    yc: {
      name: '银川市', province: '宁夏回族自治区',
      landUseTax: null,
      landUseTaxNote: '未查到银川市现行城镇土地使用税土地等级税额标准的官方文件，留空待补',
      propertyTaxDeduct: null,
      deedTaxRate: 0.03,
      lvatApprovedRate: null,
      iitApprovedRate: null,
      localEduSurtax: 2,
      devExpenseRate: null,
    },
    xn: {
      name: '西宁市', province: '青海省',
      landUseTax: null,
      landUseTaxNote: '未查到西宁市现行城镇土地使用税土地等级税额标准的官方文件；青海省幅度西宁市区约 10–20 元，留空待补',
      propertyTaxDeduct: null,
      deedTaxRate: 0.03,
      lvatApprovedRate: null,
      iitApprovedRate: null,
      localEduSurtax: 2,
      devExpenseRate: null,
    },
  },

  // ===== 省级参数（契税法定税率、省级开发费用比例等） =====
  provinces: {
    '北京市':         { deedTaxRate: 0.03, devExpenseRate: null, personalHousingOrdinaryRate: null, note: '27 省法定最低税率 3% 之一' },
    '天津市':         { deedTaxRate: 0.03, devExpenseRate: null, personalHousingOrdinaryRate: null, note: '27 省法定最低税率 3% 之一' },
    '河北省':         { deedTaxRate: 0.04, devExpenseRate: null, personalHousingOrdinaryRate: 0.03, note: '一般 4%；个人购买普通住房（≤144㎡）适用 3%（冀政发〔2016〕6号第五条）' },
    '山西省':         { deedTaxRate: 0.03, devExpenseRate: null, personalHousingOrdinaryRate: null, note: '27 省法定最低税率 3% 之一' },
    '内蒙古自治区':   { deedTaxRate: 0.03, devExpenseRate: null, personalHousingOrdinaryRate: null, note: '27 省法定最低税率 3% 之一' },
    '辽宁省':         { deedTaxRate: 0.04, devExpenseRate: null, personalHousingOrdinaryRate: 0.03, note: '一般 4%；个人购买普通住房适用 3%' },
    '吉林省':         { deedTaxRate: 0.03, devExpenseRate: null, personalHousingOrdinaryRate: null, note: '27 省法定最低税率 3% 之一' },
    '黑龙江省':       { deedTaxRate: 0.03, devExpenseRate: null, personalHousingOrdinaryRate: null, note: '27 省法定最低税率 3% 之一；契税法施行时税率由4%下调至3%' },
    '上海市':         { deedTaxRate: 0.03, devExpenseRate: null, personalHousingOrdinaryRate: null, note: '27 省法定最低税率 3% 之一' },
    '江苏省':         { deedTaxRate: 0.03, devExpenseRate: null, personalHousingOrdinaryRate: null, note: '27 省法定最低税率 3% 之一' },
    '浙江省':         { deedTaxRate: 0.03, devExpenseRate: null, personalHousingOrdinaryRate: null, note: '27 省法定最低税率 3% 之一' },
    '安徽省':         { deedTaxRate: 0.03, devExpenseRate: null, personalHousingOrdinaryRate: null, note: '27 省法定最低税率 3% 之一' },
    '福建省':         { deedTaxRate: 0.03, devExpenseRate: null, personalHousingOrdinaryRate: null, note: '27 省法定最低税率 3% 之一' },
    '江西省':         { deedTaxRate: 0.03, devExpenseRate: null, personalHousingOrdinaryRate: null, note: '27 省法定最低税率 3% 之一' },
    '山东省':         { deedTaxRate: 0.03, devExpenseRate: null, personalHousingOrdinaryRate: null, note: '27 省法定最低税率 3% 之一' },
    '河南省':         { deedTaxRate: 0.03, devExpenseRate: null, personalHousingOrdinaryRate: null, note: '两档：住房权属转移 3%，其他 4%。本表取法定一般档 3%，分档口径待按河南省人大决定原文核实' },
    '湖北省':         { deedTaxRate: 0.03, devExpenseRate: null, personalHousingOrdinaryRate: null, note: '27 省法定最低税率 3% 之一' },
    '湖南省':         { deedTaxRate: 0.04, devExpenseRate: null, personalHousingOrdinaryRate: null, note: '湖南确定为 4%（未设普通住房优惠档）' },
    '广东省':         { deedTaxRate: 0.03, devExpenseRate: null, personalHousingOrdinaryRate: null, note: '27 省法定最低税率 3% 之一（含深圳）' },
    '广西壮族自治区': { deedTaxRate: 0.03, devExpenseRate: null, personalHousingOrdinaryRate: null, note: '27 省法定最低税率 3% 之一' },
    '海南省':         { deedTaxRate: 0.03, devExpenseRate: null, personalHousingOrdinaryRate: null, note: '27 省法定最低税率 3% 之一' },
    '重庆市':         { deedTaxRate: 0.03, devExpenseRate: null, personalHousingOrdinaryRate: null, note: '27 省法定最低税率 3% 之一' },
    '四川省':         { deedTaxRate: 0.03, devExpenseRate: null, personalHousingOrdinaryRate: null, note: '27 省法定最低税率 3% 之一' },
    '贵州省':         { deedTaxRate: 0.03, devExpenseRate: null, personalHousingOrdinaryRate: null, note: '27 省法定最低税率 3% 之一' },
    '云南省':         { deedTaxRate: 0.03, devExpenseRate: null, personalHousingOrdinaryRate: null, note: '27 省法定最低税率 3% 之一' },
    '西藏自治区':     { deedTaxRate: 0.03, devExpenseRate: null, personalHousingOrdinaryRate: null, note: '27 省法定最低税率 3% 之一' },
    '陕西省':         { deedTaxRate: 0.03, devExpenseRate: null, personalHousingOrdinaryRate: null, note: '27 省法定最低税率 3% 之一' },
    '甘肃省':         { deedTaxRate: 0.03, devExpenseRate: null, personalHousingOrdinaryRate: null, note: '27 省法定最低税率 3% 之一' },
    '青海省':         { deedTaxRate: 0.03, devExpenseRate: null, personalHousingOrdinaryRate: null, note: '27 省法定最低税率 3% 之一' },
    '宁夏回族自治区': { deedTaxRate: 0.03, devExpenseRate: null, personalHousingOrdinaryRate: null, note: '27 省法定最低税率 3% 之一' },
    '新疆维吾尔自治区': { deedTaxRate: 0.03, devExpenseRate: null, personalHousingOrdinaryRate: null, note: '27 省法定最低税率 3% 之一' },
  },
};

// ===== 自检代码（不抛异常，仅 console.assert 风格告警） =====
(function selfCheck() {
  if (typeof console === 'undefined' || !console.assert) return;
  const PCT_FIELDS = [
    ['propertyTaxDeduct', 10, 30],
    ['lvatApprovedRate', 0, 10],
    ['iitApprovedRate', 0, 3],
    ['localEduSurtax', 0, 5],
    ['devExpenseRate', 5, 10],
  ];
  const cities = REGIONS.cities || {};
  for (const key of Object.keys(cities)) {
    const c = cities[key];
    // landUseTax
    if (c.landUseTax != null) {
      console.assert(Array.isArray(c.landUseTax), `[${key}] landUseTax 应为数组`);
      console.assert(c.landUseTax.length > 0, `[${key}] landUseTax 不应为空数组`);
      c.landUseTax.forEach((v, i) => {
        console.assert(typeof v === 'number' && isFinite(v), `[${key}] landUseTax[${i}] 应为有限数字`);
        console.assert(v > 0, `[${key}] landUseTax[${i}] 应为正数`);
        if (i > 0) console.assert(v < c.landUseTax[i - 1], `[${key}] landUseTax[${i}] 应严格小于上一档`);
      });
    }
    if (c.landUseTaxIndustrial != null) {
      console.assert(Array.isArray(c.landUseTaxIndustrial), `[${key}] landUseTaxIndustrial 应为数组`);
      c.landUseTaxIndustrial.forEach((v, i) => {
        console.assert(typeof v === 'number' && v > 0, `[${key}] landUseTaxIndustrial[${i}] 应为正数`);
        if (i > 0) console.assert(v <= c.landUseTaxIndustrial[i - 1], `[${key}] landUseTaxIndustrial[${i}] 应不大于上一档`);
      });
    }
    // 百分比字段
    for (const [field, lo, hi] of PCT_FIELDS) {
      const v = c[field];
      if (v === undefined || v === null) continue;
      console.assert(typeof v === 'number' && isFinite(v), `[${key}] ${field} 应为数字`);
      console.assert(v >= lo && v <= hi, `[${key}] ${field}=${v} 超出合理区间 ${lo}-${hi}`);
    }
    // 契税
    if (c.deedTaxRate !== undefined && c.deedTaxRate !== null) {
      console.assert(typeof c.deedTaxRate === 'number', `[${key}] deedTaxRate 应为数字`);
      console.assert(c.deedTaxRate >= 0.03 && c.deedTaxRate <= 0.05, `[${key}] deedTaxRate=${c.deedTaxRate} 超出 0.03-0.05`);
    }
    // 省级引用一致性
    console.assert(!!REGIONS.provinces[c.province], `[${key}] province「${c.province}」未在 provinces 表中登记`);
  }
  // 省级表自检
  for (const [pname, p] of Object.entries(REGIONS.provinces || {})) {
    if (p.deedTaxRate !== undefined && p.deedTaxRate !== null) {
      console.assert(p.deedTaxRate >= 0.03 && p.deedTaxRate <= 0.05, `[省:${pname}] deedTaxRate=${p.deedTaxRate} 超出 0.03-0.05`);
    }
    if (p.devExpenseRate !== undefined && p.devExpenseRate !== null) {
      console.assert(p.devExpenseRate >= 5 && p.devExpenseRate <= 10, `[省:${pname}] devExpenseRate=${p.devExpenseRate} 超出 5-10`);
    }
  }
})();
