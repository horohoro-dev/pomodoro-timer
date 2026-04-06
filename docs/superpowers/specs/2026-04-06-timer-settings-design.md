# タイマー設定UI — 設計書

> 作成日: 2026-04-06

## 概要

ポモドーロタイマーの作業時間・休憩時間・長休憩時間・長休憩間隔をユーザーが自由に変更できるUIを追加する。

## UIパターン

**右ドロワー方式**を採用。

- idle時（`phase === "idle"`）にタイマー画面右端に⚙アイコンボタンを表示
- クリックで右からドロワーパネルがスライドイン
- ドロワーが開いてもタイマー円は隠れない（メインエリアが圧縮される）
- タイマー実行中（`isRunning === true` または `phase !== "idle"`）はアイコン非表示、ドロワーも自動で閉じる

## 設定項目

| 項目 | デフォルト | 刻み | 最小値 | 最大値 |
|------|-----------|------|--------|--------|
| 作業時間（workDuration） | 25分 | 5分 | 5分 | 120分 |
| 休憩時間（breakDuration） | 5分 | 5分 | 5分 | 30分 |
| 長休憩時間（longBreakDuration） | 15分 | 5分 | 5分 | 60分 |
| 長休憩間隔（longBreakInterval） | 4ループ | 1 | 2 | 10 |

各項目は `−` / `+` ボタンで増減する。

## コンポーネント構成

```
timer/
├── timer-display.tsx      （既存）
├── timer-controls.tsx     （既存）
├── timer-status.tsx       （既存）
└── timer-settings.tsx     （新規）設定ドロワーコンポーネント
```

### TimerSettings コンポーネント

- `"use client"` コンポーネント
- Props: `isOpen: boolean`, `onClose: () => void`
- ストアから `config` を読み、`updateConfig` で更新
- idle時のみ操作可能（ストアの既存制約に合致）
- ドロワー開閉状態はコンポーネントローカルstateで管理（永続化不要）

### TimerPage の変更

- ⚙アイコンボタンを追加（`phase === "idle"` 時のみ表示）
- `TimerSettings` を配置
- レイアウト: `flex` でメインエリア + ドロワーを横並び
- ドロワーが開いた際、メインエリアが自然に圧縮される（`flex: 1`）

## ストアの変更

変更なし。既存の `updateConfig` と `persist` ミドルウェアで対応済み。

## i18n

`messages/ja.json` と `messages/en.json` の `timer` セクションに以下を追加:

- `settings`: 設定
- `workDuration`: 作業時間
- `breakDuration`: 休憩時間
- `longBreakDuration`: 長休憩時間
- `longBreakInterval`: 長休憩間隔

## 永続化

既存のZustand `persist` ミドルウェア（`localStorage` キー: `pomodoro-timer-config`）がconfigの変更を自動保存する。追加の永続化実装は不要。

## アニメーション

ドロワーのスライドインはCSS `transition`（`transform: translateX`）で実装。Tailwindの `transition-transform duration-300` を使用。

## アクセシビリティ

- ⚙ボタンに `aria-label` を付与
- ドロワーに `role="dialog"` と `aria-label`
- `+` / `−` ボタンに `aria-label`（例: "作業時間を5分増やす"）
- Escキーでドロワーを閉じる
