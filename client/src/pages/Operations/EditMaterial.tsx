import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Select, message, Space } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { api } from '../../api';

export default function EditMaterial() {
  const { t } = useTranslation();
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getMaterials();
      setMaterials(Array.isArray(res) ? res : res.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleEdit = (record: any) => {
    form.setFieldsValue(record);
    setEditModal(true);
  };

  const handleSave = async (values: any) => {
    try {
      await api.updateMaterial(values.id, values);
      message.success('修改成功 / Updated');
      setEditModal(false);
      load();
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: '確認刪除 / Confirm Delete',
      onOk: async () => {
        try {
          await api.deleteMaterial(id);
          message.success('已刪除 / Deleted');
          load();
        } catch (e: any) {
          message.error(e.message);
        }
      },
    });
  };

  const columns = [
    { title: t('materials.partNumber'), dataIndex: 'id', key: 'id', width: 120 },
    { title: t('materials.name'), dataIndex: 'name', key: 'name' },
    { title: t('materials.unit'), dataIndex: 'unit', key: 'unit', width: 80 },
    { title: t('materials.category'), dataIndex: 'category', key: 'category', width: 120 },
    { title: t('materials.stock'), dataIndex: 'stockQty', key: 'stockQty', width: 100 },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 120,
      render: (_: any, record: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
        </Space>
      ),
    },
  ];

  return (
    <>
      <Table columns={columns} dataSource={materials} rowKey="id" loading={loading} size="small" />
      <Modal title="修改物料 / Edit Material" open={editModal} onCancel={() => setEditModal(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="id" label={t('materials.partNumber')}>
            <Input disabled />
          </Form.Item>
          <Form.Item name="name" label={t('materials.name')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="specification" label={t('materials.spec')}>
            <Input />
          </Form.Item>
          <Form.Item name="unit" label={t('materials.unit')} rules={[{ required: true }]}>
            <Select>
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
          <Form.Item name="stockQty" label={t('materials.stock')}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="safetyStock" label={t('materials.safetyStock')}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
