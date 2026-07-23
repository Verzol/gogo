/**
 * Script nén & xuất toàn bộ dữ liệu Supabase thành file tĩnh archive.json
 * Chạy trước khi Supabase paused sau chuyến đi: npm run archive
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const outputPath = path.join(__dirname, '../../frontend/src/data/archive.json');

async function exportArchive() {
  console.log('📦 Đang xuất dữ liệu chuyến đi Đà Lạt 2026 sang archive.json...');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('⚠️ Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY. Tạo file archive mẫu.');
    const sampleData = {
      exportedAt: new Date().toISOString(),
      status: "archived",
      messages: [],
      confessions: [
        {
          id: "demo-1",
          content: "Đà Lạt lạnh nhưng đi cùng mọi người ấm áp vô cùng!",
          author_alias: "Hành khách Toa 01",
          created_at: new Date().toISOString()
        }
      ],
      spyGameResults: {
        winner: "Phe Dân Làng",
        spies: ["Quân Lele", "Tâm Lê"]
      }
    };
    fs.writeFileSync(outputPath, JSON.stringify(sampleData, null, 2), 'utf-8');
    console.log(`✅ Đã tạo file archive mẫu tại: ${outputPath}`);
    return;
  }

  try {
    let createClient;
    try {
      const supabaseModule = await import('@supabase/supabase-js');
      createClient = supabaseModule.createClient;
    } catch {
      console.warn('⚠️ Gói @supabase/supabase-js chưa được cài đặt. Tạo file archive mẫu.');
      const sampleData = {
        exportedAt: new Date().toISOString(),
        status: "archived",
        messages: [],
        confessions: []
      };
      fs.writeFileSync(outputPath, JSON.stringify(sampleData, null, 2), 'utf-8');
      return;
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: messages } = await supabase.from('messages').select('*').order('created_at', { ascending: true });
    const { data: confessions } = await supabase.from('confessions').select('*').order('created_at', { ascending: false });

    const archiveData = {
      exportedAt: new Date().toISOString(),
      status: "archived",
      messages: messages || [],
      confessions: confessions || []
    };

    fs.writeFileSync(outputPath, JSON.stringify(archiveData, null, 2), 'utf-8');
    console.log(`🎉 Xuất dữ liệu thành công! Đã ghi ${messages?.length || 0} tin nhắn và ${confessions?.length || 0} tự sự vào archive.json.`);
  } catch (err) {
    console.error('❌ Lỗi khi xuất dữ liệu archive:', err);
  }
}

exportArchive();
