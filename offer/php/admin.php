<?php
$password = 'seo-admin-2026';

if (!isset($_SERVER['PHP_AUTH_USER']) || !isset($_SERVER['PHP_AUTH_PW']) ||
    $_SERVER['PHP_AUTH_USER'] !== 'admin' || $_SERVER['PHP_AUTH_PW'] !== $password) {
    header('WWW-Authenticate: Basic realm="SEO Admin"');
    header('HTTP/1.0 401 Unauthorized');
    echo 'Доступ запрещён';
    exit;
}

$dataFile = __DIR__ . '/leads.json';
$leads = [];
if (file_exists($dataFile)) {
    $leads = json_decode(file_get_contents($dataFile), true) ?? [];
}

if (isset($_GET['delete'])) {
    $id = (int)$_GET['delete'];
    $leads = array_values(array_filter($leads, fn($l) => $l['id'] !== $id));
    file_put_contents($dataFile, json_encode($leads, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    header('Location: admin.php');
    exit;
}

$newCount = count(array_filter($leads, fn($l) => ($l['status'] ?? '') === 'new'));
$totalCount = count($leads);
?>
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Заявки на SEO аудит</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: -apple-system, 'Segoe UI', sans-serif; background: #07071a; color: #f0f0f5; padding: 40px; }
h1 { font-size: 1.6rem; margin-bottom: 8px; }
.stats { color: #8888a8; margin-bottom: 30px; }
.stats span { background: rgba(99,102,241,0.15); padding: 4px 12px; border-radius: 8px; margin-right: 8px; }
table { width: 100%; border-collapse: collapse; }
th, td { text-align: left; padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 0.9rem; }
th { color: #8888a8; font-weight: 600; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px; }
tr:hover td { background: rgba(255,255,255,0.03); }
.status-new { color: #f59e0b; }
.site-link { color: #a78bfa; text-decoration: none; }
.site-link:hover { text-decoration: underline; }
.delete-btn { color: #ef4444; text-decoration: none; font-size: 0.8rem; }
.empty { text-align: center; padding: 60px; color: #555570; }
</style>
</head>
<body>
<h1>&#x1F4CB; Заявки на SEO аудит</h1>
<div class="stats">
  <span>Новых: <?php echo $newCount; ?></span>
  <span>Всего: <?php echo $totalCount; ?></span>
</div>

<?php if ($leads): ?>
<table>
<thead>
<tr>
  <th>Дата</th>
  <th>Имя</th>
  <th>Контакт</th>
  <th>Сайт</th>
  <th>Комментарий</th>
  <th></th>
</tr>
</thead>
<tbody>
<?php foreach (array_reverse($leads) as $lead): ?>
<tr>
  <td><?php echo htmlspecialchars($lead['date'] ?? ''); ?></td>
  <td><?php echo htmlspecialchars($lead['name']); ?></td>
  <td><?php echo htmlspecialchars($lead['phone']); ?></td>
  <td><a class="site-link" href="<?php echo htmlspecialchars($lead['site']); ?>" target="_blank"><?php echo htmlspecialchars(mb_substr($lead['site'], 0, 40)) . '...'; ?></a></td>
  <td><?php echo htmlspecialchars(mb_substr($lead['comment'] ?? '', 0, 50)); ?></td>
  <td><a class="delete-btn" href="?delete=<?php echo $lead['id']; ?>" onclick="return confirm('Удалить заявку?')">Удалить</a></td>
</tr>
<?php endforeach; ?>
</tbody>
</table>
<?php else: ?>
<div class="empty">Пока нет заявок</div>
<?php endif; ?>
</body>
</html>
