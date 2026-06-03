<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

$post = file_get_contents('php://input');
if ($post) {
    file_put_contents('cms-data.json', $post);
    echo json_encode(["status" => "ok"]);
} else {
    echo json_encode(["status" => "error"]);
}
