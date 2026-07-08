async function fetchDenganKunci(url, options = {}) {
    const token = localStorage.getItem('authKey'); // Mengambil kunci dari simpanan

    // Menambahkan kunci ke dalam setiap permintaan (header)
    options.headers = {
        ...options.headers,
        'Authorization': 'Bearer ' + token
    };

    const response = await fetch(url, options);

    // Jika satpam (AuthGuard) menolak, lempar balik ke login
    if (response.status === 403 || response.status === 401) {
        alert("Sesi berakhir! Silakan login kembali.");
        window.location.href = 'login.html';
        return null;
    }
    
    return await response.json();
}