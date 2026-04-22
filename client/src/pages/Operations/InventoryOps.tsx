import { useEffect, useState } from 'react';
import { Card, Form, Select, InputNumber, Input, Button, Table, Tag, message, Row, Col } from 'antd';
import { useTranslation } from 'react-i18next';
import { api } from '../../api';

export default function InventoryOps() {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [materials, setMaterials] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const [matsRes, txns] = await Promise.all([api.getMaterials(), api.getTransactions()]);
    setMaterials(Array.isArray(matsRes) ? matsRes : matsRes.data);
    setTransactions(txns);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (values: any) => {
    try {
      await api.createTransaction(values);
      message.success(`${values.type === 'IN' ? '入庫' : '出庫'}成功 / ${values.type} success`);
      form.resetFields();
      load();
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const columns = [
    { title: t('materials.partNumber'), dataIndex: 'materialId', key: 'materialId' },
    { title: t('materials.name'), dataIndex: ['material', 'name'], key: 'name' },
    {
      title: '類型 / Type', dataIndex: 'type', key: 'type',
      render: (v: string) => <Tag color={v === 'IN' ? 'green' : 'red'}>{v === 'IN' ? '入庫' : '出庫'}</Tag>,
    },
    { title: '數量 / Qty', dataIndex: 'quantity', key: 'quantity' },
    { title: '經辦人 / Operator', dataIndex: 'operator', key: 'operator' },
    { title: '備註 / Remark', dataIndex: 'remark', key: 'remark' },
    { title: '時間 / Time', dataIndex: 'createdAt', key: 'time', render: (v: string) => new Date(v).toLocaleString() },
  ];

  return (
    <Row gutter={16}>
      <Col span={10}>
        <Card title="進出庫操作 / Inventory Operation">
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Form.Item name="materialId" label={t('materials.partNumber')} rules={[{ required: true }]}>
              <Select showSearch placeholder="選擇物料 / Select material" optionFilterProp="label"
                options={materials.map((m) => ({ value: m.id, label: `${m.id} - ${m.name}` }))} />
            </Form.Item>
            <Form.Item name="type" label="類型 / Type" rules={[{ required: true }]}>
              <Select>
                <Select.Option value="IN">{t('operations.inbound')}</Select.Option>
                <Select.Option value="OUT">{t('operations.outbound')}</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="quantity" label="數量 / Quantity" rules={[{ required: true }]}>
              <InputNumber min={0.01} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="operator" label="經辦人 / Operator">
              <Input />
            </Form.Item>
            <Form.Item name="remark" label="備註 / Remark">
              <Input.TextArea rows={2} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit">{t('common.submit')}</Button>
            </Form.Item>
          </Form>
        </Card>
      </Col>
      <Col span={14}>
        <Card title="進出庫紀錄 / Transaction History">
          <Table columns={columns} dataSource={transactions} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 10 }} />
        </Card>
      </Col>
    </Row>
  );
}
