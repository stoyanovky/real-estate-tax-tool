/* ==========================================================================
 * 页面交互与结果渲染
 * ========================================================================== */
(function () {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  const NUM_FIELDS = [
    '成交总价', '持有年限', '购置原价', '评估价格', '购房发票金额', '土地价款',
    '取得土地支付的契税等', '已发生开发成本', '转让环节税金', '利息费用', '核定征收率',
    '进项税额', '合理费用', '核定征收收入额', '应纳税所得额_企业', '自然人合伙人利润占比',
    '建筑面积', '房产原值', '年租金收入', '实际占用面积', '租金增值税率',
    '专票不得抵扣进项', '购房契税',
  ];
  const TEXT_FIELDS = ['城市', '主体类型', '资产类型', '持有主体类型', '开发销售模式', '视角',
    '房产取得时间', '是否自建', '建设完成时间', '建造开工时间', '满五唯一', '可提供利息证明',
    'lvatUseApproved', 'iitUseApproved', '是普通标准住宅', '土地增值税扣除方式',
    '符合小型微利企业', '合伙人个税计税方式', '买方主体类型', '住房套数',
    '持有环节用途', '是否营业用房', '减除比例', '出租标的', '承租人类型', '土地等级',
    '场景类型', '所在区域', '购房发票类型', '自然人商办允许差额',
    '购房发票日期', '售房发票日期'];

  const numFmt = (n) => {
    const v = Number(n) || 0;
    return v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  const money = (n) => '¥ ' + numFmt(n);
  const isZero = (n) => Math.abs(Number(n) || 0) < 0.005;

  /* ---------------- 读取表单 ---------------- */
  function readForm() {
    const p = { 适用小规模减按1: true, 适用小规模减半六税两费: true };
    TEXT_FIELDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) p[id] = el.value;
    });
    NUM_FIELDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) p[id] = el.value === '' ? 0 : Number(el.value);
    });
    // 地区参数手工覆盖值
    // 原样传字符串，交给 RegionResolver.resolve() 按 kind（pct/dec/arr）统一归一化，
    // 避免界面与引擎之间的单位换算分散在两处而出现错配。
    p.参数覆盖 = {};
    if (typeof RegionResolver !== 'undefined') {
      Object.keys(RegionResolver.DEFAULTS).forEach((key) => {
        const el = document.getElementById('rp_' + key);
        if (!el || el.value === '' || el.value === null) return;
        const raw = String(el.value).trim();
        if (raw === '') return;
        p.参数覆盖[key] = raw;
      });
    }
    return p;
  }

  /* ---------------- 地区参数面板渲染 ---------------- */
  // kind 与 RegionResolver.KIND 一致：'pct'=百分数整数、'dec'=小数、'arr'=数组
  const RP_FIELD_MAP = {
    landUseTax: { label: '城镇土地使用税单位税额', unit: '元/㎡', type: 'text', kind: 'arr',
      hint: '按土地等级分档，用逗号分隔，如 18,15,10,7,5,3,1.5' },
    propertyTaxDeduct: { label: '房产税减除比例', unit: '%', type: 'number', kind: 'pct',
      hint: '法定幅度 10%-30%，由各省确定（填 30 表示 30%）' },
    deedTaxRate: { label: '契税法定税率', unit: '%', type: 'number', kind: 'dec',
      hint: '法定幅度 3%-5%，由省级人大常委会确定（填 3 表示 3%）' },
    lvatApprovedRate: { label: '土地增值税核定征收率', unit: '%', type: 'number', kind: 'pct',
      hint: '地方自定；采用核定征收方式时必填（填 5 表示 5%）' },
    iitApprovedRate: { label: '个税核定征收比例', unit: '%', type: 'number', kind: 'pct',
      hint: '国税发〔2006〕108号幅度 1%-3%，地方自定（填 1 表示 1%）' },
    localEduSurtax: { label: '地方教育附加', unit: '%', type: 'number', kind: 'pct',
      hint: '财综〔2010〕98号授权地方自定，普遍 2%（填 2 表示 2%）' },
  };

  const SRC_LABEL = { city: '市定', province: '省定', default: '全国默认', manual: '手工', none: '待确认' };

  function renderRegionParams(p) {
    const box = $('#regionParams');
    const nameEl = $('#regionCityName');
    if (!box || typeof RegionResolver === 'undefined') return;

    const desc = RegionResolver.describe(p['城市'] || 'default');
    if (nameEl) nameEl.textContent = desc.province ? `${desc.city} · ${desc.province}` : desc.city;

    // 保留用户已输入的手工值，避免每次重绘丢失
    const prev = {};
    box.querySelectorAll('input[data-rp-key]').forEach((inp) => {
      prev[inp.getAttribute('data-rp-key')] = inp.value;
    });

    let html = '';
    Object.keys(RP_FIELD_MAP).forEach((key) => {
      const meta = RP_FIELD_MAP[key];
      const row = desc.rows.find((r) => r.key === key);
      if (!row) return;
      const src = prev[key] !== undefined && prev[key] !== '' ? 'manual' : row.source;
      const val = src === 'manual' ? prev[key] : (row.value === null || row.value === undefined ? '' : row.value);

      // 城镇土地使用税是数组，展示为逗号分隔文本
      const isArray = Array.isArray(row.value);
      let displayVal = val;
      if (isArray) {
        if (src === 'manual' && Array.isArray(prev[key])) {
          displayVal = prev[key].join(',');
        } else if (typeof prev[key] === 'string' && prev[key] !== '') {
          displayVal = prev[key];
        } else {
          displayVal = (row.value || []).join(',');
        }
      }
      // 小数型参数（契税税率）一律按「%」展示：0.03 → 3（含地区默认值，原实现仅手工值才换算）
      if (RP_FIELD_MAP[key] && RP_FIELD_MAP[key].kind === 'dec') {
        const n = Number(val);
        if (isFinite(n) && n > 0 && n <= 1) displayVal = (n * 100).toFixed(2).replace(/\.00$/, '');
      }

      const cls = src === 'manual' ? ' is-manual' : (src === 'none' ? ' is-unknown' : '');
      const badgeCls = src === 'manual' ? 'manual' : (src === 'none' ? 'unknown' : src);
      const note = src === 'city' || src === 'province' ? (row.cityNote || '') : row.hint;

      html += `<div class="rp-row${cls}">
        <div class="rp-label">${meta.label}${note ? `<small>${note}</small>` : ''}</div>
        <div class="rp-value">
          <input type="${meta.type}" id="rp_${key}" data-rp-key="${key}"
            value="${displayVal === null || displayVal === undefined ? '' : displayVal}"
            placeholder="${src === 'none' ? '待确认' : ''}">
          <span class="rp-unit">${meta.unit}</span>
          <span class="rp-badge ${badgeCls}">${SRC_LABEL[src] || src}</span>
        </div>
      </div>`;
    });
    box.innerHTML = html;

    // 绑定手工输入
    box.querySelectorAll('input[data-rp-key]').forEach((inp) => {
      inp.addEventListener('input', refresh);
      inp.addEventListener('change', refresh);
    });
  }

  /* ---------------- 条件显隐 ---------------- */
  /**
   * 场景联动：字段「显示 / 隐藏 / 灰化」
   * 规则：
   *   ① 与当前场景完全无关（如交易场景下的持有字段）→ 隐藏
   *   ② 同一表单内条件不满足（如非自然人买方的住房套数）→ 灰化（可见但不可编辑）
   */
  function applyVisibility(p) {
    const scene = p['场景类型'];
    $$('[data-show]').forEach((el) => {
      const key = el.getAttribute('data-show');
      let show = true;
      if (key === 'holding') show = scene === 'holding';
      else if (key === 'price') show = scene === 'transfer';
      else if (key === 'buyer') show = scene === 'transfer';
      else if (key === 'holder') show = scene === 'holding';
      else if (key === 'devmode') show = p['主体类型'] && p['主体类型'].includes('开发企业');
      el.classList.toggle('hidden', !show);
    });

    // ---------- 上下文判定 ----------
    const 主体 = p['主体类型'] || '';
    const isDev = 主体.includes('开发企业');
    const isNatural = 主体 === '自然人';
    const isSmall = 主体.includes('小规模');
    const isPartner = 主体.includes('有限合伙');
    const isTransfer = scene === 'transfer';
    const holding = scene === 'holding';
    const isDevSale = isDev && p['开发销售模式'] === '正常房产销售';
    const 是住宅 = p['资产类型'] === '住宅类';
    const 买方主体 = p['买方主体类型'] || 主体;
    const 买方自然人 = 买方主体 === '自然人';
    const 出租 = p['持有环节用途'] === '出租';
    const 出租住房 = p['出租标的'] === '住房';
    const 自建 = p['是否自建'] === '是';
    const 老不动产 = p['房产取得时间'] === '2016.4.30前';
    const 有息证明 = p['可提供利息证明'] === '是';
    const 允许土增核定 = p['lvatUseApproved'] === '是';
    const 允许个税核定 = p['iitUseApproved'] === '是';

    // ---------- 增值税 ----------
    setField('房产取得时间', isTransfer, isTransfer && !isNatural && !isDev);
    setField('建造开工时间', isTransfer, isTransfer && isDevSale);
    setField('建设完成时间', isTransfer, isTransfer && isDev && !isDevSale);
    setField('是否自建', isTransfer, isTransfer && !isNatural);
    // 进项税额只有一般纳税人能抵扣（自然人/小规模不抵扣）
    setField('进项税额', isTransfer, isTransfer && !isNatural && !isSmall);
    setField('满五唯一', isTransfer, isTransfer && isNatural && 是住宅);
    setField('合理费用', isTransfer, isTransfer && isNatural);
    // 个税核定收入额：未勾选「使用核定征收」则灰化
    setField('核定征收收入额', isTransfer && isNatural, isTransfer && isNatural && 允许个税核定);
    setField('应纳税所得额_企业', isTransfer, isTransfer && !isNatural);
    setField('符合小型微利企业', isTransfer, isTransfer && !isNatural);
    setField('自然人合伙人利润占比', isTransfer, isTransfer && isPartner);
    setField('合伙人个税计税方式', isTransfer, isTransfer && isPartner);

    // ---------- 土增税扣除方式（显式三选一）----------
    const 需要旧房加计 = isTransfer && !isDevSale;
    const 土增方式 = p['土地增值税扣除方式'] || '';
    const 有明确选择 = !!土增方式;
    const 选房企 = 土增方式 === '房企新建';
    const 选评估 = 土增方式 === '评估价格';
    const 选发票 = 土增方式 === '发票加计';

    setField('土地增值税扣除方式', isTransfer);

    // 房企新建商品房专用
    const 可用房企字段 = 有明确选择 ? 选房企 : isDevSale;
    setField('土地价款', isTransfer, isTransfer && (有明确选择 ? 选房企 : isDev));
    setField('取得土地支付的契税等', isTransfer, isTransfer && 可用房企字段);
    setField('已发生开发成本', isTransfer, isTransfer && 可用房企字段);
    setField('转让环节税金', isTransfer, isTransfer && 可用房企字段);
    setField('可提供利息证明', isTransfer, isTransfer && 可用房企字段);
    // 无利息证明则只能按 (土地+成本)×10%，利息费用灰化
    setField('利息费用', isTransfer, isTransfer && 可用房企字段 && 有息证明);

    // 旧房专用（评估价 / 发票加计 二选一）
    const 可用评估 = 有明确选择 ? 选评估 : 需要旧房加计;
    const 可用发票 = 有明确选择 ? 选发票 : 需要旧房加计;
    setField('评估价格', isTransfer, isTransfer && 可用评估);
    setField('购房发票金额', isTransfer, isTransfer && 可用发票);
    setField('购房发票类型', isTransfer, isTransfer && 可用发票);
    setField('专票不得抵扣进项', isTransfer, isTransfer && 可用发票 && p['购房发票类型'] === '增值税专用发票');

    setField('持有年限', isTransfer, isTransfer && (isNatural || !isDevSale));
    setField('购房发票日期', isTransfer, 需要旧房加计);
    setField('售房发票日期', isTransfer, 需要旧房加计);
    setField('是普通标准住宅', isTransfer, isTransfer && 是住宅);
    // 土增核定率：未勾选「使用核定征收」则灰化
    setField('核定征收率', isTransfer, isTransfer && 需要旧房加计 && 允许土增核定);
    // 购置原价：自建无原价；房企新项目全额计税也不需要
    setField('购置原价', isTransfer && (!isDev || 老不动产), isTransfer && !自建 && (!isDev || 老不动产));

    // ---------- 买方 ----------
    setField('买方主体类型', isTransfer);
    // ★ 住房套数只对自然人买方有意义 → 非自然人灰化
    setField('住房套数', isTransfer, isTransfer && 买方自然人);

    // ---------- 持有环节 ----------
    setField('房产原值', holding, holding && !出租);        // 从价计征用
    setField('年租金收入', holding, holding && 出租);        // 从租计征用
    setField('租金增值税率', holding, holding && 出租);
    setField('出租标的', holding, holding && 出租);
    // 4% 优惠只针对「出租住房」，商办出租不需要承租人类型
    setField('承租人类型', holding && 出租 && 出租住房);
    setField('实际占用面积', holding, holding && p['是否营业用房'] === '是');
    setField('土地等级', holding, holding && p['是否营业用房'] === '是');

    // ---------- 其他 ----------
    // 购房发票类型/专票字段已在「旧房专用」区块按扣除方式控制，此处不重复设置
    setField('购房契税', isTransfer, 需要旧房加计);
  }

  /** 更新「持有年限」字段下方的提示 */
  function updateYearsHint(years) {
    const el = document.getElementById('持有年限提示');
    if (!el) return;
    if (years === undefined || years === null || years === '') {
      el.textContent = '留空则按买入/卖出日期自动推算';
    } else {
      el.textContent = `当前 ${years} 年（可手工修改）`;
    }
  }

  /**
   * 统一设置字段状态
   * @param {string} id       字段 id
   * @param {boolean} visible 是否显示（false=隐藏）
   * @param {boolean} [enabled] 是否可编辑（默认同 visible；true+false 组合 = 可见但灰化）
   */
  function setField(id, visible, enabled) {
    const el = document.getElementById(id);
    if (!el) return;
    const canEdit = (enabled === undefined) ? visible : enabled;
    const field = el.closest('.field');
    if (field) {
      field.classList.toggle('hidden', !visible);
      field.classList.toggle('is-disabled', !canEdit);
    }
    el.disabled = !canEdit;
    // 隐藏时清空值，避免残留值参与计算
    if (!visible) {
      if (el.tagName === 'SELECT') el.selectedIndex = 0;
      else if (el.type !== 'checkbox' && el.type !== 'radio') el.value = '';
    }
  }

  /** 兼容旧调用：仅控制显示 */
  function setVisible(id, show) { setField(id, show); }

  /* ---------------- 渲染结果 ---------------- */
  function render(p, r) {
    const scene = p['场景类型'];
    const view = p['视角'];
    const cards = $('#summaryCards');
    const body = $('#resultBody');
    const tips = $('#tips');

    if (scene === 'transfer' && (!p['成交总价'] || Number(p['成交总价']) <= 0)) {
      cards.innerHTML = '';
      tips.innerHTML = '';
      body.innerHTML = `<div class="empty-state"><div class="empty-icon">🧮</div><p>请在左侧填写要素，此处将实时展示税费测算结果</p></div>`;
      return;
    }
    if (scene === 'holding') {
      const hasVal = Number(p['房产原值']) > 0 || Number(p['年租金收入']) > 0 || Number(p['实际占用面积']) > 0;
      if (!hasVal) {
        cards.innerHTML = ''; tips.innerHTML = '';
        body.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><p>请在「持有要素」中填写房产原值、年租金收入或土地面积</p></div>`;
        return;
      }
    }

    let html = '';

    /* ---- 汇总卡片 ---- */
    if (scene === 'transfer') {
      const items = [];
      if (view !== 'buyer') items.push({ cls: 'seller', label: '卖方税费合计', value: r.卖方.合计, sub: '增值税+附加+土增税+印花税+所得税' });
      if (view !== 'seller') items.push({ cls: 'buyer', label: '买方税费合计', value: r.买方.合计, sub: '契税+印花税' });
      if (view === 'both') items.push({ cls: '', label: '交易总税费', value: r.卖方.合计 + r.买方.合计, sub: '卖方 + 买方' });
      items.push({ cls: '', label: '不含增值税成交价', value: r.卖方.不含增值税价, sub: '价税分离参考' });
      cards.innerHTML = items.map((i) => `
        <div class="summary-card ${i.cls}">
          <span class="sc-label">${i.label}</span>
          <div class="sc-value ${i.cls}">${money(i.value)}</div>
          <div class="sc-sub">${i.sub}</div>
        </div>`).join('');
    } else {
      const items = [
        { cls: 'holding', label: '房产税（年）', value: r.持有.房产税.税额, sub: r.持有.房产税.计税方式 || '' },
        { cls: 'holding', label: '城镇土地使用税（年）', value: r.持有.城镇土地使用税.税额, sub: '按面积 × 地段税额' },
        { cls: 'holding', label: '持有环节合计（年）', value: r.持有.合计, sub: '不含其他持有环节税种' },
      ];
      cards.innerHTML = items.map((i) => `
        <div class="summary-card ${i.cls}">
          <span class="sc-label">${i.label}</span>
          <div class="sc-value holding">${money(i.value)}</div>
          <div class="sc-sub">${i.sub}</div>
        </div>`).join('');
    }

    /* ---- 提示 ---- */
    const tipList = (r.提示 || []).map((t) => `<div class="tip">${t}</div>`);
    tips.innerHTML = tipList.join('');

    /* ---- 明细 ---- */
    if (scene === 'transfer') {
      if (view !== 'buyer') html += renderSeller(r, p);
      if (view !== 'seller') html += renderBuyer(r, p);
    } else {
      html += renderHolding(r, p);
    }
    body.innerHTML = html;
  }

  function row(name, desc, amount, formula, extra) {
    const cls = isZero(amount) ? 'amount zero' : 'amount';
    return `<tr>
      <td>
        <div class="tax-name">${name}</div>
        ${desc ? `<div class="tax-desc">${desc}</div>` : ''}
        ${formula ? `<div class="formula">${formula}</div>` : ''}
        ${extra || ''}
      </td>
      <td class="num"><span class="${cls}">${isZero(amount) ? '0.00' : numFmt(amount)}</span></td>
    </tr>`;
  }

  function renderSeller(r, p) {
    const v = r.卖方.增值税, st = r.卖方.附加税费, lv = r.卖方.土地增值税;
    const sp = r.卖方.印花税, it = r.卖方.所得税;

    let surchargeRows = '';
    if (!isZero(st.合计)) {
      surchargeRows = `
        ${row('城市维护建设税', `计税依据：实缴增值税 ${numFmt(r.卖方.增值税.实缴增值税)}`, st.城建税, '实缴增值税 × 城建税税率')}
        ${row('教育费附加', '以实缴增值税为计税依据', st.教育费附加, '实缴增值税 × 3%')}
        ${row('地方教育附加', '以实缴增值税为计税依据', st.地方教育附加, '实缴增值税 × 2%')}`;
    } else {
      surchargeRows = `<tr><td><div class="tax-name">增值税附加税费</div><div class="tax-desc">${st.说明 || '实缴增值税为 0，不计附加'}</div></td><td class="num"><span class="amount zero">0.00</span></td></tr>`;
    }

    let lvatExtra = '';
    if (lv.扣除明细) {
      const d = lv.扣除明细;
      lvatExtra = `<div class="formula">扣除项目：土地 ${numFmt(d.土地金额)} + 开发成本 ${numFmt(d.开发成本)} + 开发费用 ${numFmt(d.开发费用)} + 转让税金 ${numFmt(d.转让税金)} + 加计20% ${numFmt(d.加计扣除)}</div>`;
    }

    let itExtra = '';
    if (it.穿透) {
      itExtra = `<div class="formula">合伙企业利润 ${numFmt(it.合伙企业利润)} → 自然人合伙人 ${numFmt(it.自然人合伙人税)} + 法人合伙人 ${numFmt(it.法人合伙人税)}</div>`;
    }

    return `
    <div class="card seller">
      <div class="card-head"><span>卖方税费</span><span class="badge">${p['主体类型']} · ${p['资产类型']}</span></div>
      <div class="card-body">
        <table class="tax">
          <thead><tr><th style="width:68%">税种 / 费用</th><th class="num">金额（元）</th></tr></thead>
          <tbody>
            ${row('增值税及附加', `${v.计税方式}${v.优惠 ? '；' + v.优惠 : ''}${v.可抵扣进项 ? '；进项可抵扣' : ''}`, v.销项税额,
              v.计税依据 !== undefined
                ? (v.可抵扣进项
                    ? `含税依据 ${numFmt(v.计税依据)} ÷ (1+${((v.征收率 || 0) * 100).toFixed(0)}%) × ${((v.征收率 || 0) * 100).toFixed(0)}%，减进项 ${numFmt(v.进项税额)}`
                    : `含税依据 ${numFmt(v.计税依据)} ÷ (1+${((v.征收率 || 0) * 100).toFixed(0)}%) × ${((v.征收率 || 0) * 100).toFixed(0)}%`)
                : '')}
            ${surchargeRows}
            ${row('土地增值税', lv.说明 || '', lv.税额,
              lv.核定征收 ? `不含税收入 ${numFmt(lv.不含税收入)} × ${((lv.核定征收率 || 0) * 100).toFixed(2)}%` :
              (lv.增值额 !== undefined ? `增值额 ${numFmt(lv.增值额)} ÷ 扣除项目 ${numFmt(lv.扣除项目合计)} = 增值率 ${lv.增值率}% → 超率累进 ${((lv.rate || 0) * 100).toFixed(0)}% 速算扣除 ${((lv.deduction || 0) * 100).toFixed(0)}%` : ''),
              lvatExtra)}
            ${row('印花税（产权转移书据）', sp.说明 || '', sp.税额,
              sp.税率 ? `计税依据 ${numFmt(sp.计税依据 || p['成交总价'])} × ${(sp.税率 * 100).toFixed(3)}%` : '')}
            ${row('所得税', it.说明 || '', it.税额,
              it.应纳税所得额 !== undefined ? `应纳税所得额 ${numFmt(it.应纳税所得额)} × ${((it.税率 || 0) * 100).toFixed(0)}%` : '', itExtra)}
            <tr class="total"><td>卖方税费合计</td><td class="num">${numFmt(r.卖方.合计)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>`;
  }

  function renderBuyer(r, p) {
    const d = r.买方.契税, sp = r.买方.印花税;
    return `
    <div class="card buyer">
      <div class="card-head"><span>买方税费</span><span class="badge">${p['买方主体类型']} · ${p['资产类型']}</span></div>
      <div class="card-body">
        <table class="tax">
          <thead><tr><th style="width:68%">税种 / 费用</th><th class="num">金额（元）</th></tr></thead>
          <tbody>
            ${row('契税', d.说明 || '', d.税额,
              `计税依据（不含增值税）${numFmt(d.计税依据)} × ${((d.税率 || 0) * 100).toFixed(2)}%`)}
            ${row('印花税（产权转移书据）', sp.说明 || '', sp.税额,
              sp.税率 ? `计税依据 ${numFmt(sp.计税依据 || p['成交总价'])} × ${(sp.税率 * 100).toFixed(3)}%` : '')}
            <tr class="total"><td>买方税费合计</td><td class="num">${numFmt(r.买方.合计)}</td></tr>
          </tbody>
        </table>
        <div class="section-title">买方增值税参考</div>
        <table class="tax"><tbody>
          <tr><td><div class="tax-desc">${r.买方.增值税参考.说明}</div></td><td class="num"><span class="amount ${isZero(r.买方.增值税参考.税额) ? 'zero' : ''}">${numFmt(r.买方.增值税参考.税额)}</span></td></tr>
        </tbody></table>
      </div>
    </div>`;
  }

  function renderHolding(r, p) {
    const pt = r.持有.房产税, lut = r.持有.城镇土地使用税;
    return `
    <div class="card holding">
      <div class="card-head"><span>持有环节税费（年度）</span><span class="badge">${p['持有主体类型']} · ${p['持有环节用途']}</span></div>
      <div class="card-body">
        <table class="tax">
          <thead><tr><th style="width:68%">税种</th><th class="num">金额（元/年）</th></tr></thead>
          <tbody>
            ${row('房产税', pt.说明 || '', pt.税额,
              pt.计税依据 !== undefined ? `计税依据 ${numFmt(pt.计税依据)} × ${((pt.税率 || 0) * 100).toFixed(2)}%` : '')}
            ${row('城镇土地使用税', lut.说明 || '', lut.税额,
              lut.税额标准 !== undefined ? `面积 ${numFmt(lut.面积)}㎡ × ${lut.税额标准} 元/㎡` : '')}
            <tr class="total"><td>持有环节合计</td><td class="num">${numFmt(r.持有.合计)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>`;
  }

  /* ---------------- 政策弹窗 ---------------- */
  function buildPolicyHTML() {
    return `
    <h4>⚠️ 重要提示：2026 年增值税法制变化</h4>
    <p>本工具的政策基准日为 <b>2026-10-24</b>。《中华人民共和国增值税法》及其实施条例（国务院令第 826 号）已于 <b>2026-01-01 施行</b>，原财税〔2016〕36 号同时废止。工作区 Excel 梳理表中的增值税部分建立在已废止的 36 号体系上，本工具已按新法修正：</p>
    <table>
      <tr><th>事项</th><th>Excel 原表述</th><th>修正后</th><th>依据</th></tr>
      <tr><td>个人销售住房不足 2 年</td><td>5% 全额</td><td><b>3% 全额</b></td><td>财政部 税务总局公告2025年第17号</td></tr>
      <tr><td>小规模纳税人销售不动产</td><td>3%（易误用减按1%）</td><td><b>3%，不适用减按 1%</b></td><td>财政部 税务总局公告2026年第10号 三(三)6</td></tr>
      <tr><td>自然人转让商办厂房</td><td>老项目简易5%／新项目一般计税9%</td><td><b>一律 3% 简易计税</b>（外购可差额，自建全额）</td><td>增值税法第十一条、实施条例第七条</td></tr>
      <tr><td>土增税扣除项④</td><td>城建税+教育附加+地方教育附加</td><td><b>补入印花税</b></td><td>国家税务总局公告2026年第3号第五条</td></tr>
    </table>

    <h4>一、计税税率速查</h4>
    <table>
      <tr><th>税种</th><th>计税依据</th><th>税率/征收率</th><th>主要依据</th></tr>
      <tr><td>增值税（一般计税）</td><td>不含税销售额</td><td>9%</td><td>《增值税法》第十条</td></tr>
      <tr><td>增值税（简易计税）</td><td>差额或全额</td><td>5%（至 2027-12-31）</td><td>财政部 税务总局公告2026年第10号 三(二)4</td></tr>
      <tr><td>增值税（小规模/自然人）</td><td>差额或全额</td><td>3%（不动产不减按1%）</td><td>《增值税法》第十一条；2026年第10号</td></tr>
      <tr><td>增值税（个人住房）</td><td>全额</td><td>满2年免征；不足2年 3%</td><td>财政部 税务总局公告2025年第17号</td></tr>
      <tr><td>城建税</td><td>实缴增值税</td><td>市区7% / 县城镇5% / 其他1%</td><td>《城市维护建设税法》第四条</td></tr>
      <tr><td>教育费附加</td><td>实缴增值税</td><td>3%</td><td>《征收教育费附加的暂行规定》</td></tr>
      <tr><td>地方教育附加</td><td>实缴增值税</td><td>2%</td><td>各地规定</td></tr>
      <tr><td>土地增值税</td><td>增值额 ÷ 扣除项目合计</td><td>四级超率累进 30%/40%/50%/60%</td><td>财税〔1994〕84号、财法字〔1995〕6号</td></tr>
      <tr><td>印花税</td><td>不含增值税所载金额</td><td>产权转移书据 0.05%</td><td>《印花税法》第五条第二款</td></tr>
      <tr><td>契税</td><td>不含增值税成交价</td><td>3%~5%（省级定）；个人住房 1%/1.5%/2%</td><td>《契税法》；2024年第16号公告</td></tr>
      <tr><td>个人所得税</td><td>财产转让所得</td><td>20%</td><td>《个人所得税法》；财税字〔1999〕278号</td></tr>
      <tr><td>企业所得税</td><td>应纳税所得额</td><td>25%；小型微利 25%×20%=5%</td><td>《企业所得税法》；财政部 税务总局公告2023年第12号</td></tr>
      <tr><td>房产税</td><td>从价：原值×(1−减除比例)；从租：不含增值税租金</td><td>1.2% / 12%（住房出租优惠 4%）</td><td>国发〔1986〕90号</td></tr>
      <tr><td>城镇土地使用税</td><td>实际占用面积</td><td>南京：18/15/10/7/5/3/1.5 元/㎡</td><td>《城镇土地使用税暂行条例》；宁政办发〔2019〕28号</td></tr>
    </table>

    <h4>二、土地增值税四级超率累进</h4>
    <table>
      <tr><th>增值率（增值额 ÷ 扣除项目合计）</th><th>税率</th><th>速算扣除系数</th></tr>
      <tr><td>≤ 50%</td><td>30%</td><td>0%</td></tr>
      <tr><td>50% ~ 100%</td><td>40%</td><td>5%</td></tr>
      <tr><td>100% ~ 200%</td><td>50%</td><td>15%</td></tr>
      <tr><td>&gt; 200%</td><td>60%</td><td>35%</td></tr>
    </table>
    <p class="src">公式：应纳税额 = 增值额 × 税率 − 扣除项目合计 × 速算扣除系数。</p>

    <h4>三、扣除项目规则</h4>
    <ul>
      <li><b>房地产开发企业（销售新建商品房）</b>：①取得土地使用权支付金额；②房地产开发成本（已发生的前期、建安、基础设施、开发间接费）；③房地产开发费用——可提供利息证明：利息 +(①+②)×5%；不能提供：(①+②)×10%；④转让环节税金（城建税、教育费附加、地方教育附加、<b>印花税</b>）；⑤加计 20% 扣除 =(①土地金额 + ②已发生开发成本)×20%。依据：《实施细则》第七条(六)、国家税务总局公告2026年第3号第五条。</li>
      <li><b>旧房转让</b>：①能提供评估价格的，按评估价格扣除；②无评估价格但有购房发票的，按发票金额每年加计 5% 扣除；③两者均无的，核定征收。</li>
      <li><b>加计年数的计算（国税函〔2010〕220号第七条）</b>：自购房发票所载日期起至售房发票开具之日止，<b>每满 12 个月计一年</b>；超过 1 年未满 12 个月但超过 6 个月的，按一年计算；未超过 6 个月的，不计年。工具支持填写「买入日期」「卖出日期」自动推算，也可直接填写「持有年限」。</li>
      <li><b>加计基数按发票类型确定</b>：营业税发票取票面金额；增值税普通发票取价税合计；增值税专用发票取不含税金额 + 不得抵扣的进项税额。</li>
      <li><b>购房契税</b>可作税金扣除，但<b>不计入</b>旧房加计基数。</li>
      <li><b>个人转让住房</b>：暂免征土地增值税（财税〔2008〕137号第三条）。</li>
    </ul>

    <h4>四、契税优惠（2024年12月1日起）</h4>
    <table>
      <tr><th>情形</th><th>≤ 140㎡</th><th>&gt; 140㎡</th></tr>
      <tr><td>家庭唯一住房</td><td>1%</td><td>1.5%</td></tr>
      <tr><td>家庭第二套住房</td><td>1%</td><td>2%</td></tr>
      <tr><td>第三套及以上</td><td colspan="2">不享受优惠，按属地法定税率（多数 3%，河北/辽宁/湖南 4%）</td></tr>
      <tr><td>企业 / 合伙 / 非住房</td><td colspan="2">属地法定税率 3%~5%</td></tr>
    </table>
    <p class="src">依据：财政部 税务总局 住房城乡建设部公告 2024 年第 16 号、《契税法》。140㎡ 为不动产权证<b>房屋建筑面积</b>。普通住宅/非普通住宅标准已取消。<b>契税不属于"六税两费"</b>，小规模纳税人购买方契税不享减半。</p>

    <h4>五、房产税与城镇土地使用税要点</h4>
    <ul>
      <li><b>从价计征</b>：房产原值 × (1 − 减除比例) × 1.2%。江苏/南京减除比例 <b>30%</b>（苏政发〔1986〕172号）。</li>
      <li><b>从租计征</b>：不含增值税租金 × 12%。个人出租住房减按 <b>4%</b>（财税〔2008〕24号）；单位出租住房减按 4% 须同时满足：标的为住房 <b>且</b> 承租人为个人或专业化规模化住房租赁企业（财政部 税务总局 住房城乡建设部公告2021年第24号第二条）。</li>
      <li><b>个人所有非营业用的房产免征房产税</b>（国发〔1986〕90号）。</li>
      <li><b>个人非营业用房暂不征收城镇土地使用税</b>（省级授权，〔1988〕国税地字第015号；江苏苏税三〔89〕017号"暂缓征收"）；用于生产经营的照章征收，居住与经营并用按各自使用面积分别征免。</li>
      <li><b>"六税两费"减半</b>（财政部 税务总局公告2023年第12号，至2027-12-31）：适用<b>增值税小规模纳税人、小型微利企业、个体工商户</b>。⚠️ <b>一般纳税人若符合小型微利企业条件同样减半</b>；土地增值税与契税不在减半范围。</li>
      <li><b>南京城镇土地使用税</b>：一至七类 18/15/10/7/5/3/1.5 元/㎡（宁政办发〔2019〕28号，2019-01-01 起执行）。</li>
    </ul>

    <h4>六、政策有效期（到期提醒）</h4>
    <table>
      <tr><th>政策</th><th>有效期至</th></tr>
      <tr><td>一般纳税人不动产简易计税 5%</td><td>2027-12-31</td></tr>
      <tr><td>房地产老项目简易计税 5%</td><td>2027-12-31</td></tr>
      <tr><td>"六税两费"减半</td><td>2027-12-31</td></tr>
      <tr><td>小型微利企业所得税 5%</td><td>2027-12-31</td></tr>
      <tr><td>增值税起征点（月10万/季30万/次1000元）</td><td>2027-12-31</td></tr>
    </table>

    <h4>七、主要政策来源</h4>
    <ul class="src">
      <li>《中华人民共和国增值税法》（2026.1.1 施行）· 《实施条例》（国务院令第826号）</li>
      <li>财政部 税务总局公告 2025 年第 17 号 · 2026 年第 9 号 · 2026 年第 10 号</li>
      <li>国家税务总局公告 2026 年第 3 号</li>
      <li>财政部 税务总局 住房城乡建设部公告 2024 年第 16 号 · 2021 年第 24 号</li>
      <li>《中华人民共和国契税法》《中华人民共和国印花税法》《中华人民共和国城市维护建设税法》</li>
      <li>财税〔1994〕84号 · 财法字〔1995〕6号 · 财税〔2006〕21号 · 国税函〔2010〕220号</li>
      <li>财税〔2008〕137号 · 财税〔2008〕24号 · 财税字〔1999〕278号 · 财税〔2008〕159号</li>
      <li>国发〔1986〕90号 · 苏政发〔1986〕172号 · 宁政办发〔2019〕28号</li>
      <li>财政部 税务总局公告 2023 年第 12 号</li>
    </ul>

    <h4>八、地区参数（本地化差异）</h4>
    <p>以下参数由<b>地方</b>确定，工具已做成「地区参数表」：选择城市后自动带出，手工填写优先于地区默认值。</p>
    <table>
      <tr><th>参数</th><th>单位</th><th>适用环节</th><th>性质</th><th>依据</th></tr>
      <tr><td>城镇土地使用税单位税额</td><td>元/㎡·年（按等级分档）</td><td>城镇土地使用税</td><td>市级</td><td>《城镇土地使用税暂行条例》；各省市税额标准</td></tr>
      <tr><td>房产税减除比例</td><td>%</td><td>房产税从价计征</td><td>省级</td><td>法定幅度 10%-30%</td></tr>
      <tr><td>契税法定税率</td><td>%</td><td>契税</td><td>省级</td><td>《契税法》法定幅度 3%-5%，省级人大常委会决定</td></tr>
      <tr><td>土地增值税核定征收率</td><td>%</td><td>土地增值税</td><td>市级</td><td>地方自定，无全国统一值</td></tr>
      <tr><td>个税核定征收比例</td><td>%</td><td>个人所得税</td><td>市级</td><td>国税发〔2006〕108号 幅度 1%-3%</td></tr>
      <tr><td>地方教育附加</td><td>%</td><td>增值税附加</td><td>省级</td><td>财综〔2010〕98号授权地方自定</td></tr>
    </table>
    <p class="src">覆盖优先级：手工填写 &gt; 城市级参数 &gt; 省级参数 &gt; 全国通用默认值。地区参数表见 <code>research/地区参数表.md</code>，数据文件见 <code>app/js/regions.js</code>。</p>

    <h4>九、地区执行口径开关</h4>
    <ul>
      <li><b>自然人转让商办厂房类可否按差额计征增值税</b>：公告2026年第10号第四条（八）文义支持（自然人属小规模纳税人，"不含个人销售购买的住房"为除外项），但部分地区基层执行口径不同。工具已做成界面开关，默认按文义允许差额，实际以主管税务机关认定为准。</li>
      <li><b>合伙企业自然人合伙人个税口径</b>：经营所得 5%-35%（国家层面倾向）或财产转让所得 20%（部分地方口径），已做成可切换参数。</li>
    </ul>

    <h4>十、使用说明与免责</h4>
    <ul>
      <li>本工具为政策测算辅助工具，结果为按输入要素与上述一般规则的估算，实际应纳税额以主管税务机关认定为准。</li>
      <li>契税、土地增值税、房产税等地方性执行差异较大，部分地区另有优惠或核定口径，请结合本地规定修正参数（政策明细见工作区 <code>research/</code> 目录下三份政策文档与<b>地区参数表</b>）。</li>
      <li>本工具暂未覆盖：耕地占用税、土地闲置税、契税减免特殊情形（廉租房/经适房/棚改安置/离婚分割等13项）、不动产登记费、境外主体、非货币性资产交换、以物抵债、划转/改制/合并等特殊交易形式，以及房企增值税预征与土增税清算全流程。</li>
      <li>工具为按现行一般规则与已录入地区参数的<b>估算</b>，地方口径差异较大，务必结合本地规定核对地区参数与口径开关后再使用。</li>
    </ul>`;
  }

  /* ---------------- 事件绑定 ---------------- */
  function refresh() {
    const p = readForm();
    applyVisibility(p);
    renderRegionParams(p);
    try {
      const r = calculate(p);
      render(p, r);
      window.__lastResult = { p, r };
    } catch (e) {
      $('#resultBody').innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>计算出错：${e.message}</p></div>`;
      console.error(e);
    }
  }

  function bindTabs() {
    $$('.tab').forEach((t) => {
      t.addEventListener('click', () => {
        $$('.tab').forEach((x) => x.classList.remove('active'));
        $$('.tab-panel').forEach((x) => x.classList.remove('active'));
        t.classList.add('active');
        document.querySelector(`[data-panel="${t.dataset.tab}"]`).classList.add('active');
      });
    });
  }

  function bindInputs() {
    document.querySelectorAll('.tab-panels input, .tab-panels select').forEach((el) => {
      el.addEventListener('input', refresh);
      el.addEventListener('change', refresh);
    });
    // 买入/卖出日期变化 → 自动推算持有年限（仅当用户未手工改过年限）
    const onDate = () => {
      const buy = document.getElementById('购房发票日期');
      const sell = document.getElementById('售房发票日期');
      const years = document.getElementById('持有年限');
      if (!buy || !sell || !years) return;
      if (buy.value && sell.value) {
        const b = new Date(buy.value), s = new Date(sell.value);
        if (s > b) {
          years.value = Math.max(0, Math.round((s - b) / (365.25 * 24 * 3600 * 1000)));
          updateYearsHint(years.value);
        }
      }
    };
    ['购房发票日期', '售房发票日期'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) { el.addEventListener('change', onDate); el.addEventListener('input', onDate); }
    });

    // 城市变更 → 重建地区参数面板（手工值重置，由用户重新确认）
    const cityEl = document.getElementById('城市');
    if (cityEl) {
      cityEl.addEventListener('change', () => {
        const box = $('#regionParams');
        if (box) box.innerHTML = '<p class="region-empty">选择城市后自动带出地方参数</p>';
        refresh();
      });
    }
  }

  function bindButtons() {
    $('#btnReset').addEventListener('click', () => {
      // 【修复问题36】清理范围扩大到整个表单（含地区参数面板），默认值与非重置初始状态一致
      document.querySelectorAll('input, select').forEach((el) => {
        if (el.type === 'button' || el.type === 'submit' || el.id === '城市') return;
        if (el.tagName === 'SELECT') el.selectedIndex = 0; else el.value = '';
      });
      const def = {
        核定征收率: '5', 自然人合伙人利润占比: '100',
        减除比例: '30',            // 初始值 30%（原重置成 10%，与初始态不一致）
        土地等级: '1', 租金增值税率: '0',
        lvatUseApproved: '否', iitUseApproved: '否',
        建造开工时间: '2016.5.1后',
      };
      Object.entries(def).forEach(([id, v]) => { const el = document.getElementById(id); if (el) el.value = v; });
      refresh();
    });

    $('#btnPolicy').addEventListener('click', () => {
      $('#policyBody').innerHTML = buildPolicyHTML();
      $('#policyModal').hidden = false;
    });

    $('#policyModal').addEventListener('click', (e) => {
      if (e.target.hasAttribute('data-close')) $('#policyModal').hidden = true;
    });

    $('#btnExport').addEventListener('click', exportCSV);
  }

  function exportCSV() {
    const d = window.__lastResult;
    if (!d) return;
    const { p, r } = d;
    const rows = [['场景', p['场景类型']], ['卖方主体', p['主体类型']], ['资产类型', p['资产类型']],
      ['城市', p['城市']], ['成交总价', p['成交总价']], []];
    if (p['场景类型'] === 'transfer') {
      // 【修复问题35】导出完整链条：销项/进项/实缴分列 + 扣除明细 + 地区参数来源
      rows.push(['【卖方】', '', '']);
      rows.push(['增值税-计税方式', '', r.卖方.增值税.计税方式 || '']);
      rows.push(['增值税-销项税额', r.卖方.增值税.销项税额, '票面税额']);
      rows.push(['增值税-进项税额', r.卖方.增值税.进项税额 || 0, r.卖方.增值税.可抵扣进项 ? '可抵扣' : '不可抵扣']);
      rows.push(['增值税-实缴（计入合计）', r.卖方.实缴增值税额 != null ? r.卖方.实缴增值税额 : r.卖方.增值税.实缴增值税, '合计口径=税负总额']);
      rows.push(['增值税-不含税收入', r.卖方.不含增值税价, '']);
      rows.push(['增值税附加合计', r.卖方.附加税费.合计, '以实缴增值税为计税依据']);
      rows.push(['土地增值税', r.卖方.土地增值税.税额, r.卖方.土地增值税.说明 || '']);
      if (r.卖方.土地增值税 && r.卖方.土地增值税.扣除明细) {
        const dd = r.卖方.土地增值税.扣除明细;
        Object.keys(dd).forEach((k) => rows.push([`  土增税扣除-${k}`, dd[k], '']));
      }
      rows.push(['印花税', r.卖方.印花税.税额, r.卖方.印花税.说明 || '']);
      rows.push(['所得税', r.卖方.所得税.税额, r.卖方.所得税.说明 || '']);
      rows.push(['卖方合计', r.卖方.合计, '税负总额口径']);
      if (r.地区参数 && r.地区参数.来源) {
        Object.keys(r.地区参数.来源).forEach((k) => {
          rows.push([`地区参数-${k}`, (r.地区参数.取值 || {})[k], `来源:${r.地区参数.来源[k]}`]);
        });
      }
      (r.地区参数 && r.地区参数.待确认 || []).forEach((w) => rows.push(['⚠️待确认', '', w]));
      rows.push(['【买方】', '', '']);
      rows.push(['契税', r.买方.契税.税额, r.买方.契税.说明 || '']);
      rows.push(['印花税', r.买方.印花税.税额, r.买方.印花税.说明 || '']);
      rows.push(['买方合计', r.买方.合计, '']);
    } else {
      rows.push(['【持有环节】', '', '']);
      rows.push(['房产税', r.持有.房产税.税额, r.持有.房产税.说明 || '']);
      rows.push(['城镇土地使用税', r.持有.城镇土地使用税.税额, r.持有.城镇土地使用税.说明 || '']);
      rows.push(['合计', r.持有.合计, '']);
    }
    const csv = '\uFEFF' + rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `不动产税费测算_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  /* ---------------- 城市下拉（由地区参数表生成） ---------------- */
  function populateCities() {
    const sel = document.getElementById('城市');
    if (!sel || typeof RegionResolver === 'undefined') return;
    const current = sel.value;
    sel.innerHTML = '';
    RegionResolver.cityList().forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c.key;
      opt.textContent = c.province ? `${c.name}（${c.province}）` : c.name;
      sel.appendChild(opt);
    });
    // 保持原选中项
    if (current && Array.prototype.some.call(sel.options, (o) => o.value === current)) {
      sel.value = current;
    }
  }

  /* ---------------- 启动 ---------------- */
  document.addEventListener('DOMContentLoaded', () => {
    populateCities();
    bindTabs();
    bindInputs();
    bindButtons();
    refresh();
    // 暴露给外部（调试 / 自动化测试）
    window.__refresh = refresh;
    window.__readForm = readForm;
    window.__buildPolicyHTML = buildPolicyHTML;
  });
})();
