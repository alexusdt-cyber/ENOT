<?php
/**
 * SwiftX SSO Exchange Endpoint
 * 
 * Этот endpoint принимает ticket от фронтенда,
 * валидирует его на Host (NoteFlow) и создает локальную сессию.
 * 
 * ВАЖНО: Измените HOST_BASE на реальный URL вашего NoteFlow!
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
    exit;
}

// ============================================================
// КОНФИГУРАЦИЯ - ИЗМЕНИТЕ ЭТИ ЗНАЧЕНИЯ!
// ============================================================

// URL вашего NoteFlow сервера (Host)
define('HOST_BASE', 'https://ВАШ-NOTEFLOW-ДОМЕН.replit.app');

// ID приложения - используйте UUID из NoteFlow, а не componentKey!
// Получите UUID через: curl "https://your-domain/api/apps" | grep -i swiftx
define('APP_ID', 'ВАШ-UUID-ИЗ-NOTEFLOW');

// ============================================================
// ОСНОВНАЯ ЛОГИКА
// ============================================================

$input = json_decode(file_get_contents('php://input'), true);

if (!$input || empty($input['ticket']) || empty($input['appId'])) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'ticket and appId required']);
    exit;
}

$ticket = $input['ticket'];
$appId = $input['appId'];

// Проверяем appId
if ($appId !== APP_ID) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'error' => 'Invalid appId']);
    exit;
}

// Делаем server-to-server запрос к NoteFlow для валидации ticket
$introspectUrl = HOST_BASE . '/api/sso/introspect';

$ch = curl_init($introspectUrl);
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode([
        'ticket' => $ticket,
        'appId' => $appId
    ]),
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 10,
    CURLOPT_SSL_VERIFYPEER => true
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Failed to connect to Host: ' . $curlError]);
    exit;
}

$data = json_decode($response, true);

if (!$data || $httpCode !== 200) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'Introspect failed', 'details' => $data]);
    exit;
}

if (isset($data['valid']) && $data['valid'] === false) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => $data['reason'] ?? 'Invalid ticket']);
    exit;
}

// Успешная валидация! data содержит информацию о пользователе
// data['sub'] = userId на Host
$externalUserId = $data['sub'] ?? null;

if (!$externalUserId) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'No user ID in response']);
    exit;
}

// ============================================================
// ЗДЕСЬ ВАША ЛОГИКА СОЗДАНИЯ ПОЛЬЗОВАТЕЛЯ/СЕССИИ
// ============================================================

// Пример: найти или создать пользователя в вашей БД
$user = findOrCreateUser($externalUserId, $data);

// Пример: создать локальную сессию
$sessionId = createLocalSession($user['id']);

// Установить cookie с сессией
setcookie('swiftx_session', $sessionId, [
    'expires' => time() + 86400 * 7, // 7 дней
    'path' => '/',
    'secure' => true,
    'httponly' => true,
    'samesite' => 'Lax'
]);

// Возвращаем успех
echo json_encode([
    'ok' => true,
    'user' => [
        'id' => $user['id'],
        'externalId' => $externalUserId,
        'scopes' => $data['scopes'] ?? []
    ]
]);

// ============================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (замените на вашу реализацию)
// ============================================================

function findOrCreateUser($externalUserId, $ssoData) {
    // TODO: Реализуйте поиск/создание пользователя в вашей БД
    // 
    // Пример с MySQL:
    // $pdo = new PDO('mysql:host=localhost;dbname=swiftx', 'user', 'pass');
    // 
    // $stmt = $pdo->prepare('SELECT * FROM users WHERE external_id = ?');
    // $stmt->execute([$externalUserId]);
    // $user = $stmt->fetch(PDO::FETCH_ASSOC);
    // 
    // if (!$user) {
    //     $stmt = $pdo->prepare('INSERT INTO users (external_id, created_at) VALUES (?, NOW())');
    //     $stmt->execute([$externalUserId]);
    //     $userId = $pdo->lastInsertId();
    //     $user = ['id' => $userId, 'external_id' => $externalUserId];
    // }
    // 
    // return $user;
    
    // Временная заглушка для тестирования:
    return ['id' => 'user_' . $externalUserId];
}

function createLocalSession($userId) {
    // TODO: Реализуйте создание сессии в вашей БД
    //
    // Пример:
    // $sessionId = bin2hex(random_bytes(32));
    // $stmt = $pdo->prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))');
    // $stmt->execute([$sessionId, $userId]);
    // return $sessionId;
    
    // Временная заглушка:
    return bin2hex(random_bytes(32));
}
