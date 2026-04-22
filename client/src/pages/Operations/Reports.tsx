import { useEffect, useState } from 'react';
import { Card, Table, Button, Space, message } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { api } from '../../api';

export default function Reports() {
  const { t } = useTranslation();
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMaterials().then(res => setMaterials(Array.isArray(res) ? res : res.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const columns = [
    { title: t('materials.partNumber'), dataIndex: 'id', key: 'id' },
    { title: t('materials.name'), dataIndex: 'name', key: 'name' },
    { title: t('materials.category'), dataIndex: 'category', key: 'category' },
    { title: t('materials.unit'), dataIndex: 'unit', key: 'unit' },
    { title: t('materials.stock'), dataIndex: 'stockQty', key: 'stockQty' },
    { title: t('materials.safetyStock'), dataIndex: 'safetyStock', key: 'safetyStock' },
    {
      title: '狀態 / Status',
      key: 'status',
      render: (_: any, r: any) => (
        <span style={{ color: r.stockQty <= r.safetyStock && r.safetyStock > 0 ? '#ff4d4f' : '#52c41a' }}>
          {r.stockQty <= r.safetyStock && r.safetyStock > 0 ? '低庫存 / Low' : '正常 / Normal'}
        </span>
      ),
    },
  ];

  const exportCsv = () => {
    const header = 'PartNumber,Name,Category,Unit,Stock,SafetyStock\n';
    const rows = materials.map((m) => `${m.id},${m.name},${m.category || ''},${m.unit},${m.stockQty},${m.safetyStock}`).join('\n');
    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `bom-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    message.success('CSV 匯出成功 / CSV exported');
  };

  return (
    <Card
      title="庫存報表 / Inventory Report"
      extra={
        <Space>
          <Button icon={<DownloadOutlined />} onClick={exportCsv}>{t('operations.exportCsv')}</Button>
        </Space>
      }
    >
      <Table columns={columns} dataSource={materials} rowKey="id" loading={loading} size="small" />
    </Card>
  );
}
