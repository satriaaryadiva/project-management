# Supabase Next.js Starter Template

Aplikasi manajemen proyek dan tugas (Task Management) yang dibangun menggunakan **Next.js 15 (App Router)** dan **Supabase**. Aplikasi ini mencakup fitur otentikasi lengkap, manajemen profil, proyek, tugas, komentar, upload file, dan autentikasi dua faktor (2FA).

## 🚀 Cara Install & Run

Ikuti langkah-langkah berikut untuk menjalankan proyek ini di lokal komputer Anda.

### Prasyarat
- Node.js versi 18 atau lebih baru.
- Akun [Supabase](https://supabase.com).

### Langkah Instalasi

1.  **Clone Repository**
    ```bash
    git clone https://github.com/satriaaryadiva/project-management.git
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Setup Environment Variables**
    Buat file `.env.local` di root folder `nextjs` dan isi dengan kredensial Supabase Anda:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=your-project-url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
    NEXT_PUBLIC_PRODUCTNAME=MyAwesomeApp
    ```

4.  **Jalankan Aplikasi**
    ```bash
    npm run dev
    ```
    Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

## 🗄️ Struktur Database

Aplikasi ini menggunakan skema database berikut di Supabase (PostgreSQL):

*   **`profiles`**: Menyimpan data pengguna tambahan yang terhubung dengan `auth.users`.
    *   `id` (UUID, PK, FK ke `auth.users`)
    *   `full_name` (Text)
    *   `email` (Text)
    *   `role` (Enum: 'admin', 'manager', 'member')
    *   `avatar_url` (Text)
    
*   **`projects`**: Menyimpan data proyek.
    *   `id` (BigInt, PK)
    *   `name` (Text)
    *   `description` (Text)
    *   `created_by` (UUID, FK ke `profiles.id`)

*   **`project_members`**: Tabel relasi many-to-many antara proyek dan user.
    *   `project_id` (BigInt, FK ke `projects.id`)
    *   `user_id` (UUID, FK ke `profiles.id`)
    *   `role` (Enum: 'manager', 'member')

*   **`tasks`**: Menyimpan tugas-tugas dalam proyek.
    *   `id` (BigInt, PK)
    *   `project_id` (BigInt, FK ke `projects.id`)
    *   `title` (Text)
    *   `description` (Text)
    *   `status` (Enum: 'todo', 'in-progress', 'done')
    *   `assigned_to` (UUID, FK ke `profiles.id`)
    *   `deadline` (Timestamp)
    
*   **`task_comments`**: Komentar pada tugas.
    *   `id` (BigInt, PK)
    *   `task_id` (BigInt, FK ke `tasks.id`)
    *   `user_id` (UUID, FK ke `profiles.id`)
    *   `content` (Text)
    *   `image_url` (Text)

*   **`todo_list`** (Legacy/Simple): Tabel todo sederhana (opsional).

## 🏗️ Deskripsi Arsitektur & Cara Pakai

### Arsitektur
Aplikasi ini menggunakan arsitektur **Modern Fullstack Serverless**:
*   **Frontend**: Next.js 15 dengan App Router, React Server Components (RSC), dan Client Components.
*   **Styling**: Tailwind CSS dan Shadcn UI untuk komponen antarmuka yang modern dan responsif.
*   **Backend**: Supabase (Backend-as-a-Service).
    *   **Auth**: Menangani pendaftaran, login, dan 2FA.
    *   **Database**: PostgreSQL dengan Row Level Security (RLS) untuk keamanan data.
    *   **Storage**: Menyimpan file upload (avatar, lampiran tugas).
    *   **Client**: `src/lib/supabase/client.ts` dan `unified.ts` menyediakan single entry point untuk interaksi API dan Supabase Client.

### Cara Pakai

1.  **Registrasi & Login**: Buat akun baru atau login. User baru defaultnya memiliki role `member`.
2.  **Dashboard**: Halaman utama menampilkan ringkasan proyek dan progres.
3.  **Proyek**:
    *   Buka menu **Projects**.
    *   Buat proyek baru.
    *   Klik proyek untuk melihat detail.
    *   **Manage Members**: Tambahkan anggota tim ke proyek melalui dialog "Manage Members".
4.  **Tugas (Tasks)**:
    *   Di dalam proyek, buat tugas baru.
    *   Klik tugas untuk melihat detail, mengubah status, atau menambahkan assignee.
    *   **Komentar**: Diskusikan tugas di kolom komentar, bisa menyertakan lampiran gambar.
5.  **Storage**: Menu contoh untuk mengupload dan membagikan file pribadi.
6.  **2FA**: Aktifkan Two-Factor Authentication di menu User Settings/Security untuk keamanan tambahan.
7.  **Admin** (Khusus Role Admin): Menu "Manage Users" untuk mengubah role pengguna lain.

---
Dibuat dengan ❤️ menggunakan Next.js & Supabase.
