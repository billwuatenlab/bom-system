import { useState, useEffect } from 'react';
import { Layout, Menu, Button, Tooltip, Drawer, message } from 'antd';
import {
  DashboardOutlined,
  AppstoreOutlined,
  ToolOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  GlobalOutlined,
  QrcodeOutlined,
  LinkOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { useAppStore } from '../store/app';

const { Sider, Content, Header } = Layout;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

export default function MainLayout() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { sidebarCollapsed, toggleSidebar } = useAppStore();
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [networkIps, setNetworkIps] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/network')
      .then(r => r.json())
      .then(data => setNetworkIps(data.ips || []))
      .catch(() => {});
  }, []);

  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: t('menu.dashboard') },
    { key: '/materials', icon: <AppstoreOutlined />, label: t('menu.materials') },
    { key: '/operations', icon: <ToolOutlined />, label: t('menu.operations') },
    { key: '/system', icon: <SettingOutlined />, label: t('menu.system') },
  ];

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === 'zh-TW' ? 'en' : 'zh-TW');
  };

  const menuContent = (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={[location.pathname]}
      items={menuItems}
      onClick={({ key }) => { navigate(key); if (isMobile) setDrawerOpen(false); }}
    />
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Mobile: Drawer sidebar */}
      {isMobile && (
        <Drawer
          placement="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width={220}
          styles={{ body: { padding: 0, background: '#001529' } }}
          closable={false}
        >
          <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, fontWeight: 'bold', background: '#001529' }}>
            {t('app.title')}
          </div>
          {menuContent}
        </Drawer>
      )}

      {/* Desktop: Fixed sidebar */}
      {!isMobile && (
        <Sider
          trigger={null}
          collapsible
          collapsed={sidebarCollapsed}
          style={{ background: '#001529' }}
          width={220}
        >
          <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: sidebarCollapsed ? 16 : 20, fontWeight: 'bold' }}>
            {sidebarCollapsed ? 'BOM' : t('app.title')}
          </div>
          {menuContent}
        </Sider>
      )}

      <Layout>
        {/* Top Header */}
        <Header style={{ background: '#fff', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0' }}>
          <Button
            type="text"
            icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={isMobile ? () => setDrawerOpen(true) : toggleSidebar}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <Tooltip title={i18n.language === 'zh-TW' ? 'Switch to English' : '切換至中文'}>
              <Button type="text" icon={<GlobalOutlined />} onClick={toggleLang}>
                {i18n.language === 'zh-TW' ? 'EN' : '中'}
              </Button>
            </Tooltip>
          </div>
        </Header>

        {/* Main Content */}
        <Content style={{ flex: 1, padding: isMobile ? 12 : 24, overflow: 'auto', background: '#f5f5f5' }}>
          <Outlet />
        </Content>
      </Layout>

      {/* QR Code - desktop only, bottom-left corner */}
      {!isMobile && (
        <div style={{ position: 'fixed', bottom: 24, left: 24, zIndex: 1000 }}>
          {showQR && (() => {
            const isExternal = window.location.hostname.includes('trycloudflare.com') || window.location.hostname.includes('ngrok');
            const shareUrl = isExternal
              ? `${window.location.origin}${location.pathname}`
              : networkIps.length > 0 ? `http://${networkIps[0]}:3001${location.pathname}` : '';
            return shareUrl ? (
              <div style={{
                background: '#fff', borderRadius: 12, padding: 20, marginBottom: 12,
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)', textAlign: 'center', minWidth: 220,
              }}>
                <QRCodeSVG value={shareUrl} size={180} />
                <p style={{ margin: '12px 0 4px', fontSize: 13, fontWeight: 'bold', color: '#333' }}>
                  手機掃碼連線 / Scan to connect
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, margin: '4px 0' }}>
                  <LinkOutlined style={{ color: '#1890ff', fontSize: 12 }} />
                  <span style={{ fontSize: 12, color: '#666', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {isExternal ? window.location.hostname : `${networkIps[0]}:3001`}
                  </span>
                  <Button
                    type="text"
                    size="small"
                    icon={<CopyOutlined style={{ fontSize: 11 }} />}
                    onClick={() => {
                      navigator.clipboard.writeText(shareUrl);
                      message.success('已複製連結 / Link copied');
                    }}
                    style={{ padding: '0 4px', height: 20 }}
                  />
                </div>
              </div>
            ) : null;
          })()}
          <Button
            type="primary"
            shape="circle"
            size="large"
            icon={<QrcodeOutlined />}
            onClick={() => setShowQR(!showQR)}
            style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
          />
        </div>
      )}
    </Layout>
  );
}
