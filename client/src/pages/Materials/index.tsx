import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, Table, Input, InputNumber, Descriptions, Empty, Spin, Tag, Image, Button, Upload, message } from 'antd';
import { SearchOutlined, FolderOutlined, FileOutlined, EditOutlined, CheckCircleOutlined, CloseCircleOutlined, UploadOutlined, DeleteOutlined, PaperClipOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { Resizable } from 'react-resizable';
import 'react-resizable/css/styles.css';
import { api } from '../../api';

// ── Types ──

interface RowData {
  key: string;
  code: string;
  name: string;
  description: string;
  count: number | string;
  totalStock: number;
  totalCost: number;
  nodeType: 'prefix' | 'category' | 'material' | 'stockFilter';
  material?: any;
  children?: RowData[];
  _loaded?: boolean;
}

interface CatInfo { category: string | null; count: number; totalStock: number; totalCost: number; }
type MetaMap = Record<string, { displayName: string; description?: string }>;

// ── Helpers ──

function isAlphaNum(s: string) { return /^[A-Za-zＡ-Ｚａ-ｚ０-９0-9]/.test(s); }
function normalize(s: string) { return s.replace(/[Ａ-Ｚａ-ｚ０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)); }
function groupBy<T>(arr: T[], fn: (i: T) => string) {
  const r: Record<string, T[]> = {};
  arr.forEach(i => { const k = fn(i); (r[k] ||= []).push(i); });
  return r;
}

// ── Resizable header cell ──

function ResizableTitle(props: any) {
  const { onResize, width, ...restProps } = props;
  if (!width) return <th {...restProps} />;
  return (
    <Resizable width={width} height={0} handle={
      <span className="react-resizable-handle" onClick={e => e.stopPropagation()}
        style={{ position: 'absolute', right: -5, bottom: 0, top: 0, width: 10, cursor: 'col-resize', zIndex: 1 }} />
    } onResize={onResize} draggableOpts={{ enableUserSelectHack: false }}>
      <th {...restProps} />
    </Resizable>
  );
}

// ── Build prefix tree ──

const defaultNames: Record<string, string> = {
  B: '外購零組件 / Purchased Parts',
  M: '自製物料 / Manufactured Materials',
  I: 'IC 元件 / IC Components',
};

function buildPrefixTree(categories: CatInfo[], meta: MetaMap): RowData[] {
  const alpha: CatInfo[] = [], other: CatInfo[] = [], nullCat: CatInfo[] = [];
  for (const cat of categories) {
    if (!cat.category) nullCat.push(cat);
    else if (isAlphaNum(cat.category)) alpha.push({ ...cat, category: normalize(cat.category) });
    else other.push(cat);
  }

  const rows: RowData[] = [];
  const by1 = groupBy(alpha, c => c.category![0]);

  for (const [c1, cats1] of Object.entries(by1).sort(([a], [b]) => a.localeCompare(b))) {
    const t1 = cats1.reduce((s, c) => s + c.count, 0);
    if (cats1.length === 1 && cats1[0].category!.length <= 1) { rows.push(makeCatRow(cats1[0], meta)); continue; }

    const by2 = groupBy(cats1, c => c.category!.slice(0, 2));
    const ch2: RowData[] = [];
    for (const [c2, cats2] of Object.entries(by2).sort(([a], [b]) => a.localeCompare(b))) {
      const t2 = cats2.reduce((s, c) => s + c.count, 0);
      if (cats2.length === 1) { ch2.push(makeCatRow(cats2[0], meta)); continue; }

      const by3 = groupBy(cats2, c => c.category!.slice(0, 3));
      const ch3: RowData[] = [];
      for (const [c3, cats3] of Object.entries(by3).sort(([a], [b]) => a.localeCompare(b))) {
        const t3 = cats3.reduce((s, c) => s + c.count, 0);
        if (cats3.length === 1) { ch3.push(makeCatRow(cats3[0], meta)); continue; }
        const ch4 = cats3.sort((a, b) => (a.category || '').localeCompare(b.category || '')).map(c => makeCatRow(c, meta));
        ch3.push(makePrefixRow(c3, t3, ch4, meta));
      }
      ch2.push(makePrefixRow(c2, t2, ch3, meta));
    }
    rows.push(makePrefixRow(c1, t1, ch2, meta));
  }

  for (const cat of other) rows.push(makeCatRow(cat, meta));
  for (const cat of nullCat) rows.push({
    key: 'cat:(未分類)', code: '—',
    name: meta['(未分類)']?.displayName || '未分類 / Uncategorized',
    description: '未指定品號類別', count: cat.count,
    totalStock: cat.totalStock, totalCost: cat.totalCost,
    nodeType: 'category', children: [],
  });
  return rows;
}

function makePrefixRow(code: string, count: number, children: RowData[], meta: MetaMap): RowData {
  const totalStock = children.reduce((s, c) => s + (c.totalStock || 0), 0);
  const totalCost = children.reduce((s, c) => s + (c.totalCost || 0), 0);
  return {
    key: `prefix:${code}`, code,
    name: meta[code]?.displayName || defaultNames[code] || `${code} 群組`,
    description: meta[code]?.description || `包含 ${children.length} 個子項目`,
    count, totalStock, totalCost, nodeType: 'prefix', children,
  };
}

function makeCatRow(cat: CatInfo, meta: MetaMap): RowData {
  const code = cat.category || '—';
  return {
    key: `cat:${cat.category}`, code,
    name: meta[code]?.displayName || `${code} 類別`,
    description: meta[code]?.description || `共 ${cat.count} 筆物料`,
    count: cat.count, totalStock: cat.totalStock, totalCost: cat.totalCost,
    nodeType: 'category', children: [],
  };
}

// ── Main Component ──

export default function Materials() {
  const { t } = useTranslation();
  const [treeData, setTreeData] = useState<RowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [loadingKeys, setLoadingKeys] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<{ key: string; field: string } | null>(null);
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
  const [colWidths, setColWidths] = useState([200, 240, 260, 130, 90, 120, 130]);
  const [attachStats, setAttachStats] = useState<{
    categories: Record<string, { photoCount: number; docCount: number; totalSize: number }>;
    items: Record<string, { photoCount: number; docCount: number; totalSize: number }>;
  }>({ categories: {}, items: {} });
  const loadedCategories = useRef<Set<string>>(new Set());
  const metaRef = useRef<MetaMap>({});

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadRoot = useCallback(async () => {
    setLoading(true);
    loadedCategories.current.clear();
    try {
      const [res, meta, ratesData, stats] = await Promise.all([
        api.getCategories(search || undefined),
        api.getCategoryMeta(),
        api.getExchangeRates().catch(() => null),
        api.getAttachmentStats().catch(() => ({ categories: {}, items: {} })),
      ]);
      if (ratesData?.twdRates) setExchangeRates(ratesData.twdRates);
      metaRef.current = meta;
      setAttachStats(stats);

      if (res.type === 'search') {
        setTreeData(res.data.map((m: any) => ({
          key: m.id, code: m.id, name: m.name,
          description: m.specification || m.supplier || '—',
          count: m.stockQty, totalStock: m.stockQty,
          totalCost: (m.costPrice || 0) * (m.stockQty || 0),
          nodeType: 'material' as const, material: m,
        })));
      } else {
        setTreeData(buildPrefixTree(res.data, meta));
      }
      setExpandedKeys([]);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [search]);

  useEffect(() => { loadRoot(); }, [loadRoot]);

  // Convert materials array to RowData[]
  const materialsToRows = (materials: any[]): RowData[] =>
    materials.map((m: any) => ({
      key: m.id, code: m.id, name: m.name,
      description: m.specification ? (m.specification.length > 60 ? m.specification.slice(0, 60) + '...' : m.specification) : '—',
      count: m.stockQty, totalStock: m.stockQty,
      totalCost: (m.costPrice || 0) * (m.stockQty || 0),
      nodeType: 'material' as const, material: m,
    }));

  // Build hierarchical tree from material IDs by dot-separated segments
  const buildIdTree = (materials: any[], parentPrefix: string): RowData[] => {
    // Group materials by next segment of their ID after parentPrefix
    const getNextSegment = (id: string): string => {
      const rest = parentPrefix ? id.slice(parentPrefix.length) : id;
      // Remove leading dot
      const trimmed = rest.startsWith('.') ? rest.slice(1) : rest;
      const dotIdx = trimmed.indexOf('.');
      if (dotIdx === -1) return ''; // This is a leaf (material itself)
      return trimmed.slice(0, dotIdx);
    };

    const groups: Record<string, any[]> = {};
    const leaves: any[] = [];

    for (const m of materials) {
      const seg = getNextSegment(m.id);
      if (seg === '') {
        leaves.push(m);
      } else {
        const groupKey = parentPrefix ? `${parentPrefix}.${seg}` : seg;
        (groups[groupKey] ||= []).push(m);
      }
    }

    const rows: RowData[] = [];

    // Sort groups alphabetically
    for (const [prefix, items] of Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))) {
      // Check if all items in group share more common segments — if only 1 item, show as material directly
      if (items.length === 1) {
        rows.push(...materialsToRows(items));
      } else {
        const totalStock = items.reduce((s: number, m: any) => s + (m.stockQty || 0), 0);
        const totalCost = items.reduce((s: number, m: any) => s + (m.costPrice || 0) * (m.stockQty || 0), 0);
        rows.push({
          key: `group:${prefix}`, code: prefix, nodeType: 'prefix',
          name: `${prefix} (${items.length})`,
          description: `共 ${items.length} 筆物料`,
          count: items.length, totalStock, totalCost,
          children: buildIdTree(items, prefix),
        });
      }
    }

    // Add leaf materials
    rows.push(...materialsToRows(leaves).sort((a, b) => a.code.localeCompare(b.code)));

    return rows;
  };

  // Lazy load category children
  const handleExpand = async (expanded: React.Key[], info: { node: any; expanded: boolean }) => {
    setExpandedKeys(expanded);
    const node = info.node as RowData;
    if (!info.expanded || node.nodeType === 'material') return;
    // stockFilter and prefix with children already loaded — no need to fetch
    if (node.nodeType === 'stockFilter' || (node.nodeType === 'prefix' && node.children && node.children.length > 0)) return;
    if (node.nodeType === 'category' && !loadedCategories.current.has(node.key)) {
      const catName = String(node.key).replace('cat:', '');
      const realCat = catName === '(未分類)' ? '' : catName;
      setLoadingKeys(prev => new Set(prev).add(node.key));
      try {
        const materials = await api.getMaterialsByCategory(realCat);
        const children = buildIdTree(materials, realCat);
        setTreeData(prev => updateChildren(prev, node.key, children));
        loadedCategories.current.add(node.key);
      } catch (e) { console.error(e); }
      setLoadingKeys(prev => { const n = new Set(prev); n.delete(node.key); return n; });
    }
  };

  const updateChildren = (nodes: RowData[], parentKey: string, children: RowData[]): RowData[] =>
    nodes.map(n => n.key === parentKey ? { ...n, children } : n.children ? { ...n, children: updateChildren(n.children, parentKey, children) } : n);

  const updateNodeInTree = (nodes: RowData[], key: string, updates: Partial<RowData>): RowData[] =>
    nodes.map(n => n.key === key ? { ...n, ...updates } : n.children ? { ...n, children: updateNodeInTree(n.children, key, updates) } : n);

  // ── Inline edit save ──

  const isEditing = (key: string, field: string) => editingCell?.key === key && editingCell?.field === field;

  const saveMaterialField = async (record: RowData, field: string, value: any) => {
    if (!record.material || String(value) === String(record.material[field])) { setEditingCell(null); return; }
    try {
      await api.updateMaterial(record.material.id, { [field]: value });
      const updated = { ...record.material, [field]: value };
      setTreeData(prev => updateNodeInTree(prev, record.key, { name: updated.name, material: updated, count: updated.stockQty }));
      if (selectedMaterial?.id === record.key) setSelectedMaterial(updated);
      message.success('已儲存 / Saved');
    } catch (e: any) { message.error(e.message); }
    setEditingCell(null);
  };

  const saveFolderName = async (record: RowData, value: string) => {
    const code = record.nodeType === 'category' ? String(record.key).replace('cat:', '') : String(record.key).replace('prefix:', '');
    if (value === record.name) { setEditingCell(null); return; }
    try {
      await api.updateCategoryMeta(code, { displayName: value });
      metaRef.current[code] = { ...metaRef.current[code], displayName: value };
      setTreeData(prev => updateNodeInTree(prev, record.key, { name: value }));
      message.success('已儲存 / Saved');
    } catch (e: any) { message.error(e.message); }
    setEditingCell(null);
  };

  // ── Currency conversion ──
  const toTWD = (amount: number | null, currency: string | null): number | null => {
    if (!amount) return null;
    if (!currency || currency === 'NTD' || currency === 'TWD') return amount;
    const rate = exchangeRates[currency.toUpperCase()];
    if (!rate) return amount;
    return Math.round(amount * rate * 100) / 100;
  };

  // ── Resizable columns ──

  const handleResize = (index: number) => (_: any, { size }: any) => {
    setColWidths(prev => { const next = [...prev]; next[index] = size.width; return next; });
  };

  const baseColumns = [
    {
      title: '代碼 / Code', dataIndex: 'code', key: 'code', width: colWidths[0],
      render: (code: string, record: RowData) => {
        let icon;
        if (record.nodeType === 'material') icon = <FileOutlined style={{ marginRight: 6, color: '#1890ff' }} />;
        else if (record.nodeType === 'stockFilter') icon = record.key.endsWith(':instock')
          ? <CheckCircleOutlined style={{ marginRight: 6, color: '#52c41a' }} />
          : <CloseCircleOutlined style={{ marginRight: 6, color: '#ff4d4f' }} />;
        else icon = <FolderOutlined style={{ marginRight: 6, color: '#faad14' }} />;
        return (
          <span>
            {icon}
            <strong>{record.nodeType === 'stockFilter' ? '' : code}</strong>
            {loadingKeys.has(record.key) && <Spin size="small" style={{ marginLeft: 8 }} />}
          </span>
        );
      },
    },
    {
      title: '名稱 / Name', dataIndex: 'name', key: 'name', width: colWidths[1], ellipsis: true,
      render: (name: string, record: RowData) => {
        if (record.nodeType === 'stockFilter') {
          return <span style={{ fontWeight: 'bold', color: record.key.endsWith(':instock') ? '#52c41a' : '#ff4d4f' }}>{name}</span>;
        }
        if (isEditing(record.key, 'name')) {
          const defaultVal = record.nodeType === 'material' ? record.material?.name : record.name;
          return (
            <Input size="small" autoFocus defaultValue={defaultVal}
              onPressEnter={(e) => {
                const v = (e.target as HTMLInputElement).value;
                record.nodeType === 'material' ? saveMaterialField(record, 'name', v) : saveFolderName(record, v);
              }}
              onBlur={(e) => {
                record.nodeType === 'material' ? saveMaterialField(record, 'name', e.target.value) : saveFolderName(record, e.target.value);
              }}
              onClick={(e) => e.stopPropagation()} />
          );
        }
        return (
          <span style={{ cursor: 'pointer', borderBottom: '1px dashed #d9d9d9' }}
            onClick={(e) => { e.stopPropagation(); setEditingCell({ key: record.key, field: 'name' }); }}>
            {name} <EditOutlined style={{ fontSize: 11, color: '#bbb', marginLeft: 4 }} />
          </span>
        );
      },
    },
    {
      title: '描述 / Description', dataIndex: 'description', key: 'description', width: colWidths[2], ellipsis: true,
    },
    {
      title: '金額 / Cost', key: 'costPrice', width: colWidths[3],
      render: (_: any, record: RowData) => {
        if (record.nodeType !== 'material') return <Tag color={record.nodeType === 'stockFilter' ? (record.key.endsWith(':instock') ? 'green' : 'red') : undefined}>{record.count}</Tag>;
        const m = record.material;
        if (isEditing(record.key, 'costPrice')) {
          return (
            <InputNumber size="small" autoFocus defaultValue={m.costPrice || 0} min={0} style={{ width: '100%' }}
              onPressEnter={(e) => saveMaterialField(record, 'costPrice', Number((e.target as HTMLInputElement).value) || 0)}
              onBlur={(e) => saveMaterialField(record, 'costPrice', Number(e.target.value) || 0)}
              onClick={(e) => e.stopPropagation()} />
          );
        }
        const twdPrice = toTWD(m.costPrice, m.costCurrency);
        const isConverted = m.costCurrency && m.costCurrency !== 'NTD' && m.costCurrency !== 'TWD' && exchangeRates[m.costCurrency?.toUpperCase()];
        const display = twdPrice ? `NT$ ${twdPrice.toLocaleString()}` : '—';
        return (
          <span style={{ cursor: 'pointer', borderBottom: '1px dashed #d9d9d9' }}
            onClick={(e) => { e.stopPropagation(); setEditingCell({ key: record.key, field: 'costPrice' }); }}>
            {display}
            {isConverted && <span style={{ fontSize: 10, color: '#faad14', marginLeft: 4 }} title={`原幣 ${m.costCurrency} ${m.costPrice}`}>({m.costCurrency})</span>}
            <EditOutlined style={{ fontSize: 11, color: '#bbb', marginLeft: 4 }} />
          </span>
        );
      },
    },
    {
      title: '庫存 / Stock', dataIndex: 'totalStock', key: 'totalStock', width: colWidths[4], align: 'right' as const,
      render: (stock: number, record: RowData) => {
        if (record.nodeType === 'material') {
          return <span style={{ color: stock <= 0 ? '#ff4d4f' : '#52c41a', fontWeight: 'bold' }}>{stock}</span>;
        }
        return <strong>{stock.toLocaleString()}</strong>;
      },
    },
    {
      title: '總價(NT$) / Total', dataIndex: 'totalCost', key: 'totalCost', width: colWidths[5] || 140, align: 'right' as const,
      render: (_: any, record: RowData) => {
        let cost = record.totalCost;
        if (record.nodeType === 'material' && record.material) {
          const twdPrice = toTWD(record.material.costPrice, record.material.costCurrency);
          cost = (twdPrice || 0) * (record.material.stockQty || 0);
        }
        if (!cost) return '—';
        return <span style={{ fontWeight: record.nodeType !== 'material' ? 'bold' : 'normal' }}>
          NT$ {Math.round(cost).toLocaleString()}
        </span>;
      },
    },
    {
      title: '附件 / Files', key: 'attachments', width: colWidths[6] || 130, align: 'center' as const,
      render: (_: any, record: RowData) => {
        // Recursively aggregate stats from tree node
        const aggregate = (node: RowData): { p: number; d: number; s: number } => {
          if (node.nodeType === 'material' && node.material) {
            const stat = (attachStats.items || {})[node.material.id];
            return stat ? { p: stat.photoCount, d: stat.docCount, s: stat.totalSize } : { p: 0, d: 0, s: 0 };
          }
          if (node.nodeType === 'category') {
            // Use category stats + normalize full-width chars
            const code = String(node.key).replace(/^cat:/, '');
            const normCode = normalize(code);
            let p = 0, d = 0, s = 0;
            for (const [cat, stat] of Object.entries(attachStats.categories || {})) {
              if (cat === code || normalize(cat) === normCode) {
                p += stat.photoCount;
                d += stat.docCount;
                s += stat.totalSize;
              }
            }
            return { p, d, s };
          }
          // prefix or stockFilter: aggregate from children
          if (node.children && node.children.length > 0) {
            let p = 0, d = 0, s = 0;
            for (const child of node.children) {
              const c = aggregate(child);
              p += c.p; d += c.d; s += c.s;
            }
            return { p, d, s };
          }
          // prefix without loaded children: match from category stats
          if (node.nodeType === 'prefix') {
            const code = String(node.key).replace(/^prefix:/, '');
            let p = 0, d = 0, s = 0;
            for (const [cat, stat] of Object.entries(attachStats.categories || {})) {
              if (normalize(cat).startsWith(code)) {
                p += stat.photoCount;
                d += stat.docCount;
                s += stat.totalSize;
              }
            }
            return { p, d, s };
          }
          return { p: 0, d: 0, s: 0 };
        };

        const { p: photoCount, d: docCount, s: totalSize } = aggregate(record);

        if (photoCount === 0 && docCount === 0) return <span style={{ color: '#ccc' }}>—</span>;
        return (
          <span style={{ fontSize: 11 }}>
            {photoCount > 0 && <Tag color="blue" style={{ fontSize: 10, padding: '0 4px' }}>照片 {photoCount}</Tag>}
            {docCount > 0 && <Tag color="orange" style={{ fontSize: 10, padding: '0 4px' }}>文件 {docCount}</Tag>}
            <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>{formatSize(totalSize)}</div>
          </span>
        );
      },
    },
  ];

  const columns = baseColumns.map((col, index) => ({
    ...col,
    onHeaderCell: () => ({
      width: col.width,
      onResize: handleResize(index),
    }),
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)' }}>
      {/* 上半部：物料總覽 / Top: Materials overview */}
      <Card style={{ flex: 1, overflow: 'auto', marginBottom: 12 }}
        title={<div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h3 style={{ margin: 0 }}>{t('materials.title')}</h3>
          <Input prefix={<SearchOutlined />} placeholder="搜尋料號、品名、廠商、專案... / Search..."
            value={searchInput} onChange={(e) => setSearchInput(e.target.value)} allowClear style={{ maxWidth: 400 }} />
        </div>}>
        <Table
          columns={columns as any}
          components={{ header: { cell: ResizableTitle } }}
          dataSource={treeData}
          loading={loading}
          size="small"
          pagination={false}
          scroll={{ x: 800, y: 'calc(50vh - 200px)' }}
          expandable={{
            expandedRowKeys: expandedKeys as string[],
            onExpand: (expanded, record) => {
              const newKeys = expanded ? [...expandedKeys, record.key] : expandedKeys.filter(k => k !== record.key);
              handleExpand(newKeys, { node: record, expanded });
            },
            rowExpandable: (record) => record.nodeType !== 'material' && record.children !== undefined && record.children.length > 0 || record.nodeType === 'category',
          }}
          onRow={(record) => ({
            onClick: () => {
              // If expandable, toggle expand
              const isExpandable = record.nodeType !== 'material' && record.children !== undefined && record.children.length > 0 || record.nodeType === 'category';
              if (isExpandable) {
                const isExpanded = expandedKeys.includes(record.key);
                const newKeys = isExpanded ? expandedKeys.filter(k => k !== record.key) : [...expandedKeys, record.key];
                handleExpand(newKeys, { node: record, expanded: !isExpanded });
              }
              if (record.material) setSelectedMaterial(record.material);
            },
            style: { cursor: 'pointer', backgroundColor: selectedMaterial?.id === record.key ? '#e6f7ff' : undefined },
            className: 'bom-row-hover',
          })}
        />
      </Card>

      {/* 下半部：資料細節 / Bottom: Material detail */}
      <Card title="物料詳情 / Material Detail" style={{ flex: 1, overflow: 'auto' }}>
        {selectedMaterial ? <MaterialDetail material={selectedMaterial} t={t} toTWD={toTWD} /> : <Empty description="請點選物料查看詳情 / Click a material to view details" />}
      </Card>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + ' ' + units[i];
}

function MaterialDetail({ material, t, toTWD }: { material: any; t: any; toTWD: (a: number | null, c: string | null) => number | null }) {
  const imageUrl = material.imageUrl ? material.imageUrl : null;
  const isMobile = window.innerWidth < 768;
  const [storageSize, setStorageSize] = useState<number>(0);
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const docs = material.documents ? JSON.parse(material.documents) : [];
    setDocuments(docs);
    api.getMaterialStorage(material.id).then(r => setStorageSize(r.totalSize)).catch(() => {});
  }, [material]);

  const handleDocUpload = async (file: File) => {
    setUploading(true);
    try {
      const result = await api.uploadMaterialDocument(material.id, file);
      const newDocs = result.documents ? JSON.parse(result.documents) : [];
      setDocuments(newDocs);
      api.getMaterialStorage(material.id).then(r => setStorageSize(r.totalSize)).catch(() => {});
      message.success('文件已上傳 / Document uploaded');
    } catch (e: any) {
      message.error('上傳失敗 / Upload failed: ' + e.message);
    }
    setUploading(false);
    return false;
  };

  const handleDocDelete = async (url: string) => {
    try {
      const result = await api.deleteMaterialDocument(material.id, url);
      const newDocs = result.documents ? JSON.parse(result.documents) : [];
      setDocuments(newDocs);
      api.getMaterialStorage(material.id).then(r => setStorageSize(r.totalSize)).catch(() => {});
      message.success('文件已刪除 / Document deleted');
    } catch (e: any) {
      message.error(e.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 16 : 24 }}>
      {/* 照片 / Photo — mobile: top */}
      {isMobile && (
        <div style={{ textAlign: 'center' }}>
          {imageUrl ? (
            <Image src={imageUrl} alt={material.name} style={{ maxWidth: 200, borderRadius: 8 }} />
          ) : (
            <div style={{ width: '100%', height: 120, background: '#f5f5f5', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', border: '1px dashed #d9d9d9' }}>
              尚無照片 / No photo
            </div>
          )}
        </div>
      )}

      {/* 詳細資料 / Detail fields */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <Descriptions bordered column={isMobile ? 1 : 2} size="small">
          <Descriptions.Item label={t('materials.partNumber')}><strong>{material.id}</strong></Descriptions.Item>
          <Descriptions.Item label={t('materials.name')}>{material.name}</Descriptions.Item>
          <Descriptions.Item label={t('materials.spec')} span={isMobile ? 1 : 2}>{material.specification || '-'}</Descriptions.Item>
          <Descriptions.Item label={t('materials.category')}>{material.category || '-'}</Descriptions.Item>
          <Descriptions.Item label="狀態 / Status">
            {material.status ? <Tag color={
              material.status === '申請' ? 'blue' : material.status === '核准' ? 'green' :
              material.status === '使用' ? 'cyan' : material.status === '退件' ? 'red' : 'default'
            }>{material.status}</Tag> : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="專案代號 / Project">{material.projectCode || '-'}</Descriptions.Item>
          <Descriptions.Item label="申請人 / Applicant">{material.applicant || '-'}</Descriptions.Item>
          <Descriptions.Item label="舊品號 / Old P/N">{material.oldPartNumber || '-'}</Descriptions.Item>
          <Descriptions.Item label="申請用途 / Purpose">{material.purpose || '-'}</Descriptions.Item>
          <Descriptions.Item label="廠商 / Supplier">{material.supplier || '-'}</Descriptions.Item>
          <Descriptions.Item label="成本(原幣) / Cost(Original)">{material.costPrice ? `${material.costCurrency || 'NTD'} ${material.costPrice}` : '-'}</Descriptions.Item>
          <Descriptions.Item label="成本(NT$) / Cost(TWD)">{(() => {
            const twd = toTWD(material.costPrice, material.costCurrency);
            return twd ? `NT$ ${twd.toLocaleString()}` : '-';
          })()}</Descriptions.Item>
          <Descriptions.Item label="交期 / Lead Time">{material.leadTime || '-'}</Descriptions.Item>
          <Descriptions.Item label="交易條件 / Terms">{material.paymentTerms || '-'}</Descriptions.Item>
          <Descriptions.Item label="品號屬性 / Attribute">{material.partAttribute || '-'}</Descriptions.Item>
          <Descriptions.Item label="會計科目 / Account">{material.accountingCat || '-'}</Descriptions.Item>
          <Descriptions.Item label="主要庫別 / Warehouse">{material.warehouse || '-'}</Descriptions.Item>
          <Descriptions.Item label={t('materials.unit')}>{material.unit}</Descriptions.Item>
          <Descriptions.Item label={t('materials.stock')}>
            <span style={{ color: material.stockQty <= material.safetyStock ? '#ff4d4f' : '#52c41a', fontWeight: 'bold' }}>{material.stockQty}</span>
          </Descriptions.Item>
          <Descriptions.Item label={t('materials.safetyStock')}>{material.safetyStock}</Descriptions.Item>
        </Descriptions>
      </div>

      {/* 右側：照片 + 文件 + 總大小 / Right: Photo + Documents + Total size */}
      <div style={{ width: isMobile ? '100%' : 250, flexShrink: 0 }}>
        {/* 照片 / Photo */}
        {!isMobile && (
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <h4 style={{ marginBottom: 8 }}>照片 / Photo</h4>
            {imageUrl ? (
              <Image src={imageUrl} alt={material.name} style={{ width: '100%', borderRadius: 8 }} />
            ) : (
              <div style={{ width: '100%', height: 140, background: '#f5f5f5', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', border: '1px dashed #d9d9d9' }}>
                尚無照片<br />No photo
              </div>
            )}
          </div>
        )}

        {/* 文件 / Documents */}
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ marginBottom: 8 }}>
            <PaperClipOutlined style={{ marginRight: 6 }} />
            文件 / Documents ({documents.length})
          </h4>
          {documents.length > 0 ? (
            <div style={{ maxHeight: 150, overflow: 'auto' }}>
              {documents.map((doc: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontSize: 12 }}>
                  <FileOutlined style={{ color: '#1890ff' }} />
                  <a href={doc.url} target="_blank" rel="noreferrer"
                    style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {doc.name}
                  </a>
                  <span style={{ color: '#999', fontSize: 11 }}>{formatSize(doc.size)}</span>
                  <Button type="text" size="small" danger icon={<DeleteOutlined style={{ fontSize: 11 }} />}
                    onClick={() => handleDocDelete(doc.url)} style={{ padding: '0 4px', height: 20 }} />
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#bbb', fontSize: 12 }}>尚無文件 / No documents</p>
          )}
          <Upload
            beforeUpload={(file) => { handleDocUpload(file); return false; }}
            showUploadList={false}
          >
            <Button icon={<UploadOutlined />} size="small" loading={uploading} style={{ marginTop: 8 }}>
              上傳文件 / Upload
            </Button>
          </Upload>
        </div>

        {/* 總資料大小 / Total storage size */}
        <div style={{ background: '#f6f6f6', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
          <span style={{ fontSize: 12, color: '#666' }}>總資料大小 / Total Size</span>
          <div style={{ fontSize: 18, fontWeight: 'bold', color: '#1890ff', marginTop: 4 }}>
            {formatSize(storageSize)}
          </div>
          <span style={{ fontSize: 11, color: '#999' }}>
            照片 + 文件 ({documents.length} 份)
          </span>
        </div>
      </div>
    </div>
  );
}
