import { useState } from 'react';
import { Tabs } from 'antd';
import { PlusOutlined, EditOutlined, ImportOutlined, SwapOutlined, FileTextOutlined, CameraOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import AddMaterial from './AddMaterial';
import EditMaterial from './EditMaterial';
import ImportExcel from './ImportExcel';
import InventoryOps from './InventoryOps';
import Reports from './Reports';
import CameraCapture from './CameraCapture';

export default function Operations() {
  const { t } = useTranslation();
  const [activeKey, setActiveKey] = useState('add');

  const items = [
    { key: 'add', label: t('operations.add'), icon: <PlusOutlined />, children: <AddMaterial /> },
    { key: 'edit', label: t('operations.edit'), icon: <EditOutlined />, children: <EditMaterial /> },
    { key: 'import', label: t('operations.import'), icon: <ImportOutlined />, children: <ImportExcel /> },
    { key: 'inventory', label: '進出庫 / Inventory', icon: <SwapOutlined />, children: <InventoryOps /> },
    { key: 'reports', label: t('operations.reports'), icon: <FileTextOutlined />, children: <Reports /> },
    { key: 'camera', label: '拍照 / Photo', icon: <CameraOutlined />, children: <CameraCapture /> },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>{t('operations.title')}</h2>
      <Tabs
        activeKey={activeKey}
        onChange={setActiveKey}
        items={items.map((item) => ({
          key: item.key,
          label: (
            <span>
              {item.icon} {item.label}
            </span>
          ),
          children: item.children,
        }))}
      />
    </div>
  );
}
