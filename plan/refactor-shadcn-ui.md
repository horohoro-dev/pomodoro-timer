# shadcn/ui 導入 & リファクタリング計画

> 作成日: 2026-04-06
> ステータス: 未着手
> ブランチ: 新規ブランチで作業（feature/#5-timer からではなくmainマージ後に切る）

---

## 目的

shadcn/ui を導入し、UIコンポーネントの統一・保守性向上・カスタマイズ性の強化を行う。
合わせて、現在のコードで改善すべき点を対応する。

---

## 1. shadcn/ui 導入

### やること

- `shadcn/ui` を初期化（`npx shadcn@latest init`）
- 既存の `src/components/ui/button.tsx` を shadcn/ui の Button に置き換え
- `lucide-react`（shadcn/ui のデフォルトアイコンライブラリ）をインストール
- 必要に応じて追加コンポーネントを導入（Dialog, Drawer など）

### 注意点

- 既存の Tailwind CSS v4 + tailwind-variants + tailwind-merge の構成との互換性を確認
- shadcn/ui は Tailwind CSS v4 対応済み（v2.x 以降）
- カラートークン（`--primary`, `--foreground` 等）は既存の `globals.css` と shadcn/ui のテーマを統合する

---

## 2. forwardRef の削除（React 19 対応）

### 対象ファイル

- `src/components/ui/button.tsx`

### 理由

React 19 では `ref` が通常の props として渡せるため `forwardRef` は不要。
Next.js 16 は React 19 を使用しているので対応可能。

### 変更内容

```tsx
// Before
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => { ... }
);

// After
function Button({ className, variant, size, ref, ...props }: ButtonProps & { ref?: React.Ref<HTMLButtonElement> }) { ... }
```

※ shadcn/ui の Button に置き換える場合はそちらが React 19 対応済みか確認。対応済みならこの作業は不要。

---

## 3. SVGインラインアイコン → lucide-react に置き換え

### 対象ファイル（アイコン）

- `src/components/timer/timer-controls.tsx` — ▶（再生）、⏸（一時停止）、↻（リセット）
- `src/components/timer/timer-display.tsx` — ⏸（一時停止オーバーレイ）
- `src/app/(app)/timer/page.tsx` — ⚙（設定アイコン、Unicode絵文字）

### 置き換え先（lucide-react）

| 現在 | lucide-react アイコン |
|------|----------------------|
| ▶ SVG | `<Play />` |
| ⏸ SVG | `<Pause />` |
| ↻ SVG | `<RotateCcw />` |
| ⚙ 絵文字 | `<Settings />` |

### 置き換えの理由

- Unicode絵文字は環境によって表示が変わるリスクがある
- インラインSVGは保守が面倒
- lucide-react は shadcn/ui のデフォルトアイコンライブラリで統一感がある

---

## 4. useLongPress の切り出し（任意）

### 対象ファイル（useLongPress）

- `src/components/timer/timer-settings.tsx`（現在230行）

### 検討内容

`useLongPress` フックを `src/hooks/use-long-press.ts` に切り出す。
ただし、他で再利用予定がなければ現状維持でも可。ファイルサイズが問題になった時点で対応する。

---

## 作業順序

1. shadcn/ui 初期化 + テーマ統合
2. Button コンポーネント置き換え（forwardRef 削除含む）
3. lucide-react でアイコン置き換え
4. 動作確認 + テスト修正
5. （任意）useLongPress 切り出し
