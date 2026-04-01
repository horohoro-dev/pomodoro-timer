# Claude CodeをDocker上で動かす

## docker compose（推奨）

- ビルド
```sh
docker compose build --no-cache
```
- 初回起動 or package.json 変更時(node_modules インストール)
  初回はまだpackage.jsonがマウントされていない
```sh
docker compose run --rm app bash -c "pnpm install"
```

- 起動（Claude Code）
```sh
docker compose run --rm app
```

- 停止・削除
```sh
docker compose down
```

- node_modules ボリューム削除（リセット時）
```sh
docker compose down -v
```

## 備考

- Docker 内の `node_modules` は named volume で分離されている（Linux 用バイナリ）
- ホスト（Mac）側でも `pnpm install` して Mac 用の `node_modules` を使う
- `package.json` を変更したら両方で `pnpm install` を実行すること
