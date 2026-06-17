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

$scheme_original = $scheme;

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
    CURLOPT_HEADER => true,
    CURLINFO_HEADER_OUT => true,
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$requestHeaders = curl_getinfo($ch, CURLINFO_HEADER_OUT);

$sslInfo = null;
if ($scheme_original === 'https') {
    $certinfo = curl_getinfo($ch, CURLINFO_CERTINFO);
    if (is_array($certinfo) && count($certinfo) > 0) {
        foreach ($certinfo as $cert) {
            if (isset($cert['Subject']) && strpos($cert['Subject'], $host) !== false) {
                $sslInfo = [
                    'subject' => $cert['Subject'],
                    'issuer' => $cert['Issuer'] ?? '',
                    'start' => $cert['Start date'] ?? '',
                    'expire' => $cert['Expire date'] ?? '',
                ];
                $sslInfo['valid'] = strtotime($cert['Expire date']) > time();
                break;
            }
        }
    }
    if (!$sslInfo) {
        $sslInfo = ['valid' => $httpCode > 0, 'issuer' => '(не удалось определить)'];
    }
}

$finalUrl = curl_getinfo($ch, CURLINFO_EFFECTIVE_URL);
$responseTimeMs = curl_getinfo($ch, CURLINFO_TOTAL_TIME) * 1000;
curl_close($ch);

if ($error && $httpCode === 0) {
    echo json_encode(['error' => $error]);
    exit;
}

$headers = substr($response, 0, $headerSize);
$html = substr($response, $headerSize);
$contentEncoding = '';
if (preg_match('/Content-Encoding:\s*(\S+)/i', $headers, $m)) {
    $contentEncoding = $m[1];
}

if ($httpCode >= 400) {
    echo json_encode(['error' => "Сервер вернул код $httpCode"]);
    exit;
}

if (strlen($html) < 50) {
    echo json_encode(['error' => 'Не удалось получить HTML страницы']);
    exit;
}

$extra = [];

$baseScheme = parse_url($finalUrl, PHP_URL_SCHEME);
$baseHost = parse_url($finalUrl, PHP_URL_HOST);
$basePort = parse_url($finalUrl, PHP_URL_PORT);
$baseUrl = "$baseScheme://$baseHost" . ($basePort ? ":$basePort" : '');

function checkUrl($url) {
    $c = curl_init();
    curl_setopt_array($c, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 8,
        CURLOPT_NOBODY => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        CURLOPT_SSL_VERIFYPEER => false,
    ]);
    curl_exec($c);
    $code = curl_getinfo($c, CURLINFO_HTTP_CODE);
    curl_close($c);
    return $code >= 200 && $code < 400 ? $code : null;
}

$robotsUrl = "$baseUrl/robots.txt";
$robotsCode = checkUrl($robotsUrl);
if ($robotsCode) {
    $c = curl_init();
    curl_setopt_array($c, [
        CURLOPT_URL => $robotsUrl,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 8,
        CURLOPT_USERAGENT => 'Mozilla/5.0',
        CURLOPT_SSL_VERIFYPEER => false,
    ]);
    $robotsContent = curl_exec($c);
    curl_close($c);
    $extra['robotsTxt'] = ['exists' => true, 'size' => strlen($robotsContent)];
} else {
    $extra['robotsTxt'] = ['exists' => false];
}

$sitemapUrl = "$baseUrl/sitemap.xml";
$sitemapCode = checkUrl($sitemapUrl);
$extra['sitemapXml'] = ['exists' => $sitemapCode !== null];

if (!$extra['robotsTxt']['exists']) {
    $altsitemap = rtrim($baseUrl, '/') . '/sitemap_index.xml';
    $altCode = checkUrl($altsitemap);
    if ($altCode) {
        $extra['sitemapXml'] = ['exists' => true];
    }
}

$isGzip = $contentEncoding === 'gzip' || $contentEncoding === 'deflate' || $contentEncoding === 'br';

echo json_encode([
    'html' => $html,
    'url' => $finalUrl,
    'status' => $httpCode,
    'contentType' => $contentType,
    'contentEncoding' => $contentEncoding ?: null,
    'responseTimeMs' => round($responseTimeMs, 0),
    'ssl' => $sslInfo,
    'extra' => $extra,
]);
