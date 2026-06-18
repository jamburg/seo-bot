<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['error' => 'Только POST']);
    exit;
}

$email = $_POST['email'] ?? '';
$subject = $_POST['subject'] ?? '';
$body = $_POST['body'] ?? '';

if (!$email || !$subject || !$body) {
    echo json_encode(['error' => 'email, subject, body обязательны']);
    exit;
}

$password = getenv('EMAIL_PASSWORD');
if (!$password) {
    $password = 'wbvexrnwtsbkgjxa';
}

$from = 'jamburg@yandex.ru';
$smtp_host = 'ssl://smtp.yandex.ru';
$smtp_port = 465;

$headers = "From: $from\r\n"
         . "Reply-To: $from\r\n"
         . "Content-Type: text/plain; charset=utf-8\r\n"
         . "MIME-Version: 1.0\r\n";

$encoded_subject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
$encoded_body = mb_convert_encoding($body, 'UTF-8', 'auto');

$errno = 0;
$errstr = '';
$socket = @fsockopen($smtp_host, $smtp_port, $errno, $errstr, 30);
if (!$socket) {
    echo json_encode(['error' => "SMTP connect failed: $errstr ($errno)"]);
    exit;
}

function smtp_cmd($socket, $cmd, $expect = 250) {
    if ($cmd !== null) fwrite($socket, $cmd . "\r\n");
    $resp = '';
    while (true) {
        $line = fgets($socket, 512);
        if ($line === false) break;
        $resp .= $line;
        if (isset($line[3]) && $line[3] === ' ') break;
    }
    $code = (int)substr($resp, 0, 3);
    if ($expect !== null && $code !== $expect) {
        throw new Exception("SMTP error (expected $expect): " . trim($resp));
    }
    return $resp;
}

try {
    smtp_cmd($socket, null, 220);
    smtp_cmd($socket, "EHLO mail-proxy");
    smtp_cmd($socket, "AUTH LOGIN", 334);
    smtp_cmd($socket, base64_encode($from), 334);
    smtp_cmd($socket, base64_encode($password), 235);
    smtp_cmd($socket, "MAIL FROM:<$from>");
    smtp_cmd($socket, "RCPT TO:<$email>");
    smtp_cmd($socket, "DATA", 354);
    fwrite($socket, "To: $email\r\n");
    fwrite($socket, "Subject: $encoded_subject\r\n");
    fwrite($socket, $headers);
    fwrite($socket, "\r\n");
    fwrite($socket, $encoded_body);
    fwrite($socket, "\r\n.\r\n");
    smtp_cmd($socket, null, 250);
    smtp_cmd($socket, "QUIT", 221);
    fclose($socket);
    echo json_encode(['ok' => true, 'sent_to' => $email]);
} catch (Exception $e) {
    fclose($socket);
    echo json_encode(['error' => $e->getMessage()]);
}
