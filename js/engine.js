/* ==========================================================================
 * 不动产交易及持有环节税费计算引擎
 * 依据：0929不动产交易及持有环节税收政策梳理.xlsx + 经核验的政策依据
 * 纯前端计算，无后端依赖。金额单位：元（人民币）
 * ========================================================================== */

const RATE = {
  // ---- 增值税 ----
  // 依据：《中华人民共和国增值税法》(2026.1.1 施行) + 实施条例(国务院令826号)
  //      + 财政部 税务总局公告2025年第17号 / 2026年第9号 / 2026年第10号
  VAT: {
    GENERAL: 0.09,        // 一般计税率 9%（增值税法第十条第二项）
    SIMPLE_OLD: 0.05,     // 简易计税 征收率 5%（至 2027.12.31，2026年第10号公告三(二)4）
    SMALL_3: 0.03,       // 小规模纳税人 3%（增值税法第十一条）
    SMALL_1_REDUCED: 0.01,// 3% 减按 1% —— 仅非不动产适用，不动产销售不适用
    INDIV_2YEAR: 0.03,   // 个人销售住房不足 2 年：3% 全额（2025年第17号公告）
    // 起征点（小规模纳税人，2026.1.1~2027.12.31）
    THRESHOLD: { month: 100000, quarter: 300000, once: 1000 },
  },
  // ---- 政策有效期（用于界面提示）----
  VALID_UNTIL: {
    simple5: '2027-12-31',      // 简易计税 5% 优惠
    sixTaxTwo: '2027-12-31',    // 六税两费减半
    smallMicro: '2027-12-31',  // 小型微利企业
    threshold: '2027-12-31',   // 增值税起征点
  },
  // ---- 增值税附加（以实缴增值税为计税依据）----
  SURTAX: {
    city: { bj: 0.07, sh: 0.07, gz: 0.07, sz: 0.07, default: 0.07 },
    edu: 0.03,
    localEdu: 0.02,
    // 自然人非增值税纳税人通常不缴附加
  },
  // ---- 土地增值税 ----
  LVAT: {
    // 四级超率累进：增值额 ÷ 扣除项目合计
    brackets: [
      { max: 0.50, rate: 0.30, deduct: 0.00 },
      { max: 1.00, rate: 0.40, deduct: 0.05 },
      { max: 2.00, rate: 0.50, deduct: 0.15 },
      { max: Infinity, rate: 0.60, deduct: 0.35 },
    ],
    // 旧房转让加计 5% 扣除
    oldHouseDeductionRate: 0.05,
    // 房地产开发企业加计 20% 扣除
    devExtraDeductionRate: 0.20,
    // 开发费用扣除比例
    devExpenseWithInterest: 0.05,   // (土地+开发成本)×5%
    devExpenseNoInterest: 0.10,     // (土地+开发成本)×10%
  },
  // ---- 印花税（产权转移书据）----
  STAMP: { rate: 0.0005 },          // 万分之五
  // ---- 契税 ----
  // 法定幅度 3%-5%，由省级人大常委会决定；下表为已核实的常见省级适用税率
  DEED: {
    familyFirst:   { le140: 0.01, gt140: 0.015 },  // 家庭唯一住房
    familySecond:  { le140: 0.01, gt140: 0.02  },  // 家庭第二套住房
    familyThird:   null,                            // 第三套及以上不享受优惠，按属地法定税率
    // 属地法定税率（无省级差别时统一 3%）
    areaRate: {
      nj: 0.03, bj: 0.03, sh: 0.03, gz: 0.03, sz: 0.03,
      hebei: 0.04, liaoning: 0.04, hunan: 0.04, henan: 0.03,
      default: 0.03,
    },
    defaultAreaRate: 0.03,
  },
  // ---- 所得税 ----
  IIT: { personalTransfer: 0.20, dividend: 0.20 },   // 财产转让所得 20%
  CIT: { normal: 0.25, smallLow: 0.05 },            // 企业所得税 25% / 小型微利 5%
  PARTNERSHIP: { operating: { min: 0.05, max: 0.35 } }, // 经营所得 5%-35%
  // ---- 房产税 ----
  PROPERTY_TAX: { fromValue: 0.012, fromRent: 0.12, personalRentHousing: 0.04 },
  // ---- 城镇土地使用税（元/㎡·年，南京）----
  // 依据：宁政办发〔2019〕28号，自 2019-01-01 起执行
  LAND_USE_NANJING: [18, 15, 10, 7, 5, 3, 1.5],
  // ---- 房产税减除比例（江苏/南京 30%，苏政发〔1986〕172号）----
  PROPERTY_TAX_DEDUCT: { nj: 30, bj: 30, sh: 20, gz: 30, sz: 30, default: 30 },
  // ---- 小微企业普惠性税收减免（"六税两费"减半，至 2027.12.31）----
  SIX_TWO_HALF: { applicable: true, endsAt: '2027-12-31' },
};

const TEXT = {
  city: {
    bj: '北京市', sh: '上海市', gz: '广州市', sz: '深圳市', nj: '南京市', default: '其他地区',
  },
};

// 城建税适用税率（市区）
function citySurtaxRate(city, 区域) {
  // 《城市维护建设税法》第四条：市区 7%、县城/镇 5%、其他 1%
  if (区域 === '县城、镇' ) return 0.05;
  if (区域 === '其他地区') return 0.01;
  return RATE.SURTAX.city[city] ?? RATE.SURTAX.city.default;
}

/* ==========================================================================
 * 工具函数
 * ========================================================================== */
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const num = (n) => (Number(n) || 0);
const safeDiv = (a, b) => (b === 0 || !isFinite(a / b) ? 0 : a / b);
const numFmt = (n) => (Number(n) || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * 百分数统一解析 —— 所有「率」类字段的唯一入口
 * 约定：界面上的率类字段一律按「百分数」输入（填 5 表示 5%，填 0.5 表示 0.5%）
 * @param {*} v 原始输入
 * @param {number} fallback 解析失败时的默认值（**小数**形式，如 0.05）
 * @returns {number} 小数形式的比率（如 0.05）
 */
function pct(v, fallback = 0) {
  if (v === undefined || v === null || v === '') return fallback;
  let s = String(v).trim();
  if (s === '') return fallback;
  const hasSign = s.endsWith('%');
  if (hasSign) s = s.slice(0, -1).trim();
  const n = Number(s);
  if (!isFinite(n)) return fallback;
  // 显式带 % 号 → 一定是百分数
  if (hasSign) return n / 100;
  // 值 > 1 → 按百分数（5 = 5%）
  if (Math.abs(n) > 1) return n / 100;
  // 0 < 值 <= 1：视为百分数的小数部分（0.5 = 0.5%），因为约定率类字段填百分数
  // 但为避免把「0.05 表示 5%」的旧习惯算错，此处按约定解释为 0.05% = 0.0005
  // —— 界面已加 % 提示，故统一按百分数处理
  return n / 100;
}

/** 把整数/小数年份精确化：不做四舍五入，返回 {years, months, totalMonths} */
function preciseYears(fromDate, toDate) {
  if (!fromDate || !toDate || toDate <= fromDate) return { years: 0, months: 0, totalMonths: 0 };
  let totalMonths = (toDate.getFullYear() - fromDate.getFullYear()) * 12
    + (toDate.getMonth() - fromDate.getMonth());
  // 未满整月则减 1 月
  if (toDate.getDate() < fromDate.getDate()) totalMonths -= 1;
  if (totalMonths < 0) totalMonths = 0;
  return { years: Math.floor(totalMonths / 12), months: totalMonths % 12, totalMonths };
}

/**
 * 经营所得个人所得税税率表（年）
 * 依据：《个人所得税法》经营所得税率表
 */
const IIT_OPERATING_BRACKETS = [
  { max: 30000,   rate: 0.05, deduct: 0 },
  { max: 90000,   rate: 0.10, deduct: 1500 },
  { max: 300000,  rate: 0.20, deduct: 10500 },
  { max: 500000,  rate: 0.30, deduct: 40500 },
  { max: Infinity, rate: 0.35, deduct: 65500 },
];

/**
 * 通用超额累进计算（速算扣除数法）
 * @param {number} base 应纳税所得额
 * @param {Array<{max:number,rate:number,deduct:number}>} brackets 税率表
 */
function computeProgressive(base, brackets) {
  const b = Math.max(0, num(base));
  if (b <= 0) return { tax: 0, rate: 0, deduct: 0 };
  const br = brackets.find((x) => b <= x.max) || brackets[brackets.length - 1];
  const tax = Math.max(0, b * br.rate - br.deduct);
  return { tax: round2(tax), rate: br.rate, deduct: br.deduct };
}

/** 四级超率累进：增值额 ÷ 扣除项目合计 */
function computeLandVAT(增值额, 扣除项目合计) {
  if (扣除项目合计 <= 0) return { tax: 0, rate: 0, deduction: 0, 增值率: 0 };
  const 增值率 = safeDiv(增值额, 扣除项目合计);
  const br = RATE.LVAT.brackets.find((b) => 增值率 <= b.max) || RATE.LVAT.brackets[3];
  const tax = Math.max(0, 增值额 * br.rate - 扣除项目合计 * br.deduct);
  return {
    tax: round2(tax),
    rate: br.rate,
    deduction: br.deduct,
    增值率: round2(增值率 * 100),
  };
}

/* ==========================================================================
 * 增值税计算
 * 依据：《增值税法》(2026.1.1) + 实施条例(国务院令826号)
 *      财政部 税务总局公告2025年第17号、2026年第9号、2026年第10号
 * 返回 { 计税方式, 销项税额, 计税依据, 不含税收入, 可抵扣进项 }
 * ========================================================================== */
function computeVAT(p) {
  const {
    主体类型, 资产类型, 房产取得时间, 成交总价, 购置原价, 建造开工时间,
  } = p;
  const 是自建 = String(p.是否自建) === '是';
  const isNatural = 主体类型 === '自然人';
  const isSmall = String(主体类型 || '').includes('小规模');
  const isDev = String(主体类型 || '').includes('开发企业');
  const price = num(成交总价);

  // ---------- 自然人 ----------
  if (isNatural) {
    // 自然人（含个体工商户一般纳税人除外）视为小规模纳税人，实施条例第七条
    if (资产类型 === '住宅类') {
      // 个人销售住房：满 2 年免征；不足 2 年按 3% 全额
      // 注意：个人销售住房不适用差额计税（2026年第10号公告四(八)）
      if (resolveHoldingYears(p) >= 2) {
        return {
          计税方式: '免征（满 2 年）', 征收率: 0, 可抵扣进项: false,
          销项税额: 0, 计税依据: 0, 不含税收入: price,
        };
      }
      const rate = RATE.VAT.INDIV_2YEAR;
      return {
        计税方式: '简易计税（全额 3%）', 征收率: rate, 可抵扣进项: false,
        销项税额: round2(price / (1 + rate) * rate), 计税依据: price,
        不含税收入: round2(price / (1 + rate)),
        政策依据: '财政部 税务总局公告2025年第17号（2026.1.1 起，5%→3%）',
      };
    }
    // 自然人转让商办厂房类：3% 简易计税；外购（不含自建）可差额
    // ⚠️ 差额计税为地方执行口径不一事项 → 由开关 自然人商办允许差额 控制
    //    依据：财政部 税务总局公告2026年第10号公告第四条（八）
    //    文义支持自然人作为小规模纳税人扣除购置原价，但部分地区执行口径不同
    const rate = RATE.VAT.SMALL_3;
    const 允许差额 = p.自然人商办允许差额 !== false && p.自然人商办允许差额 !== '否';
    const 用差额 = !是自建 && 允许差额;
    const base = 用差额 ? Math.max(0, price - num(购置原价)) : price;
    return {
      计税方式: 用差额 ? '简易计税（差额 3%）' : '简易计税（全额 3%）',
      征收率: rate, 可抵扣进项: false,
      销项税额: round2(base / (1 + rate) * rate), 计税依据: round2(base),
      不含税收入: round2(price - round2(base / (1 + rate) * rate)),
      政策依据: '《增值税法》第十一条、实施条例第七条、2026年第10号公告四(八)',
      提示: 用差额
        ? '自然人非一般纳税人，不适用 9% 一般计税；外购不动产按差额计税（地方执行口径不一，请与主管税务机关确认）'
        : '自然人非一般纳税人，不适用 9% 一般计税；当前按全额 3% 计税（该地区不允许差额扣除）',
    };
  }

  // ---------- 小规模纳税人（含小规模公司/合伙）----------
  if (isSmall) {
    // ⚠️ 不动产销售不适用"3% 减按 1%"（2026年第10号公告第三条(三)6）
    const rate = RATE.VAT.SMALL_3;
    const base = 是自建 ? price : Math.max(0, price - num(购置原价));
    return {
      计税方式: 是自建 ? '简易计税（全额 3%）' : '简易计税（差额 3%）',
      征收率: rate, 可抵扣进项: false,
      销项税额: round2(base / (1 + rate) * rate), 计税依据: round2(base),
      不含税收入: round2(price - round2(base / (1 + rate) * rate)),
      政策依据: '《增值税法》第十一条；不动产销售不适用 3% 减按 1%（2026年第10号公告）',
      提示: '不动产销售不适用小规模纳税人 3% 减按 1% 优惠',
    };
  }

  // ---------- 房地产开发企业 ----------
  if (isDev) {
    if (p.开发销售模式 === '正常房产销售') {
      // 按施工许可合同开工日：2016.4.30 前为房地产老项目
      if (建造开工时间 === '2016.4.30前') {
        const rate = RATE.VAT.SIMPLE_OLD;
        return {
          计税方式: '简易计税 5%（房地产老项目）', 征收率: rate, 可抵扣进项: false,
          销项税额: round2(price / (1 + rate) * rate), 计税依据: price,
          不含税收入: round2(price / (1 + rate)),
          政策依据: '2026年第10号公告第三条(二)4，5% 优惠至 2027-12-31',
        };
      }
      const rate = RATE.VAT.GENERAL;
      const 土地价款 = num(p.土地价款);
      const base = Math.max(0, price - 土地价款);
      return {
        计税方式: '一般计税 9%（房地产新项目）', 征收率: rate, 可抵扣进项: true,
        销项税额: round2(base / (1 + rate) * rate), 计税依据: round2(base),
         不含税收入: round2(price - round2(base / (1 + rate) * rate)),
        政策依据: '《增值税法》第十条；销售款项 − 向政府支付的土地价款',
      };
    }
    // 自建办证后再转让：按建设时间适用简易 5% 或一般计税 9%
    if (p.建设完成时间 === '2016.4.30前') {
      const rate = RATE.VAT.SIMPLE_OLD;
      return {
        计税方式: '简易计税 5%（全额）', 征收率: rate, 可抵扣进项: false,
         销项税额: round2(price / (1 + rate) * rate), 计税依据: price,
        不含税收入: round2(price / (1 + rate)),
        政策依据: '2026年第10号公告第三条(二)4，5% 优惠至 2027-12-31',
      };
    }
    const rate = RATE.VAT.GENERAL;
    return {
      计税方式: '一般计税 9%', 征收率: rate, 可抵扣进项: true,
      销项税额: round2(price * rate / (1 + rate)), 计税依据: price,
      不含税收入: round2(price / (1 + rate)),
      政策依据: '《增值税法》第十条',
    };
  }

  // ---------- 一般纳税人（公司/合伙，非房企）----------
  // 简易计税 5% 仅限 2016.4.30 前取得，且仅"不含自建"可扣除购置原价
  if (房产取得时间 === '2016.4.30前') {
    const rate = RATE.VAT.SIMPLE_OLD;
    const base = 是自建 ? price : Math.max(0, price - num(购置原价));
    return {
      计税方式: '简易计税（差额 5%）', 征收率: rate, 可抵扣进项: false,
      销项税额: round2(base / (1 + rate) * rate), 计税依据: round2(base),
      不含税收入: round2(price - round2(base / (1 + rate) * rate)),
      政策依据: '2026年第10号公告第三条(二)4（至 2027-12-31）、第三条(四)2（36个月锁定）',
    };
  }
  const rate = RATE.VAT.GENERAL;
  return {
    计税方式: '一般计税 9%', 征收率: rate, 可抵扣进项: true,
    销项税额: round2(price * rate / (1 + rate)), 计税依据: price,
    不含税收入: round2(price / (1 + rate)),
    政策依据: '《增值税法》第十条',
  };
}

/* ==========================================================================
 * 增值税附加（城建税、教育费附加、地方教育附加）
 * 计税依据：实缴增值税（实缴增值税 = 销项税额 - 进项税额）
 * ========================================================================== */
function computeSurtax(p, 实缴增值税) {
  const base = num(实缴增值税);
  if (base <= 0) return { 城建税: 0, 教育费附加: 0, 地方教育附加: 0, 合计: 0, 说明: '实缴增值税为 0，不计附加' };
  const city = citySurtaxRate(p.城市 || 'default', p.所在区域);
  const 城建税 = round2(base * city);
  const eduRate = (p.eduSurtax !== undefined && p.eduSurtax !== null && p.eduSurtax !== '')
    ? num(p.eduSurtax) / 100 : RATE.SURTAX.edu;
  const localEduRate = (p.localEduSurtax !== undefined && p.localEduSurtax !== null && p.localEduSurtax !== '')
    ? num(p.localEduSurtax) / 100 : RATE.SURTAX.localEdu;
  const 教育费附加 = round2(base * eduRate);
  const 地方教育附加 = round2(base * localEduRate);
  // 【修复问题16】统一资格判定：小规模纳税人 / 小型微利企业 / 个体工商户
  // 依据：财政部 税务总局公告2023年第12号
  const useHalf = qualifiesSixTaxesHalved(p.主体类型, p);
  const half = useHalf ? 0.5 : 1;
  return {
    城建税: round2(城建税 * half),
    教育费附加: round2(教育费附加 * half),
    地方教育附加: round2(地方教育附加 * half),
    合计: round2((城建税 + 教育费附加 + 地方教育附加) * half),
    说明: half < 1 ? '小规模纳税人享受“六税两费”减半（财政部 税务总局公告2023年第12号）' : '',
  };
}

/* ==========================================================================
 * 土地增值税
 * ========================================================================== */

/* --------------------------------------------------------------------------
 * 旧房转让：发票加计年数计算
 * 依据：国税函〔2010〕220号第七条
 * 自购房发票所载日期起至售房发票开具之日止，每满12个月计一年；
 * 超过1年未满12个月但超过6个月的，按一年计算；未超过6个月的，不计年。
 *
 * 数据来源优先级：
 *   1) 购房发票日期 + 售房发票日期（精确到日，按上述规则计年）
 *   2) 直接填写的持有年限（年）——向下取整，最少 1 年
 *   3) 均无 → 0 年（不加计），并由界面提示
 * -------------------------------------------------------------------------- */

/**
 * 持有年限统一解析（年）
 * 优先级：买入/卖出日期自动推算 > 直接填写的持有年限
 * 返回 0 表示未提供
 */
function resolveHoldingYears(p) {
  const 买入 = parseDate(p.购房发票日期);
  const 卖出 = parseDate(p.售房发票日期) || new Date();
  if (买入 && 卖出 > 买入) {
    // 精确到月，不四舍五入（避免 1年7个月被算成 2年而错误免税）
    const py = preciseYears(买入, 卖出);
    return Math.max(0, py.years + py.months / 12);
  }
  const y = num(p.持有年限);
  return y > 0 ? y : 0;
}

/** 日期字符串 → Date（无效返回 null） */
function parseDate(s) {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s).trim());
  if (!m) return null;
  const Y = Number(m[1]), M = Number(m[2]), D = Number(m[3]);
  const d = new Date(Y, M - 1, D);
  if (isNaN(d.getTime())) return null;
  // 【修复问题33】拒绝「非法日期自动滚动」（如 2026-02-30 会变成 3月2日）
  if (d.getFullYear() !== Y || d.getMonth() !== M - 1 || d.getDate() !== D) return null;
  return d;
}

/**
 * 计算发票加计年数
 * @returns {{years:number, source:string, detail:string}}
 */
function calcInvoiceYears(p) {
  const 买入 = parseDate(p.购房发票日期);
  const 卖出 = parseDate(p.售房发票日期);

  if (买入 && 卖出) {
    if (卖出 <= 买入) {
      return { years: 0, source: 'date-error', detail: '卖出日期不早于买入日期' };
    }
    // 按「满12个月计一年」计算整年数
    let years = Math.floor((卖出 - 买入) / (365.25 * 24 * 3600 * 1000));
    // 精确按日历校正，避免 365.25 的取整误差
    const approx = new Date(买入.getTime());
    approx.setFullYear(approx.getFullYear() + years);
    if (approx > 卖出) {
      years -= 1;
      approx.setFullYear(approx.getFullYear() - 1);
    }
    // 超过1年未满12个月但超过6个月的，按一年计算；未超过6个月的，不计年
    const next = new Date(approx.getTime());
    next.setFullYear(next.getFullYear() + 1);
    if (years >= 1 && 卖出 > next) {
      // 满一年
    } else if (years >= 1) {
      // 不足一年：剩余月份 > 6 则计一年
      const months = (卖出 - approx) / (30.44 * 24 * 3600 * 1000);
      if (months > 6) years += 1;
    } else {
      // 不足一年的情形
      const months = (卖出 - 买入) / (30.44 * 24 * 3600 * 1000);
      if (months > 6) years = 1;
    }
    const mFrom = (买入.getMonth() + 1), dFrom = 买入.getDate();
    const mTo = (卖出.getMonth() + 1), dTo = 卖出.getDate();
    return {
      years: Math.max(0, years), source: 'date',
      detail: `${买入.getFullYear()}-${String(mFrom).padStart(2,'0')}-${String(dFrom).padStart(2,'0')} 至 ` +
              `${卖出.getFullYear()}-${String(mTo).padStart(2,'0')}-${String(dTo).padStart(2,'0')}`,
    };
  }

  const y = num(p.持有年限);
  if (y > 0) {
    // 【修复问题33】按整年计（满12个月计1年），不足1年不计加计
    // 原实现 Math.max(1, Math.floor(y)) 会把 0.1 年也算成 1 年
    const yy = Math.floor(y);
    return { years: yy, source: 'manual', detail: `按填写年限 ${y} 年计（不足1年不计加计）` };
  }
  return { years: 0, source: 'none', detail: '未填写买入/卖出日期或持有年限' };
}

/* --------------------------------------------------------------------------
 * 旧房转让：发票类型 → 加计扣除基数
 * 依据：国税函〔2010〕220号、财税〔2006〕21号第二条
 *  - 营业税发票：票面金额（含税价）
 *  - 增值税普通发票：票面金额（价税合计）
 *  - 增值税专用发票：不含税金额 + 不得抵扣的进项税额
 * -------------------------------------------------------------------------- */
function invoiceBase(发票类型, 发票金额, 专票不得抵扣进项) {
  const type = 发票类型 || '增值税普通发票';
  const amt = num(发票金额);
  if (type === '营业税发票') return amt;
  if (type === '增值税专用发票') return round2(amt + num(专票不得抵扣进项));
  return amt; // 增值税普通发票：价税合计
}

function computeLandVATFull(p, vatResult) {
  const { 主体类型, 资产类型 } = p;
  const isDev = String(主体类型 || '').includes('开发企业');
  const isNatural = 主体类型 === '自然人';

  // 自然人转让住房：暂免
  if (isNatural && 资产类型 === '住宅类') {
    return { 税额: 0, 说明: '个人转让住房暂免征土地增值税', 扣除项目合计: 0, 增值额: 0, 增值率: 0 };
  }

  const 不含税收入 = vatResult.不含税收入;

  // ---- 扣除方式显式选择（三种情形，避免界面混乱）----
  //  '房企新建' = 开发企业新建商品房（加计20%）
  //  '评估价格' = 旧房转让按评估价格扣除
  //  '发票加计' = 旧房转让按购房发票金额每年加计5%
  const 扣除方式选择 = p['土地增值税扣除方式'] || '';

  // ---- 情形一：开发企业 · 新建商品房（加计 20%），四级超率累进 ----
  if (扣除方式选择 === '房企新建' || (!扣除方式选择 && isDev && p.开发销售模式 === '正常房产销售')) {
    const 土地金额 = num(p.土地价款) + num(p.取得土地支付的契税等);
    const 开发成本 = num(p.已发生开发成本);
    // 转让环节税金：含城建税、教育费附加、地方教育附加及印花税
    // 依据：国家税务总局公告2026年第3号第五条
    // 【修复问题8】转让环节税金含附加税费（条例第六条(四)）
    const 转让税金 = round2(num(p.转让环节税金) + num(p.卖方印花税额) + num(p.卖方附加税费额));
    const 利息 = num(p.利息费用);
    const 可提供利息证明 = p.可提供利息证明 === '是';

    // 开发费用比例：省级参数可覆盖 5%/10%（国税函〔2010〕220号）
    const 有息比例 = (p.devExpenseRate !== undefined && p.devExpenseRate !== null && p.devExpenseRate !== '')
      ? num(p.devExpenseRate) / 100 : RATE.LVAT.devExpenseWithInterest;
    const 无息比例 = (p.devExpenseRate !== undefined && p.devExpenseRate !== null && p.devExpenseRate !== '')
      ? num(p.devExpenseRate) * 2 / 100 : RATE.LVAT.devExpenseNoInterest;
    let 开发费用;
    let 利息提示 = '';
    if (可提供利息证明) {
      // 【修复问题25/26】利息须能按项目分摊、提供金融机构证明，且不超过商业银行同期同类贷款利率
      // 依据：《土地增值税暂行条例实施细则》第七条(三)
      开发费用 = round2(利息 + (土地金额 + 开发成本) * 有息比例);
      利息提示 = '；利息须按项目分摊、有金融机构证明，且不超过商业银行同期同类贷款利率，超出部分不得扣除';
    } else {
      开发费用 = round2((土地金额 + 开发成本) * 无息比例);
      利息提示 = '；未提供利息证明，按(土地+开发成本)的10%以内计算扣除';
    }
    const 加计扣除 = round2((土地金额 + 开发成本) * RATE.LVAT.devExtraDeductionRate);
    const 扣除项目合计 = round2(土地金额 + 开发成本 + 开发费用 + 转让税金 + 加计扣除);
    const 增值额 = round2(不含税收入 - 扣除项目合计);
    const r = computeLandVAT(增值额, 扣除项目合计);
    return {
      ...r, 税额: r.tax, 增值额, 扣除项目合计, 不含税收入,
      扣除明细: { 土地金额, 开发成本, 开发费用, 转让税金, 加计扣除 },
      说明: '房地产开发企业销售新建商品房，四级超率累进；加计 20% 扣除' + (利息提示 || ''),
    };
  }

  // ---- 旧房转让（非房地产开发企业转让，或开发企业转让自建办证后房产）----
  // 扣除方式：评估价格 / 发票金额每年加计 5% / 核定征收
  const 评估价格 = num(p.评估价格);
  const 发票金额 = num(p.购房发票金额);
  const 持有年限 = resolveHoldingYears(p);
  let 扣除项目合计 = 0;
  let 扣除方式 = '';
  let 核定征收率 = 0;
  let 加计年数明细 = null;

  const 走评估 = 扣除方式选择 === '评估价格' || (!扣除方式选择 && 评估价格 > 0);
  const 走发票 = 扣除方式选择 === '发票加计' || (!扣除方式选择 && !(评估价格 > 0) && 发票金额 > 0);

  if (走评估) {
    if (!(评估价格 > 0)) {
      return {
        税额: 0, 需补充资料: true, 扣除方式: '资料不足',
        扣除项目合计: 0, 增值额: 0, 增值率: 0, 不含税收入,
        说明: '⚠️ 已选择「评估价格扣除」，请填写「评估价格」；若无法取得评估报告，可改用「发票加计」或勾选核定征收。',
      };
    }
    // 【修复问题25】评估价格应涵盖：旧房及建筑物评估价 + 取得土地使用权支付金额
    // + 评估费用 + 相关税金；此处仅取评估价一个数，需用户确认金额完整性
    扣除方式 = '评估价格扣除（请确认评估价是否已含土地取得成本与评估费用）';
    扣除项目合计 = 评估价格;
  } else if (走发票) {
    if (!(发票金额 > 0)) {
      return {
        税额: 0, 需补充资料: true, 扣除方式: '资料不足',
        扣除项目合计: 0, 增值额: 0, 增值率: 0, 不含税收入,
        说明: '⚠️ 已选择「发票金额加计 5%」，请填写「购房发票金额」；若无法取得购房发票，可改用评估价格或勾选核定征收。',
      };
    }
    // 加计基数按发票类型确定；加计年数按国税函〔2010〕220号第七条
    const yr = calcInvoiceYears(p);
    const 加计年数 = yr.years;
    const 基数 = invoiceBase(p.购房发票类型, 发票金额, p.专票不得抵扣进项);
    const 年数来源 = yr.source === 'date' ? '按买入/卖出日期计算'
      : (yr.source === 'manual' ? '按填写年限计算' : '未提供');
    扣除方式 = `发票金额每年加计 ${RATE.LVAT.oldHouseDeductionRate * 100}% 扣除（${加计年数} 年，${年数来源}；基数 ${numFmt(基数)}）`;
    扣除项目合计 = round2(基数 * (1 + RATE.LVAT.oldHouseDeductionRate * 加计年数));
    加计年数明细 = yr;
  } else {
    // 【修复问题19】核定征收必须由用户显式勾选（须符合法定情形）
    // 依据：《土地增值税暂行条例》第九条——仅在隐瞒虚报成交价、扣除项目金额不实、
    //      转让价格低于评估价且无正当理由等情形下，才按核定/评估价格计算征收
    const 允许核定 = (p.lvatUseApproved === '是' || p.lvatUseApproved === true);
    if (!允许核定) {
      return {
        税额: 0, 需补充资料: true, 扣除方式: '资料不足',
        扣除项目合计: 0, 增值额: 0, 增值率: 0, 不含税收入,
        说明: '⚠️ 缺少评估价格或购房发票，无法按查账方式计算。若符合核定征收法定情形，请在界面勾选「使用核定征收」。',
      };
    }
    扣除方式 = '核定征收（用户勾选）';
    // 核定征收率：地区参数 > 用户手工输入 > 全国默认 5%
    核定征收率 = (p.lvatApprovedRate !== undefined && p.lvatApprovedRate !== null && p.lvatApprovedRate !== '')
      ? pct(p.lvatApprovedRate, 0.05)
      : pct(p.核定征收率, 0.05);
    扣除项目合计 = 0;
    const 增值额 = 不含税收入;
    const r = computeLandVAT(增值额, 扣除项目合计 || 1);
    // 核定征收：按不含税收入直接乘征收率
    const tax = round2(不含税收入 * 核定征收率);
    return {
      税额: tax, 核定征收: true, 核定征收率, 扣除方式, 扣除项目合计: 0,
      增值额, 增值率: 0, 不含税收入,
      说明: `核定征收：不含税收入 × ${(核定征收率 * 100).toFixed(1)}%`,
    };
  }

  // 开发企业转让自建办证后房产：加计 20% 扣除（针对土地与开发成本）
  let 加计扣除 = 0;
  if (isDev) {
    加计扣除 = round2((num(p.土地价款) + num(p.已发生开发成本)) * RATE.LVAT.devExtraDeductionRate);
  }
  // 转让环节税金可扣除（含印花税；购房契税可扣但不计入加计基数）
  const 转让税金 = round2(num(p.转让环节税金) + num(p.卖方印花税额) + num(p.购房契税) + num(p.卖方附加税费额));

  const totalDeduct = round2(扣除项目合计 + 加计扣除 + 转让税金);
  const 增值额 = round2(不含税收入 - totalDeduct);
  const r = computeLandVAT(增值额, totalDeduct);
  return {
    ...r, 税额: r.tax, 增值额, 扣除项目合计: totalDeduct, 不含税收入,
    扣除方式, 加计扣除, 转让税金, 加计年数明细,
    说明: `旧房转让：${扣除方式}`,
  };
}

/* ==========================================================================
 * 印花税（产权转移书据，万分之五）
 * 依据：《印花税法》第五条第二款 —— 计税依据为所载金额，不包括增值税
 * 住房免征：财税〔2008〕137号第二条（个人销售或购买住房暂免征收印花税）
 * ========================================================================== */
function computeStamp(p, side) {
  const { 资产类型 } = p;
  const 主体类型 = side === '卖方' ? p.主体类型 : (p.买方主体类型 || p.主体类型);
  // 【修复问题16】与附加税口径一致：小规模 / 小微 / 个体户
  const half = qualifiesSixTaxesHalved(主体类型, p) ? 0.5 : 1;

  // 计税依据：不含增值税的成交金额
  const 成交总价 = num(p.成交总价);
  const 增值税额 = side === '卖方' ? num(p.卖方增值税额) : num(p.买方增值税额);
  const 计税依据 = round2(Math.max(0, 成交总价 - 增值税额));

  if (主体类型 === '自然人') {
    if (资产类型 === '住宅类') {
      return {
        税额: 0, 税率: 0, 计税依据,
        说明: '个人销售/购买住房暂免征收印花税（财税〔2008〕137号第二条，执行至2027-12-31）',
      };
    }
    const tax = round2(计税依据 * RATE.STAMP.rate);
    return { 税额: tax, 税率: RATE.STAMP.rate, 计税依据, 说明: '产权转移书据 万分之五（不含增值税）' };
  }
  const tax = round2(计税依据 * RATE.STAMP.rate * half);
  return {
    税额: tax, 税率: RATE.STAMP.rate, 计税依据,
    说明: '产权转移书据 万分之五（不含增值税）' +
      (half < 1 ? '，小规模纳税人“六税两费”减半' : ''),
  };
}

/* ==========================================================================
 * 契税（买方）
 * ========================================================================== */
function computeDeedTax(p) {
  const { 资产类型 } = p;
  const 主体类型 = p.买方主体类型 || p.主体类型;
  // 计税依据：不含增值税成交价
  // 依据：印花税法第五条二款；契税执行口径公告2021年第23号第二条第（九）项
  const 成交总价 = num(p.成交总价);
  const 增值税 = num(p.买方增值税额);
  const 计税依据 = round2(Math.max(0, 成交总价 - 增值税));

  // 属地法定税率（法定幅度 3%-5%，由省级人大常委会决定）
  // 优先级：地区参数（p.deedTaxRate，小数）> 内置回退表 > 全国默认 3%
  const 城市 = p.城市 || 'default';
  // 【修复问题31】非住宅可适用地区单独税率（如河南 4%），优先于通用 deedTaxRate
  const 用非住宅率 = (资产类型 !== '住宅类')
    && p.deedTaxRateNonResidential !== undefined && p.deedTaxRateNonResidential !== null
    && p.deedTaxRateNonResidential !== '';
  const areaRate = 用非住宅率
    ? num(p.deedTaxRateNonResidential)
    : ((p.deedTaxRate !== undefined && p.deedTaxRate !== null && p.deedTaxRate !== '')
        ? num(p.deedTaxRate)
        : (RATE.DEED.areaRate[城市] ?? RATE.DEED.defaultAreaRate));

  // 企业/合伙企业：按属地法定税率，不享受住房优惠
  if (主体类型 !== '自然人') {
    return {
      税额: round2(计税依据 * areaRate), 税率: areaRate, 计税依据,
      说明: `企业/合伙企业适用属地法定税率 ${(areaRate * 100).toFixed(2)}%（《契税法》法定幅度 3%-5%，由省级人大常委会确定）`,
    };
  }

  // 个人购买非住房：不享受住房优惠
  if (资产类型 !== '住宅类') {
    return {
      税额: round2(计税依据 * areaRate), 税率: areaRate, 计税依据,
      说明: `个人购买非住房（商办厂房/车库）不享受住房优惠，适用属地法定税率 ${(areaRate * 100).toFixed(0)}%`,
    };
  }

  const 套数 = p.住房套数 || '家庭唯一住房';
  const 面积 = num(p.建筑面积);
  const isBeijingSHGZSZ = ['bj', 'sh', 'gz', 'sz'].includes(城市);
  let rate;
  let 说明;

  if (套数 === '家庭唯一住房') {
    rate = 面积 <= 140 ? RATE.DEED.familyFirst.le140 : RATE.DEED.familyFirst.gt140;
    说明 = `家庭唯一住房，房屋建筑面积 ${面积}㎡：${rate * 100}%`;
  } else if (套数 === '家庭第二套住房') {
    rate = 面积 <= 140 ? RATE.DEED.familySecond.le140 : RATE.DEED.familySecond.gt140;
    说明 = `家庭第二套住房，房屋建筑面积 ${面积}㎡：${rate * 100}%`;
  } else {
    // 第三套及以上：不享受任何优惠，按属地法定税率
    rate = areaRate;
    说明 = `家庭第三套及以上住房不享受税收优惠，适用属地法定税率 ${(areaRate * 100).toFixed(0)}%`;
  }
  if (isBeijingSHGZSZ && 套数 !== '家庭第三套及以上住房') {
    说明 += '（京沪广深可统一执行该优惠标准）';
  }
  return { 税额: round2(计税依据 * rate), 税率: rate, 计税依据, 说明 };
}

/* ==========================================================================
 * 所得税（卖方）
 * ========================================================================== */
function computeIncomeTax(p, vatResult) {
  const { 主体类型, 资产类型 } = p;
  const 收入 = num(p.成交总价);
  const isNatural = 主体类型 === '自然人';
  const isPartner = String(主体类型 || '').includes('有限合伙');
  const isDev = String(主体类型 || '').includes('开发企业');
  const isSmall = String(主体类型 || '').includes('小规模');

  // ---- 自然人 ----
  if (isNatural) {
    if (资产类型 === '住宅类') {
      const 持有年限 = resolveHoldingYears(p);
      if (p.满五唯一 === '是') {
        return {
          税额: 0, 税率: 0, 应纳税所得额: 0, 说明: '“满五唯一”免征个人所得税（财税字〔1999〕278号）',
        };
      }
      // 收入取不含税收入（问题3）；扣除财产原值（问题2）；税金含附加+印花+土增（问题9）
      const 不含税收入0 = num(vatResult && vatResult.不含税收入) > 0 ? num(vatResult.不含税收入) : 收入;
      const 收入额 = num(p.核定征收收入额) > 0 ? num(p.核定征收收入额) : 不含税收入0;
      const 原值 = num(p.购置原价);
      const 费用 = num(p.合理费用);
      const 税金 = num(p.卖方可扣除税金);
      const 应纳税所得额 = round2(Math.max(0, 收入额 - 原值 - 费用 - 税金));
      const tax = round2(应纳税所得额 * RATE.IIT.personalTransfer);
      return {
        税额: tax, 税率: RATE.IIT.personalTransfer, 应纳税所得额, 收入额,
        说明: `财产转让所得 20%；应纳税所得额 = 转让收入（不含税 ${numFmt(收入额)}） − 原值 ${numFmt(原值)} − 合理费用 ${numFmt(费用)} − 税金 ${numFmt(税金)}`,
      };
    }
    // 自然人转让商办厂房：财产转让所得 20%，核定/查账征收
    // 收入取不含税收入（问题3）；扣除财产原值（问题2）
    const 不含税收入1 = num(vatResult && vatResult.不含税收入) > 0 ? num(vatResult.不含税收入) : 收入;
    const 收入额 = num(p.核定征收收入额) > 0 ? num(p.核定征收收入额) : 不含税收入1;
    const 原值1 = num(p.购置原价);
    const 费用 = num(p.合理费用);
    const 税金1 = num(p.卖方可扣除税金);
    const 应纳税所得额 = round2(Math.max(0, 收入额 - 原值1 - 费用 - 税金1));
    const tax = round2(应纳税所得额 * RATE.IIT.personalTransfer);
    // 【修复问题18】核定征收必须由用户显式勾选（能提供原值凭证的应据实征收）
    // 依据：国税发〔2006〕108号——能提供完整准确原值凭证的据实征收，不能提供的才核定
    const 允许个税核定 = (p.iitUseApproved === '是' || p.iitUseApproved === true);
    const 核定比例 = 允许个税核定 ? pct(p.iitApprovedRate, 0) : 0;
    if (核定比例 > 0) {
      const 核定税额 = round2(收入额 * 核定比例);
      return {
        税额: 核定税额, 税率: 核定比例, 应纳税所得额: 收入额, 收入额, 核定征收: true,
        说明: `核定征收：转让收入 × ${(核定比例 * 100).toFixed(1)}%（地区参数，原值凭证不完整时适用）`,
      };
    }
    return {
      税额: tax, 税率: RATE.IIT.personalTransfer, 应纳税所得额, 收入额,
      说明: '财产转让所得 20%（若原值凭证不完整，可按当地核定征收比例计算，请手工填写核定比例）',
    };
  }

  // ---- 有限合伙企业：不缴企业所得税，穿透至合伙人 ----
  if (isPartner) {
    // 【修复问题32】亏损（负利润）不产生税负，按 0 计税并提示可结转
    // 依据：《企业所得税法》第十八条（亏损结转以后年度弥补）
    const 利润原始 = num(p.应纳税所得额_企业);
    const 利润 = round2(Math.max(0, 利润原始));
    const 亏损 = 利润原始 < 0 ? 利润原始 : 0;
    const 自然人合伙人占比 = num(p.自然人合伙人利润占比) / 100;
    const 自然人部分 = round2(利润 * 自然人合伙人占比);
    const 法人部分 = round2(利润 - 自然人部分);
    const 按经营所得 = p.合伙人个税计税方式 === '经营所得 5%-35%';
    let 自然人税;
    if (按经营所得) {
      // 【修复问题21】经营所得 5%~35% 超额累进（原实现直接乘最高档 35%，严重高估）
      // 依据：《个人所得税法》经营所得税率表；财税〔2000〕91号
      const prog = computeProgressive(自然人部分, IIT_OPERATING_BRACKETS);
      自然人税 = prog.tax;
    } else {
      自然人税 = round2(自然人部分 * RATE.IIT.personalTransfer);
    }
    const 法人税 = round2(法人部分 * RATE.CIT.normal);
    return {
      税额: round2(自然人税 + 法人税), 穿透: true,
      自然人合伙人税: 自然人税, 法人合伙人税: 法人税,
      合伙企业利润: 利润, 自然人合伙人占比,
      说明: '合伙企业不缴企业所得税，穿透至合伙人（财税〔2008〕159号）',
    };
  }

  // ---- 企业 ----
  const 利润 = num(p.应纳税所得额_企业);
  let rate = RATE.CIT.normal;
  let 说明 = '企业所得税 25%';
  if (p.符合小型微利企业 === '是') {
    rate = RATE.CIT.smallLow;
    说明 = '符合小型微利企业条件，实际税率 5%（25%×20%，财政部 税务总局公告2023年第12号，至2027-12-31）';
  }
  const tax = round2(利润 * rate);
  return { 税额: tax, 税率: rate, 应纳税所得额: 利润, 说明 };
}

/* ==========================================================================
 * 持有环节：房产税
 * ========================================================================== */

/**
 * 房产税从价计征减除比例（小数形式，如 0.30）
 * 优先级：地区参数（p.propertyTaxDeduct）> 用户手工选择（p.减除比例）> 全国默认 30%
 */
function pickDeduct(p) {
  if (p.propertyTaxDeduct !== undefined && p.propertyTaxDeduct !== null && p.propertyTaxDeduct !== '') {
    const v = num(p.propertyTaxDeduct);
    if (v > 0) return v > 1 ? v / 100 : v;   // 兼容 30 与 0.30 两种写法
  }
  const manual = num(p.减除比例);
  if (manual > 0) return manual / 100;
  return 0.30;
}

function computePropertyTax(p) {
  const { 持有环节用途 } = p;
  const 主体类型 = p.持有主体类型 || p.主体类型;
  const isNatural = 主体类型 === '自然人';
  const 自用 = 持有环节用途 === '自用';

  // 六税两费减半：适用于小规模纳税人、小型微利企业、个体工商户
  // ⚠️ 一般纳税人若符合小型微利企业条件同样减半
  const half = qualifiesSixTaxesHalved(主体类型, p) ? 0.5 : 1;

  if (自用) {
    // 自然人非营业用房免征
    if (isNatural && p.是否营业用房 !== '是') {
      return { 税额: 0, 计税方式: '免征', 说明: '个人所有非营业用的房产免征房产税（国发〔1986〕90号）' };
    }
    const 原值 = num(p.房产原值);
    // 【修复问题22】优先取地区参数（pickDeduct 内部已处理手工选择与默认值）
    const 减除比例 = pickDeduct(p);
    const 计税依据 = round2(原值 * (1 - 减除比例));
    const tax = round2(计税依据 * RATE.PROPERTY_TAX.fromValue * half);
    return {
      税额: tax, 计税方式: '从价计征', 计税依据, 税率: RATE.PROPERTY_TAX.fromValue,
      减半: half < 1,
      说明: `房产原值 ×(1−${(减除比例 * 100).toFixed(0)}%) × 1.2%${half < 1 ? ' × 50%（六税两费减半）' : ''}（年）`,
    };
  }

  // ---- 出租：从租计征 ----
  const 租金收入 = num(p.年租金收入);
  const 住房出租 = p.出租标的 === '住房';
  const 承租人类型 = p.承租人类型 || '其他企业';   // 个人 | 专业化规模化住房租赁企业 | 其他企业
  let rate = RATE.PROPERTY_TAX.fromRent;
  let 说明 = '不含增值税租金 × 12%';

  if (住房出租) {
    // 【修复问题23】区分两类主体，原实现把「承租人条件」错误套用到个人身上：
    //   ① 个人（自然人）出租住房：不区分用途，一律减按 4% —— 财税〔2008〕24号
    //   ② 单位出租住房：仅向个人/专业化规模化住房租赁企业出租时减按 4% —— 2021年第24号
    const 合规承租人 = 承租人类型 === '个人' || 承租人类型 === '专业化规模化住房租赁企业';
    if (isNatural) {
      rate = RATE.PROPERTY_TAX.personalRentHousing;
      说明 = '个人出租住房，不区分用途，减按 4%（财税〔2008〕24号）';
    } else if (合规承租人) {
      rate = RATE.PROPERTY_TAX.personalRentHousing;
      说明 = `单位出租住房减按 4%（承租人：${承租人类型}，2021年第24号）`;
    } else {
      说明 = '单位出租住房且承租人不符合条件，按 12%（须为个人或专业化规模化住房租赁企业）';
    }
  }
  const 不含税租金 = round2(租金收入 / (1 + pct(p.租金增值税率)));
  const 计税依据 = 不含税租金;
  const tax = round2(计税依据 * rate * half);
  return {
    税额: tax, 计税方式: '从租计征', 计税依据, 税率: rate, 减半: half < 1,
    说明: 说明 + (half < 1 ? ' × 50%（六税两费减半）' : '') + '（年）',
  };
}

/* ==========================================================================
 * “六税两费”减半资格判定
 * 依据：财政部 税务总局公告2023年第12号（2023.1.1 至 2027.12.31）
 * 适用主体：增值税小规模纳税人、小型微利企业、个体工商户
 * ⚠️ 一般纳税人若符合小型微利企业条件，同样享受减半
 * ========================================================================== */
function qualifiesSixTaxesHalved(主体类型, p) {
  // 【修复问题16/17】统一判定，并尊重用户的「关闭减半」开关
  if (p && (p.适用小规模减半六税两费 === false || p.适用小规模减半六税两费 === '否')) return false;
  if (!主体类型) return false;
  const t = String(主体类型);
  if (t.includes('小规模')) return true;
  if (t.includes('个体工商户')) return true;
  if (p && p.符合小型微利企业 === '是') return true;
  return false;
}

/* ==========================================================================
 * 持有环节：城镇土地使用税
 * ========================================================================== */
function computeLandUseTax(p) {
  const 主体类型 = p.持有主体类型 || p.主体类型;
  const isNatural = 主体类型 === '自然人';
  const 土地等级 = num(p.土地等级) || 1;
  const 面积 = num(p.实际占用面积);

  // 【修复问题24】个人出租住房：免征城镇土地使用税（财税〔2008〕24号）
  if (isNatural && p.持有环节用途 === '出租' && p.出租标的 === '住房') {
    return { 税额: 0, 说明: '个人出租住房免征城镇土地使用税（财税〔2008〕24号）' };
  }

  // 个人非营业用房：省级授权暂缓征收（〔1988〕国税地字第015号；江苏 苏税三〔89〕017号）
  // ⚠️ 用于生产经营的应照章征收；居住与经营并用的按各自使用面积分别征免
  if (isNatural && p.是否营业用房 !== '是') {
    return { 税额: 0, 说明: '个人非营业用房暂不征收城镇土地使用税（省级授权，江苏省苏税三〔89〕017号）' };
  }

  const half = qualifiesSixTaxesHalved(主体类型, p) ? 0.5 : 1;

  // 单位税额：地区参数表（p.landUseTax 数组）优先
  // ⚠️ 地区参数缺失时**不得**套用南京标准 —— 只有南京市才用 RATE.LAND_USE_NANJING
  const 表 = (Array.isArray(p.landUseTax) && p.landUseTax.length)
    ? p.landUseTax
    : (p.城市 === 'nj' ? RATE.LAND_USE_NANJING : null);

  if (!表) {
    return {
      税额: 0, 面积, 土地等级, 减半: half < 1, 待填写: true,
      说明: `⚠️ ${p.城市 || '该地区'}的城镇土地使用税单位税额未收录到，请在「地区参数」中手工填写后计算`,
    };
  }

  const 标准 = 表[Math.min(表.length - 1, Math.max(0, 土地等级 - 1))];
  const tax = round2(面积 * 标准 * half);
  const 地区名 = p.城市 === 'nj' ? '南京市' : (p.城市名称 || '当地');
  return {
    税额: tax, 税额标准: 标准, 面积, 土地等级, 减半: half < 1,
    说明: `实际占用面积 ${面积}㎡ × ${标准} 元/㎡（${地区名}第${土地等级}类土地）` +
      (half < 1 ? ' × 50%（六税两费减半）' : ''),
  };
}

/* ==========================================================================
 * 主计算入口
 * ========================================================================== */
function calculate(p) {
  const out = { 卖方: {}, 买方: {}, 持有: {}, 提示: [], 地区参数: {} };

  // ---------- 地区参数解析（城市/省级默认值 + 用户手工覆盖）----------
  let REG = { value: {}, source: {}, 待确认: [] };
  if (typeof RegionResolver !== 'undefined') {
    REG = RegionResolver.resolve(p);
  } else {
    // 独立运行引擎时的兜底：仅用全国默认
    REG.value = { propertyTaxDeduct: 30, deedTaxRate: 0.03, localEduSurtax: 2, eduSurtax: 3 };
    REG.source = {}; REG.待确认 = [];
  }
  const RV = REG.value;
  out.地区参数 = { 取值: RV, 来源: REG.source, 待确认: REG.待确认 };
  // 合并地区参数到计算入参（优先级：手工覆盖 > 地区 > 默认）
  const P = { ...p, ...RV };
  if (REG.城市名称) P.城市名称 = REG.城市名称;

  // 【健壮性】持有场景可能只有「持有主体类型」，此处统一兜底，避免 undefined.includes 崩溃
  const 主体类型 = P.主体类型 || P.持有主体类型 || '';
  const 资产类型 = P.资产类型 || '商办厂房类';

  // ---------- 卖方：增值税 ----------
  const vat = computeVAT(P);
  // 实缴增值税 = 销项税额 − 进项税额（一般纳税人可抵扣进项）
  const 进项税额 = num(P.进项税额);
  const 实缴增值税 = Math.max(0, num(vat.销项税额) - (vat.可抵扣进项 ? 进项税额 : 0));
  out.卖方.增值税 = { ...vat, 进项税额: vat.可抵扣进项 ? 进项税额 : 0, 实缴增值税 };

  // ---------- 卖方：附加 ----------
  const surtax = computeSurtax(P, 实缴增值税);
  out.卖方.附加税费 = surtax;

  // ---------- 卖方：印花税 ----------
  // 印花税计税依据不含增值税（《印花税法》第五条第二款）
  // 顺序：印花税须先于土地增值税计算 —— 印花税是土增税的扣除项
  const 卖方印花税参数 = { ...p, 卖方增值税额: num(vat.销项税额) };
  out.卖方.印花税 = computeStamp(卖方印花税参数, '卖方');

  // ---------- 卖方：土地增值税 ----------
  // 【修复问题8】「与转让房地产有关的税金」应含附加税费 + 印花税
  // 依据：《土地增值税暂行条例》第六条(四)、《实施细则》第七条(五)
  const lvat = computeLandVATFull({
    ...P,
    卖方印花税额: num(out.卖方.印花税.税额),
    卖方附加税费额: num(surtax.合计),
  }, vat);
  // 【修复问题27】普通标准住宅：增值率未超过 20% 的免征土地增值税
  // 依据：《土地增值税暂行条例》第八条(一)
  const 是普通住宅 = (资产类型 === '住宅类')
    && (P.是普通标准住宅 === '是' || P.是普通标准住宅 === true);
  if (是普通住宅 && lvat && !lvat.需补充资料 && num(lvat.增值率) <= 20 && num(lvat.税额) > 0) {
    lvat.原税额 = num(lvat.税额);
    lvat.税额 = 0;
    lvat.免征 = true;
    lvat.说明 = (lvat.说明 || '') + '；普通标准住宅增值率未超过20%，免征土地增值税（条例第八条(一)）';
  }
  out.卖方.土地增值税 = lvat;

  // ---------- 卖方：所得税 ----------
  // 【修复问题9】可扣除税金 = 附加 + 印花 + 土增
  // 依据：国税发〔2006〕108号（转让住房过程中缴纳的税金及合理费用可扣除）
  const 卖方可扣除税金 = num(surtax.合计) + num(out.卖方.印花税.税额) + num(lvat.税额);
  const iit = computeIncomeTax({ ...P, 卖方可扣除税金 }, vat);
  out.卖方.所得税 = iit;

  // 【修复问题7】合计口径 = 税负总额（口径A）
  // 增值税用「实缴额（销项 − 进项）」，与附加税费计税依据保持一致
  out.卖方.合计 = round2(
    实缴增值税 + num(surtax.合计) + num(lvat.税额) + num(out.卖方.印花税.税额) + num(iit.税额)
  );
  // 保留票面口径供参考对照（不参与合计）
  out.卖方.销项税额 = num(vat.销项税额);
  out.卖方.实缴增值税额 = 实缴增值税;
  out.卖方.不含增值税价 = vat.不含税收入;

  // ---------- 买方 ----------
  // 【修复问题4】买方进项税额 = 卖方票面销项税额，与实际交易挂钩
  //   原实现按「买方自己身份」另算 3%/9%，导致：
  //   ① 卖方 9%、买方小规模时按 3% 拆（与票面不符）
  //   ② 卖方免税时仍扣 9%「税」，契税依据被错误压低
  // 依据：《增值税暂行条例》第八条（进项税额为票面税额）；
  //      《契税法》第四条（计税依据为不含增值税的成交价格，免税则全额）
  const 卖方销项税额 = num(vat.销项税额);
  const 买方增值税额 = 卖方销项税额;
  const 买方增值税说明 = 卖方销项税额 > 0
    ? `买方进项税额 = 卖方票面销项税额 ${numFmt(卖方销项税额)}（能否抵扣视买方用途而定）`
    : '卖方本环节免征增值税（无销项），买方无进项税额；契税按全额成交价计税';
  out.买方.增值税参考 = { 税额: 买方增值税额, 说明: 买方增值税说明 };

  const deed = computeDeedTax({ ...P, 买方增值税额 });
  out.买方.契税 = deed;
  out.买方.印花税 = computeStamp({ ...P, 买方增值税额 }, '买方');
  out.买方.合计 = round2(num(deed.税额) + num(out.买方.印花税.税额));

  // ---------- 持有环节 ----------
  out.持有.房产税 = computePropertyTax(P);
  out.持有.城镇土地使用税 = computeLandUseTax(P);
  out.持有.合计 = round2(num(out.持有.房产税.税额) + num(out.持有.城镇土地使用税.税额));

  // ---------- 提示 ----------
  if (主体类型 === '自然人' && 资产类型 === '住宅类') {
    if (resolveHoldingYears(P) < 2) {
      out.提示.push('⚠️ 自然人转让住房持有不足 2 年，全额按 <b>3%</b> 征收率计征增值税（财政部 税务总局公告2025年第17号，2026.1.1 起已由 5% 降为 3%）。');
    }
    if (resolveHoldingYears(P) >= 5 && P.满五唯一 !== '是') {
      out.提示.push('💡 持有满 5 年且为家庭唯一生活用房可免征个人所得税（财税字〔1999〕278号），请核对“满五唯一”认定。');
    }
  }
  if (主体类型 === '自然人' && 资产类型 === '商办厂房类') {
    out.提示.push('ℹ️ 自然人不是一般纳税人，转让商办厂房一律按 3% 简易计税；外购（不含自建）可按差额计算。');
  }
  if (String(主体类型).includes('小规模')) {
    out.提示.push('ℹ️ 小规模纳税人销售不动产<b>不适用</b>“3% 减按 1%”优惠（财政部 税务总局公告2026年第10号第三条(三)6），本表按 3% 计算。');
    out.提示.push('💡 “六税两费”减半适用于增值税小规模纳税人、小型微利企业、个体工商户（至 2027.12.31），不含土地增值税与契税。');
  }
  if (String(主体类型).includes('开发企业') && P.开发销售模式 === '正常房产销售') {
    out.提示.push('💡 房地产开发企业销售新建商品房适用四级超率累进土地增值税，可加计 20% 扣除；转让环节印花税可作税金扣除（国家税务总局公告2026年第3号第五条）。');
  }
  // 旧房加计扣除年数提醒
  if (P.场景类型 === 'transfer' && num(P.评估价格) === 0 && num(P.购房发票金额) > 0) {
    const yr = calcInvoiceYears(P);
    if (yr.years === 0) {
      out.提示.push('⚠️ 土地增值税旧房加计扣除年数无法确定：请填写「买入日期」与「卖出日期」，或直接填写「持有年限」，否则每年加计 5% 的扣除将计为 0。');
    } else {
      out.提示.push(`ℹ️ 土地增值税旧房加计扣除年数：<b>${yr.years} 年</b>（${yr.source === 'date' ? '按买入/卖出日期计算' : '按填写年限计算'}），加计扣除率 5%（国税函〔2010〕220号第七条）。`);
    }
  }
  if (P.符合小型微利企业 === '是' && !String(主体类型).includes('小规模')) {
    out.提示.push('ℹ️ 一般纳税人符合小型微利企业条件的，同样享受“六税两费”减半，并适用企业所得税 5%（25%×20%）实际税率。');
  }
  if (P.城市 && ['hebei', 'liaoning', 'hunan'].includes(P.城市)) {
    out.提示.push('ℹ️ 该地区契税法定税率为 4%（《契税法》法定幅度 3%-5%，由省级人大常委会确定），本表已按 4% 计算。');
  }
  if (P.住房套数 === '家庭第三套及以上住房' && P.买方主体类型 === '自然人') {
    out.提示.push('⚠️ 家庭第三套及以上住房不享受 2024 年第 16 号公告的任何优惠，按属地法定税率计征。');
  }
  if (P.持有环节用途 === '出租' && P.出租标的 === '住房') {
    const 合规 = P.承租人类型 === '个人' || P.承租人类型 === '专业化规模化住房租赁企业';
    if (!合规) {
      out.提示.push('⚠️ 出租住房但承租人不符合 4% 优惠条件（须为个人或专业化规模化住房租赁企业），房产税按 12% 计征。');
    }
  }

  return out;
}
