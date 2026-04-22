import { useEffect, useState } from 'react';
import { Tabs, Card, Table, Tag, Button, Modal, Form, Input, Select, message, Descriptions, Badge, Steps, Result, Space } from 'antd';
import { UserOutlined, DashboardOutlined, PlusOutlined, FileTextOutlined, RocketOutlined, CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { api } from '../../api';

export default function SystemPage() {
  const { t } = useTranslation();

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>{t('system.title')}</h2>
      <Tabs
        items={[
          { key: 'status', label: <span><DashboardOutlined /> {t('system.status')}</span>, children: <SystemStatus /> },
          { key: 'accounts', label: <span><UserOutlined /> {t('system.accounts')}</span>, children: <AccountManagement /> },
          { key: 'logs', label: <span><FileTextOutlined /> {t('system.logs')}</span>, children: <OperationLogs /> },
          { key: 'deploy', label: <span><RocketOutlined /> 部署 / Deploy</span>, children: <DeployPanel /> },
        ]}
      />
    </div>
  );
}

function SystemStatus() {
  const { t } = useTranslation();
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    api.health().then(setHealth).catch(console.error);
  }, []);

  return (
    <Card>
      <Descriptions bordered column={2}>
        <Descriptions.Item label={t('system.apiHealth')}>
          <Badge status={health ? 'success' : 'error'} text={health ? '正常 / Online' : '離線 / Offline'} />
        </Descriptions.Item>
        <Descriptions.Item label={t('system.dbStatus')}>
          <Badge status="success" text="SQLite 連線正常 / Connected" />
        </Descriptions.Item>
        <Descriptions.Item label="伺服器時間 / Server Time">
          {health?.timestamp ? new Date(health.timestamp).toLocaleString() : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="BOM 最大層數 / Max BOM Level">9</Descriptions.Item>
      </Descriptions>
    </Card>
  );
}

function AccountManagement() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      setUsers(await api.getUsers());
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (values: any) => {
    try {
      await api.createUser(values);
      message.success('帳號建立成功 / Account created');
      setAddModal(false);
      form.resetFields();
      load();
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: t('system.email'), dataIndex: 'email', key: 'email' },
    { title: t('system.name'), dataIndex: 'name', key: 'name' },
    {
      title: t('system.role'), dataIndex: 'role', key: 'role',
      render: (role: string) => {
        const colors: Record<string, string> = { admin: 'red', operator: 'blue', viewer: 'green' };
        return <Tag color={colors[role]}>{role}</Tag>;
      },
    },
    {
      title: '狀態 / Status', dataIndex: 'status', key: 'status',
      render: (s: string) => <Badge status={s === 'active' ? 'success' : 'default'} text={s} />,
    },
  ];

  return (
    <>
      <Card extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setAddModal(true)}>新增帳號 / Add Account</Button>}>
        <Table columns={columns} dataSource={users} rowKey="id" loading={loading} size="small" />
      </Card>
      <Modal title="新增帳號 / Add Account" open={addModal} onCancel={() => setAddModal(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={handleAdd}>
          <Form.Item name="email" label={t('system.email')} rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="name" label={t('system.name')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="密碼 / Password" rules={[{ required: true, min: 6 }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="role" label={t('system.role')} initialValue="viewer">
            <Select>
              <Select.Option value="admin">Admin 管理員</Select.Option>
              <Select.Option value="operator">Operator 操作員</Select.Option>
              <Select.Option value="viewer">Viewer 檢視者</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

function DeployPanel() {
  const [deploying, setDeploying] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleDeploy = async () => {
    setDeploying(true);
    setResult(null);
    try {
      const res = await api.triggerDeploy();
      setResult(res);
      if (res.success) {
        message.success('部署完成！/ Deploy successful!');
      } else {
        message.error('部署失敗 / Deploy failed');
      }
    } catch (e: any) {
      message.error(e.message);
      setResult({ success: false, error: e.message });
    }
    setDeploying(false);
  };

  return (
    <Card>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <Button
            type="primary"
            size="large"
            icon={deploying ? <LoadingOutlined /> : <RocketOutlined />}
            onClick={handleDeploy}
            loading={deploying}
            style={{ height: 56, fontSize: 18, padding: '0 48px' }}
            danger={false}
          >
            {deploying ? '部署中... / Deploying...' : '一鍵部署 / Deploy Now'}
          </Button>
          <p style={{ marginTop: 12, color: '#888' }}>
            建置前後端並部署到線上環境 / Build frontend & backend and deploy to production
          </p>
        </div>

        {result && (
          <>
            {result.success ? (
              <Result status="success" title="部署成功 / Deploy Successful" />
            ) : (
              <Result status="error" title="部署失敗 / Deploy Failed" subTitle={result.error} />
            )}
            {result.steps && (
              <Steps
                direction="vertical"
                current={result.steps.length - 1}
                items={result.steps.map((s: any) => ({
                  title: s.step,
                  status: s.status === 'success' ? 'finish' : s.status === 'failed' ? 'error' : 'process',
                  icon: s.status === 'success' ? <CheckCircleOutlined /> : s.status === 'failed' ? <CloseCircleOutlined /> : undefined,
                  description: s.output ? <pre style={{ fontSize: 12, maxHeight: 100, overflow: 'auto', background: '#f5f5f5', padding: 8, borderRadius: 4 }}>{s.output}</pre> : undefined,
                }))}
              />
            )}
          </>
        )}
      </Space>
    </Card>
  );
}

function OperationLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getLogs().then(setLogs).catch(console.error).finally(() => setLoading(false));
  }, []);

  const actionColors: Record<string, string> = {
    CREATE: 'green',
    UPDATE: 'blue',
    DELETE: 'red',
    IMPORT: 'purple',
    INBOUND: 'cyan',
    OUTBOUND: 'orange',
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    {
      title: '操作 / Action', dataIndex: 'action', key: 'action',
      render: (action: string) => <Tag color={actionColors[action] || 'default'}>{action}</Tag>,
    },
    { title: '對象 / Target', dataIndex: 'target', key: 'target' },
    {
      title: '操作者 / Operator', key: 'user', width: 120,
      render: (_: any, record: any) => record.user?.name || '系統 / System',
    },
    {
      title: '時間 / Time', dataIndex: 'createdAt', key: 'createdAt', width: 180,
      render: (t: string) => new Date(t).toLocaleString(),
    },
    {
      title: '詳情 / Detail', dataIndex: 'detail', key: 'detail', ellipsis: true, width: 300,
      render: (d: string) => {
        try {
          const obj = JSON.parse(d);
          if (obj.before && obj.after) {
            const changes: string[] = [];
            for (const key of Object.keys(obj.after)) {
              if (JSON.stringify(obj.before[key]) !== JSON.stringify(obj.after[key])) {
                changes.push(`${key}: ${obj.before[key]} → ${obj.after[key]}`);
              }
            }
            return changes.join('; ') || '無變更 / No changes';
          }
          return d;
        } catch {
          return d;
        }
      },
    },
  ];

  return (
    <Card>
      <Table columns={columns} dataSource={logs} rowKey="id" loading={loading} size="small"
        pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `共 ${total} 筆 / Total ${total}` }}
      />
    </Card>
  );
}
