<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

$url = $_GET['url'] ?? '';

if (!$url) {
    echo json_encode(['error' => 'Параметр URL обязателен']);
    exit;
}

if (!filter_var($url, FILTER_VALIDATE_URL)) {
    echo json_encode(['error' => 'Некорректный URL']);
    exit;
}

$parsed = parse_url($url);
$scheme = $parsed['scheme'] ?? '';
if (!in_array($scheme, ['http', 'https'])) {
    echo json_encode(['error' => 'Допустимы только HTTP и HTTPS']);
    exit;
}

$host = $parsed['host'] ?? '';
if ($host === 'localhost' || $host === '127.0.0.1' || $host === '0.0.0.0' || $host === '::1') {
    echo json_encode(['error' => 'Запросы к localhost запрещены']);
    exit;
}

$ip = gethostbyname($host);
if ($ip !== $host) {
    if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
        echo json_encode(['error' => 'Запросы к частным IP-адресам запрещены']);
        exit;
    }
}

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $url,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT => 20,
    CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    CURLOPT_HTTPHEADER => [
        'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language: ru,en;q=0.9',
    ],
    CURLOPT_SSL_VERIFYPEER => false,
]);

$html = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($error) {
    echo json_encode(['error' => $error]);
    exit;
}

if ($httpCode >= 400) {
    echo json_encode(['error' => "Сервер вернул код $httpCode"]);
    exit;
}

if (strlen($html) < 50) {
    echo json_encode(['error' => 'Не удалось получить HTML страницы']);
    exit;
}

echo json_encode([
    'html' => $html,
    'url' => $url,
    'status' => $httpCode,
]);
