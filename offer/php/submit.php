<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['ok' => false, 'error' => 'Метод не поддерживается']);
    exit;
}

$name = trim($_POST['name'] ?? '');
$phone = trim($_POST['phone'] ?? '');
$site = trim($_POST['site'] ?? '');
$comment = trim($_POST['comment'] ?? '');

if (!$name || !$phone || !$site) {
    echo json_encode(['ok' => false, 'error' => 'Заполните все обязательные поля']);
    exit;
}

if (!filter_var($site, FILTER_VALIDATE_URL)) {
    echo json_encode(['ok' => false, 'error' => 'Некорректный URL сайта']);
    exit;
}

$entry = [
    'id' => time(),
    'date' => date('d.m.Y H:i:s'),
    'name' => $name,
    'phone' => $phone,
    'site' => $site,
    'comment' => $comment,
    'status' => 'new',
];

$dataFile = __DIR__ . '/leads.json';
$leads = [];

if (file_exists($dataFile)) {
    $content = file_get_contents($dataFile);
    $leads = json_decode($content, true) ?? [];
}

$leads[] = $entry;
file_put_contents($dataFile, json_encode($leads, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

$to = 'your-email@example.com';
$subject = "=?UTF-8?B?" . base64_encode("Новая заявка на SEO аудит") . "?=";
$message = "Имя: $name\nТелефон: $phone\nСайт: $site\nКомментарий: $comment";
$headers = "Content-Type: text/plain; charset=UTF-8\r\nFrom: no-reply@" . ($_SERVER['HTTP_HOST'] ?? 'localhost');

@mail($to, $subject, $message, $headers);

echo json_encode(['ok' => true, 'id' => $entry['id']]);
