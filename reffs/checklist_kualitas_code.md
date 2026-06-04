# Checklist Kualitas Source Code (SD-104)

Version 1.1

## A. QSC1 – Ketentuan Umum
- [ ] QSC1-1 Penulisan kode menggunakan pendekatan Object Oriented Programming (OOP)
- [ ] QSC1-2 Menggunakan 4 space indentation
- [ ] QSC1-3 Menggunakan format camelCase dalam penulisan class, fungsi, dan variabel
- [ ] QSC1-4 Menghindari kondisi negatif agar tidak terjebak nested if
- [ ] QSC1-5 Variabel konfigurasi/konstanta diletakkan di `.env` atau database
- [ ] QSC1-6 Jumlah maksimal baris dalam satu file adalah 500
- [ ] QSC1-7 Antar grup clause/expression dipisahkan oleh baris kosong
- [ ] QSC1-8 Panjang baris maksimal 120 karakter
- [ ] QSC1-9 Operator `*` tanpa spasi, operator `+ - /` menggunakan spasi
- [ ] QSC1-10 Kurung kurawal buka berada pada baris yang sama
- [ ] QSC1-11 Menghindari train wrecks (Law of Demeter)
- [ ] QSC1-12 Menghindari duplikasi kode
- [ ] QSC1-13 Kode menggambarkan tujuan service dengan jelas
- [ ] QSC1-14 Satu file hanya berisi satu bahasa pemrograman
- [ ] QSC1-15 Controller tidak berisi query langsung
- [ ] QSC1-16 Menggunakan constants untuk menggantikan magic number
- [ ] QSC1-17 Menggunakan enkapsulasi untuk menghindari AND/OR berlebih
- [ ] QSC1-18 Terbebas dari lint error
- [ ] QSC1-19 Semua status unit testing dalam keadaan pass atau passed
- [ ] QSC1-20 Semua status integration testing dalam keadaan pass atau passed

## B. QSC2 – Ketentuan Class
- [ ] QSC2-1 Nama class berupa kata benda dan diawali huruf kapital
- [ ] QSC2-2 Ukuran class harus kecil
- [ ] QSC2-3 Nama class mencerminkan tanggung jawabnya
- [ ] QSC2-4 Class memiliki satu tanggung jawab (SRP)
- [ ] QSC2-5 Terbuka untuk ekstensi, tertutup untuk modifikasi (OCP)
- [ ] QSC2-6 Jumlah variabel dalam class tidak berlebihan
- [ ] QSC2-7 Bergantung pada abstraksi, bukan implementasi (DIP)
- [ ] QSC2-8 Class tidak mengimplementasikan method yang tidak dibutuhkan

## C. QSC3 – Ketentuan Variabel
- [ ] QSC3-1 Variabel dideklarasikan di bagian awal class
- [ ] QSC3-2 Variabel dideklarasikan dekat dengan fungsi yang membutuhkannya
- [ ] QSC3-3 Nama variabel jelas dan deskriptif
- [ ] QSC3-4 Satu deklarasi atau assignment per baris

## D. QSC4 – Ketentuan Fungsi
- [ ] QSC4-1 Nama fungsi berupa kata kerja
- [ ] QSC4-2 Maksimal 3 parameter input
- [ ] QSC4-3 Maksimal 5 perintah dalam satu fungsi
- [ ] QSC4-4 Fungsi yang tidak digunakan harus dihapus (ISP)
- [ ] QSC4-5 Nama fungsi menggambarkan perilakunya
- [ ] QSC4-6 Fungsi hanya menangani satu tanggung jawab
- [ ] QSC4-7 Return value tidak bernilai null
- [ ] QSC4-8 Fungsi yang saling memanggil diletakkan berdekatan

## E. QSC5 – Ketentuan Komentar
- [ ] QSC5-1 Komentar jelas dan relevan
- [ ] QSC5-2 Komentar yang tidak berguna harus dihapus
- [ ] QSC5-3 Tidak menulis komentar pada kode yang sudah jelas
- [ ] QSC5-4 Kode yang dikomentari untuk menonaktifkan harus dihapus

## F. QSC6 – Ketentuan Testing
- [ ] QSC6-1 Unit testing dapat dijalankan dengan satu perintah
- [ ] QSC6-2 Waktu eksekusi service maksimal 3 detik
- [ ] QSC6-3 Required field kosong mengembalikan HTTP 400
- [ ] QSC6-4 Data invalid mengembalikan HTTP 422
- [ ] QSC6-5 Autentikasi gagal mengembalikan HTTP 403
- [ ] QSC6-6 SQL Injection test mengembalikan HTTP 400
- [ ] QSC6-7 XSS Injection test mengembalikan HTTP 400
- [ ] QSC6-8 Setiap API memiliki callback dan tidak menghasilkan null

## G. QSC7 – Ketentuan Design
- [ ] QSC7-1 Struktur folder menggunakan MVC
- [ ] QSC7-2 HTML sebagai struktur, CSS sebagai presentasi, JavaScript sebagai behaviour
- [ ] QSC7-3 Routing digunakan pada frontend dan backend
- [ ] QSC7-4 Menggunakan separation of main/index
- [ ] QSC7-5 Object tidak membuat dependensinya sendiri

## H. QSC8 – Ketentuan Error Handling
- [ ] QSC8-1 Menggunakan Exception dibanding return code
- [ ] QSC8-2 Menggunakan try-catch-finally
- [ ] QSC8-3 Menggunakan unchecked exception
