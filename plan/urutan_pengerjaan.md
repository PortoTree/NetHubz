# Urutan Pengerjaan Proyek "Mencari"

Berikut adalah peta jalan (*roadmap*) pengerjaan fitur-fitur utama di aplikasi. Urutan ini disusun berdasarkan prioritas sistem, dari fondasi yang paling mendasar hingga fitur *advanced* (lanjutan). 

Setiap kali kita menyelesaikan sebuah fase atau fitur, kita akan mencoretnya (menggunakan format `~~teks~~` atau *checklist* `[x]`).

---

## Phase 0: Keamanan & Fondasi Database (SEGERA)
Sebelum masuk ke fitur baru yang kompleks, kita wajib membereskan fondasi keamanan agar data user tidak bocor atau bisa dimanipulasi orang lain.
- [x] **Fix Supabase Row Level Security (RLS)**: Mengaktifkan dan mengatur RLS untuk tabel `User`, `Profile`, dll. Ini adalah *technical debt* dari pengerjaan profil.

## Phase 1: Koneksi Sosial & Moderasi
Fondasi dari *social network* adalah hubungan antar pengguna. Ini dikerjakan duluan agar fitur lain (seperti *timeline* postingan atau *chat*) punya landasan data.
- [x] **Follow / Friendship user to user**: Logika API dan UI untuk follow atau tambah teman.
- [x] **Block user to user**: Fitur keamanan bagi user untuk memblokir interaksi dengan user lain.
- [x] **Pengaturan privasi user**: Fitur di dalam edit profil modal pada setiap user agar user dapat mengatur privasi akunnya (misal: public, hanya teman, private).

## Phase 1.5: Sistem Notifikasi Global
Karena user sudah bisa saling follow, mereka butuh pemberitahuan secara real-time.
- [x] **Database Notifikasi**: Skema Prisma untuk menampung notifikasi (Follow, Like, Komen, dll).
- [x] **UI/UX Dropdown Notifikasi**: Tampilan *bell icon* di Navbar beserta daftar notifikasinya.

## Phase 2: Sistem Konten Utama (Core)
Setelah user saling terkoneksi, mereka butuh media untuk berinteraksi dan berbagi.
- [x] **Database Postingan**: Skema Prisma, API, dan UI untuk membuat (*create*), membaca (*read*), mengedit (*update*), dan menghapus (*delete*) postingan.
- [x] **Interaksi Postingan**: Logika untuk Like, Comment, Share, dan Save (Simpan) postingan.
- [x] **Privacy post**: privasi setiap postingan untuk user (public, friends only, private).
- [x] **UI/UX postingan**: Tampilan postingan di halaman utama /home, halaman teman ke teman /friend, dan halaman profil user. termasuk juga ui/ux untuk interaksi postingan, seperti like, comment, share, dan save.

note: nanti akan ada postingan khusus only komunitas, apakah di kerjakan logikanya sekalian atau mau terpisah nanti bareng dengan pengerjaan komunitas saja?

## Phase 2.1 (plan/kategori_dan_form_dinamis.md)
- [x] **Database Setup**: Tambah enum `ProjectCategory` dan `CollabType`, serta update model `Project` (tambah `category`, `customCategory`, `collabTypes`, `linkedProductId`, `isForSale`) di `schema.prisma`.
- [x] **Lokalisasi & Bahasa**: Tambah translasi baru di `en.json` dan `id.json` untuk list kategori 21 item, label form dinamis, dan placeholder.
- [x] **Backend Actions**: Update `projects.ts` (`createProject`, `updateProject`) untuk menerima data baru, termasuk validasi *Hybrid Link* Nethubz untuk ekstrak `linkedProductId`.
- [x] **Refactor UI Form (Create/Edit)**: Implementasi label dinamis berdasarkan kategori yang dipilih, input khusus untuk kategori "OTHER", checkbox *"Tautkan dengan Product NetHubz"*, dan toggle/badge *For Sale*.
- [x] **Update Showcase & Detail**: Badge kategori di komponen `ProjectCard`, perbarui filter pencarian backend agar membaca `customCategory` dan status *For Sale*.

## Phase 2.2
- [x] **Optimasi Navbar**: Refactor Navbar ke dalam file `layout.tsx` supaya setiap kali pindah halaman, navbar tidak perlu merender ulang terus-menerus.
- [x] **Pecah Kode (Code Splitting) Halaman Utama**: Refactor file raksasa `app/[locale]/home/page.tsx` (5000+ baris) menjadi komponen-komponen kecil yang terpisah (seperti komponen tab, modal, dan helper) agar *maintenance* jauh lebih mudah tanpa merubah alur routing.

## Phase 2.2: Mobile Responsive
- [x] **Navigasi & Sidebar**: Menyembunyikan sidebar dan membuat *bottom navigation*.
- [ ] **Layout Responsif**: Menyesuaikan layout grid dari desktop ke versi kolom tunggal untuk *mobile*.
- [ ] **Optimasi Komponen UX**: Memastikan ukuran modal, padding, dan tombol sesuai untuk navigasi layar sentuh.

## Phase 3: Komunitas & Real-time
Skala yang lebih luas untuk interaksi dalam kelompok, butuh penanganan *socket* (real-time) yang stabil.
- [ ] **Database Komunitas**: Sistem pembuatan Grup/Komunitas, hak akses (Admin/Member), dan profil grup.
- [ ] **Postingan komunitas**: secara privasi ini khusus untuk komunitas, bukan untuk user ke user. jadi yang melihat hanya orang yang join komunitas, kecuali jika owner/admin komunitas tersebut membuat pengaturan privasi pada komunitas menjadi public.
- [ ] **Live Real-time Chat & Group Chat**: Fitur pesan langsung antar user (DM) dan percakapan di dalam komunitas (Grup).

## Phase 3.4: UI/UX Kosmetik Profil (Persiapan Gamification)
Membangun infrastruktur UI/UX untuk kosmetik dan reward sebelum sistem logika level dijalankan.
- [ ] **UI/UX Avatar Border & Animasi**: Menyiapkan komponen CSS/Tailwind untuk render border, avatar beranimasi, dan sampul animasi di komponen Profile, Navbar, dan Postingan.
- [ ] **UI/UX Custom Theme Warna Profil**: Menyiapkan logic CSS variabel untuk memungkinkan user mengubah tema warna spesifik pada halaman profilnya.
- [ ] **UI/UX Akun Bisnis**: Menyiapkan desain/badge penanda tipe akun bisnis di halaman profil.

## Phase 4.5: Gamification & Sistem Leveling
Memberikan reward dan kosmetik kepada user aktif yang berhasil membangun jaringan teman dan komunitas. Sangat bergantung pada Phase 1 (Teman) dan Phase 4 (Komunitas).
- [ ] **Leveling Logic & Tracker**: Background job atau trigger untuk menghitung jumlah teman dan member komunitas untuk menentukan level (Level 0 - 4).
- [ ] **Downgrade System & Safety Net**: Logika toleransi margin 5% penurunan teman, dan mekanisme lock/disable pengaturan komunitas jika user ter-downgrade.
- [ ] **Sistem Reward Kosmetik**: Fitur Avatar Animasi, Sampul Animasi, dan Custom Warna Profil berdasarkan pencapaian level.
- [ ] **Unlock Tipe Akun Bisnis**: Hak akses untuk merubah tipe akun ke Bisnis di level 3.
- [ ] **Pencapaian Umur Akun (Age Achievement)**: Cron job / pengecekan umur akun otomatis (6 bulan, 1, 2, 3 tahun) untuk unlock Border eksklusif.

## Phase 5: Monetisasi & Custom Page (End-Game)
Fitur lanjutan (premium/creator) yang mengandalkan semua fitur dasar yang sudah berjalan stabil.
- [ ] **Database Toko Produk**: Skema untuk pendaftaran toko, etalase produk digital/fisik.
- [ ] **Halaman Web Link Custom**: Logika *routing* dinamis agar user punya URL unik (contoh: `https://domain.online/{link}`) layaknya Linktree/Lynk.id, lengkap dengan integrasi produk.

---

*Catatan: Dokumen ini akan diperbarui secara berkala. Fitur yang sudah selesai akan diberi tanda centang `[x]` atau dicoret.*