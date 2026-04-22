import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Alert, Divider, Spin } from 'antd';
import {
  InboxOutlined,
  DatabaseOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  SwapOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { api } from '../../api';

const currencyFlags: Record<string, string> = {
  USD: '🇺🇸', EUR: '🇪🇺', JPY: '🇯🇵', CNY: '🇨🇳', TWD: '🇹🇼',
};
const currencyNames: Record<string, string> = {
  USD: '美元 / US Dollar',
  EUR: '歐元 / Euro',
  JPY: '日幣 / Japanese Yen',
  CNY: '人民幣 / Chinese Yuan',
};

export default function Dashboard() {
  const { t } = useTranslation();
  const [data, setData] = useState<any>(null);
  const [rates, setRates] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getDashboard().catch(() => null),
      api.getExchangeRates().catch(() => null),
    ]).then(([d, r]) => {
      setData(d);
      setRates(r);
    }).finally(() => setLoading(false));
  }, []);

  const transactionColumns = [
    { title: t('materials.partNumber'), dataIndex: ['material', 'id'], key: 'materialId' },
    { title: t('materials.name'), dataIndex: ['material', 'name'], key: 'name' },
    {
      title: '類型 / Type', dataIndex: 'type', key: 'type',
      render: (type: string) => <Tag color={type === 'IN' ? 'green' : 'red'}>{type === 'IN' ? '入庫' : '出庫'}</Tag>,
    },
    { title: '數量 / Qty', dataIndex: 'quantity', key: 'quantity' },
    {
      title: '時間 / Time', dataIndex: 'createdAt', key: 'createdAt',
      render: (val: string) => new Date(val).toLocaleString(),
    },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>{t('dashboard.title')}</h2>

      {/* Stats */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={4}>
          <Card loading={loading}>
            <Statistic title={t('dashboard.totalMaterials')} value={data?.totalMaterials || 0}
              prefix={<InboxOutlined />} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card loading={loading}>
            <Statistic title={t('dashboard.totalStock')} value={data?.totalStock || 0}
              prefix={<DatabaseOutlined />} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card loading={loading}>
            <Statistic title="總庫存物料 / In-Stock Items" value={data?.inStockCount || 0}
              prefix={<CheckCircleOutlined />} valueStyle={{ color: '#13c2c2' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card loading={loading}>
            <Statistic title={t('dashboard.lowStock')} value={data?.lowStockCount || 0}
              prefix={<WarningOutlined />} valueStyle={{ color: data?.lowStockCount > 0 ? '#ff4d4f' : '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card loading={loading}>
            <Statistic title={t('dashboard.recentActivity')} value={data?.recentTransactions?.length || 0}
              prefix={<SwapOutlined />} suffix="筆" />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card loading={loading}>
            <Statistic
              title="物料總金額 / Total Value"
              value={data?.totalValue || 0}
              prefix={<DollarOutlined />}
              suffix="TWD"
              valueStyle={{ color: '#cf1322' }}
              formatter={(val) => Number(val).toLocaleString()}
            />
          </Card>
        </Col>
      </Row>

      {data?.lowStockCount > 0 && (
        <Alert
          message={`${data.lowStockCount} 項物料低於安全庫存 / ${data.lowStockCount} materials below safety stock`}
          type="warning" showIcon style={{ marginTop: 16 }} />
      )}

      {/* Exchange Rates */}
      <Card
        title={<span><DollarOutlined /> 即時匯率 / Live Exchange Rates</span>}
        style={{ marginTop: 16 }}
        extra={rates ? <span style={{ color: '#888', fontSize: 12 }}>
          更新時間: {new Date(rates.updatedAt).toLocaleString()}
        </span> : null}
      >
        {!rates ? (
          <div style={{ textAlign: 'center', padding: 20 }}><Spin /> 載入匯率中...</div>
        ) : (
          <Row gutter={[16, 16]}>
            {['USD', 'EUR', 'JPY', 'CNY'].map(cur => (
              <Col xs={12} sm={6} key={cur}>
                <Card
                  size="small"
                  style={{ textAlign: 'center', background: '#fafafa' }}
                >
                  <div style={{ fontSize: 24, marginBottom: 4 }}>{currencyFlags[cur]}</div>
                  <div style={{ fontWeight: 'bold', fontSize: 16, color: '#1890ff' }}>
                    {rates.twdRates[cur]?.toFixed(cur === 'JPY' ? 4 : 2)}
                  </div>
                  <div style={{ fontSize: 12, color: '#888' }}>
                    1 {cur} = ? TWD
                  </div>
                  <Divider style={{ margin: '8px 0' }} />
                  <div style={{ fontSize: 12, color: '#595959' }}>
                    {currencyNames[cur]}
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        )}
        <div style={{ marginTop: 12, padding: '8px 12px', background: '#f0f5ff', borderRadius: 6, fontSize: 13 }}>
          {currencyFlags['TWD']} <strong>本幣 / Base Currency：新台幣 TWD</strong>
          <span style={{ marginLeft: 16, color: '#888' }}>
            系統金額與總價皆以新台幣顯示 / All amounts and totals are displayed in TWD
          </span>
        </div>
      </Card>

      {/* Recent Activity */}
      <Card title={t('dashboard.recentActivity')} style={{ marginTop: 16 }}>
        <Table
          columns={transactionColumns}
          dataSource={data?.recentTransactions || []}
          rowKey="id"
          pagination={false}
          loading={loading}
          size="small"
          locale={{ emptyText: '尚無紀錄 / No records yet' }}
        />
      </Card>
    </div>
  );
}
