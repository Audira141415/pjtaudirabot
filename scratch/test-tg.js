const token = '8229286305:AAEOvUAwyOqiC7Ghrkr_Xp21JkJ2AASkgiQ';
const chatId = '-5256126186';
const url = `https://api.telegram.org/bot${token}/sendMessage`;

fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    chat_id: chatId,
    text: "🛠 <b>UJI COBA MAINTENANCE</b>\n\nSistem saat ini sedang dalam pengujian (Maintenance) untuk memastikan notifikasi Telegram menggunakan format <i>HTML</i> berjalan lancar.\n\n<b>Status:</b> Berhasil dikirim melalui sistem bot baru.\n<b>Waktu Pengujian:</b> " + new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + " WIB\n\n<i>Silakan abaikan pesan ini.</i>",
    parse_mode: 'HTML'
  })
})
.then(res => res.json())
.then(data => console.log(JSON.stringify(data, null, 2)))
.catch(console.error);
