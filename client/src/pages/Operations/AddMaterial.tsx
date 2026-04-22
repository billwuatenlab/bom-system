import { Form, Input, InputNumber, Select, Button, message, Card } from 'antd';
import { useTranslation } from 'react-i18next';
import { api } from '../../api';

export default function AddMaterial() {
  const { t } = useTranslation();
  const [form] = Form.useForm();

  const handleSubmit = async (values: any) => {
    try {
      await api.createMaterial(values);
      message.success('物料新增成功 / Material created');
      form.resetFields();
    } catch (e: any) {
      message.error(e.message);
    }
  };

  return (
    <Card>
      <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ maxWidth: 600 }}>
        <Form.Item name="id" label={t('materials.partNumber')} rules={[{ required: true }]}>
          <Input placeholder="e.g. PCB-001" />
        </Form.Item>
        <Form.Item name="name" label={t('materials.name')} rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="specification" label={t('materials.spec')}>
          <Input />
        </Form.Item>
        <Form.Item name="unit" label={t('materials.unit')} rules={[{ required: true }]}>
          <Select placeholder="選擇單位 / Select unit">
            <Select.Option value="pcs">pcs</Select.Option>
            <Select.Option value="kg">kg</Select.Option>
            <Select.Option value="m">m</Select.Option>
            <Select.Option value="L">L</Select.Option>
            <Select.Option value="set">set</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item name="category" label={t('materials.category')}>
          <Input />
        </Form.Item>
        <Form.Item name="description" label="描述 / Description">
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item name="stockQty" label={t('materials.stock')} initialValue={0}>
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="safetyStock" label={t('materials.safetyStock')} initialValue={0}>
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit">{t('common.save')}</Button>
        </Form.Item>
      </Form>
    </Card>
  );
}
