# Claude CodeをDocker上で動かす

## docker compose（推奨）

- ビルド

```sh
docker compose build --no-cache
```

- 起動（Claude Code）

```sh
docker compose run --rm app
```

- VSCodeでプロジェクトを開き、Cmd + Shift + P → Dev Containers: Reopen in Container
  拡張機能のDev Containers(ms-vscode-remote.remote-containers)が必要

- 初回起動 or package.json 変更時は、Docker内で `pnpm install` を実行する

- 停止・削除

```sh
docker compose down
```

- node_modules ボリューム削除（リセット時）

```sh
docker compose down -v
```

## エディタ連携（VS Code + Dev Containers）

- VS Code の Dev Containers 拡張（`ms-vscode-remote.remote-containers`）を使い、Docker 内から開く
- `Cmd + Shift + P` → `Dev Containers: Reopen in Container` で起動
- Docker 内の `node_modules` がそのまま使えるため、ホスト側で `pnpm install` は不要

## 備考

- Docker 内の `node_modules` は named volume で分離されている（Linux 用バイナリ）
- ホスト側では `pnpm install` を実行しない（セキュリティ上、node_modules はDocker内のみに配置）
- `pnpm install` は必ず Claude Code セッション内または VS Code Dev Containers のターミナルで実行すること（ホストからの `docker compose run` で実行すると別のボリュームにインストールされ、Dev Containers / Claude Code 側に反映されない）
- `package.json` を変更したら Docker 内で `pnpm install` を実行すること
- `claude-sessions` named volume で会話履歴をプロジェクトごとに分離している。設定・認証・agents はホスト側 `~/.claude` を共有
- named volume を削除してセッションをリセットするには `docker compose down -v`（node_modules も削除される）
