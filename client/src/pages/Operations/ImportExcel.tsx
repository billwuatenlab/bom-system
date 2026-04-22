import { useState } from 'react';
import { Upload, Button, Card, Alert, Table, message } from 'antd';
import { UploadOutlined, FileExcelOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { api } from '../../api';

export default function ImportExcel() {
  const { t } = useTranslation();
  const [result, setResult] = useState<any>(null);

  const handleUpload = async (file: File) => {
    try {
      const res = await api.importExcel(file);
      setResult(res);
      if (res.success > 0) {
        message.success(`成功匯入 ${res.success} 筆 / Imported ${res.success} items`);
      }
      if (res.errors?.length > 0) {
        message.warning(`${res.errors.length} 筆錯誤 / ${res.errors.length} errors`);
      }
    } catch (e: any) {
      message.error(e.message);
    }
    return false; // prevent auto upload
  };

  return (
    <Card>
      <Alert
        message="Excel 匯入格式說明 / Import Format"
        description={
          <div>
            <p>Excel 檔案需包含以下欄位（中文或英文皆可）：</p>
            <p><em>Excel file should contain these columns (Chinese or English):</em></p>
            <Table
              size="small"
              pagination={false}
              dataSource={[
                { zh: '料號', en: 'PartNumber', required: '必填' },
                { zh: '名稱', en: 'Name', required: '必填' },
                { zh: '規格', en: 'Spec', required: '選填' },
                { zh: '單位', en: 'Unit', required: '必填' },
                { zh: '分類', en: 'Category', required: '選填' },
                { zh: '描述', en: 'Description', required: '選填' },
                { zh: '庫存', en: 'Stock', required: '選填' },
                { zh: '安全庫存', en: 'SafetyStock', required: '選填' },
              ]}
              columns={[
                { title: '中文欄位', dataIndex: 'zh', key: 'zh' },
                { title: 'English Column', dataIndex: 'en', key: 'en' },
                { title: '必填 / Required', dataIndex: 'required', key: 'required' },
              ]}
              rowKey="en"
            />
          </div>
        }
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Upload
        accept=".xlsx,.xls"
        showUploadList={false}
        beforeUpload={handleUpload}
      >
        <Button type="primary" icon={<UploadOutlined />} size="large">
          <FileExcelOutlined /> {t('operations.import')}
        </Button>
      </Upload>

      {result && (
        <div style={{ marginTop: 24 }}>
          <Alert message={`成功: ${result.success} 筆 / Success: ${result.success}`} type="success" showIcon />
          {result.errors?.length > 0 && (
            <Alert
              message="匯入錯誤 / Import Errors"
              description={result.errors.map((e: string, i: number) => <div key={i}>{e}</div>)}
              type="error"
              showIcon
              style={{ marginTop: 8 }}
            />
          )}
        </div>
      )}
    </Card>
  );
}
