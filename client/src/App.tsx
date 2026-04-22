import { Routes, Route } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhTW from 'antd/locale/zh_TW';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Materials from './pages/Materials';
import Operations from './pages/Operations';
import SystemPage from './pages/System';

export default function App() {
  return (
    <ConfigProvider locale={zhTW} theme={{ token: { colorPrimary: '#1890ff' } }}>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="materials" element={<Materials />} />
          <Route path="operations" element={<Operations />} />
          <Route path="system" element={<SystemPage />} />
        </Route>
      </Routes>
    </ConfigProvider>
  );
}
