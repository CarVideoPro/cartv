<?php
// 1. CORS Başlıkları: Bulduğunuz kodun aynısı.
// Bu, bizim sunucumuzun, kendi web sayfamızdan gelen isteklere izin vermesini sağlar.
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET,HEAD,OPTIONS');
header("Access-Control-Allow-Headers: Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers");

// 2. Hedef URL'yi al
// Video oynatıcımızdan gelen linki (?url=...) alıyoruz.
$url = isset($_GET['url']) ? $_GET['url'] : '';

if (empty($url)) {
    http_response_code(400);
    echo 'URL parametresi eksik.';
    exit;
}

// 3. İçeriği Uzak Sunucudan Çek
// Sunucumuz, IPTV sunucusuna gidip .m3u8 dosyasını indirir.
$content = @file_get_contents($url);

if ($content === FALSE) {
    http_response_code(502);
    echo 'Kaynak alinamadi.';
    exit;
}

// 4. İçeriğin Türünü Ayarla ve Tarayıcıya Gönder
// IPTV sunucusundan gelen içeriğin türünü (Content-Type) aynen tarayıcıya iletiyoruz.
// Bu, HLS (m3u8) akışlarının doğru çalışması için önemlidir.
header('Content-Type: application/vnd.apple.mpegurl');
echo $content;

?>