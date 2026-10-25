/* ==========================================================================
 * 地区参数解析器
 * ---------------------------------------------------------------------------
 * 作用：把"地方性参数"从计算引擎中解耦出来。
 *
 *   REGIONS（app/js/regions.js，自动生成的城市/省份参数表）
 *        ↓
 *   RegionResolver：合并「地区默认值」与「用户手工覆盖值」
 *        ↓
 *   engine.js 通过 resolve(p) 取得最终生效参数
 *
 * 覆盖优先级（从高到低）：
 *   1. 用户手工填写（p.参数覆盖.<字段>，即界面上的"手工指定"输入框）
 *   2. REGIONS.cities[城市] 的城市级参数
 *   3. REGIONS.provinces[省份] 的省级参数
 *   4. 全国通用默认值（本文件 DEFAULTS）
 *
 * 未查到的值（regions.js 中为 null）不会用 0 冒充，而是回落到全国默认值，
 * 并在 results 的"待确认"清单中提示用户手工核实。
 * ========================================================================== */

/**
 * 全国通用默认值（仅在地区参数缺失时使用）
 *
 * 【单位契约 —— 与 app/js/regions.js 严格一致，勿改】
 *   kind: 'pct'  百分数整数（30 表示 30%）
 *   kind: 'dec'  小数（0.03 表示 3%）
 *   kind: 'arr'  数组（元/㎡·年）
 *
 * 界面手工输入框对 pct 与 dec 均以「%」展示，但提交前一律归一化为
 * 内部标准单位（pct 保持整数、dec 保持小数），由 resolve() 负责。
 */
const REGION_DEFAULTS = {
  // 城镇土地使用税，元/㎡·年（按土地等级 1..N），kind=arr，null = 无默认值
  landUseTax: null,
  // 房产税从价计征减除比例，%  kind=pct
  propertyTaxDeduct: 30,
  // 契税属地法定税率，小数 kind=dec（0.03 = 3%）
  deedTaxRate: 0.03,
  // 契税非住宅适用税率（部分地区住房与非住宅分档，如河南 3%/4%），小数 kind=dec
  deedTaxRateNonResidential: null,
  // 土地增值税核定征收率，%  kind=pct
  lvatApprovedRate: null,
  // 个人所得税核定征收比例，%  kind=pct
  iitApprovedRate: null,
  // 地方教育附加，%  kind=pct
  localEduSurtax: 2,
  // 省级土地增值税开发费用扣除比例，%  kind=pct
  devExpenseRate: null,
  // 增值税附加中的教育费附加，%  kind=pct（全国统一3%，不随地区变）
  eduSurtax: 3,
};

/** 各参数的单位类型 */
const REGION_PARAM_KIND = {
  landUseTax: 'arr',
  propertyTaxDeduct: 'pct',
  deedTaxRate: 'dec',
  deedTaxRateNonResidential: 'dec',
  lvatApprovedRate: 'pct',
  iitApprovedRate: 'pct',
  localEduSurtax: 'pct',
  devExpenseRate: 'pct',
  eduSurtax: 'pct',
};

/** 已知有非统一值的地区参数提示文案 */
const REGION_PARAM_META = {
  landUseTax: {
    label: '城镇土地使用税单位税额',
    unit: '元/㎡·年',
    hint: '按土地等级分档，未查到当地标准的请手工填写',
  },
  propertyTaxDeduct: {
    label: '房产税减除比例',
    unit: '%',
    hint: '法定幅度 10%-30%，由各省确定',
  },
  deedTaxRate: {
    label: '契税法定税率',
    unit: '%',
    hint: '法定幅度 3%-5%，由省级人大常委会确定',
  },
  deedTaxRateNonResidential: {
    label: '契税非住宅税率',
    unit: '%',
    hint: '部分地区住房与非住宅分档（如河南 3%/4%），为空则沿用法定税率',
  },
  lvatApprovedRate: {
    label: '土地增值税核定征收率',
    unit: '%',
    hint: '地方自定，无全国统一值；核定征收方式必填',
  },
  iitApprovedRate: {
    label: '个税核定征收比例',
    unit: '%',
    hint: '国税发〔2006〕108号 幅度 1%-3%，地方自定',
  },
  localEduSurtax: {
    label: '地方教育附加',
    unit: '%',
    hint: '财综〔2010〕98号授权地方自定，普遍 2%',
  },
  devExpenseRate: {
    label: '省级开发费用扣除比例',
    unit: '%',
    hint: '国税函〔2010〕220号：具体比例按省级规定执行',
  },
};

/** 省级税率 → 百分数字符串展示 */
function pct(x, digits) {
  if (x === null || x === undefined || x === '') return '—';
  const v = Number(x);
  if (!isFinite(v)) return '—';
  return v.toFixed(digits === undefined ? 0 : digits) + '%';
}

const RegionResolver = (function () {
  'use strict';

  /** 读取 REGIONS（可能未加载） */
  function table() {
    return (typeof REGIONS !== 'undefined' && REGIONS) ? REGIONS : { cities: {}, provinces: {} };
  }

  /** 取得城市级参数 */
  function cityOf(cityKey) {
    const t = table();
    return (t.cities && t.cities[cityKey]) || null;
  }

  /** 取得省级参数（优先按城市记录的省份，再按省份名直接查） */
  function provinceOf(cityKey, provinceName) {
    const t = table();
    const c = cityOf(cityKey);
    const name = provinceName || (c && c.province);
    if (!name) return null;
    return (t.provinces && t.provinces[name]) || null;
  }

  /**
   * 解析最终生效的地区参数
   * @param {object} p 引擎入参（含 p.城市、p.参数覆盖）
   * @returns {object} { value: {字段: 值}, source: {字段: 'city'|'province'|'default'|'manual'|'none'}, 待确认: [] }
   */
  function resolve(p) {
    const cityKey = p && p.城市 ? p.城市 : 'default';
    const overrides = (p && p.参数覆盖) || {};
    const c = cityOf(cityKey);
    const pr = provinceOf(cityKey, p && p.省份);

    const value = {};
    const source = {};
    const 待确认 = [];

    const push待确认 = (key, hint) => {
      const meta = REGION_PARAM_META[key];
      待确认.push({
        参数: key,
        名称: meta ? meta.label : key,
        单位: meta ? meta.unit : '',
        提示: hint,
      });
    };

    Object.keys(REGION_DEFAULTS).forEach((key) => {
      // 1) 手工覆盖
      const ov = overrides[key];
      const kind = REGION_PARAM_KIND[key] || 'pct';
      if (ov !== undefined && ov !== null && ov !== '') {
        // 数组型参数：原样保留
        if (kind === 'arr') {
          if (Array.isArray(ov) && ov.length) {
            value[key] = ov;
            source[key] = 'manual';
            return;
          }
          // 逗号分隔文本 → 数组
          if (typeof ov === 'string') {
            const arr = ov.split(/[,，、\s]+/).map(Number)
              .filter((n) => isFinite(n) && n > 0);
            if (arr.length) {
              value[key] = arr;
              source[key] = 'manual';
              return;
            }
          }
          push待确认(key, '手工填写值无效，已改用地区默认值，请重新填写');
          return;
        }
        const n = Number(ov);
        if (!isFinite(n)) {
          // 【修复问题29】无效值不中断，继续按城市/省级/全国默认逐级回退
          push待确认(key, '手工填写值无效，已回退到地区默认值，请重新填写');
        } else {
        // 归一化：小数型统一存小数；百分数型统一存百分数整数
        if (kind === 'dec') {
          // 【修复问题28】小数型（契税税率）：约定界面填百分数（4=4%）
          //   兼容 0.04 的小数写法；边界值 1 按 1% 处理（契税不存在 100%）
          value[key] = n >= 1 ? n / 100 : n;
          if (value[key] < 0.001 || value[key] > 0.10) {
            push待确认(key, `填写值「${n}」换算后为 ${(value[key] * 100).toFixed(3)}%，超出契税税率合理区间（0.1%~10%），请核对（界面按百分数填写，如 3 表示 3%）`);
          }
        } else {
          // 【修复问题28】百分数型（如减除比例 30 表示 30%）：按百分数整数解读
          //   小于 1 的值视为小数写法（0.3 → 30%），并明确提示换算结果
          if (n > 0 && n < 1) {
            value[key] = n * 100;
            push待确认(key, `填写值「${n}」已按小数解读为 ${(n * 100).toFixed(2)}%；若本意为 ${n}%，请直接填 ${n}`);
          } else {
            value[key] = n;
          }
          if (value[key] < 0 || value[key] > 100) {
            push待确认(key, `填写值「${n}」超出百分比合理范围（0~100），请核对`);
          }
        }
          source[key] = 'manual';
          return;
        }
      }
      // 2) 城市级
      if (c && c[key] !== undefined && c[key] !== null) {
        value[key] = c[key];
        source[key] = 'city';
        return;
      }
      // 3) 省级
      if (pr && pr[key] !== undefined && pr[key] !== null) {
        value[key] = pr[key];
        source[key] = 'province';
        return;
      }
      // 4) 全国默认
      const d = REGION_DEFAULTS[key];
      if (d !== null && d !== undefined) {
        value[key] = d;
        source[key] = 'default';
      } else {
        value[key] = null;
        source[key] = 'none';
        const meta = REGION_PARAM_META[key];
        待确认.push({
          参数: key,
          名称: meta ? meta.label : key,
          单位: meta ? meta.unit : '',
          提示: meta ? meta.hint : '该地区参数未收录，请手工填写',
        });
      }
    });

    return { value, source, 待确认, 城市名称: (c && c.name) || '', 省份名称: (pr && pr.name) || (c && c.province) || '' };
  }

  /**
   * 供界面使用：列出某城市全部地区参数及其来源，供渲染"地区参数"面板
   */
  function describe(cityKey) {
    const t = table();
    const c = cityOf(cityKey);
    const pr = provinceOf(cityKey);
    const rows = [];
    Object.keys(REGION_DEFAULTS).forEach((key) => {
      const meta = REGION_PARAM_META[key] || { label: key, unit: '', hint: '' };
      let v = null, src = 'none';
      if (c && c[key] !== undefined && c[key] !== null) { v = c[key]; src = 'city'; }
      else if (pr && pr[key] !== undefined && pr[key] !== null) { v = pr[key]; src = 'province'; }
      else if (REGION_DEFAULTS[key] !== null && REGION_DEFAULTS[key] !== undefined) {
        v = REGION_DEFAULTS[key]; src = 'default';
      }
      rows.push({
        key, label: meta.label, unit: meta.unit, hint: meta.hint,
        value: v, source: src,
        cityNote: c ? (c[key + 'Note'] || '') : '',
      });
    });
    return {
      city: c ? c.name : '其他地区',
      province: c ? c.province : '',
      rows,
    };
  }

  /** 界面下拉框用的城市清单 */
  function cityList() {
    const t = table();
    const list = Object.keys(t.cities || {}).map((k) => ({
      key: k, name: t.cities[k].name, province: t.cities[k].province,
    }));
    list.push({ key: 'default', name: '其他地区（未收录参数）', province: '' });
    return list;
  }

  return {
    resolve, describe, cityList,
    DEFAULTS: REGION_DEFAULTS, META: REGION_PARAM_META, KIND: REGION_PARAM_KIND, pct,
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = RegionResolver;
}
