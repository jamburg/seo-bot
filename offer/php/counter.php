<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

$counterFile = __DIR__ . '/counters.json';

$data = ['visits' => 0, 'orders' => 0];
if (file_exists($counterFile)) {
    $data = json_decode(file_get_contents($counterFile), true) ?? $data;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $data['orders'] = ($data['orders'] ?? 0) + 1;
    file_put_contents($counterFile, json_encode($data, JSON_PRETTY_PRINT));
    echo json_encode(['ok' => true, 'visits' => $data['visits'], 'orders' => $data['orders']]);
    exit;
}

$data['visits'] = ($data['visits'] ?? 0) + 1;
file_put_contents($counterFile, json_encode($data, JSON_PRETTY_PRINT));

echo json_encode(['ok' => true, 'visits' => $data['visits'], 'orders' => $data['orders']]);
