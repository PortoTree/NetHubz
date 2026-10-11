1. ask-matt (Pemandu / Router Alur)
Fungsi: Peta induk dan "penunjuk jalan". Jika kamu bingung langkah apa yang harus diambil selanjutnya, skill ini akan mengarahkanmu ke skill yang sesuai.
Kapan Digunakan:
Saat kamu punya ide besar tapi bingung harus mulai dari mana: "Tanya Matt, alur mana yang cocok buat proyek baru ini?"

2. grill-me (Wawancara & Pematangan Ide)
Fungsi: Menguji ide kamu secara agresif lewat wawancara tajam (tanya-jawab berulang). Agent tidak akan langsung koding, melainkan mencari celah logika, batasan arsitektur, dan risiko sebelum eksekusi.
Kapan Digunakan:
Sebelum mulai bikin fitur baru: "Saya ada ide mau bikin fitur autentikasi multi-tenant, tolong grill-me dulu."
Saat ide masih di kepala dan ingin diuji kelayakannya tanpa menyentuh kode.

3. to-spec (Membuat Dokumen Spesifikasi Teknis)
Fungsi: Mengambil intisari dari hasil diskusi/chat dan merangkumnya menjadi dokumen spesifikasi teknis formal (Problem Statement, Acceptance Criteria, & Testing Seams).
Kapan Digunakan:
Setelah sesi tanya-jawab/brainstorming selesai dan kamu ingin mendokumentasikan rencananya sebelum dieksekusi: "Ubah hasil diskusi tadi jadi spec."

4. to-tickets (Memecah Spec Menjadi Tiket Kerja)
Fungsi: Memecah dokumen spec tadi menjadi potongan-potongan tiket kecil (tracer-bullet vertical slices). Masing-masing tiket menyatakan relasi pemblokir (blocking edges: tiket mana yang harus selesai duluan).
Kapan Digunakan:
Saat fitur terlalu besar untuk dikerjakan dalam satu sesi, sehingga perlu dibagi menjadi task-task kecil yang terukur: "Pecah spec ini jadi tickets."

5. implement (Eksekusi Tiket / Koding)
Fungsi: Mesin eksekutor pengerjaan tiket. SOP-nya ketat: wajib mengaitkan dengan tes (TDD), menjalankan typecheck secara reguler, dan diakhiri dengan otomatis memanggil code-review.
Kapan Digunakan:
Saat tiket sudah siap dan kamu ingin agent mulai koding: "Implement ticket #1."

6. tdd (Test-Driven Development)
Fungsi: Disiplin koding berbasis tes: Red 
→
→ Green 
→
→ Refactor. Agent dilarang menulis implementasi sebelum tes gagalnya dibuat terlebih dahulu.
Kapan Digunakan:
Saat membangun logika bisnis yang sensitif dan butuh jaminan tidak ada regresi: "Gunakan TDD untuk buat fungsi kalkulasi diskon ini."

7. frontend-design (Panduan Estetika & Desain Visual)
Fungsi: Memaksa agent bersikap seperti Design Lead. Skill ini melarang keras layout generik khas AI (seperti tombol gradient standar, tipografi acak, atau hiasan angka "01/02" yang tidak bermakna), dan menggantinya dengan pilihan tipografi, palet warna, dan hierarki visual yang otentik sesuai industri produk.
Kapan Digunakan:
Saat membuat komponen UI, landing page, atau memoles tampilan website: "Bikin halaman dashboard analitik ini dengan skill frontend-design agar tidak kelihatan seperti template generik."

8. diagnosing-bugs (Investigasi Bug Sulit / Flaky)
Fungsi: Protokol bedah kasus untuk bug yang bandel. Agent dilarang menebak-nebak (theorizing) sebelum berhasil membuat satu perintah tes/feedback loop yang konsisten gagal (merah) pada bug tersebut.
Kapan Digunakan:
Ketika ada bug yang sulit direproduksi, error intermiten, atau performa melambat drastis: "Diagnose bug transaksi gagal ini."

9. code-review (Review Kode Otomatis Dua Sumbu)
Fungsi: Melakukan audit kode hasil editan di git diff menggunakan dua subagent paralel:
Sumbu Standar: Apakah kodenya mematuhi aturan standar koding repo?
Sumbu Spek: Apakah kodenya benar-benar menyelesaikan apa yang diminta di awal?
Kapan Digunakan:
Sebelum merge branch atau membuat Pull Request (PR): "Tolong code-review perubahan sejak branch main."
Ringkasan Alur Ideal (End-to-End Flow):
Pematangan Ide: grill-me
Dokumentasi: to-spec 
→
→ to-tickets
Eksekusi: implement (otomatis memicu tdd dan frontend-design)
Validasi: code-review
Jika Ada Masalah Berat: diagnosing-bugs