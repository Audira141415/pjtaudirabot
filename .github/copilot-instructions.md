# Project Instructions for AI Assistant

1. **Multi-Platform Ecosystem**: Proyek ini adalah sistem bot multi-platform (WhatsApp & Telegram) yang terintegrasi dengan dashboard React dan API backend terpusat untuk layanan Audira.
2. **Modular Architecture**: Menggunakan monorepo (pnpm workspaces) dengan pembagian tanggung jawab yang jelas antara core API, bot adapters, dan dashboard UI untuk memastikan skalabilitas.
3. **High Performance & Reliability**: Fokus pada efisiensi eksekusi (Prisma ORM, Docker deployment) dan sistem monitoring (SLA, smoke testing) untuk menjaga stabilitas bot dalam menangani load tinggi.
4. Hindari membaca keseluruhan file besar jika tidak diperlukan; baca blok fungsi terkait saja.
5. Proses harus super efisien: minim command, minim file read, langsung ke target.
6. Jangan mencampur banyak fungsi/logic dalam satu file; pecah ke module kecil yang jelas tanggung jawabnya.
7. Jika ada inisiatif di luar request user, **wajib minta persetujuan dulu** sebelum eksekusi.

## Hard Instruction Dokumentasi (WAJIB)
8. Setiap file yang dibuat atau diubah **wajib** memiliki header doc singkat di bagian paling atas file.
9. Header doc **wajib** berisi minimal:
   - tujuan file/module,
   - dipakai oleh siapa (caller/route/controller),
   - dependensi utama (service/repo/API),
   - daftar fungsi public/utama,
   - side effect penting (DB read/write, HTTP call, file I/O).
10. Jika file sudah punya header doc, **wajib update** agar tetap akurat setelah perubahan.
11. Dilarang menambah/mengubah logic tanpa menyesuaikan header doc.
12. Format header harus ringkas, konsisten, dan mudah dipindai cepat (maksimal efisien untuk tracing).

## Standar Query/Database (WAJIB setara DBA senior)
13. Rancang query dengan prinsip **minimum cost, minimum I/O, minimum lock contention**.
14. Selalu evaluasi:
   - cardinality/selectivity filter,
   - pemakaian index yang tepat,
   - join order & join strategy,
   - dampak ke CPU, memory, disk, dan network.
15. Hindari pola boros resource (proses berulang, temp table tidak perlu, write berlapis, N+1 query) jika bisa diselesaikan dengan rencana query yang lebih ringkas.
16. Pilih strategi paling efisien sesuai konteks (upsert/merge/batch/incremental/query rewrite), bukan template tunggal.
17. Pastikan aman untuk skala besar: transactional consistency tepat, locking minimal, dan tetap cepat saat data tumbuh.
18. Sebelum finalize perubahan DB-heavy, jelaskan singkat alasan efisiensi, trade-off, dan risiko performa yang dihindari (explain in English).
