<?php
$password = 'Kbctyjr2003';

$auth_user = $_SERVER['PHP_AUTH_USER'] ?? '';
$auth_pw = $_SERVER['PHP_AUTH_PW'] ?? '';

if (!$auth_user && !$auth_pw && isset($_SERVER['HTTP_AUTHORIZATION'])) {
    $auth = $_SERVER['HTTP_AUTHORIZATION'];
    if (strpos($auth, 'Basic ') === 0) {
        $decoded = base64_decode(substr($auth, 6));
        if ($decoded && strpos($decoded, ':') !== false) {
            list($auth_user, $auth_pw) = explode(':', $decoded, 2);
        }
    }
}

if (!$auth_user && !$auth_pw && isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
    $auth = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    if (strpos($auth, 'Basic ') === 0) {
        $decoded = base64_decode(substr($auth, 6));
        if ($decoded && strpos($decoded, ':') !== false) {
            list($auth_user, $auth_pw) = explode(':', $decoded, 2);
        }
    }
}

if ($auth_user !== 'admin' || $auth_pw !== $password) {
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

$counterFile = __DIR__ . '/counters.json';
$visits = 0;
$orders = 0;
if (file_exists($counterFile)) {
    $c = json_decode(file_get_contents($counterFile), true);
    $visits = $c['visits'] ?? 0;
    $orders = $c['orders'] ?? 0;
}

if (isset($_GET['delete'])) {
    $id = (int)$_GET['delete'];
    $leads = array_values(array_filter($leads, fn($l) => $l['id'] !== $id));
    file_put_contents($dataFile, json_encode($leads, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    header('Location: admin.php' . (isset($_GET['filter']) ? '?filter=' . urlencode($_GET['filter']) : ''));
    exit;
}

if (isset($_GET['toggle'])) {
    $id = (int)$_GET['toggle'];
    foreach ($leads as &$l) {
        if ($l['id'] === $id) {
            $l['status'] = ($l['status'] ?? 'new') === 'new' ? 'processed' : 'new';
            break;
        }
    }
    unset($l);
    file_put_contents($dataFile, json_encode($leads, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    header('Location: admin.php' . (isset($_GET['filter']) ? '?filter=' . $_GET['filter'] : ''));
    exit;
}

$filter = $_GET['filter'] ?? 'all';
if ($filter === 'new') {
    $filtered = array_filter($leads, fn($l) => ($l['status'] ?? 'new') === 'new');
} elseif ($filter === 'processed') {
    $filtered = array_filter($leads, fn($l) => ($l['status'] ?? 'new') === 'processed');
} else {
    $filtered = $leads;
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
.stats { color: #8888a8; margin-bottom: 24px; display: flex; flex-wrap: wrap; gap: 8px; }
.stats span { background: rgba(99,102,241,0.15); padding: 4px 12px; border-radius: 8px; }
.filters { margin-bottom: 24px; display: flex; gap: 8px; flex-wrap: wrap; }
.filters a { padding: 6px 16px; border-radius: 8px; text-decoration: none; color: #8888a8; font-size: 0.9rem;
  background: rgba(255,255,255,0.04); transition: all 0.2s; }
.filters a:hover { background: rgba(99,102,241,0.15); color: #c4b5fd; }
.filters a.active { background: rgba(99,102,241,0.25); color: #a78bfa; }
table { width: 100%; border-collapse: collapse; }
th, td { text-align: left; padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 0.9rem; }
th { color: #8888a8; font-weight: 600; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px; }
tr:hover td { background: rgba(255,255,255,0.03); }
tr.processed { opacity: 0.5; }
.status-new { color: #f59e0b; font-weight: 600; }
.status-processed { color: #22c55e; }
.site-link { color: #a78bfa; text-decoration: none; }
.site-link:hover { text-decoration: underline; }
.action-btn { text-decoration: none; font-size: 0.8rem; padding: 2px 8px; border-radius: 4px; }
.delete-btn { color: #ef4444; }
.toggle-btn { color: #22c55e; }
.empty { text-align: center; padding: 60px; color: #555570; }
@media (max-width:768px) {
  body { padding: 16px; }
  table, thead, tbody, th, td, tr { display: block; }
  thead tr { display: none; }
  td { padding: 8px 12px; border: none; }
  td::before { content: attr(data-label); display: inline-block; width: 100px; color: #8888a8; font-weight: 600; }
  tr { border-bottom: 1px solid rgba(255,255,255,0.06); margin-bottom: 12px; padding: 8px 0; }
}
</style>
</head>
<body>
<h1>&#x1F4CB; Заявки на SEO аудит</h1>
<div class="stats">
  <span>&#x1F4C5; Новых: <?php echo $newCount; ?></span>
  <span>&#x1F4CA; Всего: <?php echo $totalCount; ?></span>
  <span>&#x1F441; Посещений: <?php echo $visits; ?></span>
  <span>&#x1F4CB; Заказов: <?php echo $orders; ?></span>
  <span>&#x1F4C8; Конверсия: <?php echo $visits > 0 ? round($orders / $visits * 100, 1) : 0; ?>%</span>
</div>

<div class="filters">
  <a href="?filter=all" class="<?php echo $filter === 'all' ? 'active' : ''; ?>">&#x41B; Все</a>
  <a href="?filter=new" class="<?php echo $filter === 'new' ? 'active' : ''; ?>">&#x1F4C5; Новые</a>
  <a href="?filter=processed" class="<?php echo $filter === 'processed' ? 'active' : ''; ?>">&#x2705; Обработанные</a>
</div>

<?php $filteredArr = array_values($filtered); ?>
<?php if ($filteredArr): ?>
<div style="overflow-x:auto;">
<table>
<thead>
<tr>
  <th>Дата</th>
  <th>Статус</th>
  <th>Имя</th>
  <th>Контакт</th>
  <th>Сайт</th>
  <th>Комментарий</th>
  <th></th>
</tr>
</thead>
<tbody>
<?php foreach (array_reverse($filteredArr) as $lead): $status = $lead['status'] ?? 'new'; ?>
<tr class="<?php echo $status === 'processed' ? 'processed' : ''; ?>">
  <td data-label="Дата"><?php echo htmlspecialchars($lead['date'] ?? ''); ?></td>
  <td data-label="Статус"><span class="<?php echo 'status-' . $status; ?>"><?php echo $status === 'new' ? 'Новая' : 'Обработана'; ?></span></td>
  <td data-label="Имя"><?php echo htmlspecialchars($lead['name']); ?></td>
  <td data-label="Контакт"><?php echo htmlspecialchars($lead['phone']); ?></td>
  <td data-label="Сайт"><a class="site-link" href="<?php echo htmlspecialchars($lead['site']); ?>" target="_blank"><?php echo htmlspecialchars(mb_substr($lead['site'], 0, 40)); ?></a></td>
  <td data-label="Коммент."><?php echo htmlspecialchars(mb_substr($lead['comment'] ?? '', 0, 50)); ?></td>
  <td data-label="">
    <a class="action-btn toggle-btn" href="?toggle=<?php echo $lead['id']; ?>&filter=<?php echo $filter; ?>" title="Переключить статус">&#x2705;</a>
    <a class="action-btn delete-btn" href="?delete=<?php echo $lead['id']; ?>&filter=<?php echo $filter; ?>" onclick="return confirm('Удалить заявку?')" title="Удалить">&#x274C;</a>
  </td>
</tr>
<?php endforeach; ?>
</tbody>
</table>
</div>
<?php else: ?>
<div class="empty">&#x1F50D; Нет заявок по выбранному фильтру</div>
<?php endif; ?>
</body>
</html>
