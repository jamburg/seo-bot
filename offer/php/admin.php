<?php
session_start();

$password = 'Kbctyjr2003';

if (isset($_GET['logout'])) {
    session_destroy();
    header('Location: admin.php');
    exit;
}

if (isset($_POST['login'])) {
    if ($_POST['pass'] === $password) {
        $_SESSION['admin'] = true;
        header('Location: admin.php');
        exit;
    }
    $error = 'Неверный пароль';
}

if (!($_SESSION['admin'] ?? false)) {
?>
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Вход — SEO Admin</title>
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:-apple-system,'Segoe UI',sans-serif; background:#07071a; color:#f0f0f5;
  display:flex; align-items:center; justify-content:center; min-height:100vh; }
.login-box { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);
  border-radius:16px; padding:40px; width:340px; }
h1 { font-size:1.3rem; margin-bottom:24px; text-align:center; color:#c4b5fd; }
.form-group { margin-bottom:16px; position:relative; }
label { display:block; font-size:0.85rem; color:#8888a8; margin-bottom:6px; }
input { width:100%; padding:12px 14px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1);
  border-radius:10px; color:#f0f0f5; font-size:1rem; outline:none; }
input:focus { border-color:#a78bfa; }
.pass-wrap { position:relative; }
.pass-wrap input { padding-right:44px; }
.eye-btn { position:absolute; right:12px; top:50%; transform:translateY(-50%); background:none; border:none;
  cursor:pointer; color:#8888a8; font-size:1.2rem; padding:4px; }
.eye-btn:hover { color:#c4b5fd; }
.btn { width:100%; padding:12px; background:#7c3aed; border:none; border-radius:10px; color:#fff;
  font-size:1rem; cursor:pointer; font-weight:600; transition:background 0.2s; }
.btn:hover { background:#6d28d9; }
.error { color:#ef4444; font-size:0.85rem; text-align:center; margin-bottom:12px; }
</style>
</head>
<body>
<div class="login-box">
  <h1>&#x1F512; Вход в панель</h1>
  <?php if (isset($error)): ?><div class="error"><?php echo $error; ?></div><?php endif; ?>
  <form method="post">
    <div class="form-group">
      <label>Пароль</label>
      <div class="pass-wrap">
        <input type="password" name="pass" id="passInput" required autofocus>
        <button type="button" class="eye-btn" id="eyeBtn" onclick="togglePass()">&#x1F441;</button>
      </div>
    </div>
    <button type="submit" name="login" class="btn">Войти</button>
  </form>
</div>
<script>
function togglePass() {
  const el = document.getElementById('passInput');
  const btn = document.getElementById('eyeBtn');
  if (el.type === 'password') { el.type = 'text'; btn.textContent = '\u{1F441}'; }
  else { el.type = 'password'; btn.textContent = '\u{1F441}'; }
}
</script>
</body>
</html>
<?php
exit;
}

// ==== АДМИНКА ====
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
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
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
.header-bar { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:16px; }
.logout-btn { color:#8888a8; text-decoration:none; font-size:0.85rem; padding:6px 14px; border:1px solid rgba(255,255,255,0.1); border-radius:8px; transition:all 0.2s; }
.logout-btn:hover { background:rgba(239,68,68,0.15); border-color:#ef4444; color:#ef4444; }
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
<div class="header-bar">
  <h1>&#x1F4CB; Заявки на SEO аудит</h1>
  <a class="logout-btn" href="?logout">&#x1F6AA; Выйти</a>
</div>

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
