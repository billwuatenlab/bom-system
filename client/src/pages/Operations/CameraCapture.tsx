import { useState, useRef, useEffect } from 'react';
import { Card, Button, Select, message, Image, Space, Empty } from 'antd';
import { CameraOutlined, SyncOutlined, UploadOutlined, DeleteOutlined, PictureOutlined } from '@ant-design/icons';
import { api } from '../../api';

const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

export default function CameraCapture() {
  const [materials, setMaterials] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load materials list
  useEffect(() => {
    api.getMaterials({ page: '1', pageSize: '100' }).then(res => setMaterials(res.data)).catch(console.error);
  }, []);

  // Load selected material's image
  useEffect(() => {
    if (selectedId) {
      const m = materials.find(m => m.id === selectedId);
      setCurrentImage(m?.imageUrl ? m.imageUrl : null);
    } else {
      setCurrentImage(null);
    }
  }, [selectedId, materials]);

  // === Shared: compress image ===
  const resizeImage = (dataUrl: string, maxWidth: number, maxHeight: number, quality: number): Promise<string> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = dataUrl;
    });
  };

  // === Desktop: getUserMedia approach ===
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      setStreaming(true);
      setCapturedImage(null);
    } catch (e: any) {
      message.error('無法開啟相機 / Cannot open camera: ' + e.message);
    }
  };

  useEffect(() => {
    if (streaming && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play();
    }
  }, [streaming]);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setStreaming(false);
  };

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(dataUrl);
    stopCamera();
  };

  // === Mobile: file input with capture attribute ===
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      // Resize to max 1280x960, quality 0.8 for mobile
      const resized = await resizeImage(reader.result as string, 1280, 960, 0.8);
      setCapturedImage(resized);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // === Upload (shared) — compress before upload ===
  const upload = async () => {
    if (!capturedImage || !selectedId) {
      message.warning('請先選擇物料並拍照 / Select a material and take a photo first');
      return;
    }
    setUploading(true);
    try {
      // Compress: max 1280x960, JPEG 80%
      const compressed = await resizeImage(capturedImage, 1280, 960, 0.8);
      const res = await fetch(compressed);
      const blob = await res.blob();
      const file = new File([blob], `${selectedId}-${Date.now()}.jpg`, { type: 'image/jpeg' });

      const result = await api.uploadMaterialImage(selectedId, file);
      setCurrentImage(result.imageUrl);
      setCapturedImage(null);

      const updated = await api.getMaterials({ page: '1', pageSize: '100' });
      setMaterials(updated.data);

      message.success('照片已上傳 / Photo uploaded');
    } catch (e: any) {
      message.error('上傳失敗 / Upload failed: ' + e.message);
    }
    setUploading(false);
  };

  useEffect(() => () => stopCamera(), []);

  return (
    <Card title="📷 物料拍照 / Material Photo Capture">
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontWeight: 'bold', marginRight: 8 }}>選擇物料 / Select Material:</label>
        <Select
          showSearch
          style={{ width: isMobile ? '100%' : 400 }}
          placeholder="搜尋料號或品名... / Search part number or name..."
          optionFilterProp="label"
          value={selectedId}
          onChange={setSelectedId}
          options={materials.map(m => ({ value: m.id, label: `${m.id} — ${m.name}` }))}
        />
      </div>

      {/* Hidden file input for mobile camera */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 16 : 24 }}>
        {/* Camera / Capture area */}
        <div style={{ flex: 1 }}>
          <div style={{
            width: '100%', maxWidth: 640, aspectRatio: '16/9',
            background: '#000', borderRadius: 8, overflow: 'hidden', position: 'relative',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {streaming ? (
              <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} autoPlay playsInline muted />
            ) : capturedImage ? (
              <img src={capturedImage} alt="captured" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <div style={{ color: '#666', textAlign: 'center' }}>
                <CameraOutlined style={{ fontSize: 48 }} /><br />
                {isMobile ? '點擊下方按鈕拍照或選擇照片' : '點擊下方按鈕開啟相機'}<br />
                {isMobile ? 'Tap button below to take or select photo' : 'Click button below to open camera'}
              </div>
            )}
          </div>

          <canvas ref={canvasRef} style={{ display: 'none' }} />

          <Space style={{ marginTop: 12 }} wrap>
            {!streaming && !capturedImage && (
              isMobile ? (
                <>
                  <Button type="primary" icon={<CameraOutlined />} size="large"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.capture = 'environment';
                        fileInputRef.current.click();
                      }
                    }}>
                    拍照 / Take Photo
                  </Button>
                  <Button icon={<PictureOutlined />} size="large"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.removeAttribute('capture');
                        fileInputRef.current.click();
                      }
                    }}>
                    選擇照片 / Gallery
                  </Button>
                </>
              ) : (
                <Button type="primary" icon={<CameraOutlined />} onClick={startCamera} size="large">
                  開啟相機 / Open Camera
                </Button>
              )
            )}
            {streaming && (
              <>
                <Button type="primary" danger icon={<CameraOutlined />} onClick={capture} size="large">
                  拍照 / Capture
                </Button>
                <Button onClick={stopCamera}>取消 / Cancel</Button>
              </>
            )}
            {capturedImage && (
              <>
                <Button type="primary" icon={<UploadOutlined />} onClick={upload} loading={uploading} size="large" disabled={!selectedId}>
                  上傳至物料 / Upload
                </Button>
                <Button icon={<SyncOutlined />} size="large"
                  onClick={() => {
                    setCapturedImage(null);
                    if (isMobile) {
                      if (fileInputRef.current) {
                        fileInputRef.current.capture = 'environment';
                        fileInputRef.current.click();
                      }
                    } else {
                      startCamera();
                    }
                  }}>
                  重拍 / Retake
                </Button>
                <Button icon={<DeleteOutlined />} onClick={() => setCapturedImage(null)}>刪除 / Discard</Button>
              </>
            )}
          </Space>
        </div>

        {/* Current image */}
        <div style={{ width: isMobile ? '100%' : 280 }}>
          <h4>目前照片 / Current Photo</h4>
          {currentImage ? (
            <Image src={currentImage} alt="material" style={{ width: '100%', maxWidth: 280, borderRadius: 8 }} />
          ) : (
            <Empty description="尚無照片 / No photo" />
          )}
          {selectedId && (
            <p style={{ marginTop: 8, color: '#888' }}>料號: {selectedId}</p>
          )}
        </div>
      </div>
    </Card>
  );
}
