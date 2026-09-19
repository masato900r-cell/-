# さんすうチャレンジ

たし算・ひき算（0〜10、130パターン）を練習する子ども向けアプリです。
友人が作ったオリジナル版をベースに、以下を追加しています。

- **出題方式をデッキ方式に変更**：たし算65問・ひき算65問をそれぞれシャッフルし、
  1プレイにつき5問ずつ配って、配り切ったら再シャッフル。特定の問題ばかり出た
  り、逆にほとんど出ない問題ができたりしないようにしています。
- **正解率ダッシュボード（`stats.html`）を追加**：プレイのたびに問題ごとの
  正解／不正解を記録し、苦手な問題・得意な問題、たし算とひき算どちらが苦手か
  などを見える化します。保護者の方向けの画面です。
- **複数端末での記録共有（任意機能）**：Cloudflare Workers + KVを使った小さな
  同期サーバーを立てると、PC・iPhone・iPadなど別々の端末でプレイした記録を
  1つのダッシュボードに合算できます。設定しなければ、今まで通り各端末の中だけ
  で完結します。
- すべての記録は各端末のブラウザ内（`localStorage`）に保存されます。同期を
  設定しない限り、サーバーには一切送信されません。

## ファイル構成

| ファイル | 役割 |
|---|---|
| `index.html` | 本体（子どもが遊ぶ画面） |
| `stats.html` | 正解率ダッシュボード（保護者向け） |
| `manifest.webmanifest` | ホーム画面に追加したときの名前・アイコン設定 |
| `sw.js` | オフラインで動かすためのキャッシュ設定 |
| `icon-180.png` | アプリアイコン（**仮のプレースホルダーです**。後述） |
| `worker.js` | 複数端末の記録を合算するCloudflare Worker（任意機能） |
| `wrangler.toml` | 上記Workerのデプロイ設定 |

> **注意**：`manifest.webmanifest` / `sw.js` / `icon-180.png` の3つは、元サイト
> の実物を確認できなかったため、このプロジェクト用に新しく作り直したもので
> す。オリジナルと完全に同じ挙動・見た目にしたい場合は、友人から実物のファ
> イルをもらって差し替えてください（`index.html` と `stats.html` はそのまま
> 使えます）。

## ローカルで試す

そのまま `index.html` をダブルクリックするだけでも動きますが、ブラウザに
よっては `localStorage`（プレイ記録の保存）が不安定になることがあるため、
簡易サーバーを立てるのが確実です。

```bash
cd sansuu-challenge
python3 -m http.server
```

ブラウザで `http://localhost:8000/` を開いてください。同じWi-Fi内であれば、
スマホからも `http://（PCのIPアドレス）:8000/` でアクセスできます。

## 複数端末でデータを共有する（Cloudflare Workers + KV）

無料の範囲で、PC・iPhoneなど別々の端末の記録を1つに合算できます。

### 1. Wranglerでログインする

Node.jsがインストールされていれば、追加インストール不要でそのまま使えます。

```bash
npx wrangler login
```

ブラウザが開くので、Cloudflareアカウントでログイン（アカウントがなければ
その場で無料登録）します。

### 2. KV（データの保存先）を作成する

```bash
npx wrangler kv namespace create SANSUU_KV
```

実行すると、次のような行が表示されます。

```
{ binding = "SANSUU_KV", id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" }
```

この `id` の値を`wrangler.toml`の `REPLACE_WITH_YOUR_KV_NAMESPACE_ID` の部分
に書き換えて保存してください。

### 3. Workerをデプロイする

```bash
npx wrangler deploy
```

成功すると、`https://sansuu-sync.【あなたのサブドメイン】.workers.dev` の
ようなURLが表示されます。これが同期用のURLです。

### 4. アプリ側にURLを設定する

`index.html`と`stats.html`、両方の中にある次の行を、上記で発行されたURLに
書き換えます（2ファイルとも同じURLにしてください）。

```js
var SYNC_URL = '';
```

```js
var SYNC_URL = 'https://sansuu-sync.【あなたのサブドメイン】.workers.dev';
```

書き換えたら、いつも通りGitHubにpushして反映してください。

### 5. 端末同士を紐づける

`stats.html`を開くと画面上部に「同期コードを設定」というボタンが出ます。
1台目の端末で好きな合言葉（4〜10文字の半角英数字）を決めて設定し、2台目・
3台目の端末でも`stats.html`の「同期コードを設定」から**同じ合言葉**を入力
すれば、以降はどの端末でプレイしても同じダッシュボードに集計されます。

なお認証機能ではないので、この合言葉を知っている人なら誰でもそのデータを
見たり書き換えたりできてしまいます。家族内だけで使う分には問題ない設計です
が、他人に合言葉を教えないよう注意してください。



1. GitHubで新しい空のリポジトリを作成する（README・.gitignore・ライセンス
   などは追加しない。すでにこちらでコミット済みのため）
2. このフォルダで以下を実行

```bash
git remote add origin https://github.com/【あなたのユーザー名】/【リポジトリ名】.git
git branch -M main
git push -u origin main
```

（SSHで運用している場合は `git@github.com:【ユーザー名】/【リポジトリ名】.git` を使ってください）

## Cloudflare Pagesに公開する

pushしたリポジトリをCloudflare Pagesに連携すれば、ビルド設定は不要（静的
ファイルのみのため）で、そのまま公開できます。

- Framework preset: `None`
- Build command: 空欄のまま
- Build output directory: `/`（リポジトリ直下）

GitHub連携を使わず、Pagesのダッシュボードからこのフォルダを直接ドラッグ＆
ドロップして公開することも可能です。
